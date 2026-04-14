# Finish Line - April 12, 2026

Everything left to do. Completed items are in FINISH_LINE_DONE.md.

**Active sessions:**
- **Session A** — idle, awaiting next task *(just finished: 2f frontend test suite review + smoke-test parity for all 6 remaining charts — suite 288/288 across 25 files — see FINISH_LINE_DONE.md)*
- **Session B** — 3: Deployment infrastructure setup *(in progress)*
- **Session C / finish-line-c** — D2 export fix *(done — see FINISH_LINE_DONE.md)*
- **Session D / finish-line-d** — idle, awaiting next task *(just finished: /charts rearrange — SectorPie + GeoPie promoted to full width, Map paired with PeriodHeatmap — see FINISH_LINE_DONE.md)*

---

## 1. Remaining Tasks (from LAST_PLAN.md)

### Comments / Loose Ends

- [ ] Go through all comments documents

---

## 2. Reviews

### 2a. Explorer Review (User Perspective)

Walk through every page as a user. Note issues inline below.

- [ ] **Home page (`/`)** — map interaction, scenario selector, parameter sliders, chart descriptions, mobile toggle
- [ ] **Charts page (`/charts`)** — all 14 charts render, filters work, per-chart overrides, export works
- [ ] **Reports** — `/reports/power`, `/reports/flex`, `/reports/methodology` — content renders, embedded charts work
- [ ] **Other pages** — `/about`, `/contact`, `/data`, `/demandkit`
- [ ] **Navigation** — active page indicator, transitions between pages
- [ ] **Mobile** — responsive breakpoints, map toggle, chart sizing
- [ ] **Error states** — API down behavior, missing data graceful fallback

Findings:
> (fill in during review)

### 2b. Charts Review (What Else Could We Build)

Current charts (14): AreaChart, TimeLine, SegmentBars, Histogram, GeoBarChart, SectorPieChart, PeriodHeatmap, GeoSegmentChart, StackedSectorChart, MonthlyWeekProfile, FlexImpactChart, FlexPeakBars, GeoPieChart, Map

- [ ] Are there data dimensions not yet visualized?
- [ ] Scenario comparison charts (A vs B side-by-side)
- [ ] Yearly/daily profile comparison (the misaligned one)
- [ ] Peak demand visualization (beyond FlexPeakBars)
- [ ] Geographic comparison (county vs county)
- [ ] Summary/dashboard chart (key metrics at a glance)

Ideas:
> (fill in during review)


---

## 3. Deployment

Staging is fully live via the first CI-driven deploy. See FINISH_LINE_DONE.md § "First CI-driven staging deploy + Phase 1 perf fixes" and § "Session B — Staging environment brought online". What's left:

### Production stack — Phase 6 *(not started)*

Mirror of the staging work, but the apex DNS cutover waits on the current Vercel app retiring.

- [ ] `./infrastructure/setup.sh production` — creates App Runner service, explorer + data S3 buckets (with versioning), CloudFront distribution, IAM roles
- [ ] `./api/scripts/promote-data.sh` — same-region server-side copy from `behovskartan-data-staging` → `behovskartan-data-production` (~1 min for 17 GB)
- [ ] DNS: `api.behovskartan.se` → App Runner, eu-central-1 ACM cert, same `associate-custom-domain --no-enable-www-subdomain` flow as staging. New Route53 records only — no touching `@`/`www`/`beta`.
- [ ] Create GitHub Environment `production` via `gh api` with production values for all 10 variables
- [ ] **Enable `required_reviewers` protection rule on `production`** — the human-approval gate before any deploy
- [ ] Build and push an initial ECR image via a workflow_dispatch → production (or locally) to get the App Runner service healthy before first deploy
- [ ] First real deploy: `git checkout production && git merge staging && git push` → review + approve in Actions → verify `https://behovskartan.se`... (on temporary placeholder domain until apex cutover)
- [ ] **Deferred to post-Vercel-retirement**: Route53 `@` and `www.behovskartan.se` cutover from Vercel to production CloudFront. This is an **EDIT** to existing records, not a CREATE — handle as one planned change with before/after `dig` diffs.

