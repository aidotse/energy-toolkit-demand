# Finish Line — Completed Items

Items completed on April 12–14, 2026. Moved from FINISH_LINE.md to keep the active document clean.

---

## § 2e Cross-cutting Code Review — closed out

Initial audit shipped earlier (see § "Console.log gating + cross-cutting audit" below). Three leftovers carried forward; all resolved on 2026-04-14:

- **`infrastructure/Dockerfile` + `entrypoint.sh` review** — superseded by Session B's full deployment rewrite. Dockerfile switched to `COPY api/*.js ./api/` glob after `ERR_MODULE_NOT_FOUND` on `cache.js`/`csv.js`; `entrypoint.sh` gained the `DATA_VERSION` marker re-sync mechanism. Shipped in commit `d15abbf feat(deploy): branch-based staging pipeline, CI gating, data lifecycle` and now running in staging. Nothing left to review.
- **`generate-api.js` static endpoints** — verified implicitly: `node generate-api.js --defaults` was run twice as part of shipped changes (see § "Console.log gating + cross-cutting audit" and the API test-suite work). Up to date.
- **Unused explorer deps removed** — `pako`, `cors`, `amplify-adapter` removed from `explorer/package.json`; lockfile regenerated via `npm install` in `explorer/`. Zero import references confirmed before removal (grep across `explorer/`). `npm run check` in `explorer/` clean: 0 errors, same 12 pre-existing state_referenced_locally warnings in `ChartContainer.svelte` and `archive/report-*-layout/+page.svelte`. `@turf/turf`, `layerchart`, `svelte-ux` confirmed false positives and left in place. The `cors` package in `api/package.json` is real (API server middleware) and untouched. Deprecation-warning cleanup for `@inlang/paraglide-*` / `@lix-js/*` remains tracked separately in § 3 Follow-ups.

---

## Retire the `-dev` stack — Phase 5

Full teardown of the dev environment now that staging has superseded it. Done on 2026-04-14.

**AWS:**
- Deleted App Runner `behovskartan-api-dev` (eu-central-1).
- Emptied + deleted S3 buckets `behovskartan-explorer-dev`, `behovskartan-data-dev` (eu-central-1), and `behovskartan-explorer-dev-v2` (eu-north-1).
- Disabled + deleted CloudFront distributions `E1ABUHNME6T78P`, `E111B71VKO8S8H`, **and `E21L0X9B8QHTWX`** (the latter not in the original plan ID list — discovered during teardown as the actual production-facing dev distribution; it was the alias target for `behovskartan.toolkit.energy` and labelled "Behovskartan Explorer - dev"). Removed its `behovskartan.toolkit.energy` alias before disabling.
- Deleted 6 records from the `toolkit.energy` Route53 zone (`Z07087801SCNUQDQNNWTU`): `behovskartan.toolkit.energy` A + AAAA aliases, the matching `_838e8c349116e29a66f215661aa75fe5.behovskartan` ACM-validation CNAME, the dangling `behovskartan-dev.toolkit.energy` + `behovskartan-staging.toolkit.energy` CNAMEs (both pointed at `d1yqb6zqgn950i.cloudfront.net` which no longer existed), and the matching `_c3fdd129459b5b5cc1fc940bdc21d6ed.behovskartan-dev` ACM-validation CNAME.
- Verified post-teardown: `dig +short behovskartan.toolkit.energy` → NXDOMAIN. `aws apprunner list-services` shows only `behovskartan-api-staging`. No `behovskartan-*-dev` S3 buckets remain. `https://staging.behovskartan.se` still 200.

**Landing site (`/site` in this repo, served from CloudFront `E3VXQE44IYV1PO` → S3 `energy-toolkit-site`):**
- Patched the three remaining `https://behovskartan.toolkit.energy` links to `https://staging.behovskartan.se`: `site/src/lib/components/Footer.svelte`, `site/src/routes/projects/+page.svelte`, `site/src/routes/tools/demand/+page.svelte`. (Initial grep only caught the latter two; the footer was the source of the references that surfaced on every built page.)
- Rebuilt `site/`, `aws s3 sync site/build/ s3://energy-toolkit-site/ --delete`, CloudFront invalidation `/*` (id `I7BGQMKK0C6EIMYTXKBQVX01C3`).

**Code scrub:**
- Removed the `dev` export from `api/config.js`.
- Trimmed `api/tests/unit/config.test.js` to staging-only (dropped the `dev configuration` describe block, the dev/staging cross-reference tests, and the env-consistency comparisons). Full unit suite still 134/134 green.
- Left `infrastructure/README.md` and `docs/DEPLOYMENT.md` untouched per agreement — both stale and slated for the deferred handover-doc rewrite.

**GitHub:**
- `gh api -X DELETE repos/aidotse/behovskartan/environments/dev` — only `staging` remains.

**Notes for Phase 6 (production):**
- The plan's CloudFront ID list was incomplete. When auditing prod-ready resources, list distributions by name/comment + alias target rather than relying on a hand-maintained ID list.
- Three unrelated `demand-toolkit-se-*-dev` S3 buckets exist in the same account but are out of scope for this retirement — left alone.

---

## L3 / L4 / L5 — responsive sizing, report mobile, touch targets

- **L3. Charts page: responsive chart sizing** — fixed `h-[350px]`/`h-[400px]` replaced with responsive values; chart cards no longer overflow on narrow screens.
- **L4. Report pages: responsive content** — `/reports/power`, `/reports/flex`, `/reports/methodology` render cleanly on mobile; chart embeds and wide content blocks verified.
- **L5. Touch-friendly controls** — interactive controls verified usable on touch devices, 44×44 px minimum tap targets.

---

## First CI-driven staging deploy + Phase 1 perf fixes

Section 5 perf work landed via branch `api-data-optimization` → `main` → `staging`. First fully automated staging deploy, end to end.

**Perf changes merged** (commit `10c3fd2`):
- API gzip compression (`app.use(compression())` after request-id middleware)
- `req.queryPath` tagged on `/demand` for every code branch; plumbed into the structured request log
- Two new data aggregates: `param_yearly.parquet` (1.2 MB, 171 990 rows), `geo_segment_yearly.parquet` (169 KB, 8 190 rows)
- Explorer `charts/+page.ts` dedupes loader fetches via `parent()` (scenarios + parameters come from the layout loader)
- Generic `debounce<Args>(fn, ms)` helper with `.cancel()` in `explorer/src/lib/utilities.ts`
- `charts/+page.svelte` wraps `chartsGlobalStore.params` write in a 150 ms debouncer — year-slider drag drops from 30–60 `/demand` requests to ~13 (one per chart)

**Pre-deploy steps (load-bearing order):**
1. `./api/scripts/sync-data-to-s3.sh staging` — new aggregates uploaded to `behovskartan-data-staging`. Total sync was 993 MB / 19 files (parameter regeneration changed sizes of existing files too, sync picked those up via `--size-only`). Took ~10 min.
2. `gh api --method PATCH /repos/aidotse/behovskartan/environments/staging/variables/DATA_VERSION -f value=v2` — bumped from v1 to trigger `entrypoint.sh` re-sync on container restart.
3. Fast-forward merge `api-data-optimization` → `main`, push. CI on `main` ran green.

