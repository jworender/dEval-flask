import os
import requests
import json
import base64
import hashlib
import psycopg2
from psycopg2.extras import Json
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, Response
from dotenv import load_dotenv
from coincurve import PrivateKey, PublicKey
from tabulate import tabulate

app = Flask(__name__)

# Load environment variables from .env file
#load_dotenv()

# --- Key Setup ---
# For demonstration, generate a new key pair at startup.
private_key_obj = PrivateKey()
public_key_obj = private_key_obj.public_key

# --- Database Parameters ---
DB_PARAMS = {
    'dbname': os.environ.get('POSTGRES_DBNAME'),
    'user': os.environ.get('POSTGRES_USER'),
    'password': os.environ.get('POSTGRES_PW'),
    'host': os.environ.get('POSTGRES_HOST'),
    'port': os.environ.get('POSTGRES_PORT')
}

# Get the API key and endpoint URL from environment variables.
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
# Default to the standard OpenAI completions endpoint, but this can be set to any compatible URL.
OPENAI_API_URL = os.environ.get('OPENAI_API_URL', 'https://api.openai.com/v1/chat/completions')

@app.route('/')
def index():
    return f"OpenAI API URL: {OPENAI_API_URL}"

# --- Helper Functions for Base64 URL Encoding ---
def base64url_encode(data: bytes) -> bytes:
    return base64.urlsafe_b64encode(data).rstrip(b'=')

def base64url_decode(data: str) -> bytes:
    # Pad with '=' to make the length a multiple of 4 if needed.
    padding = '=' * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode(data + padding)

@app.route('/test', methods=['POST'])
def test_llm():
    """
    Expects a JSON payload with at least the "prompt" key.
    Optional parameters: model, max_tokens, temperature.
    """
    data = request.get_json()
    if not data or 'prompt' not in data:
        return jsonify({'error': 'Invalid input. Please provide a JSON with a prompt.'}), 400

    # Prepare payload for the OpenAI API.
    payload = {
        'model': data.get('model', 'gpt-4o'),
        # Use "messages" if provided, otherwise wrap "prompt" in a message.
        'messages': data.get('messages', [{"role": "user", "content": data.get("prompt", "")}]),
        'max_tokens': data.get('max_tokens', 100),
        'temperature': data.get('temperature', 0.7),
    }

    headers = {
        'Authorization': f'Bearer {OPENAI_API_KEY}',
        'Content-Type': 'application/json'
    }

    try:
        # Send a POST request to the OpenAI-compatible endpoint.
        response = requests.post(OPENAI_API_URL, json=payload, headers=headers)
        response.raise_for_status()  # Raise an error for bad status codes.
        result = response.json()
        return jsonify(result), 200
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500

# --- Custom JWS Signing and Verification ---
def sign_jws(header: dict, payload: dict, private_key: PrivateKey) -> str:
    """
    Create a JWS token with a header and payload.
    The token structure is: base64url(header).base64url(payload).base64url(signature)
    The signature is computed over the header and payload using secp256k1 and SHA-256.
    """
    header_json = json.dumps(header, separators=(',', ':')).encode()
    payload_json = json.dumps(payload, separators=(',', ':')).encode()
    encoded_header = base64url_encode(header_json)
    encoded_payload = base64url_encode(payload_json)
    signing_input = encoded_header + b'.' + encoded_payload
    # Compute SHA-256 hash of the signing input.
    digest = hashlib.sha256(signing_input).digest()
    # Sign the digest using secp256k1.
    signature = private_key.sign(digest, hasher=None)
    encoded_signature = base64url_encode(signature)
    token = signing_input.decode() + '.' + encoded_signature.decode()
    return token

def verify_jws(token: str, public_key: PublicKey) -> dict:
    """
    Verify a JWS token signed with secp256k1.
    Returns the decoded payload if successful, or raises ValueError.
    """
    try:
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError("Token must have 3 parts")
        encoded_header, encoded_payload, encoded_signature = parts
        signing_input = (encoded_header + '.' + encoded_payload).encode()
        signature = base64url_decode(encoded_signature)
        digest = hashlib.sha256(signing_input).digest()
        # Verify the signature using the public key.
        if not public_key.verify(signature, digest, hasher=None):
            raise ValueError("Invalid signature")
        # Decode header and payload.
        header = json.loads(base64url_decode(encoded_header).decode())
        payload = json.loads(base64url_decode(encoded_payload).decode())
        return payload
    except Exception as e:
        raise ValueError("JWS verification failed: " + str(e))

