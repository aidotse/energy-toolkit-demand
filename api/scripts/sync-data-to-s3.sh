#!/usr/bin/env bash
# Sync the local data/ directory to an environment's S3 data bucket.
#
# Usage:
#   ./api/scripts/sync-data-to-s3.sh <env> [--full] [--profile <aws-profile>]
#
#   <env>             staging | production
#   --full            use mtime comparison instead of --size-only
#   --profile <name>  AWS CLI profile to use (default: AWS_PROFILE env var)
#
# By default, --size-only is used so that regenerates which rewrite files with
# identical content but new mtimes don't trigger unnecessary re-uploads. Pass
# --full if you suspect a content change with no size change.
#
# Versioning is enabled on the data buckets; a mistaken sync can be recovered
# from noncurrent versions for 30 days.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <staging|production> [--full] [--profile <aws-profile>]" >&2
  exit 1
fi

ENV="$1"; shift
case "$ENV" in
  staging|production) ;;
  *) echo "Error: env must be 'staging' or 'production' (got '$ENV')" >&2; exit 1 ;;
esac

BUCKET="behovskartan-data-$ENV"
DATA_DIR="$(cd "$(dirname "$0")/../.." && pwd)/data"
AWS_ARGS=()
SYNC_ARGS=(--size-only)

while [[ $# -gt 0 ]]; do
  case $1 in
    --full)    SYNC_ARGS=(); shift ;;
    --profile) AWS_ARGS+=(--profile "$2"); shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ ! -d "$DATA_DIR" ]]; then
  echo "Error: $DATA_DIR does not exist" >&2
  exit 1
fi

if ! aws s3api head-bucket --bucket "$BUCKET" "${AWS_ARGS[@]}" 2>/dev/null; then
  echo "Error: bucket s3://$BUCKET does not exist. Run infrastructure/setup.sh $ENV first." >&2
  exit 1
fi

echo "Syncing $DATA_DIR → s3://$BUCKET/ (${SYNC_ARGS[*]:-mtime compare})"
aws s3 sync "$DATA_DIR" "s3://$BUCKET/" "${SYNC_ARGS[@]}" "${AWS_ARGS[@]}"

FILE_COUNT=$(aws s3 ls "s3://$BUCKET/" --recursive "${AWS_ARGS[@]}" | wc -l)
TOTAL_SIZE=$(aws s3 ls "s3://$BUCKET/" --recursive --summarize "${AWS_ARGS[@]}" | tail -1)
echo "Done. $FILE_COUNT files, $TOTAL_SIZE"
