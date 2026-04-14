# Generalization Plan: Splitting behovskartan into the Energy Toolkit family

## Context

`behovskartan` is currently structured as if it were the Energy Toolkit: Demand framework — README, `site/`, and CLAUDE.md all describe it as "a framework designed to be forked and customized." But there is no actual standalone framework repo: behovskartan is *both* the framework and one specific implementation (Sweden electricity demand for Energimyndigheten), with sample data, content, and branding baked in.

Two consequences:

1. **The toolkit.energy site lives inside the implementation repo.** `site/` is a fully built SvelteKit static site for toolkit.energy. It has no runtime coupling to api/ or explorer/ — it's a workspace, but it's never deployed (no CI job, no infrastructure entry). It's effectively dead code in this repo.
2. **The "fork-and-customize" story is broken.** `site/getting-started` already tells readers to `git clone github.com/YOUR-ORG/energy-toolkit-demand.git` — but no such repo exists.

## Decisions (locked in)

- **Naming**: `energy-toolkit-*` prefix under the existing `aidotse` GitHub org. No new org.
- **Framework shape**: Template/skeleton fork — a trimmed copy of behovskartan with sample data, Swedish content, and Energimyndigheten branding removed. Forkers clone, then point a coding agent at it to swap in their config and data. NOT a library/package extraction. NOT a cookiecutter CLI.
- **No setup wizard.** The `setup/` interactive CLI (`node setup/index.js`) is from a pre-coding-agent era. In 2026 a forker just opens the repo in Claude Code and says "configure this for X." We delete `setup/` from both repos rather than carrying it forward.
- **Sync model**: behovskartan keeps a git remote pointing at `energy-toolkit-demand` and pulls upstream changes manually (cherry-pick or merge). No automation, no submodules.
- **Phase order**: framework first (so the site has a real link target), then site (which actually goes live and needs SEO), then behovskartan cleanup.
- **Verification**: light. The framework repo doesn't need a working end-to-end stack on day one — it just needs to exist, build, and be obviously a stripped fork. Real testing happens when the first downstream forker uses it.

## Target layout

```
aidotse/energy-toolkit-demand    NEW — generalized framework (template repo)
aidotse/energy-toolkit-site      NEW — toolkit.energy website (deployable)
aidotse/behovskartan             EXISTING — Swedish/Energimyndigheten implementation
                                   (downstream fork of energy-toolkit-demand)
```

Future siblings: `energy-toolkit-generation` whenever the Generation tool actually exists.

## Working environment

Don't do this from a behovskartan-rooted session — three working trees gets messy. Start a new Claude Code session at `~/code` (or `/add-dir ~/code`) so it can `cd` between all three repos in one place.

---

## Phase 1 — Stand up `energy-toolkit-demand` (framework)

Goal: a real GitHub repo at `aidotse/energy-toolkit-demand` that the site can link to with a straight face. Light on verification; we are not shipping a tested product, we are creating a fork target.

1. **Create the repo**
   ```bash
   gh repo create aidotse/energy-toolkit-demand --public \
     --description "Open framework for generating, serving, and visualizing energy demand forecasts"
   ```
   Mark it as a GitHub Template repo in settings so the "Use this template" button works.

2. **Seed from behovskartan**
   ```bash
   cd ~/code
   git clone git@github.com:aidotse/behovskartan.git energy-toolkit-demand
   cd energy-toolkit-demand
   git remote remove origin
   git remote add origin git@github.com:aidotse/energy-toolkit-demand.git
   ```