# --- Flask Decorator for Protected Routes ---
def require_jws(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', None)
        if not auth_header:
            return jsonify({'error': 'Missing Authorization header'}), 401
        parts = auth_header.split()
        if parts[0].lower() != 'bearer' or len(parts) != 2:
            return jsonify({'error': 'Invalid Authorization header'}), 401
        token = parts[1]
        try:
            payload = verify_jws(token, public_key_obj)
            # Optionally attach the token payload to the request context.
            request.jws_payload = payload
        except ValueError as e:
            return jsonify({'error': str(e)}), 401
        return f(*args, **kwargs)
    return decorated

# --- Endpoints ---

@app.route('/token', methods=['POST'])
def generate_token():
    """
    For demonstration purposes, this endpoint creates a JWS token.
    In a real scenario, we will authenticate the user before issuing a token.
    """
    # Example payload; in practice, include relevant claims (like user ID, role, etc.).
    payload = request.get_json() or {"user": "validator", "role": "validator"}
    header = {"alg": "ES256K", "typ": "JWT"}
    token = sign_jws(header, payload, private_key_obj)
    return jsonify({'token': token})

@app.route('/protected', methods=['GET'])
@require_jws
def protected():
    """
    A protected route that requires a valid JWS token.
    """
    return jsonify({
        'message': 'You have accessed a protected route!',
        'payload': request.jws_payload
    })

if __name__ == '__main__':
    # Run the Flask server. Adjust debug and host as needed.
    # may want to consider Nginx in production for security and control
    app.run(debug=True, host='0.0.0.0', port=5000)

# --- Flask Route to Insert a Score ---
@app.route('/submit-score', methods=['POST'])
@require_jws
def submit_score():
    data = request.get_json()

    # Required fields: adjust as needed
    required_fields = [
        'evaluationRunId', 'modelDID', 'validatorDID', 'score'
    ]

    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cursor = conn.cursor()

        insert_query = """
            INSERT INTO test_scores (
                evaluationrunid, modeldid, validatordid, score,
                metrics, evaluation_type, hash,
                evaluation_timestamp, metadata
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        # Safely extract values, using None or defaults
        evaluationrunid = data['evaluationrunid']
        modeldid = data['modeldid']
        validatordid = data['validatorDID']
        score = float(data['score'])  # Ensure it’s numeric

        metrics = Json(data.get('metrics') or {})
        evaluation_type = data.get('evaluation_type')
        hash_value = data.get('hash')
        evaluation_timestamp = data.get('evaluation_timestamp')
        if evaluation_timestamp is not None:
            evaluation_timestamp = datetime.fromisoformat(evaluation_timestamp)
        else:
            evaluation_timestamp = datetime.utcnow()

        metadata = Json(data.get('metadata') or {})

        cursor.execute(insert_query, (
            evaluationrunid,
            modeldid,
            validatordid,
            score,
            metrics,
            evaluation_type,
            hash_value,
            evaluation_timestamp,
            metadata
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'status': 'success'}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

# --- Route to Fetch Basic Score Info ---
@app.route('/all_scores', methods=['GET'])
def get_scores():
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT evaluationrunid, modeldid, validatordid, score
            FROM test_scores
            ORDER BY score DESC
        """)

        rows = cursor.fetchall()
        result = []
        for row in rows:
            result.append({
                'evaluationRunId': row[0],
                'modelDID': row[1],
                'validatorDID': row[2],
                'score': float(row[3])
            })

        cursor.close()
        conn.close()

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- Route to Fetch slimple leaderboard table ---
@app.route('/leaderboard', methods=['GET', 'POST'])
def leaderboard_text():
    data = request.get_json(silent=True) or {}

    try:
        conn = psycopg2.connect(**DB_PARAMS)
        cursor = conn.cursor()

        where_clauses = []
        params = []

        if 'validator' in data:
            where_clauses.append("validatordid = %s")
            params.append(data['validator'])

        if 'evaluationRunId' in data:
            where_clauses.append("evaluationrunid = %s")
            params.append(data['evaluationrunid'])

        where_sql = " AND ".join(where_clauses)

        if where_sql:
            query = f"""
                SELECT modeldid, AVG(score) AS mean_score
                FROM test_scores
                WHERE {where_sql}
                GROUP BY modeldid
                ORDER BY mean_score DESC
            """
            cursor.execute(query, params)
        else:
            query = """
                SELECT modeldid, AVG(score) AS mean_score
                FROM test_scores
                GROUP BY modeldid
                ORDER BY mean_score DESC
            """
            cursor.execute(query)

        rows = cursor.fetchall()

        headers = ['Model ID', 'Mean Score']
        formatted_rows = [
            [str(row[0]), float(row[1])]
            for row in rows
        ]
        table = tabulate(formatted_rows, headers=headers, tablefmt="grid")

        # Validators considered
        if ('validator' in data):
            rows_val = [ [ data['validator'] ] ]
        else:
            cursor.execute("""
                SELECT validatordid
                FROM test_scores
                GROUP BY validatordid
                ORDER BY validatordid
            """)
            rows_val = cursor.fetchall()
            
        if ('test' in data):
            rows_test = [ [ data['test'] ] ]
        else:
            # Tests considered
            cursor.execute("""
                SELECT evaluationrunid
                FROM test_scores
                GROUP BY evaluationrunid
                ORDER BY evaluationrunid
            """)
            rows_test = cursor.fetchall()

        lval = len(rows_val)
        ltest = len(rows_test)
        l = max(lval, ltest)
        
        formatted_rows = [
            [
                (rows_val[i][0] if i < lval else " "),
                (rows_test[i][0] if i < ltest else " ")
            ] for i in range(l)
        ]
        headers = ['Validators Considered', 'Tests Considered']
        considered = tabulate(formatted_rows, headers=headers, tablefmt="grid")

        cursor.close()
        conn.close()

        return Response(table + "\n\n" + considered, mimetype='text/plain')

    except Exception as e:
        return Response(f"Error: {str(e)}", mimetype='text/plain', status=500)
