# Deployment

## Overview

The project deploys to AWS using GitHub Actions with OIDC authentication (no stored AWS keys).

| Component | Service | URL |
|-----------|---------|-----|
| API | App Runner | `https://vwf7sd26hy.eu-central-1.awsapprunner.com` |
| Explorer | S3 + CloudFront | `https://dk5nqxb38wg76.cloudfront.net` |

## How to Deploy

### Automatic (push to `production`)

```bash
git checkout production
git merge main
git push origin production
```

This triggers the full pipeline: build API image → deploy to App Runner → build Explorer → deploy to S3 → invalidate CloudFront cache.

### Manual (workflow dispatch)

Go to **Actions → Deploy → Run workflow** in GitHub, or:

```bash
gh workflow run deploy.yml --ref production -f environment=dev
```

## Pipeline

The workflow (`.github/workflows/deploy.yml`) runs three sequential jobs:

1. **build-api** — Builds the API Docker image and pushes to ECR
2. **deploy-api** — Updates App Runner with the new image, waits for it to become healthy
3. **deploy-explorer** — Builds SvelteKit static site, syncs to S3, invalidates CloudFront

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Development integration branch |
| `feature/*` | Feature branches, merged to `main` via PR |
| `production` | Deployment trigger — merge `main` here when ready to ship |

## AWS Infrastructure

All resources are in `eu-central-1` under account `600627346413`.

| Resource | Identifier |
|----------|------------|
| ECR repository | `behovskartan-api` |
| App Runner service | `behovskartan-api-dev` |
| S3 bucket | `behovskartan-explorer-dev` |
| CloudFront distribution | `E21L0X9B8QHTWX` |
| OIDC provider | `token.actions.githubusercontent.com` |
| Deploy role | `behovskartan-github-deploy` |

### Authentication

GitHub Actions authenticates via **OIDC federation** — no AWS access keys are stored as secrets. The IAM role `behovskartan-github-deploy` has a trust policy scoped to `repo:aidotse/behovskartan:*` and permissions for ECR, App Runner, S3, and CloudFront.

## GitHub Settings

### Environment: `dev`

Variables set via `gh variable set --env dev`:

| Variable | Description |
|----------|-------------|
| `API_URL` | App Runner service URL |
| `APP_RUNNER_SERVICE_ARN` | App Runner service ARN |
| `S3_BUCKET_EXPLORER` | S3 bucket for Explorer static files |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID |
| `CLOUDFRONT_DOMAIN` | CloudFront domain name |
| `ALLOWED_ORIGINS` | CORS allowed origins for the API |
| `AWS_DEPLOY_ROLE_ARN` | IAM role ARN for OIDC auth |
| `MAPBOX_STYLE_LIGHT` | Mapbox light theme style URL |

### Repository-level

| Type | Name | Description |
|------|------|-------------|
| Variable | `AWS_DEPLOY_ROLE_ARN` | Also set at repo level for the `build-api` job (no environment) |
| Secret | `MAPBOX_TOKEN` | Mapbox access token, passed as `VITE_MAPBOX_TOKEN` at build time |

## Environment Variables (Explorer)

The Explorer reads these at build time via Vite's `import.meta.env`:

| Variable | Local (`.env`) | CI |
|----------|---------------|----|
| `VITE_API_BASE_URL` | `http://localhost:4010` | From `vars.API_URL` |
| `VITE_MAPBOX_TOKEN` | Token value | From `secrets.MAPBOX_TOKEN` |
| `VITE_MAPBOX_STYLE_LIGHT` | Style URL | From `vars.MAPBOX_STYLE_LIGHT` |

## Troubleshooting

**Workflow fails at "Configure AWS credentials"**
- Check that the OIDC provider exists: `aws iam list-open-id-connect-providers`
- Check the role trust policy allows the repo: `aws iam get-role --role-name behovskartan-github-deploy`

**App Runner deployment hangs**
- The `wait service-running` step has a fallback (`|| echo`), so it won't block forever
- Check App Runner console for service events

**Explorer shows broken map**
- Verify `MAPBOX_TOKEN` secret is set: `gh secret list --repo aidotse/behovskartan`
- Locally, check `explorer/.env` has `VITE_MAPBOX_TOKEN`

**Need to redeploy only Explorer (skip API)**
- Use workflow dispatch, or push a commit that only touches `explorer/`
- Currently both always deploy; path filtering can be added later if needed
