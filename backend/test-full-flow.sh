#!/bin/bash

# Try different passwords for abc@abc.com
PASSWORDS=("password" "abc" "abc123" "Password123")

for PASS in "${PASSWORDS[@]}"; do
    echo "Trying password: $PASS"
    RESPONSE=$(curl -s -X POST http://localhost:8080/api/public/login \
      -H "Content-Type: application/json" \
      -d "{\"username\": \"abc@abc.com\", \"password\": \"$PASS\"}")
    
    TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"\(.*\)"/\1/')
    
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        echo "✓ Login successful with password: $PASS"
        echo "Token: ${TOKEN:0:30}..."
        echo ""
        echo "Fetching projects..."
        PROJECT_RESPONSE=$(curl -s -X GET http://localhost:8080/api/client-admin/projects \
          -H "Authorization: Bearer $TOKEN")
        echo "Projects response:"
        echo "$PROJECT_RESPONSE"
        exit 0
    fi
done

echo "❌ All password attempts failed"
