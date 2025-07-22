#!/bin/bash

# Script to check Firecrawl API credits
# Usage: ./check-firecrawl-credits.sh <API_KEY>

if [ -z "$1" ]; then
    echo "Usage: $0 <FIRECRAWL_API_KEY>"
    echo "Example: $0 fc-your-api-key-here"
    exit 1
fi

API_KEY=$1

echo "Checking Firecrawl credits..."

# Make the API call to get credit usage
response=$(curl -s -X GET "https://api.firecrawl.dev/v1/team/credit-usage" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json")

# Pretty print the response
echo "Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"

# Extract remaining credits if successful
if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
    credits=$(echo "$response" | jq -r '.data.remaining_credits')
    echo ""
    echo "✅ Remaining credits: $credits"
else
    echo ""
    echo "❌ Failed to fetch credit usage"
fi