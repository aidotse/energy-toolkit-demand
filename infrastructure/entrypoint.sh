#!/bin/bash
set -e

# Re-sync data from S3 when DATA_VERSION changes, or when no data exists yet.
# Bumping DATA_VERSION on the App Runner service triggers a redeploy, which
# starts a fresh container — this check then pulls the new data.
MARKER=/app/data/.version
CURRENT="${DATA_VERSION:-v0}"
EXISTING=$(cat "$MARKER" 2>/dev/null || echo "")

if [ ! -d /app/data/base ] || [ "$CURRENT" != "$EXISTING" ]; then
  echo "Syncing data from s3://${S3_DATA_BUCKET}/ (current=$CURRENT, existing=${EXISTING:-<none>})"
  aws s3 sync "s3://${S3_DATA_BUCKET}/" /app/data/ \
    --exclude "scenarios/*" \
    --no-progress
  echo "$CURRENT" > "$MARKER"
  echo "Data sync complete."
else
  echo "Data version $CURRENT already present, skipping sync."
fi

exec node api/local-server.js
