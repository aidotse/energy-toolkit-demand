#!/usr/bin/env bash
# Promote data from the staging bucket to the production bucket.
#
# Usage:
#   ./api/scripts/promote-data.sh [--yes] [--profile <aws-profile>]
#
#   --yes             skip confirmation prompt (for automation)
#   --profile <name>  AWS CLI profile
#
# This is a same-region server-side S3 copy, so it's fast regardless of your
# internet connection — expect ~1 minute for ~17 GB / ~100 objects.
#
# Both buckets have versioning enabled, so the --delete here turns old prod
# objects into noncurrent versions (recoverable for 30 days), not permanent
# deletes.
#
# After this completes, bump DATA_VERSION on the production App Runner service
# to force a container restart that picks up the new data:
#   aws apprunner update-service --service-arn <prod-arn> \
#     --source-configuration '{"ImageRepository":{"ImageConfiguration":{"RuntimeEnvironmentVariables":{"DATA_VERSION":"<new-value>"}}}}'

set -euo pipefail

SRC="behovskartan-data-staging"
DST="behovskartan-data-production"
AWS_ARGS=()
ASSUME_YES=0

while [[ $# -gt 0 ]]; do
  case $1 in
    --yes)     ASSUME_YES=1; shift ;;
    --profile) AWS_ARGS+=(--profile "$2"); shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

for b in "$SRC" "$DST"; do
  if ! aws s3api head-bucket --bucket "$b" "${AWS_ARGS[@]}" 2>/dev/null; then
    echo "Error: bucket s3://$b does not exist" >&2
    exit 1
  fi
done

SRC_SUMMARY=$(aws s3 ls "s3://$SRC/" --recursive --summarize "${AWS_ARGS[@]}" | tail -2)
DST_SUMMARY=$(aws s3 ls "s3://$DST/" --recursive --summarize "${AWS_ARGS[@]}" | tail -2)

cat <<EOF
================================================
Promote data: staging → production
================================================
Source:      s3://$SRC/
$SRC_SUMMARY

Destination: s3://$DST/
$DST_SUMMARY

Objects in production not present in staging will be DELETED
(recoverable for 30 days via bucket versioning).
================================================
EOF

if [[ "$ASSUME_YES" -ne 1 ]]; then
  read -r -p "Proceed with promotion? [y/N] " answer
  case "$answer" in
    y|Y|yes|YES) ;;
    *) echo "Aborted."; exit 1 ;;
  esac
fi

echo "Syncing..."
aws s3 sync "s3://$SRC/" "s3://$DST/" --delete "${AWS_ARGS[@]}"

echo ""
echo "Promotion complete."
echo "Next: bump DATA_VERSION on the production App Runner service to force reload."
