#!/bin/bash
#
# Behovskartan Infrastructure Setup
#
# This script creates the AWS resources needed for deployment:
# - ECR repository for API Docker images
# - S3 bucket for Explorer static files
# - CloudFront distribution for Explorer CDN
# - App Runner service for API
#
# Usage: ./setup.sh [dev|staging|production]
#
# Prerequisites:
# - AWS CLI configured with appropriate credentials
# - Sufficient IAM permissions to create resources
#

set -e

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION="eu-central-1"
PROJECT_NAME="behovskartan"

# Derived names
ECR_REPO="${PROJECT_NAME}-api"
S3_BUCKET="${PROJECT_NAME}-explorer-${ENVIRONMENT}"
APP_RUNNER_SERVICE="${PROJECT_NAME}-api-${ENVIRONMENT}"

echo "================================================"
echo "Behovskartan Infrastructure Setup"
echo "Environment: ${ENVIRONMENT}"
echo "Region: ${AWS_REGION}"
echo "================================================"
echo ""

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account: ${AWS_ACCOUNT_ID}"
echo ""

# 1. Create ECR Repository
echo "1. Creating ECR repository: ${ECR_REPO}"
aws ecr create-repository \
    --repository-name ${ECR_REPO} \
    --region ${AWS_REGION} \
    --image-scanning-configuration scanOnPush=true \
    2>/dev/null && echo "   ✅ Created" || echo "   ℹ️  Already exists"

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"
echo "   ECR URI: ${ECR_URI}"
echo ""

# 2. Create S3 Bucket for Explorer
echo "2. Creating S3 bucket: ${S3_BUCKET}"
aws s3 mb s3://${S3_BUCKET} --region ${AWS_REGION} 2>/dev/null \
    && echo "   ✅ Created" || echo "   ℹ️  Already exists"

# Configure bucket for static website
echo "   Configuring static website hosting..."
aws s3 website s3://${S3_BUCKET} \
    --index-document index.html \
    --error-document index.html

