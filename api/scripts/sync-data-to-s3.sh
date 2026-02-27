#!/usr/bin/env bash
# Sync data/ to S3 (replaces bucket contents entirely).
# Usage:
#   ./api/scripts/sync-data-to-s3.sh
#   ./api/scripts/sync-data-to-s3.sh --profile AWSAdministratorAccess-600627346413

set -euo pipefail

BUCKET="behovskartan-data-dev"
# Data directory is at repo root
DATA_DIR="$(cd "$(dirname "$0")/../.." && pwd)/data"
AWS_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --profile) AWS_ARGS+=(--profile "$2"); shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ ! -d "$DATA_DIR" ]]; then
  echo "Error: $DATA_DIR does not exist"
  exit 1
fi

echo "Emptying s3://$BUCKET/ ..."
aws s3 rm "s3://$BUCKET/" --recursive --quiet "${AWS_ARGS[@]}"

echo "Uploading $DATA_DIR → s3://$BUCKET/ ..."
aws s3 sync "$DATA_DIR" "s3://$BUCKET/" "${AWS_ARGS[@]}"

FILE_COUNT=$(aws s3 ls "s3://$BUCKET/" --recursive "${AWS_ARGS[@]}" | wc -l)
TOTAL_SIZE=$(aws s3 ls "s3://$BUCKET/" --recursive --summarize "${AWS_ARGS[@]}" | tail -1)
echo "Done. $FILE_COUNT files, $TOTAL_SIZE"