3. **Strip — in this order:**
   - **Data**: `rm -rf data/*.parquet data/*.json` (keep the `data/` directory with a `.gitkeep` and a `README.md` explaining what goes there).
   - **Generator**: keep the transformation framework and scenario runner; delete `generator/notebooks/behovskartan2.ipynb` and any Sweden-specific input data. Replace with one minimal example notebook (or just a stub README — coding agents can scaffold the notebook later).
   - **Setup wizard**: `rm -rf setup/`, remove `"setup": "node setup/index.js"` from `package.json`, drop the `@inquirer/prompts` and `lodash` deps if nothing else uses them.
   - **Content**: delete everything under `explorer/src/content/sv/`. In `explorer/src/content/en/` replace behovskartan-specific copy with brief generic placeholders ("Your project description here") so a fresh fork renders coherently.
   - **Config**: replace `config.yaml` with a minimal generic stub — project name placeholder, empty scenarios/geographies/parameters lists, comments pointing at the docs.
   - **Branding**: remove logos, favicons, replace `behovskartan.se` URLs everywhere, delete Energimyndigheten references. Greppable audit:
     ```bash
     rg -i "behovskart|energimynd|svenska|sverige|sweden"
     rg "behovskartan\.se|api\.behovskartan"
     ```
     Both should return nothing in code/docs/content (markdown attributions to the original implementation are fine in the README's "Reference implementation" section).
   - **Site**: `rm -rf site/` (it lives in its own repo as of Phase 2 — but we strip it here to avoid carrying it). Remove `"site"` from `package.json` workspaces.
   - **Infra**: keep `infrastructure/setup.sh` and `.github/workflows/deploy.yml` as scaffolding but parameterize the project name and remove the staging/production behovskartan resource names. A README note tells forkers they need their own AWS account and GitHub Environments.
   - **Repo-internal docs**: delete `FINISH_LINE.md`, `FINISH_LINE_DONE.md`, `LAST_PLAN.md`, `GENERATOR.md`, `charts-snap.md`, all the screenshot PNGs at the repo root, `GENERALIZATION.md` itself. These are behovskartan's working notes.

4. **Rewrite README.md** as framework docs:
   - What it is, who it's for, what an implementation looks like.
   - "Use this template" / fork instructions.
   - "How to configure" — a one-paragraph nudge to use a coding agent (Claude Code, Cursor, etc.) pointed at `config.yaml` and the docs, NOT a wizard.
   - Link out to toolkit.energy and to behovskartan as the reference implementation.

5. **Update CLAUDE.md** so a coding agent landing in a fresh fork understands it's a framework template and what needs to be filled in. This is the most leveraged file in the whole repo — if it's good, configuring a fork becomes "open Claude Code, say what you want."

6. **One commit, push, tag `v0.1.0`.** No CI required for v0.1.0. Don't try to make the stack run end-to-end against a fixture — that's busywork. We'll harden it the first time a real forker hits a wall.

7. **Verify (light):**
   - `npm install` at root completes without errors.
   - The audit greps above are clean.
   - Repo is browseable on GitHub and obviously generic.

---

## Phase 2 — Stand up `energy-toolkit-site` (toolkit.energy)

Goal: a public, indexable site at `toolkit.energy` that points to the framework repo from Phase 1. This is the only thing in the plan that's actually visible to the outside world, so it gets the SEO attention.

1. **Create the repo**
   ```bash
   gh repo create aidotse/energy-toolkit-site --public \
     --description "Source for toolkit.energy — the Energy Toolkit website"
   ```

2. **Move `site/` with history**
   ```bash
   cd ~/code
   git clone git@github.com:aidotse/behovskartan.git energy-toolkit-site
   cd energy-toolkit-site
   git filter-repo --subdirectory-filter site
   git remote add origin git@github.com:aidotse/energy-toolkit-site.git
   git push -u origin main
   ```

3. **Update outbound links inside the site:**
   - "Fork and clone" → `github.com/aidotse/energy-toolkit-demand` (now a real link).
   - Projects page → `github.com/aidotse/behovskartan` and `behovskartan.se`.
   - Any remaining `YOUR-ORG` placeholders → `aidotse`.

4. **SEO + discoverability checklist** (the part the previous plan ignored):

   The site already has per-page `<svelte:head>` blocks with title/description on most routes. Build on that:

   - [ ] **Set canonical site URL** in `+layout.ts` so og:url and canonical tags are correct.
   - [ ] **Per-page `<title>` audit** — every route has a unique, descriptive title (≤60 chars). Currently most do; verify all 8 routes.
   - [ ] **Per-page `<meta name="description">`** — 140-160 chars, unique per page.
   - [ ] **Open Graph + Twitter Card tags** in `+layout.svelte` with page-level overrides:
         `og:title`, `og:description`, `og:url`, `og:type`, `og:image`, `twitter:card`, `twitter:image`.
   - [ ] **`og:image`** — design a single 1200×630 social card (can be a simple branded image) committed to `static/og-image.png`. Per-page overrides optional.
   - [ ] **`static/robots.txt`** — `User-agent: * / Allow: / / Sitemap: https://toolkit.energy/sitemap.xml`.
   - [ ] **`static/sitemap.xml`** — for ~8 static pages, a hand-written sitemap is fine. Or generate at build time with a tiny Vite plugin if pages grow.
   - [ ] **JSON-LD structured data** in `+layout.svelte` — at minimum a `WebSite` schema; on `/projects` a `SoftwareApplication` or `Dataset` per project is a nice-to-have.
   - [ ] **Prerender everything** — `export const prerender = true` in `+layout.ts` (it's `adapter-static` so this should already be implied, but make it explicit).
   - [ ] **`<html lang="en">`** is already set in `app.html` — keep it.
   - [ ] **Favicon set** — already has `favicon.svg`; add a 32×32 PNG fallback and a 180×180 apple-touch-icon for completeness.
   - [ ] **No `noindex`** anywhere — sanity check.

5. **Deploy**
   - **Cloudflare Pages** is the recommended path: free, fast global CDN, automatic HTTPS, zero-config SvelteKit/`adapter-static` deploys, simple custom domain setup, and good for SEO (fast TTFB everywhere).
   - Connect the GitHub repo, build command `npm run build`, output dir `build`.
   - Add `toolkit.energy` as a custom domain in the Pages project; Cloudflare handles the cert.
   - Update DNS at the registrar to point `toolkit.energy` at Cloudflare (or move the zone to Cloudflare DNS — easier).

6. **Post-deploy SEO submission:**
   - [ ] Verify the site in **Google Search Console** (DNS TXT record) and submit the sitemap.
   - [ ] Verify in **Bing Webmaster Tools** and submit the sitemap.
   - [ ] Run a PageSpeed Insights / Lighthouse pass; fix anything red.
   - [ ] Test the og:image with the Facebook Sharing Debugger and Twitter Card Validator.
   - [ ] Curl-check `robots.txt` and `sitemap.xml` are reachable.
   - [ ] Optional: post a single inbound link from a relevant spot (your own blog, the behovskartan README, the aidotse org page) so Google has a crawl path that isn't just direct submission.

7. **Repo hygiene:**
   - Add a thin `README.md` explaining what this repo is, how to run it locally, and where it deploys.
   - GitHub Actions workflow optional (Cloudflare Pages handles the build itself).

---

## Phase 3 — Reframe `behovskartan` as a downstream implementation

Small, clean PR(s) on this repo. Done after the framework and site exist.

1. **Delete `site/`** workspace, remove `"site"` from `package.json` workspaces, regenerate `package-lock.json`.
2. **Delete `setup/`** — remove the directory, the `"setup": "node setup/index.js"` script, and the `@inquirer/prompts` / `lodash` deps if nothing else needs them. Rationale: this repo is already configured; the wizard hasn't been run in months and isn't useful to a coding-agent workflow.
3. **Add upstream remote:**
   ```bash
   git remote add upstream git@github.com:aidotse/energy-toolkit-demand.git
   ```
4. **Rewrite `README.md`** to describe behovskartan as the Swedish electricity demand implementation of the Energy Toolkit: Demand framework, built for Energimyndigheten. Strip the framework-marketing language; that lives on toolkit.energy now. Link upstream to the framework repo and outward to toolkit.energy.
5. **Update top of `CLAUDE.md`** so future Claude sessions in this repo know it's an implementation, not the framework.
6. **Add `UPSTREAM.md`** — short note on the manual merge workflow:
   ```
   git fetch upstream
   git log upstream/main ^main          # see what's new
   git cherry-pick <sha>                # or: git merge upstream/main
   ```
7. **Leave alone:** `FINISH_LINE.md`, the in-flight Phase 6 production deploy, the Phase 2 loading-UX work, anything in `api/`, `explorer/`, `generator/`. This phase is paperwork, not code churn.

---

## Phase 4 — Cross-link

1. `energy-toolkit-demand/README.md` links to toolkit.energy and to behovskartan.
2. `energy-toolkit-site` projects page lists behovskartan with a screenshot and a link to behovskartan.se + the GitHub repo.
3. `behovskartan/README.md` links upstream to `energy-toolkit-demand` and outward to toolkit.energy.
4. (Optional) Update the aidotse org's GitHub profile README to surface the family.

---

## Critical files / paths

| Repo | File | Action |
|---|---|---|
| energy-toolkit-demand | (whole repo) | Create from cloned behovskartan, then strip |
| energy-toolkit-demand | `data/`, `setup/`, `site/` | Delete |
| energy-toolkit-demand | `config.yaml` | Replace with generic stub |
| energy-toolkit-demand | `explorer/src/content/sv/` | Delete |
| energy-toolkit-demand | `explorer/src/content/en/` | Replace with placeholders |
| energy-toolkit-demand | `infrastructure/setup.sh` | Parameterize project name |
| energy-toolkit-demand | `README.md`, `CLAUDE.md` | Rewrite as framework docs |
| energy-toolkit-demand | `package.json` | Drop `setup/site` workspaces and scripts |
| energy-toolkit-site | (whole repo) | `git filter-repo --subdirectory-filter site` from behovskartan |
| energy-toolkit-site | `app.html`, `+layout.svelte`, `+layout.ts` | OG/Twitter tags, canonical, JSON-LD |
| energy-toolkit-site | `static/robots.txt`, `static/sitemap.xml`, `static/og-image.png` | Create |
| behovskartan | `site/`, `setup/` | Delete |
| behovskartan | `package.json` | Remove `setup/site` workspaces and scripts |
| behovskartan | `README.md` | Reframe as implementation |
| behovskartan | `CLAUDE.md` | Update overview paragraph |
| behovskartan | `UPSTREAM.md` | Create |

## Out of scope

- Extracting reusable code into npm packages.
- Building a `create-energy-toolkit` CLI or any setup wizard. We are explicitly going the other direction.
- End-to-end testing the framework stack against a synthetic fixture before v0.1.0.
- Creating `energy-toolkit-generation` until the Generation tool exists.
- Touching FINISH_LINE Phase 6 production deploy or Phase 2 loading-UX work in behovskartan.
