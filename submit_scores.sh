#!/bin/bash
# Usage: ./submit_scores.sh path/to/entries.json endpoint_url

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 path/to/entries.json endpoint_url"
  exit 1
fi

JSON_FILE="$1"
echo "FILE: $JSON_FILE"
ENDPOINT_URL="$2"
TOKEN="Bearer eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJ1c2VyIjoidmFsaWRhdG9yIiwicm9sZSI6InZhbGlkYXRvciJ9.MEQCIFDFHgK3nCJCUs0dzT815hyCwFSmahYk1Tbh8ApgB0BGAiBw5z6mP1OaBeS6LBpbJscWrtKXw3y0pg2Lpb79KNUnyw"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "jq is required; please install jq."
  exit 1
fi

# Read each JSON object from the file and POST it to the server
while IFS= read -r record; do
  echo "Submitting: $record"
  curl -X POST "$ENDPOINT_URL" \
    -H "Authorization: $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$record"
  echo -e "\n---"
done < <(jq -c '.[]' "$JSON_FILE")

echo "Submission complete."
