# The Last Plan

**Progress: 10 / 31**

We are bringing this project over the finish line. This document is the single source of truth for all remaining work. It consolidates tasks from PLANS.md, EXPLORER_PLAN.md, CHART_LIBRARY_REDESIGN.md, DATA_ANALYSIS_TODO.md, and GENERATOR.md into one actionable checklist.

## Overview

| Category | Items | Priority | Status |
|----------|-------|----------|--------|
| A. Bug Fixes & Critical Issues | 2 | Highest | Done |
| B. Explorer - Main Page (/) | 6 | High | Partial |
| C. Explorer - New Pages | 3 | High | Done |
| D. Explorer - Charts Page (/charts) | 4 | Medium | Partial |
| E. Explorer - Visual & Layout | 3 | Medium | Pending |
| F. Explorer - Content & i18n | 3 | Medium | Partial |
| G. API | 2 | High | Partial |
| H. Generator | 2 | Low | Pending |
| I. Data Research | 3 | High | In Discovery |
| J. Infrastructure & DevOps | 3 | Medium | Partial |
| K. Deferred / Out of Scope | - | - | Parked |

---

## A. Bug Fixes & Critical Issues

These block other work and should be addressed first.

- [x] **A1. Map widget not updating on scenario change** ✓ Done
  Fixed by expanding all 5 growth parameters from 4 values to 7 (0%, -15%, -10%, -5%, +5%, +10%, +15%), matching the actual 6 S-curve indices in the curve notebooks. Regenerated housing_growth curves.parquet, all parameter parquets, and updated OpenAPI schema.

- [x] **A2. API performance optimization** ✓ Done
  Added two new pre-aggregated tables: `geo_segment_yearly.parquet` (8,190 rows) for the previously uncovered geoFilter=all + segFilter=all query shape, and `param_yearly.parquet` (171,990 rows) pre-computing yearly totals for all parameter combinations. All yearly queries now use aggregated tables regardless of parameter state (~50-100x faster). Added HTTP cache headers (ETag + Cache-Control) to /demand responses with 304 Not Modified support.

---

## B. Explorer - Main Page (/)

The landing page is the most important user-facing surface. These items shape the first impression.

- [x] **B1. Double pie chart** (replace single SectorPieChart) ✓ Done
  Side-by-side comparison with two modes: year comparison (2025 vs selected year) and scenario comparison (baseline vs adjusted). Includes delta indicators, comparison toggle, and smart collapsing when sides are identical.

- [ ] **B2. Infobox: what drives electricity demand**
  Add a prominent content box explaining the key drivers of electricity demand (electrification, industry, transport, datacenters, etc.). Should be concise and visual.

- [ ] **B3. Chart descriptions**
  Each chart on the main page should have a short descriptive text explaining what it shows and why it matters. Use the ContentBlock component infrastructure already built.

- [ ] **B4. Scenario selector variation text box**
  Below the scenario selector, show a compact text box: "Variation on base scenario: [parameter values that differ from base]". Makes it immediately clear what the current scenario changes.

- [ ] **B5. Change highlight/accent color**
  Current highlight color doesn't match the visual identity. Update to something more in style with the overall design.

- [x] **B6. (Potential) Map extends under main card** ✓ Done
  Explore whether the map can extend beneath the main content card for a more immersive layout. Mark as potential - depends on how it looks in practice.

---

## C. Explorer - New Pages

Three new pages need to be created. Each follows the existing page patterns (PageContainer, PageHeader, etc.) and route structure.

- [x] **C1. Effekt page** ✓ Done
  `/reports/power` - Full educational report covering energy vs power, peak demand, segment profiles, and flexibility. Includes PowerConceptChart, ChartEmbed, LoadProfileChart, and FlexIllustrationChart components.

- [x] **C2. Flex page** ✓ Done
  `/reports/flex` - Comprehensive report on demand flexibility: why flex matters, what can flex, Sweden-specific context, the flex model, per-segment effects, and practical implications. Includes FlexIllustrationChart, FlexFactorChart, and LoadProfileChart components.