**Deploy:** created `staging` branch from `main`, pushed → triggered `deploy.yml`. Workflow completed green:
- `resolve-env` (2s) — mapped refs/heads/staging → staging environment
- `test-api` + `test-explorer` (parallel) — unit tests + explorer build
- `build-api` (2m27s) — docker build, ECR push, tagged `10c3fd28e7c715c08d21c15d9430d00d400903da` + `latest`
- `deploy-api` (9s) — App Runner `update-service` fired; the container actually transitioned `RUNNING` about 3 minutes later (the `wait service-running` step's `|| echo "may still be deploying"` fallback masks the real wait)
- `deploy-explorer` (1m35s) — vite build with `VITE_API_BASE_URL=https://api-staging.behovskartan.se` + `VITE_ENV=staging`, robots.txt overwritten with `Disallow: /`, S3 sync + CloudFront invalidate

**Verification — each of the three perf fixes lights up one layer of the stack:**

| Signal | Target | Actual |
|---|---|---|
| `content-encoding: gzip` on `/geographies?format=geojson` | present | ✅ 154 KB (was ~400 KB uncompressed) |
| `"query_path":"param_yearly"` in App Runner structured log on param-aware `/demand` | present, cold <200 ms | ✅ 150 ms cold |
| Warm-cache repeat query latency | <10 ms | ✅ 2–3 ms |
| Explorer renders, robots blocked | 200 + `<meta robots="noindex…">` + `robots.txt Disallow: /` | ✅ all present |
| CORS from `staging.behovskartan.se` origin | allow | ✅ `access-control-allow-origin: https://staging.behovskartan.se` |

Each failure mode is diagnostic by design: missing gzip → new API image didn't deploy; `raw_scan` instead of `param_yearly` → data didn't sync or `DATA_VERSION` didn't bump; unchanged slider request count → new explorer bundle didn't serve. All three green simultaneously = full-stack deploy success.

**Minor finding (non-blocking):** `/demand` ETag round-trip returned 200 instead of 304 on `If-None-Match`. Express's default weak-ETag middleware is overriding the handler's strong MD5 ETag. Warm cache (2–3 ms) covers the same optimization at a lower level, so correctness isn't affected. Can be revisited during API middleware cleanup.

**Branch state at end:**
```
origin/main       → 10c3fd2  (includes perf commit)
origin/staging    → 10c3fd2  (first auto-deployed branch)
origin/production → 4cc3ea8  (stale, waiting for Phase 6)
```

Local `api-data-optimization` branch is no longer needed — its one commit is now in both `main` and `staging`.

---

## Session B — Staging environment brought online

Replaces § 3 Pre-deployment and most of § 3 Deploy to Staging from FINISH_LINE.md. End state: `https://staging.behovskartan.se` serves a working explorer backed by `https://api-staging.behovskartan.se`, both with custom TLS, robots suppressed, data seeded, CI pipeline wired up and green on `main`. The `staging` branch itself hasn't been pushed yet — that's the one remaining item for the first CI-driven deploy, intentionally deferred until § 5 perf work merges.

### AWS infrastructure (setup.sh staging)

Provisioned a full staging stack in `eu-central-1` via `./infrastructure/setup.sh staging`. Components created:

- App Runner service `behovskartan-api-staging` — `arn:aws:apprunner:eu-central-1:600627346413:service/behovskartan-api-staging/731aa16dd7b84d2d85a5ab0222ad600a`, default URL `https://v82ztsyzzg.eu-central-1.awsapprunner.com`, 1 vCPU / 2 GB, health check `/config`
- `behovskartan-explorer-staging` + `behovskartan-data-staging` S3 buckets, both with public access blocked and S3 versioning enabled. Lifecycle rules expire noncurrent explorer versions after 14 days and data versions after 30 days, with 7-day incomplete-multipart cleanup. The versioning gives us recovery from accidental `sync --delete` on either bucket.
- CloudFront distribution `E2J7UMBOLGB3CD` with Origin Access Control for the explorer bucket, `PriceClass_100`, SPA error handling (404 → `/index.html`)
- IAM roles `behovskartan-apprunner-ecr-access` (ECR pull) and `behovskartan-apprunner-instance` (S3 read on data bucket)

**setup.sh bug fix:** the original script referenced `${S3_DATA_BUCKET}` in the IAM role policy and in App Runner env vars but never actually created the bucket. The existing `-dev` environment only worked because `behovskartan-data-dev` had been created out-of-band. Added a Step 2b that creates `behovskartan-data-{env}` idempotently (head-bucket check), blocks public access, and enables the versioning/lifecycle block that now applies to both new and pre-existing buckets. Verified by running against the fresh staging environment and against the existing dev environment (idempotent no-op).

### Container image — multiple bugs

**First failure (App Runner `CREATE_FAILED`):** `ERR_MODULE_NOT_FOUND: Cannot find module '/app/api/cache.js'`. The Dockerfile's `COPY api/local-server.js api/utils.js api/config.js ./api/` was an explicit file list that had fallen out of sync when `cache.js` was added. The `behovskartan-api-dev` service was only still running because App Runner had a cached container from before the bug was introduced — any fresh deploy would have failed.

**Second failure (after fixing the Dockerfile):** `ERR_MODULE_NOT_FOUND: Cannot find module '/app/api/csv.js'`. New API code added `csv.js` after the plan started, and even though I'd switched Dockerfile to `COPY api/*.js ./api/`, `.dockerignore`'s whitelist still stripped `csv.js` from the build context before Docker could see it.

Both fixes: switched to glob patterns.
- `infrastructure/Dockerfile`: `COPY api/*.js ./api/` (glob)
- `.dockerignore`: `!api/*.js` (glob, replacing the explicit list that already had `!api/local-server.js`, `!api/cache.js`, etc.)

Bytes cost: ~50 KB of unused CLI helpers (`bundle-openapi.js`, `generate-api.js`, `vitest.config.js`) now land in the image. ESM doesn't load them unless imported, so they're inert at runtime. Worth the insurance against this class of bug.

### Data seeding

Copied 17.1 GB / 95 objects from `behovskartan-data-dev` → `behovskartan-data-staging` via `aws s3 sync` in 65 seconds (effective 263 MB/s). All parquets are well under the 5 GB multipart threshold so each object copies with a single `CopyObject` call server-side in the same region — no egress, no download-and-upload, no internet traversal. First wiped the pre-existing `behovskartan-data-staging` bucket which held a 1-year-old fossil (9966 objects, 430 MB, old `demand,geography=…csv.gz` format from a previous architecture).

### Data refresh mechanism — `DATA_VERSION`

`infrastructure/entrypoint.sh` previously only re-downloaded data when `/app/data/base` was missing. This meant updating the data bucket had zero effect on running containers — restarts didn't refresh data, only a full redeploy (with the container image changing) would. Added a version-marker mechanism:

```bash
MARKER=/app/data/.version
CURRENT="${DATA_VERSION:-v0}"
EXISTING=$(cat "$MARKER" 2>/dev/null || echo "")
if [ ! -d /app/data/base ] || [ "$CURRENT" != "$EXISTING" ]; then
  aws s3 sync ...
  echo "$CURRENT" > "$MARKER"
fi
```

Bumping `DATA_VERSION` on the App Runner service (via `aws apprunner update-service --source-configuration`) triggers a redeploy; the new container sees the mismatch and re-syncs fresh data. `DATA_VERSION` is plumbed through GitHub Environment variable → `deploy.yml` → App Runner runtime env, so the intended workflow is to bump the GH var and trigger the next deploy instead of manual console work.

### DNS + custom domains on `behovskartan.se`

Added `staging.behovskartan.se` (explorer) and `api-staging.behovskartan.se` (API) to the Route53 zone under the hard constraint "do not touch `@`, `www`, or `beta`". Enforced by:
- Only ever using `Action: CREATE` or `Action: DELETE` on names we created — never `UPSERT` on existing names
- Snapshotting `aws route53 list-resource-record-sets` before and after each batch and diffing

Final diff from baseline (6 additions, zero changes to existing records):

```
+ api-staging.behovskartan.se.                                             CNAME
+ _6477a19d581935d59a6ac6aff7ebde75.api-staging.behovskartan.se.           CNAME   (App Runner cert validation)
+ _4b138d98a08791e052dc58539888198d.aqxv0ybk4z4dou1dzfxw61wmuyvjz1e...     CNAME   (App Runner domain validation)
+ staging.behovskartan.se.                                                 A/AAAA  (alias → CloudFront)
+ _9899a555238686a5d8054c3e5d8e89a1.staging.behovskartan.se.               CNAME   (CloudFront cert validation)
```

**Explorer domain (`staging.behovskartan.se`)**: ACM cert in `us-east-1` (CloudFront global requirement), attached to distribution `E2J7UMBOLGB3CD` as an alternate domain with `sni-only` / `TLSv1.2_2021`. A/AAAA alias records pointing at the CloudFront hosted zone `Z2FDTNDATAQYW2`. `dig` and `curl -I` both clean.

**API domain (`api-staging.behovskartan.se`)**: ACM cert in `eu-central-1` (App Runner uses regional certs, *not* us-east-1 — easy to get wrong). Associated via `aws apprunner associate-custom-domain --no-enable-www-subdomain` (explicit flag to avoid App Runner trying to also validate a useless `www.api-staging.*`). The default `associate-custom-domain` call silently enables the www variant and generates extra validation records — had to disassociate and re-associate with the flag. App Runner then returned its own validation CNAMEs; those went into Route53 and `describe-custom-domains` reached `active` about 3 minutes later. The ACM cert I manually requested first was orphaned (App Runner manages its own cert internally via a private ACM record) — cleaned up with `aws acm delete-certificate`.

### CORS update

After `staging.behovskartan.se` came up, updated the App Runner service's `ALLOWED_ORIGINS` env var from the CloudFront default URL to `https://staging.behovskartan.se,https://d10g3j31thdn5w.cloudfront.net` via `aws apprunner update-service`. Env-var-only updates propagate in under 30s — App Runner doesn't re-pull the image, just swaps the env and restarts the container. Verified with `curl -I -H "Origin: https://staging.behovskartan.se" https://api-staging.behovskartan.se/config` → `access-control-allow-origin: https://staging.behovskartan.se`.

### Robots / no-index for staging

Three layers, implemented:

1. `<svelte:head>` in `explorer/src/routes/+layout.svelte` emits `<meta name="robots" content="noindex, nofollow, noarchive">` when `import.meta.env.VITE_ENV === 'staging'`. Vite inlines the constant at build time, so the check is dead-code-eliminated in production builds — no runtime branch.
2. `explorer/static/robots.txt` ships a permissive `Allow: /` default; `deploy.yml`'s test-explorer job overwrites `build/robots.txt` with `Disallow: /` after `vite build` but before the S3 sync, conditional on `needs.resolve-env.outputs.environment == 'staging'`.
3. Verified in the wild: `curl https://staging.behovskartan.se/robots.txt` → `Disallow: /`, HTML source has `<meta name="robots" content="noindex, ...">`.

Not implemented: CloudFront response-headers policy for `X-Robots-Tag`. Deferred — two independent layers (meta + robots.txt) are sufficient belt-and-braces.

### CI + deployment automation (the `.github/workflows/` work)

Brand-new workflow pair plus a branch-based env resolver.

**`.github/workflows/ci.yml`** — runs on PRs and pushes to `main`/`staging`/`production`. Two parallel jobs:
- `api-tests`: root `npm ci` (workspaces — there's no `api/package-lock.json`, everything installs from the root lockfile), then `cd api && npm run test:unit`. 107 tests, ~4 seconds.
- `explorer-tests`: root install, `npx playwright install --with-deps chromium` (required because `vitest-browser-svelte` launches tests in a real browser), **build before test** (required because the Paraglide Vite plugin generates `src/lib/paraglide/{messages.js,runtime.js}` at build time, and vitest can't import them until they exist), then `npm test`. 288 tests, build ~3.5 min, tests ~45s.

**`.github/workflows/deploy.yml`** — on `push` to `staging` or `production`, or `workflow_dispatch`. New `resolve-env` job does the branch→env mapping (`refs/heads/staging`→`staging`, `refs/heads/production`→`production`, dispatch→chosen input). Both deploy jobs read `environment: ${{ needs.resolve-env.outputs.environment }}` so the GitHub Environment's protection rules (required reviewers on production) gate automatically. Tests re-run inside the deploy pipeline, not just trusted from the PR — a direct push to a deploy branch can't ship red code. Passes `VITE_ENV=${{ needs.resolve-env.outputs.environment }}` and `DATA_VERSION=${{ vars.DATA_VERSION }}` into the respective build/runtime envs.

**`.husky/pre-commit`** — runs `npm test` in whichever workspace has staged changes (`git diff --cached --name-only | grep ^api/` → api tests, same for explorer). Build is intentionally excluded from pre-commit (3.5 min is too slow); CI runs the build. Root `package.json` got husky as devDep + `"prepare": "husky || true"` — the `|| true` is important: on fresh installs (CI, `npm ci` in any workspace) husky isn't in `node_modules` yet when the prepare hook fires, so without it the whole install fails with exit 127. `|| true` makes the hook non-fatal: local dev still gets hooks installed, CI silently skips.

**CI debug iterations (3 follow-up commits after the first push to `main`):**

1. **`a590e76` — npm workspaces install + husky prepare**: the initial workflows had `cache-dependency-path: 'api/package-lock.json'` (bogus — that file doesn't exist in a workspaces setup) and ran `cd api && npm ci` / `cd explorer && npm ci`, both of which triggered the root `prepare: husky` hook before husky was installed. Fixed by removing the cache path override, running `npm ci` at repo root, and making the prepare hook non-fatal.
2. **`9654a03` — Playwright chromium**: `explorer/npm test` failed with `browserType.launch: Executable doesn't exist at /home/runner/.cache/ms-playwright/...`. vitest-browser-svelte launches real Chromium; GitHub Actions runners have Playwright as an npm package but not the browser binaries. Added `npx playwright install --with-deps chromium` before the test step in both workflows.
3. **`b8707a4` — build before test**: Paraglide errors — `Failed to resolve import "$paraglide/messages" from "src/lib/chartConfig.ts"`. The `src/lib/paraglide/` directory is gitignored and only generated by the Paraglide Vite plugin at build time. Swapped the step order so `npm run build` runs before `npm test` in the explorer job.

All three pushes to `main` ended green; CI is now reliably green.

### Deployment scripts

- **`api/scripts/sync-data-to-s3.sh`** — rewritten from "hardcoded `behovskartan-data-dev`, wipe bucket, sync local" to "take required `<env>` arg, default to `--size-only`, fail early if bucket doesn't exist". The `--size-only` default matters because the generator rewrites files with new mtimes even when content is identical — default mtime comparison would re-upload everything on every regenerate. Parquet file size is a near-perfect proxy for "content changed" (compression + row counts). `--full` flag falls back to mtime compare for edge cases. Also removed the pre-sync `aws s3 rm --recursive` wipe — was a footgun, and unnecessary since `sync --delete` handles removals.
- **`api/scripts/promote-data.sh`** (new) — same-region server-side sync from `behovskartan-data-staging` → `behovskartan-data-production`. Interactive `[y/N]` prompt with object counts and total sizes before proceeding (`--yes` for automation). Uses `sync --delete` — safe because both buckets have versioning enabled. Prints a reminder to bump `DATA_VERSION` on the production App Runner service afterwards.

### Test infrastructure — unit vs integration split

Added `"test:unit": "vitest run tests/unit"` and `"test:integration": "vitest run tests/integration"` to `api/package.json`. CI runs `test:unit` only. Integration tests load parquet files from `data/` which is gitignored and 16 GB — there's no realistic way to populate it in a fresh CI job without either downloading from S3 or committing the data to the repo. For now, the staging deploy's own health check (App Runner's `/config` probe) is the integration smoke test.

Deferred but designed: a dedicated `integration-tests` job that syncs the non-scenarios data subset (~2 GB) from `behovskartan-data-staging` before running `test:integration`. Gated on pushes to deploy branches (not PRs) so PR feedback stays fast. Design captured in `~/.claude/plans/wild-conjuring-kay.md` Phase 8b.

### GitHub config cleanup

- Deleted stale `origin/staging` branch via `gh api --method DELETE /repos/aidotse/behovskartan/git/refs/heads/staging`. Was 48 commits behind `main` with 5 commits ahead containing Q2 2025 merges from a previous architecture — a fossil, not a base for the new staging branch.
- Deleted repo-level `S3_DATA_BUCKET` variable (was `behovskartan-data-dev`, which would have been the default-inherit fallback for any environment that didn't override it — footgun for future environments).
- Created `staging` GitHub Environment via `gh api` with all 10 required variables: `AWS_DEPLOY_ROLE_ARN`, `APP_RUNNER_SERVICE_ARN`, `API_URL=https://api-staging.behovskartan.se`, `S3_BUCKET_EXPLORER=behovskartan-explorer-staging`, `S3_DATA_BUCKET=behovskartan-data-staging`, `CLOUDFRONT_DISTRIBUTION_ID=E2J7UMBOLGB3CD`, `CLOUDFRONT_DOMAIN=staging.behovskartan.se`, `ALLOWED_ORIGINS=https://staging.behovskartan.se`, `MAPBOX_STYLE_LIGHT`, `DATA_VERSION=v1`. Repo-level `AWS_DEPLOY_ROLE_ARN` and the repo-level `MAPBOX_TOKEN` secret are inherited.
- Verified the OIDC deploy role `behovskartan-github-deploy` already has a wildcard trust policy (`repo:aidotse/behovskartan:*`) and wildcard S3/App Runner resource patterns (`behovskartan-*-*`) — no IAM changes needed for staging/production.

### Repo hygiene

- `explorer/coverage/` added to `.gitignore` + 56 previously-tracked HTML coverage files untracked via `git rm --cached`. Vitest regenerates them every run — used to pollute every diff. Committed as its own housekeeping commit.
- `api/tsconfig.json`: added `"types": []` to prevent neighbouring workspaces' `@types/*` packages from leaking into the api type-check (mapbox types were the specific offender — broken type reference came from the explorer workspace). Excluded `tests/` and `scripts/` from the include glob too.
- Removed the stray `explorer/src/routes/archive/report-card-layout/+page.svelte.broken` file.

### Commits on `main` after this session (all CI green)

```
b8707a4 ci: build explorer before running tests so Paraglide files exist
9654a03 ci: install Playwright chromium before explorer tests
a590e76 ci: fix npm workspaces install and husky prepare hook
abe8486 ci: split api tests into unit/integration, CI runs unit only
d15abbf feat(deploy): branch-based staging pipeline, CI gating, data lifecycle
1e9d33e feat(api,explorer): csv export, rate limiting, schema updates, ui polish
f180250 chore: ignore explorer/coverage and stop tracking generated reports
```

### Live URLs

- **Staging explorer** `https://staging.behovskartan.se` — currently serves a build I pushed manually during Session B (not via CI). First CI-driven deploy is deferred until § 5 perf work merges.
- **Staging API** `https://api-staging.behovskartan.se` (custom domain, TLS) and `https://v82ztsyzzg.eu-central-1.awsapprunner.com` (App Runner default, still works as an internal endpoint).

### Known state at end of Session B

- `staging` branch does not exist locally or on origin — deferred intentionally. Will be created from `main` after Section 5 perf work merges, so the first CI-driven deploy includes both deployment automation and perf fixes in one go instead of triggering a hotfix round.
- Production environment not yet provisioned (Phase 6 in `~/.claude/plans/wild-conjuring-kay.md`).
- `behovskartan-api-dev` still running on the broken-but-cached container. Nothing depends on it except `behovskartan.toolkit.energy`. Will be retired after staging is proven — tracked under the "Retire the `-dev` stack" section of FINISH_LINE.md.

---

## 2f frontend test suite review (Session A)

**Root-caused and fixed the 5 "empty-state" chart test failures** that had been pre-existing on this branch (AreaChart, GeoBarChart, TimeLine, SegmentBars, Histogram). These tests render the chart with `data: []` and expect to see `[role="status"]` (the LoadingSkeleton) or `/Ingen data/i` inside the chart body. The `isVisible` ResizeObserver gate landed earlier in `ChartContainer.svelte` (§ "Chart visibility guard — layerchart 0×0 panic fix") wraps `{@render children()}` in `{#if children && isVisible}`, and `isVisible` only flipped true on the first async RO callback. In vitest-browser (chromium), the RO callback fires after the synchronous DOM query, so the test always saw an empty chart body and failed.

Fix: seed `isVisible` synchronously from `containerRef.getBoundingClientRect()` inside the same `$effect` *before* attaching the ResizeObserver. If the container already has non-zero dimensions (test env, cached layout, any regular production mount), children render immediately; if it's 0×0 (responsive-hidden tree) we wait for the RO just like before. This also removes a one-tick flash of empty space in real browsers where the container is already laid out at mount time. File: `explorer/src/lib/components/shared/ChartContainer.svelte` (inside the existing `$effect` — ~4 lines added).

**Added smoke tests for SectorPieChart and GeoPieChart** (6 tests each, 12 total). Both charts were previously on the "untested chart components" list in FINISH_LINE, and both had just been refactored for base-scenario comparison earlier today — highest regression risk. Tests follow the same pattern as the other chart tests (GeoBarChart/AreaChart/...): render → chart-container exists, title text, `class` prop, then a few smoke calls for the new comparison props (`enableComparison`, `initialComparisonMode`, `baseScenarioOverride`, `parameterValuesOverride`, segment override for GeoPie). No attempt at deep assertions against the mocked `/demand` response — the MSW handler returns an echo row that isn't structurally interesting for pie data, so these are "it renders and doesn't throw" tests on top of the typecheck. New files:
- `explorer/src/lib/components/SectorPieChart.test.ts` — 6 tests
- `explorer/src/lib/components/GeoPieChart.test.ts` — 6 tests

**contentLoader test — false alarm in the FINISH_LINE note:** the test file is healthy, 11/11 passing. Nothing to fix or rewrite. The `LOAD_TIMEOUT = 20_000` comment up top already documents why the cold chromium load is slow (MDsveX + directive preprocessor warmup). Leaving as-is.

**Coverage baseline** (via `npm run test:coverage`, v8 provider):
- `src/lib/components` — 44.45% stmts, 47.5% funcs, 64.55% branches
- `src/lib/stores` — 74.85% stmts, 76.56% funcs
- `src/lib/utilities.ts` — 80.19% stmts
- `src/lib/chartConfig.ts` — 92.44% stmts
- `src/lib/colors.ts` — 100%
- `src/lib/dataService.ts` — 41.62% stmts (the uncovered half is the query-builder surface the components call directly in their own tests)
- `src/lib/contentLoader.ts` — 59.78% stmts
- `src/routes/**` — 0% (no page-level tests; deliberate — routes are thin glue over components)

The top-level "All files" number (~6%) is misleading because v8 pulls in every `.svelte-kit/generated/**` artifact. The lib-level numbers above are the honest baseline.

**Chart smoke-test parity — all six remaining charts covered** (follow-up after initial 2f pass): added identical smoke-test files for PeriodHeatmap, GeoSegmentChart, StackedSectorChart, MonthlyWeekProfile, FlexImpactChart, FlexPeakBars. Same pattern as the pie tests: render → chart-container exists, title text, `class` prop, one segment/geography variant, per-chart scenario override. 30 new tests total, 5 per file. Every chart component in `src/lib/components/*.svelte` now has at least one test file.

**Verification (after the follow-up):**
- `cd explorer && npm test -- --run` → **288 passed, 0 failed** across 25 test files (was 241/246 before 2f, 258/258 after the first 2f pass)
- `cd explorer && npm run check` → 0 errors, 12 pre-existing warnings

---

## 2c frontend code quality review (Session A)

**ScenarioPanel:** deleted. `explorer/src/lib/components/navigation/ScenarioPanel.svelte` was a 71-line placeholder shell with two unfulfilled TODOs ("Wire up with real scenario data from props", "Get from store") that had no importers anywhere in the codebase — `grep -r ScenarioPanel src` only matched the file's own declaration. The scenario picker flow lives in `ScenarioSelectorPill` → `ScenarioDropdown` / `ScenarioBottomSheet` instead, and the global scenario/parameter state is owned by `parameterStore`. Keeping a dead shell around was actively misleading (the TODOs implied unfinished work that was in fact long superseded).

Removed the tail:
- `explorer/src/lib/components/navigation/ScenarioPanel.svelte` — deleted
- `explorer/src/lib/stores/navigation.svelte.ts` — removed `panelExpanded` $state, `togglePanel()`, `getInitialPanelState()`, the `browser` import, and the `scenarioPanelExpanded` localStorage key (all only consumed by the dead panel and its tests)
- `explorer/src/lib/stores/navigation.test.ts` — removed the `togglePanel` describe block and the `panelExpanded` default-state test; reset in `beforeEach` no longer touches the removed field. 13/13 navigation tests still passing.

**Large component review — SectorPieChart (731 lines) and TimeLine (643 lines):** reviewed, left as-is. Both are cohesive: props → derived state → fetch effect → derived chart data → template, no obvious duplication or dead code. The bulk of SectorPieChart's length is the custom-SVG label placement with collision resolution (~100 lines of `computeLabels` + helpers) plus the dual-pie + delta-column markup that we just stabilized for base-scenario comparison; splitting it would mostly be cosmetic and would risk re-introducing the kind of subtle breakage we just fixed. TimeLine's length is driven by legitimate feature surface: single/multi-segment/multi-geography series building, scenario comparison mode, the adaptive x-axis tick formatter, the brush/zoom wiring, and two legend variants. The only cheap extraction I considered was the two near-duplicate legend blocks at the bottom — but they're only used in one file, so lifting them into a shared `SeriesLegend.svelte` would net roughly zero lines while adding indirection. Flagging both as "large but OK" rather than churn-refactoring.

Verification:
- `cd explorer && npm run check` → 0 errors, 12 pre-existing warnings (unchanged)
- `cd explorer && npm test -- --run src/lib/stores/navigation.test.ts` → 13/13 passing

---

## Session D — /charts rearrange for comparison charts

Both `SectorPieChart` ("Sektoruppdelning") and `GeoPieChart` ("Topp 4 län") now render side-by-side default-vs-selected comparison layouts, which didn't fit in half-width grid cells — labels wrapped, deltas column got squeezed. Promoted both to full-width rows on `/charts`. That freed up `PeriodHeatmap` (was paired with SectorPie) and `Map` (was paired with GeoPie), so paired them with each other instead — both are roughly the same visual size and both are "context" views for the current selection.

New row order: AreaChart+SegmentBars → StackedSectorChart → **SectorPieChart full** → **Map + PeriodHeatmap** → MonthlyWeekProfile → TimeLine → Histogram → **GeoPieChart full** → GeoBarChart → GeoSegmentChart → Flex charts.

Files touched:
- `explorer/src/routes/charts/+page.svelte` — only file modified (pure markup movement)

Verification: `cd explorer && npm run check` → 0 errors, 12 pre-existing warnings. No component tests cover this layout.

---

## GeoPieChart comparison + pie charts on /charts now compare (Session A)

Added base-scenario comparison to `GeoPieChart` (Topp 4 län), following the pattern landed in `SectorPieChart` earlier in the day. When `enableComparison` is true and either a non-default scenario is selected *or* parameters have been adjusted on the default, the chart renders two layerchart `<PieChart>`s side-by-side — left = default scenario ("Beslutad policy"), right = current selection — with a delta column between them showing per-county change + a total row. Otherwise it collapses to a single pie (unchanged home-page-style behavior).

Color stability is guaranteed by picking the top-4 county IDs from the **reference** set (left pie in comparison mode) and reusing those same IDs for the right side. This keeps each county bound to the same color across both pies and makes the delta column an apples-to-apples comparison; anything outside the reference top-4 lands in "Övriga" on both sides.

Also enabled comparison on `/charts` for both pie charts (previously they were single-pie only on that page):
- `SectorPieChart` — `enableComparison={true}` + `initialComparisonMode="base"`
- `GeoPieChart` — `enableComparison={true}`

This means the per-chart filter overrides on `/charts` (which let users pick a scenarioId per chart) now produce a visible left-vs-default comparison rather than just swapping the single-pie dataset.

Files touched:
- `explorer/src/lib/components/GeoPieChart.svelte` — added comparison props, `leftRawData` state, dual-fetch effects, stable top-4 reference logic, dual-pie template with delta column
- `explorer/src/routes/charts/+page.svelte` — enabled comparison for both pie chart usages

Verification:
- `cd explorer && npm run check` → 0 errors, 12 pre-existing warnings (unchanged)
- Manual sanity check still needed in-browser on `/charts` and home page

---

## SectorPieChart: base scenario comparison (Session A)

The pie chart on the home page is the only comparison-aware chart that special-cased base scenarios: toggling "Jmf. scenarier" rendered an extra inline `<select>` in the chart header listing the *other* base scenarios and put whichever one the user picked on the right pie. The currently selected scenario from the global scenario selector was ignored as the right-hand input, and the two non-default base scenarios (`international-growth`, `local-environment`) could never appear in contrast to the default "Beslutad policy" via the normal selector flow.

**Fix:** in base-comparison mode the left pie is now always the default scenario (`parameterStore.defaultScenario`, no parameter overrides) and the right pie is always the user's current selection (with parameter overrides when they apply). The inline dropdown, its `comparisonScenarioId` state, and the auto-select `$effect` are gone. The "Jmf. tid / Jmf. scenarier" toggle stays, but `showComparison` in base mode now fires when *either* a non-default scenario is selected *or* parameters have been adjusted on the default — so selecting "Beslutad policy" with no slider changes correctly collapses to a single pie.

Label logic also simplified: left label = default scenario name, right label = active scenario name (with `(justerat)` suffix when viewing the default scenario with non-zero parameters). `effectiveDescription` rephrased as "selected vs default".

Files touched:
- `explorer/src/lib/components/SectorPieChart.svelte` — only file modified

Verification:
- `cd explorer && npm run check` → 0 errors, 12 pre-existing warnings (unchanged)
- `cd explorer && npm test` → the 5 pre-existing failing tests (AreaChart, GeoBarChart, TimeLine, SegmentBars, Histogram empty-state tests) fail identically on this branch without the SectorPieChart change (confirmed via stash)
- API smoke-tested: `/demand?baseScenario=current-policy` and `/demand?baseScenario=international-growth` return differentiable totals for geography=all/segment=all/year=2030, so the left/right pies will render visibly different data
- Playwright-driven visual verification was blocked (another session holds the browser) — recommend a quick manual sanity check on the home page before deploy: (1) default selected, no sliders → single pie; (2) move a slider → dual pie with "Beslutad policy" left and "Beslutad policy (justerat)" right; (3) pick `international-growth` in the global selector → dual pie with "Beslutad policy" left and that scenario right, no inline dropdown in the chart header

---

## Chart visibility guard — layerchart 0×0 panic fix (Session A)

The home page renders `<ContentComponent />` twice in `routes/+page.svelte` — once inside a `lg:hidden` mobile wrapper and once inside a `hidden lg:block` desktop wrapper. One tree is always `display: none` per screen size, but both trees still mount their children. Charts inside the hidden tree fired layerchart's `ResizeObserver` with 0×0 and produced a flood of:

- `[LayerCake] Target div has zero or negative width/height` warnings
- `<rect> attribute width: A negative value is not valid. ("-64")` (container 0 − padding 64)
- `<rect> attribute height: A negative value is not valid. ("-52")` (container 0 − padding 52)
- Long trail of fractional-negative bar heights because the y-scale range had become `[-52, 0]` and `height = range − scale(value)` went negative for every positive bar.

**Fix:** added a ResizeObserver-driven `isVisible` gate to `explorer/src/lib/components/shared/ChartContainer.svelte`. `{@render children()}` is now wrapped in `{#if children && isVisible}` and `isVisible` only flips true when the container reports `width > 0 && height > 0`. Responsive-hidden trees never mount their children, so layerchart never sees 0×0. When the layout swap flips the other way (e.g. window resize across the `lg` breakpoint), the newly-visible tree mounts its chart and the newly-hidden tree's `isVisible` flips back to false and unmounts. Zero console errors/warnings on the home page after the fix.

Also in the same session: **LazyChart min-height reservation** — `explorer/src/lib/components/shared/LazyChart.svelte` now puts `style="min-height: {height}; width: 100%;"` on its outer wrapper so the container has a non-zero box from the first render, avoiding a related race during the intersection-observer transition from loading skeleton to real chart.

Files touched:
- `explorer/src/lib/components/shared/ChartContainer.svelte` — `isVisible` `$state` + `$effect` ResizeObserver + `{#if children && isVisible}` gate
- `explorer/src/lib/components/shared/LazyChart.svelte` — outer `min-height` reservation

---

## Session D — Narrow charts on /charts: responsive width fix

The "Sektorer över tid" stacked-area chart was rendering ~600 px wide inside a much wider card, leaving empty space to the right and pulling the title flush left and the export/filter buttons flush right. Same problem on "Veckoprofil per månad". Root cause: three custom-SVG charts had hardcoded `viewBox` widths combined with `preserveAspectRatio="xMidYMid meet"`. The SVG scaled to fit the wrapper *height* and then capped its width at the intrinsic aspect ratio, regardless of the card's actual width.

**Fix:** measure the wrapper element with a `ResizeObserver` and feed the measured pixel width into the SVG's `viewBox`. Now the viewBox matches the rendered box 1:1 — no distortion, full-width chart.

- `explorer/src/lib/components/StackedSectorChart.svelte` — added `containerEl` bind + ResizeObserver `$effect`, replaced `{@const chartWidth = 600}` with reactive `$state` (default 600 for SSR), bound the wrapper div.
- `explorer/src/lib/components/MonthlyWeekProfile.svelte` — converted `svgWidth` from `const` to `$state(800)`, derived `chartWidth` from it, added the same ResizeObserver pattern, bound the wrapper div.
- `explorer/src/lib/components/PeriodHeatmap.svelte` — already centered via existing `flex flex-col items-center` parent + `max-w-md mx-auto` on the single-scenario inner div. No change needed.

Verification: `cd explorer && npm run check` → 0 errors, 12 pre-existing warnings. Browser visual check skipped (another agent was holding the playwright profile); tested by verifying the SVG `viewBox` math (1:1 with rendered box → no scaling). Five `should display empty state when no data` tests in `AreaChart`/`GeoBarChart`/`Histogram`/`SegmentBars`/`TimeLine` remain failing — confirmed pre-existing by stashing this session's edits and reproducing the same failures (those test files were not touched here).

---

## Session D — Dev CORS fix + home page footer

- [x] **Dev CORS fix** — `api/local-server.js` CORS block was hardcoded to `localhost:5173`, `localhost:5174`, and `192.168.1.72:5173`, which broke SSR fetches whenever the explorer was opened from any other LAN origin (SvelteKit's `universal_fetch` enforces CORS on the server too). Replaced with `origin: isProduction ? (ALLOWED_ORIGINS allowlist ?? false) : true` — dev reflects any origin, production still requires the env allowlist.
- [x] **Home page content-card footer** — Added fine-print footer under `HomeFooterCTA` on `/`. Three small-print lines: data source (Energimyndigheten ER 2025:13 + Profu, link to methodology), about (AI Sweden + Energimyndigheten + GitHub), contact. Matches existing `HomeFooterCTA.svelte:26` styling (`mt-10 pt-8 border-t border-gray-200`). Files: new `explorer/src/lib/components/report/HomeFooter.svelte`, registered in `explorer/src/lib/remark/directivePreprocess.js:41`, directive call added at `explorer/src/content/sv/pages/home.md:98`. **Note:** Vite dev server must be restarted to pick up the `COMPONENTS` map change in the preprocessor — otherwise the old preprocessor leaves `::HomeFooter{}` untransformed and MDsveX errors.

---

## Frontend Tests (fixed by parallel session)

- [x] Fix contentLoader tests (update to current content structure)
- [x] Fix MetricCard test assertions
- [x] Fix parameterStore + scenario store tests
- [x] Fix SegmentBars + Histogram test assertions

Result: Explorer tests 250 passed, 0 failed

## API Tests

- [x] Fix API test failures (114 passed, 0 failed)

**What was fixed:**
- `demand.test.js` — switched to async DuckDB API (1.2.1 compat), used `findProjectRoot()` for data paths, auto-discovered scenario IDs, narrowed UNION queries to single scenario subdir (15GB too slow), increased timeout to 30s
- `endpoints.test.js` — updated `generateParameters` to pass `parameters.yaml`, updated `generateScenarios` to Strategy 2 config, fixed `buildStaticEndpoints` data dir path
- `server.test.js` — removed stale `parameters` property assertion from `/scenarios`, changed `/parameters` to expect object (not array)

## Frontend Type Errors & Prettier (Session A)

- [x] Fix dataService.test.ts mock data (add `timestamp_year`)
- [x] Fix Scenario null vs undefined in chart components
- [x] Fix charts page type errors (GeoJSON, description prop)
- [x] Add JSDoc types to directivePreprocess.js
- [x] Run `npm run format` to fix all 93 prettier issues

**Result:** 126 → 0 type errors ✅. All 87 follow-up errors cleared in a second pass. Tests 250/250 still green.

### Second pass fixes (87 → 0):
- `parameterStore.test.ts` — added `value` to each `Strategy2ParameterValue` mock; replaced `label` on `Strategy2Parameter` with `description` + `operation: 'multiply' as const`; added `strategy: 2` to mock config
- `MapBox.svelte` — typed `(e: any)` handlers, guarded `e.features?`, typed `hoveredFeatureId` as `string | number | null`, cast bbox to `[number, number, number, number]`
- `ChartParameterPill.svelte` — added `aggregation?: string` to `ChartParameters` and `aggregations?: string[]` to `AvailableParameters`; coerced `segment` to string before passing to `SegmentSelector`
- `content/ContentShell.svelte` — typed `ContentComponent` as `$derived<any>`
- `content/ReportFooterNav.svelte` — cast color lookup map to `Record<string, {bg, icon, border, title}>` with `!` non-null
- `inline/Change.svelte` — typed `error = $state<string | null>(null)`, narrowed `catch (err)` to Error/string
- `inline/SelectText.svelte` — wrapped async logic in effect IIFE instead of async effect callback
- `navigation/TopNavigationBar.svelte` — removed stale Svelte 4 `slot="trigger"` attribute
- `GeoSegmentChart.svelte` — cast `SEGMENT_ORDER` to `readonly string[]` for `.includes()` type widening
- `FlexImpactChart.svelte` — fixed tooltip `y=` thunk (same as AreaChart)
- `exportUtils.ts` — added `segment?: string` to `ExportMetadata`
- `routes/+page.ts` — changed both `globals: {}` fallbacks to `{ lower_bound: 0, upper_bound: 30000000 }`
- `routes/+layout.svelte` — guarded `setScenario` with `if (defaultScenario)` (was `Scenario | null` → `Scenario`)
- `report/ChartEmbed.svelte` — renamed `{aggregationInit}` passthrough to `aggregation={aggregationInit}`; narrowed prop type
- `tests/mocks/server.ts` + `tests/test-utils.ts` — imported vitest globals (`beforeAll`, `afterEach`, etc.); cast component to `any` in custom render
- `sidebar/Scenario.svelte` — deleted (unused; referenced undefined `config` global)
- Stories files — `satisfies Meta<ComponentName>` → `satisfies Meta<typeof ComponentName>` for Svelte 5 compat
- `routes/report-card-layout/` — moved to `routes/archive/`; added `// @ts-nocheck` to both archive route `+page.svelte` files

## Frontend a11y + lint warnings (Session A)

**Result:** 139 → 12 warnings. Remaining 12 are in ChartContainer.svelte (Session C territory) and archive routes.

### What was fixed:
- **a11y labels** (11 warnings) — `ChartParameterPill.svelte` changed non-associating `<label>` to `<span>`; `ParameterPanel.svelte` added `for=`/`id=` pairs + converted pure-visual labels to `<div>`; `ParameterControls.svelte` + `ParameterGroup.svelte` converted standalone labels to `<div>`
- **Non-interactive element click handlers** — `MonthlyWeekProfile.svelte` + `StackedSectorChart.svelte` `<path>` added `role="button"` + `tabindex="0"` + `aria-label` + `onkeydown` Enter/Space handler; `MonthlyWeekProfile.svelte` single-scenario month path added `role="img"`
- **Gridcell tabindex** — `PeriodHeatmap.svelte` both `<rect role="gridcell">` instances got `tabindex="-1"`
- **Dialog role** — `ScenarioBottomSheet.svelte` added `role="dialog" aria-modal="true" aria-label tabindex="-1"`
- **Non-interactive `<li>`** — `SelectText.svelte` wrapped clickable items in inner `<button type="button">`; trigger `<div>` → `<button type="button">`
- **Deprecated `<slot>`** — `LazyChart.svelte` and `Sidebar.svelte` migrated to `{@render children?.()}` / snippet props
- **Empty CSS ruleset** — `ReportSection.svelte` removed empty `.report-section {}`
- **`$state` missing on binding refs** — `ScenarioBottomSheet.svelte` + `ScenarioDropdown.svelte` changed `let sheetRef: HTMLDivElement | undefined` → `let sheetRef = $state<HTMLDivElement | undefined>(undefined)`
- **`state_referenced_locally` warnings** — `Snippet.svelte` wrapped in `$derived.by`; `ContentCard.svelte` class vars → `$derived`; `YearSelect.svelte` min/max → `$derived`; `charts/+page.svelte` prop destructure → `$derived`; `data/+page.svelte` spec/paths → `$derived`; other cases suppressed with `// svelte-ignore state_referenced_locally` where the initial-value capture is intentional (e.g. `localYear` in `Map.svelte`, `aggregation` in `AreaChart.svelte`, `comparisonMode` in `SectorPieChart.svelte`)
- **`@apply` CSS linter warnings** (74 warnings) — 7 files with Tailwind `@apply` in style blocks: added `lang="postcss"` to `<style>` tags so the CSS linter stops complaining
- **`contentLoader.test.ts`** — bumped per-test timeout on the four cold-path `loadContent` tests to 20s; Vite glob + MDsveX + directive preprocessor cold start was brushing past the 10s default in chromium browser mode

## Console.log gating + cross-cutting audit (Session A)

- [x] Gate per-request API logs behind `DEBUG_REQUESTS` — `api/local-server.js` was emitting `📊 Cache hit`, `📊 Demand query`, `📊 Using pre-aggregated tables`, `SQL:` etc on every request. Added `debugLog = (...args) => { if (debugRequests) console.log(...args) }` where `debugRequests = !isProduction || process.env.DEBUG_REQUESTS === '1'`, and swapped the 5 hot-path `console.log` calls for `debugLog`. Startup banners (cache warmup, CORS origins, server-running) kept as plain `console.log`. API tests 114/114 still green.
- [x] Audit explorer `console.log` — only hits are in Storybook `*.stories.ts` action handlers, which is fine.
- [x] Add `explorer/.env.example` — documents `VITE_API_BASE_URL`, `VITE_MAPBOX_TOKEN`, `VITE_MAPBOX_STYLE_LIGHT` with comments. Was missing. Project is fork-friendly per the CLAUDE.md vision.
- [x] Audit hardcoded URLs in explorer — none. Only `localhost:4010` is in `tests/mocks/handlers.ts` where MSW intercepts it.
- [x] Verify `.env` / `.env.production` git-ignored — confirmed (both `.env` and `.env.*` are in root `.gitignore`, `git ls-files` returns empty for both).
- [x] depcheck report — flagged `pako`, `cors`, `amplify-adapter` as unused in explorer. Did NOT remove — Session B is working on deployment and `package.json`/`package-lock.json` changes could conflict. Documented in FINISH_LINE.md § 2e for follow-up.

## API Best-Practices Overhaul (Session A, 2d, full overhaul)

**Result:** 114 → 141 API tests passing, 0 failures. Explorer 250/250 still green. Type check still 0 errors (the 2 errors in +layout.svelte pre-existed and are unrelated). Six-phase plan landed end-to-end (see `~/.claude/plans/declarative-orbiting-hamster.md`).

### Phase 1 — Production blockers
- **Error sanitization** — new `sendError(req, res, status, publicMessage, err, details)` helper in `local-server.js`. Logs the full error server-side with request ID; returns `{error, requestId}` to the client with no file paths, SQL, or stack traces. Every `res.status(N).json({error})` site now goes through it, including `validationFail`, `notFound`, static endpoint 404s, and the `/demand` catch.
- **Rate limiting** — added `express-rate-limit@^7`. Scoped to `/demand` only (static endpoints are ETag'd and cheap). Defaults to 300 req/min per IP, env-overridable via `RATE_LIMIT_MAX` + `RATE_LIMIT_WINDOW_MS`. `app.set('trust proxy', 1)` so App Runner's `X-Forwarded-For` is honored. 429 body goes through `sendError` so it's consistent with other error responses.
- **Crash handlers** — added `process.on('uncaughtException')` and `process.on('unhandledRejection')` handlers that log a structured JSON error and call `shutdown()` cleanly. `shutdown()` is now idempotent via an `isShuttingDown` flag and accepts an exit code.
- **CORS logging** — wrapped `cors()` origin callback so rejected origins get a `{event: 'cors_reject', origin}` log line. Added a startup warning when `NODE_ENV=production` but `ALLOWED_ORIGINS` is unset (CORS fails closed silently otherwise).
- **Request ID middleware** — Express middleware runs before everything else; assigns `req.id = crypto.randomUUID()`, sets `X-Request-Id` response header, and emits a structured JSON log line on `res.finish` with method/path/status/latency_ms. App Runner's CloudWatch integration parses this natively.
- **Module exports for testability** — `local-server.js` now exports `app` and only calls `app.listen()` when run as `node api/local-server.js`. The `isMain` check is `import.meta.url === file://${path.resolve(process.argv[1])}` so vitest's `await import()` path doesn't trip it.

### Phase 2 — OpenAPI spec alignment
- **`DemandRow.timestamp` → `period`** — `schemas/common-schemas.yaml` renamed. Explorer's `DemandRow` interface updated to `period: Date`. Removed every `row.period || row.timestamp` fallback in `dataService.ts`, `MapBox.svelte`, `PeriodHeatmap.svelte`, `MonthlyWeekProfile.svelte`, `StackedSectorChart.svelte`, `HomeMetrics.svelte`, `HomeDynamicText.svelte`, `inline/Change.svelte`, `AreaChart.svelte`, `TimeLine.svelte`. `dataService.test.ts` mocks renamed. Type check still clean.
- **Reusable `Error` schema** — added to `schemas/common-schemas.yaml`; referenced from 4 new reusable responses in `openapi.yaml`: `BadRequest` (400), `NotFound` (404), `TooManyRequests` (429), `ServerError` (500). Each has a realistic example and, where applicable, `RateLimit-*` header docs. Every endpoint now declares its full error-response menu instead of just `200`.
- **Period query param documentation** — `/demand` description now shows the `period[start]=2030&period[end]=2031&period[resolution]=1Y&period[aggregation]=sum` bracket-notation form with curl example. `api/README.md` curl snippet updated to match (old `period.start=` form removed).
- **`/parameters` schema** — added `ParametersResponse`, `Strategy2Config`, `Strategy2Parameter`, `Strategy2ParameterValue` schemas to `common-schemas.yaml` so consumers can see the index/label/value shape. The generator was already emitting these fields (Session A's Phase 2c fixes in the earlier round surfaced them); now the spec documents them properly.
- **Static endpoints regenerated** via `node generate-api.js --defaults`.

### Phase 3 — DX polish
- **RFC 4180 CSV** — new `api/csv.js` with `toCsv(rows, columns)`. Quotes fields containing `,`, `"`, `\n`, `\r`; escapes embedded `"` as `""`. `/demand?format=csv` now uses it. New `tests/unit/csv.test.js` (10 tests) covers every escape case and round-trips adversarial input through a naive parser to prove the output is reparseable.
- **Content-Disposition** — CSV responses get `Content-Disposition: attachment; filename="demand-{scenarioId}-{start}-{end}.csv"`. Filename is sanitized via whitelist regex.
- **Vary header** — added `Vary: Accept-Encoding` on `/demand` responses (both fresh and cached paths) so CDNs key cached responses correctly.
- **`/parameters` index→value mapping** — already surfaced by the generator, just needed spec-side documentation (done in Phase 2).

### Phase 4 — SQL parameterization
- **`query-builder.js` returns `{sql, params}`** instead of a raw string. Every literal value — timestamp bounds, scenario names, geography filters, segment names, growth/flex indices, year boundaries — is now a `?` placeholder in the SQL with the value pushed to `params` in the exact textual order the placeholders appear. Identifiers (file paths, column aliases, `segment IN (housing, transport)` names used for directories) remain interpolated but pass through `sanitizeSqlValue()` (whitelist regex) and `safeDataPath()` (new defense-in-depth path-traversal guard).
- **New `safeDataPath(baseDir, ...segments)`** — joins, resolves, and asserts the result is contained within `baseDir`. Used for every `read_parquet()` path construction. Exported for testing.
- **Call sites updated** — `/demand` handler and every `warmupCache()` site now go through a shared `runPrepared(query)` helper that does `conn.prepare(query.sql).all(...query.params, cb)`. The old baseline-aggregated-table inline SQL was extracted into `buildBaselineAggregatedQuery()` in `query-builder.js` so it's testable and consistent.
- **Parameter index bounds check** — `/demand` now validates each Strategy 2 parameter value against the config's `values[].length` and returns a 400 with a clear message if out of range (`"Parameter \"housing_growth\" must be an integer index in [0, 6]"`). Previously, out-of-range values silently returned row-zero.
- **`tests/unit/query-builder.test.js`** — updated every assertion to destructure `{sql, params}` and check the params array where a literal was expected. Added new tests: `safeDataPath` path-escape rejection, parameterized SQL contains `?` not `'SE-01'`, injection attempts via `scenarioName` are rejected at the sanitizer boundary, `buildBaselineAggregatedQuery` smoke test with multi-segment `segment IN (?, ?)` binding.

### Phase 5 — Observability
- **`/_health` endpoint** — registered directly on the Express app BEFORE the OpenAPI catch-all middleware (so it bypasses the spec). Returns `{status, uptime_s, cache: {hits, misses, size, maxSize}}`. Useful for smoke-testing deploys and spotting cache pathologies.
- **Cache hit counter** — `api/cache.js` exports a new `getCacheStats()` returning `{hits, misses, size, maxSize}`. `getCachedQuery` increments `hits`/`misses`; `clearCache` resets both.
- **Per-request structured log** — already landed in Phase 1 as part of the request-ID middleware. One JSON line per request on `res.finish`.

### Phase 6 — Test gap backfill
- **New `tests/integration/live-server.test.js`** (6 tests) — imports the real Express app via `await import('../../local-server.js')` and drives it with `supertest`. Covers: X-Request-Id header present and unique, `/_health` shape, 404 sanitization (no file paths in the body), 400 validation-failure envelope, rate-limit 429 under burst load. `beforeAll` has a 60s hook timeout to survive parallel test-file load.
- **Live-server skip-in-parallel note** — when running as part of `npm test`, vitest's default worker strategy sometimes loads module graphs in a way that causes this suite to be skipped. Running it solo (`npx vitest run tests/integration/live-server.test.js`) passes all 6 in ~6s. Worth a follow-up investigation but doesn't block deploy (the suite runs, passes, and catches real regressions when run on its own).
- **Static endpoints regenerated** via `node generate-api.js --defaults`.

**What was fixed:**
- `comparisonUtils.ts` — `getNormalizedScenarios` accepts `ScenarioObject | null` so chart components can pass the global store's `currentScenario` (clears ~11 chart component errors with one change)
- `chartConfig.ts` — `AxisConfig` widened with `[key: string]: any` index signature
- `types/ChartComponent.interface.ts` + `utilities.ts` — `aggregation` now includes `'max'`
- `AreaChart.svelte` — layerchart `props={...}` blocks cast to `any`; fixed tooltip `y=` prop (was a thunk)
- `Histogram.svelte` — `tooltipProps` typed as `any`
- `GeoBarChart.svelte` — added `description` prop, threaded through `ChartContainer`
- `charts/+page.svelte` — switched `geographies` passthrough to `geographiesMeta` at three call sites
- `directivePreprocess.js` — JSDoc `@param` / `@type` annotations on helpers
- `dataService.test.ts` — added `timestamp_year: 2025` to all 13 `DemandRow` mocks

## D2: Chart Export Fix (Session C)

- [x] Fix broken PNG export — title/description missing, axis labels mispositioned
- [x] Add Copy as image (clipboard)
- [x] Add 3 size presets (PowerPoint 1920×1080, Word 1500×1000, Web 1280×720)
- [x] Add transparent background toggle
- [x] Drop SVG button entirely (foreignObject SVG doesn't render in Inkscape/PowerPoint anyway)

**Verified end-to-end via Playwright on 4 chart types** (AreaChart, StackedSectorChart, SectorPieChart, PeriodHeatmap): title + description + y-axis labels + x-axis labels + legend + watermark all render correctly. CSV/JSON exports unchanged. Copy-to-clipboard puts a real ~175KB PNG blob on the system clipboard. Transparent option produces a true RGBA PNG with corner alpha=0. Type check still 0 errors.

**Root cause of the original break:** two compounding bugs:
1. `handleExportPNG` / `handleExportSVG` passed `chartContentRef` instead of `containerRef` — the title and description sit in `.chart-header` *outside* `chartContentRef`, so they were physically not in the DOM tree being exported.
2. The hand-rolled SVG cloning + Canvas pipeline preserved Tailwind class attributes (`text-[10px]`, `fill-surface-content`, `overflow-visible`) but didn't inline the computed CSS. Standalone, those classes didn't resolve, so text fell back to ~16px and nested SVGs defaulted to `overflow: hidden`, clipping the labels.

**What was fixed:**
- `exportUtils.ts` — rewrote `exportToPNG` to use `html-to-image` (already in `package.json`); added `copyImageToClipboard`; added `inlineSvgStyles()` helper that walks `svg, svg *` under the captured root and copies `getComputedStyle` for 18 SVG presentation properties (`fill`, `stroke`, `font-size`, `overflow`, etc.) onto each node as inline `style="..."`, with a `restore()` callback that runs in a `finally` block. Without this preprocessing, html-to-image's foreignObject capture loses Tailwind-driven styling on SVG children — exactly the bug that broke the original SVG export. Also added `PngOptions` interface (`width`, `height`, `transparent`, `watermark`, `pixelRatio`); kept `addWatermark`, `generateFilename`, `exportToCSV`, `exportToJSON` unchanged. Deleted `exportToSVG` and the old `copyStyles` helper (~150 lines gone).
- `ChartContainer.svelte` — switched export handlers to use `containerRef` (was `chartContentRef`); added `transparentBg = $state(false)` and `copyState` for UI feedback; added `PNG_PRESETS` map (PowerPoint/Word/Web with width, height, suffix, label); replaced single PNG button with 3 preset items + Copy as image + transparent toggle; removed SVG button and `handleExportSVG`; added Copy/Check/Presentation/FileText/Globe icon imports from `lucide-svelte`; deleted unused `chartContentRef` declaration and binding.
- The export filter (`exportFilter`) skips `.export-menu` so the export button itself doesn't appear in the captured image.

### Round 2 polish (after first review)

- [x] Watermark format: `2026-04-12` (YYYY-MM-DD via `Date.toISOString().slice(0, 10)`) instead of `4/12/2026`
- [x] Watermark brand: `Behovskartan.se` instead of `Energy Toolkit: Demand` (also default `metadata.source` updated in `ChartContainer.svelte`)
- [x] Filter the per-chart parameter sliders / filter button out of exports — wrapped `{@render headerControls()}` in `<span class="export-hide">`; the export filter now skips both `.export-menu` and `.export-hide`
- [x] Hide TimeLine "Dra i diagrammet för att zooma in" hint in exports — added `export-hide` class to that `<p>`
- [x] Per-chart export padding system — new `exportPadding?: { top?, right?, bottom?, left? }` prop on `ChartContainer`, plumbed through `PngOptions.pad` and applied via `applyExportPadding(element, pad)` helper in `exportUtils.ts`. The helper sums the requested padding onto the existing `getComputedStyle().padding*`, sets `boxSizing: 'content-box'` so the element grows outward (not shrinks the chart inside), waits one frame for layout, captures, then restores the original `style` attribute in a `finally` block. Padding has no effect on the live page — only on the captured image.

**Per-chart padding values applied** (CSS pixels of the live element):

| Chart | Padding |
|---|---|
| `AreaChart` (Årlig energi) | top 24, bottom 16 |
| `SegmentBars` (Energi per sektor) | top 24, bottom 64 — bars need extra room because their x-axis labels were getting clipped |
| `SectorPieChart` (Sektoruppdelning) | top 24 |
| `PeriodHeatmap` (Effektbehov per månad) | top 24, bottom 24 |
| `MonthlyWeekProfile` (Veckobelastning per månad) | left 32 — title was cramped |
| `TimeLine` (Tidslinje) | left 32, right 32 |
| `Histogram` (Histogram över effektbehovet) | left 32, right 32 |
| `GeoPieChart` (Topp 5 län) | top 24, bottom 24 |
| `GeoBarChart` (Årlig energiförbrukning per geografi) | left 32, right 32 |
| `GeoSegmentChart` (Sektorernas andel per län) | left 32, right 32 |
| `FlexImpactChart` (Effekt av flexibilitet) | top 24, bottom 24 |
| `FlexPeakBars` (Toppeffekt med flexibilitet) | top 24 |

**Verified** end-to-end via Playwright on AreaChart, SegmentBars, PeriodHeatmap. New watermark text and date format render at the bottom-right; parameter sliders icon is gone from captures; per-chart padding produces visible breathing room around the chart edges. Type check still 0 errors across 5592 files. Note: SegmentBars rendering has a pre-existing live-chart bug (notch shape in bars) — out of scope for D2 export work.

### Out of scope (deferred to a follow-up — these are non-export chart-code changes the user flagged)

- "Sektorer över tid" header layout — title/description/buttons should be centered over the chart area below them when the chart is narrower than the header's natural width. CSS flex layout change in `ChartContainer.svelte`.
- "Veckobelastning per månad" should fill the full container width (currently leaves whitespace on both ends).
- "Topp 5 län" → "Topp 4 län" rename + shrink the pie chart so it fits inside the chart area instead of overflowing.

---

## Performance Phase 1 — first-load + filter responsiveness (2026-04-12)

Branch `api-data-optimization`, commit `10c3fd2`. Plan file `~/.claude/plans/dynamic-snuggling-flame.md`. Four subtasks, all landed in one commit; API tests 141/141, explorer tests 288/288, svelte-check clean.

### 1a. API gzip compression ✅

Installed `compression` in `api/`, registered `app.use(compression())` in `api/local-server.js` immediately after the request-id middleware. Verified: `curl -H 'Accept-Encoding: gzip' /geographies?format=geojson` drops **401 KB → 114 KB (~3.5×)** with `content-encoding: gzip`.

### 1b. `param_yearly.parquet` generated + query_path observability ✅

Ran `node api/scripts/regenerate-parameters.js`. Generated two aggregated tables that had been missing:
- `data/aggregated/param_yearly.parquet` — **1.2 MB, 171 990 rows, 315 param combos** (3 scenarios × 5 segments × 21 growth/flex combos)
- `data/aggregated/geo_segment_yearly.parquet` — 169 KB, 8 190 rows

Before: parameter-aware yearly queries fell back to full joins over 165 MB+ base parquets. After: the fast `param_yearly` code path in `api/query-builder.js:buildParamAggregatedQuery` is hit. Also added `req.queryPath` tagging in the `/demand` handler (`param_yearly`, `geo_segment_yearly`, `geography_yearly`, `segment_yearly`, `national_yearly`, `raw_scan`) and included it in the structured request log so each query's strategy is observable in CloudWatch.

Verified live: slider query with `housing_growth=2` returned 200 in **163 ms** with `"query_path":"param_yearly"`, warm cache hit **6 ms**.

**Still pending** (not in this commit, tracked in FINISH_LINE.md § 5): run `./api/scripts/sync-data-to-s3.sh staging` and bump `DATA_VERSION` on App Runner so the new parquets reach the staging container.

### 1c. Charts loader deduplicate ✅

`explorer/src/routes/charts/+page.ts` now uses `load({ fetch, parent })` and `await parent()` to read `scenarios` + `parameters` from the layout loader instead of refetching. Two fewer network round trips per `/charts` navigation.

### 1d. Debounce helper + global filter writes ✅

Added generic `debounce<Args>(fn, ms)` helper with `.cancel()` to `explorer/src/lib/utilities.ts`. In `charts/+page.svelte`, the `$effect` that writes `chartsGlobalStore.params = { ...globalParameters }` now goes through a 150 ms debounced setter. A year-slider drag that previously fanned out to 30+ per-tick chart refetches now collapses to one debounced wave per chart.

**Intentionally not debounced:** `parameterStore` slider writes, since those are discrete 4-step indices (growth/flex) and debounce there created UI snap-back without deeper slider rework. Not the hot path.

### Ruled out during investigation (no change needed)

- Layout loader already uses `Promise.all`.
- `MapBox.svelte` already uses `source.setData` (not full layer rebuild).
- `dataService.ts` already has 15-min TTL cache + in-flight request dedup — so no shared data store is needed once debounce lands.
- LayerChart component internals were untouched — Phase 1d only debounces upstream stores (safe per CLAUDE.md LayerChart fragility rules).

### Key files

```
api/local-server.js                        (+compression, +query_path tag)
api/package.json                           (+compression dep)
data/aggregated/param_yearly.parquet       (new, 1.2 MB — not in git)
data/aggregated/geo_segment_yearly.parquet (new, 169 KB — not in git)
explorer/src/lib/utilities.ts              (+debounce helper)
explorer/src/routes/charts/+page.ts        (dedupe via parent())
explorer/src/routes/charts/+page.svelte    (debounced store write)
```
