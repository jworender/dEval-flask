#!/bin/bash
# Usage: ./submit_scores.sh path/to/entries.json endpoint_url

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 path/to/entries.json endpoint_url"
  exit 1
fi

JSON_FILE="$1"
ENDPOINT_URL="$2"
TOKEN="Bearer eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJ1c2VyIjoidmFsaWRhdG9yIiwicm9sZSI6InZhbGlkYXRvciJ9.MEQCIDFhpJgw_RhWiPnFQFAZj0UzEJYkGayw0OCYYTyPtM4jAiBq_1i_lBcr7FQ1OoT-pzC_vufeID0t-Edpq7KegnWJlw"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "jq is required; please install jq."
  exit 1
fi

# Read each JSON object from the file and POST it to the server
for record in $(jq -c '.[]' "$JSON_FILE"); do
  echo "Submitting: $record"
  curl -X POST "$ENDPOINT_URL" \
    -H "Authorization: $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$record"
  echo -e "\n---"
done

echo "Submission complete."