- [x] **C3. Segment curves methodology page** ✓ Done
  `/reports/methodology` - Five-step methodology walkthrough from Energimyndigheten scenarios through interpolation, load profiles, scenario parameters, to quality assurance. Includes MethodologySteps, InterpolationChart, LoadProfileChart, and GrowthLevelGrid components.

---

## D. Explorer - Charts Page (/charts)

The charts page exists with a basic card grid, global controls, and export. These items finish it.

- [ ] **D1. Chart categorization and navigation**
  Group charts into categories (Temporal, Geographic, Sectoral, Comparative). Add category tabs or sidebar navigation and search/filter.

- [ ] **D2. Per-chart parameter controls**
  Allow each chart card to override global parameters (year, geography, segment, resolution). Use the ChartParameterPill components already built in `controls/`.

- [ ] **D3. Export optimization**
  Add export size presets (PowerPoint 16:9, Web, Print A4). Add copy-to-clipboard for quick sharing. Consider bulk download as ZIP.

- [ ] **D4. Chart templates**
  Create 5-10 pre-configured chart setups: executive dashboard, scenario comparison matrix, regional deep-dive, sectoral transformation, load duration curve, seasonal pattern analysis.

---

## E. Explorer - Visual & Layout

- [ ] **E1. Page layout improvements**
  Review and adjust layouts across all pages for consistency. Ensure content hierarchy is clear and pages don't feel empty or cluttered.

- [ ] **E2. New color scale** `BLOCKED: depends on Caisa`
  New color scale for charts needs to come from Caisa. Once received, update `chartConfig.ts` and all chart components.

- [ ] **E3. Highlight color adjustment**
  Same as B5 - update the accent/highlight color used across the UI to match the agreed visual identity.

---

## F. Explorer - Content & i18n

Content infrastructure (ContentBlock, GlossaryTerm, MethodologyLink, MarkdownLayout) is built. These items put it to use.

- [x] **F1. Content migration to markdown** ✓ Done
  All report pages, about page, and data page use markdown content files under `content/sv/`. ContentShell + ReportLayout provide the rendering pipeline. Directive preprocessor enables embedding Svelte components in markdown.

- [x] **F2. Bilingual support (sv/en)** ✓ Done
  Content system supports locale-based loading via `contentLoader.ts`. Swedish content files in `content/sv/`. Message files used for UI chrome. Language switching wired through Paraglide.

- [ ] **F3. Glossary terms**
  Define and add glossary entries for domain-specific terms (effekt, energi, flexibilitet, segment, scenario, etc.). Wire up GlossaryTerm component in content.

---

## G. API

- [x] **G1. Performance optimization** ✓ Done (covered by A2)
  HTTP cache headers added, aggregated tables cover all yearly query shapes including parameterized queries.

- [ ] **G2. Endpoint gap review**
  Review whether all data needed by new pages (Effekt, Flex, Methodology) is served by existing endpoints. Add any missing endpoints to `generate-api.js`.

---

## H. Generator

The generator is mature. These are cleanup items.

- [ ] **H1. Notebook cleanup**
  Remove the `USE_NESTED_STRUCTURE` flag and related branching logic from generator notebooks. This was a transitional flag from the Strategy 2 migration.

- [ ] **H2. Curve file validation improvements**
  Improve error messages and validation for curve input files. Currently validation can be disabled; ensure it catches common data issues before they propagate.

---

## I. Data Research

These are research and data acquisition tasks that feed into the generator. Each ends with a "scenario fork" - creating divergent scenario parameters.

- [ ] **I1. First 3 segments** (Housing/Services)
  - We have: Gothenburg Energy and Skovde Energi profiles
  - In progress: Getting data from Umea or Pitea Energy
  - Tasks: Initial analysis (compare curves, check patterns, correlation), mark where we have profiles on the map, add curves to base scenarios
  - End goal: Scenario fork with realistic variation

