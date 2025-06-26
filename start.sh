#!/bin/bash

echo "Starting Docker deployment..."
docker-compose up --build -d
if [ $? -ne 0 ]; then
    echo "Error: Docker deployment failed"
    exit 1
fi

echo
echo "Deployment complete! Services are starting up..."
echo "Check 'docker-compose ps' to see service status"