### Follow-ups *(deferred, non-blocking)*

- [ ] **CI integration-test job with S3 data sync** — add a third CI job that syncs the non-scenarios data subset (~2 GB) from `behovskartan-data-staging` and runs `npm run test:integration`. Gate on pushes to deploy branches (not PRs). Design in `~/.claude/plans/wild-conjuring-kay.md` Phase 8b. Wait until the first CI-driven staging deploy is proven.
- [ ] **Handover documentation** — rewrite `docs/DEPLOYMENT.md` as a single-page handover doc covering URLs/resources, deploy commands, data update flow, rollback, and troubleshooting entry points. Wait until post-production cutover so the shape is stable.
- [ ] **Deprecated paraglide/lix packages** — `@inlang/paraglide-*` and `@lix-js/*` print deprecation warnings on every CI install. Non-blocking. Paired with the dependency cleanup in § 2e.
- [ ] **Node.js 20 → 24 on Actions runners** — GitHub Actions deprecated Node 20 images, forced-switching June 2026. Bump `actions/checkout@v4`/`setup-node@v4` usage after June 2nd, 2026.
- [ ] **Map micro-optimisations (Phase 2 of `dynamic-snuggling-flame.md`)** — only if filter responsiveness is still poor after Phase 1 perf fixes land in staging. Split `MapBox.svelte` `mergedData` into `featureSkeleton` + data derives; switch map colouring to `setFeatureState` + feature-state paint expression. Deferred per the plan document; revisit only if the slider-drag smoke test above is still laggy.

---

## 4. Additional Items

> Add anything else here as it comes up during the day.


---

## 5. Performance — Phase 2: loading UX

Phase 1 (compression, param_yearly.parquet, charts-loader dedupe, debounced filter writes) shipped in commit `10c3fd2` on branch `api-data-optimization` and is fully live on staging. See FINISH_LINE_DONE.md § "First CI-driven staging deploy + Phase 1 perf fixes". Plan file: `~/.claude/plans/dynamic-snuggling-flame.md`.

Phase 2 tackles the *appearance* of loading. Even with Phase 1 speedups, the cold-load sequence on `/` still feels jerky: empty layout → content card shell → empty chart frames → skeletons (briefly) → data snaps in → map loads last. Plan detail in `~/.claude/plans/dynamic-snuggling-flame.md` § Phase 2.

### Phase 2 tasks (branch `continued-data-api-work`)

- [ ] **2a. Default chart `loading = true`** — change `let loading = $state(false)` → `true` in all 13 chart components so the skeleton is visible from the first frame instead of one frame of empty-then-skeleton pop.
- [ ] **2b. Map skeleton overlay** — `LoadingSkeleton variant="map"` covers the mapbox canvas in `MapBox.svelte` until the style has loaded AND the first `mergedData` is populated. Fade out on transition.
- [ ] **2c. Title + content placeholders on `/`** — replace `{#if content}` guards in `+page.svelte` with always-rendered title/description skeletons so the content card has visible shape immediately.
- [ ] **2d. Fade-in on chart reveal** — `transition:fade={{ duration: 200 }}` on existing chart wrapper elements so data→render doesn't snap. Do NOT add new wrappers around LayerChart components (per CLAUDE.md LayerChart rules).
- [ ] **2e. HomeMetrics skeleton** — placeholder numbers in each metric card while the two parallel fetches resolve; card shell/title/unit stay visible.

**Verification:** cold-load `/` with DevTools Performance — no empty stages, skeletons visible from first paint, smooth fade-in; throttled "Slow 4G" should feel intentional; no layout shift; `npx vitest run` + `npx svelte-check` both clean.

**Deferred to Phase 3** (revisit only if still jerky after Phase 2): compile-time markdown import via Vite glob (eliminates async content fetch), MapBox `mergedData` split into `featureSkeleton` + data derives, map `setFeatureState` coloring rewrite.