- [ ] **I2. Datacenters**
  - Meet to discuss approach
  - Probable solution: correlate demand to outdoor temperature (daily + seasonal)
  - Randomize training peaks
  - Potentially add cycling compressors behavior
  - End goal: Scenario fork

- [ ] **I3. Transport**
  - Contact Jocke (Filip to reach out)
  - Get BK1 data from Behovskartan 1
  - End goal: Scenario fork

---

## J. Infrastructure & DevOps

- [ ] **J1. Testing framework** `BLOCKED: vite-plugin-svelte compatibility`
  Unit tests work for utilities/services (7 passing via Vitest). Svelte component tests are blocked by a compatibility issue with `vite-plugin-svelte`. 11 test files exist but component tests can't run. Investigate fix or workaround.

- [ ] **J2. CI/CD pipeline**
  Set up automated testing and build pipeline. AWS deployment infrastructure exists (from PR #110). Connect: push -> test -> build -> deploy.

- [ ] **J3. Deployment**
  Finalize deployment to AWS. Verify API and Explorer both deploy correctly. Test with production data.

---

## K. Deferred / Out of Scope

These items appeared in planning documents but are explicitly **not** part of the wrap-up. Documented here so they're not forgotten if the project continues.

| Item | Source | Reason |
|------|--------|--------|
| Scenario Explorer (discovery tool) | EXPLORER_PLAN.md | Too ambitious for wrap-up |
| Difference Analyzer (comparison tool) | EXPLORER_PLAN.md | Too ambitious for wrap-up |
| Insights Hub (guided narratives) | PLANS.md | Requires significant content work |
| Data Access Center (bulk downloads, Jupyter notebooks) | EXPLORER_PLAN.md | Post-launch feature |
| Interactive scenario builder | PLANS.md | Post-launch feature |
| Custom report generation / PDF export | PLANS.md | Post-launch feature |
| Drag-and-drop chart arrangement | CHART_LIBRARY_REDESIGN.md | Nice-to-have |
| Save/load/share chart configurations | CHART_LIBRARY_REDESIGN.md | Nice-to-have |
| Storybook - remaining component stories | PLANS.md | Low priority |
| Unified documentation website | PLANS.md | Low priority |
| Full accessibility audit (WCAG 2.1 AA) | EXPLORER_PLAN.md | Post-launch |
| Visual regression testing | PLANS.md | Post-launch |
| IndexedDB offline capability | EXPLORER_PLAN.md | Post-launch |
| Generator: geography-specific parameters | GENERATOR.md | Future enhancement |
| Generator: multi-segment parameters | GENERATOR.md | Future enhancement |
| Generator: dependent parameter bundles | GENERATOR.md | Future enhancement |
| Generator: alternative base scenarios | GENERATOR.md | Future enhancement |
| Print-optimized version | PLANS.md | Post-launch |
| Animated chart transitions | PLANS.md | Nice-to-have |

---

## Dependency Map

```
A1 (Map bug fix)  ──> B6 (Map extends under card)
A2 (API perf)     ──> Everything feels better

E2 (Color scale)  ══> BLOCKED on Caisa

G2 (Endpoint gap) ──> C1 (Effekt page)
G2 (Endpoint gap) ──> C2 (Flex page)

F1 (Content to MD) ──> B2 (Infobox), B3 (Chart descriptions)
F1 (Content to MD) ──> F2 (Bilingual support)

I1-I3 (Data)      ──> Generator runs ──> API data ──> Explorer shows it

J1 (Testing)      ══> BLOCKED on vite-plugin-svelte fix
J2 (CI/CD)        ──> J3 (Deployment)
```

---

## Working Agreement

- Track progress by checking boxes in this document
- When a task is done, check it off and note the date briefly if useful
- If a task turns out to be unnecessary, strike it through and note why
- If new work is discovered, add it to the appropriate section
- This document replaces PLANS.md, EXPLORER_PLAN.md, CHART_LIBRARY_REDESIGN.md, DATA_ANALYSIS_TODO.md as the active plan
