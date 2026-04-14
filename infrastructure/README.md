# Deployment Infrastructure

This directory contains scripts and documentation for deploying Energy Toolkit Demand to AWS.

## Architecture

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   S3 + CloudFront       │         │    AWS App Runner       │
│   (Static Frontend)     │ ──────► │    (API Container)      │
│                         │         │                         │
│   explorer/build/       │         │   Node.js + Express     │
│   - HTML/CSS/JS         │         │   + DuckDB + Parquet    │
└─────────────────────────┘         └─────────────────────────┘
```

## Components

| Component | Service | Cost (Dev) |
|-----------|---------|------------|
| API | AWS App Runner | ~$25/mo |
| Explorer | S3 + CloudFront | ~$1/mo |
| Container Registry | ECR | ~$0.15/mo |
| **Total** | | **~$26/mo** |

## Prerequisites

1. AWS CLI installed and configured
2. Docker installed locally
3. GitHub repository with Actions enabled

## Initial Setup

### 1. Run the setup script

```bash
cd infrastructure
./setup.sh dev  # or staging, production
```

This creates:
- ECR repository for Docker images
- S3 bucket for Explorer static files
- CloudFront distribution
- App Runner service

### 2. Push initial Docker image

```bash
cd api

# Login to ECR
aws ecr get-login-password --region eu-central-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.eu-central-1.amazonaws.com

# Build and push
docker build -t <account-id>.dkr.ecr.eu-central-1.amazonaws.com/${PROJECT_NAME:-energy-toolkit-demand}-api:latest .
docker push <account-id>.dkr.ecr.eu-central-1.amazonaws.com/${PROJECT_NAME:-energy-toolkit-demand}-api:latest
```

### 3. Configure GitHub

**Repository Secrets** (Settings > Secrets and variables > Actions):

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key with deployment permissions |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `MAPBOX_TOKEN` | Mapbox API token for maps |

**Environment Variables** (Settings > Environments > dev/staging/production):

| Variable | Example Value |
|----------|---------------|
| `API_URL` | `https://xxx.eu-central-1.awsapprunner.com` |
| `APP_RUNNER_SERVICE_ARN` | `arn:aws:apprunner:eu-central-1:...` |
| `S3_BUCKET_EXPLORER` | `${PROJECT_NAME:-energy-toolkit-demand}-explorer-dev` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `E1234567890ABC` |
| `CLOUDFRONT_DOMAIN` | `d1234567890.cloudfront.net` |
| `ALLOWED_ORIGINS` | `https://d1234567890.cloudfront.net` |

### 4. Deploy

Push to `main` branch to trigger automatic deployment:

```bash
git push origin main
```

Or manually trigger via GitHub Actions > Deploy > Run workflow.

## Manual Deployment

### API Only

```bash
cd api
docker build -t ${PROJECT_NAME:-energy-toolkit-demand}-api .
# Push to ECR and update App Runner
```

### Explorer Only

```bash
cd explorer
VITE_API_BASE_URL=https://xxx.awsapprunner.com npm run build
aws s3 sync build/ s3://${PROJECT_NAME:-energy-toolkit-demand}-explorer-dev/ --delete
aws cloudfront create-invalidation --distribution-id E1234 --paths "/*"
```

## Monitoring

- **App Runner Console**: View logs, metrics, and deployment status
- **CloudWatch**: API logs are automatically sent here
- **CloudFront**: View CDN metrics and cache hit rates

## Troubleshooting

### App Runner deployment fails

1. Check ECR image exists: `aws ecr describe-images --repository-name ${PROJECT_NAME:-energy-toolkit-demand}-api`
2. Check App Runner logs in CloudWatch
3. Verify IAM role has ECR access permissions

### Explorer shows old content

1. Invalidate CloudFront cache: `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"`
2. Check S3 bucket contents: `aws s3 ls s3://${PROJECT_NAME:-energy-toolkit-demand}-explorer-dev/`

### API returns CORS errors

1. Verify `ALLOWED_ORIGINS` environment variable in App Runner
2. Check that the origin matches exactly (including https://)

## Cost Optimization

For development/testing:
- App Runner can be paused when not in use
- Use `PriceClass_100` for CloudFront (cheaper, US/EU only)

For production:
- Consider reserved capacity if traffic is predictable
- Enable CloudFront caching for API static endpoints