# Set bucket policy for public read (CloudFront will handle access)
echo "   Setting bucket policy..."
cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${S3_BUCKET}/*"
        }
    ]
}
EOF
aws s3api put-bucket-policy --bucket ${S3_BUCKET} --policy file:///tmp/bucket-policy.json
echo ""

# 3. Create CloudFront Distribution
echo "3. Creating CloudFront distribution for Explorer..."

# Check if distribution already exists
EXISTING_DIST=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[0].DomainName=='${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com'].Id" --output text 2>/dev/null || true)

if [ -n "$EXISTING_DIST" ] && [ "$EXISTING_DIST" != "None" ]; then
    echo "   ℹ️  Distribution already exists: ${EXISTING_DIST}"
    CLOUDFRONT_ID=$EXISTING_DIST
else
    cat > /tmp/cloudfront-config.json << EOF
{
    "CallerReference": "${S3_BUCKET}-$(date +%s)",
    "Comment": "Behovskartan Explorer - ${ENVIRONMENT}",
    "Enabled": true,
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-${S3_BUCKET}",
                "DomainName": "${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-${S3_BUCKET}",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"],
            "CachedMethods": {
                "Quantity": 2,
                "Items": ["GET", "HEAD"]
            }
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": { "Forward": "none" }
        },
        "MinTTL": 0,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000,
        "Compress": true
    },
    "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [
            {
                "ErrorCode": 404,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 300
            }
        ]
    },
    "PriceClass": "PriceClass_100"
}
EOF
    CLOUDFRONT_ID=$(aws cloudfront create-distribution \
        --distribution-config file:///tmp/cloudfront-config.json \
        --query 'Distribution.Id' --output text)
    echo "   ✅ Created: ${CLOUDFRONT_ID}"
fi

CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution --id ${CLOUDFRONT_ID} --query 'Distribution.DomainName' --output text)
echo "   CloudFront Domain: ${CLOUDFRONT_DOMAIN}"
echo ""

# 4. Create App Runner Service
echo "4. Creating App Runner service: ${APP_RUNNER_SERVICE}"

# First, we need to build and push an initial image
echo "   Note: You need to push an initial Docker image before App Runner can start."
echo "   Run the following after this script:"
echo ""
echo "   cd api"
echo "   aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_URI}"
echo "   docker build -t ${ECR_URI}:latest ."
echo "   docker push ${ECR_URI}:latest"
echo ""

# Check if App Runner service exists
EXISTING_SERVICE=$(aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='${APP_RUNNER_SERVICE}'].ServiceArn" --output text 2>/dev/null || true)

if [ -n "$EXISTING_SERVICE" ] && [ "$EXISTING_SERVICE" != "None" ]; then
    echo "   ℹ️  Service already exists: ${EXISTING_SERVICE}"
    APP_RUNNER_ARN=$EXISTING_SERVICE
else
    echo "   Creating App Runner service (will start after image is pushed)..."

    # Create IAM role for App Runner to access ECR
    ROLE_NAME="${PROJECT_NAME}-apprunner-ecr-access"

    # Create trust policy
    cat > /tmp/trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "build.apprunner.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

    aws iam create-role \
        --role-name ${ROLE_NAME} \
        --assume-role-policy-document file:///tmp/trust-policy.json \
        2>/dev/null || echo "   IAM role already exists"

    aws iam attach-role-policy \
        --role-name ${ROLE_NAME} \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess \
        2>/dev/null || true

    ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME}"

    # Wait for role to propagate
    sleep 10

    APP_RUNNER_ARN=$(aws apprunner create-service \
        --service-name "${APP_RUNNER_SERVICE}" \
        --source-configuration '{
            "AuthenticationConfiguration": {
                "AccessRoleArn": "'"${ROLE_ARN}"'"
            },
            "ImageRepository": {
                "ImageIdentifier": "'"${ECR_URI}:latest"'",
                "ImageRepositoryType": "ECR",
                "ImageConfiguration": {
                    "Port": "4010",
                    "RuntimeEnvironmentVariables": {
                        "NODE_ENV": "production",
                        "ALLOWED_ORIGINS": "https://'"${CLOUDFRONT_DOMAIN}"'"
                    }
                }
            },
            "AutoDeploymentsEnabled": false
        }' \
        --instance-configuration '{
            "Cpu": "1 vCPU",
            "Memory": "2 GB"
        }' \
        --health-check-configuration '{
            "Protocol": "HTTP",
            "Path": "/config",
            "Interval": 10,
            "Timeout": 5,
            "HealthyThreshold": 1,
            "UnhealthyThreshold": 5
        }' \
        --query 'Service.ServiceArn' --output text 2>/dev/null) || {
            echo "   ⚠️  App Runner service creation failed. Push an image first, then re-run."
            APP_RUNNER_ARN="(pending - push image first)"
        }

    echo "   ✅ Created: ${APP_RUNNER_ARN}"
fi

# Get App Runner URL
if [ "$APP_RUNNER_ARN" != "(pending - push image first)" ]; then
    APP_RUNNER_URL=$(aws apprunner describe-service --service-arn ${APP_RUNNER_ARN} --query 'Service.ServiceUrl' --output text 2>/dev/null || echo "(pending)")
    echo "   App Runner URL: https://${APP_RUNNER_URL}"
fi
echo ""

# 5. Summary
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
echo "GitHub Repository Secrets (Settings > Secrets > Actions):"
echo "  AWS_ACCESS_KEY_ID     = <your-access-key>"
echo "  AWS_SECRET_ACCESS_KEY = <your-secret-key>"
echo "  MAPBOX_TOKEN          = <your-mapbox-token>"
echo ""
echo "GitHub Environment Variables (Settings > Environments > ${ENVIRONMENT}):"
echo "  API_URL                   = https://${APP_RUNNER_URL:-<pending>}"
echo "  APP_RUNNER_SERVICE_ARN    = ${APP_RUNNER_ARN}"
echo "  S3_BUCKET_EXPLORER        = ${S3_BUCKET}"
echo "  CLOUDFRONT_DISTRIBUTION_ID = ${CLOUDFRONT_ID}"
echo "  CLOUDFRONT_DOMAIN         = ${CLOUDFRONT_DOMAIN}"
echo "  ALLOWED_ORIGINS           = https://${CLOUDFRONT_DOMAIN}"
echo ""
echo "Next steps:"
echo "  1. Push initial Docker image (see commands above)"
echo "  2. Configure GitHub secrets and environment variables"
echo "  3. Push to main branch to trigger deployment"
echo ""
