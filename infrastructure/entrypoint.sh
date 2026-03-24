#!/bin/bash
set -e

# Download data from S3 if not already present
if [ ! -d "/app/data/base" ]; then
  echo "Downloading data from S3..."
  aws s3 sync "s3://${S3_DATA_BUCKET}/" /app/data/ \
    --exclude "scenarios/*" \
    --no-progress
  echo "Data download complete."
fi

# Start the API server
exec node api/local-server.js
