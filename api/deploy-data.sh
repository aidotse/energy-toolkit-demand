#!/usr/bin/env bash
# deploy-data.sh
# Usage: ./deploy-data.sh [dev|staging|prod] [aws_profile]
# Example: ./deploy-data.sh dev AWSAdministratorAccess-600627346413

set -euo pipefail

############# CONFIG #############
declare -r ENVIRONMENT="${1:-dev}"               # default to dev if not provided
declare -r PROFILE="${2:-default}"               # fallback AWS CLI profile

case "${ENVIRONMENT}" in
  dev)      BUCKET="behovskartan-data-dev"      ;;
  staging)  BUCKET="behovskartan-data-staging"  ;;
  prod)     BUCKET="behovskartan-data-prod"     ;;
  *) echo "Invalid environment: ${ENVIRONMENT}. Use dev|staging|prod." >&2; exit 1 ;;
esac
###################################

SRC_DIR="./data"

echo "📁 Clearing existing S3 data in ${BUCKET} (${ENVIRONMENT})..."
aws s3 rm "s3://${BUCKET}" --recursive --profile "${PROFILE}"

echo "🚀 Syncing ${SRC_DIR} → s3://${BUCKET} ..."
aws s3 sync "${SRC_DIR}" "s3://${BUCKET}" \
  --profile "${PROFILE}" \
  --delete \
  --exclude ".gitignore"

echo "✅ Upload complete for ${ENVIRONMENT}."
