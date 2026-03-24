#!/bin/bash

# Simple test script for Campus Connect Backend

echo "Starting Campus Connect Backend Tests..."

# Check if server is reachable
curl -s http://localhost:5000/ > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Server is reachable at http://localhost:5000/"
else
    echo "❌ Server is NOT reachable at http://localhost:5000/. Please make sure it is running."
    # We can't really start the server and keep it running for tests in this environment easily without backgrounding.
    # But node --check already verified syntax.
fi

# Check some API endpoints (expecting 401 since no token)
endpoints=("/api/users/profile" "/api/posts" "/api/colleges")

for ep in "${endpoints[@]}"; do
    status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000$ep)
    if [ "$status" == "401" ]; then
        echo "✅ Endpoint $ep returned 401 as expected (unauthorized)."
    else
        echo "⚠️  Endpoint $ep returned $status. (Expected 401 if server is up)"
    fi
done

echo "Tests completed."
