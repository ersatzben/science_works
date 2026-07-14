# Operations: deploys, domains, access & continuity

The map of everything that keeps science.works running that is *not* in the
code itself — and the plan for making sure no single person is a point of
failure. Companion to [fair-signposting.md](fair-signposting.md) (which covers
the scholarly-metadata layer and its production gate in depth).

## How the site is hosted

Fully static: `astro build` produces `dist/`, GitHub Pages serves it. There is
no server, database, or CMS anywhere. The git repository is the complete source
of truth — if GitHub Pages disappeared tomorrow, `dist/` could be served from
any static host with no code changes (an `_headers` file for Cloudflare/Netlify
is already generated on production builds, precisely for that migration).

## Two repositories, one codebase

| | Staging | Production |
| --- | --- | --- |
| Repo | `ersatzben/science_works_new` (git remote `origin`) | `ersatzben/science_works` (git remote `prod`) |
| URL | staging.science.works | science.works |
| Actions variables | none (defaults apply) | `SITE_URL=https://science.works`, `PRODUCTION=true` |

Day-to-day work happens on `origin`. Pushing `main` to a repo triggers that
repo's deploy (`.github/workflows/deploy.yml`), so:

- **Deploy to staging:** merge/push to `main` on origin.
- **Deploy to production:** `git push prod main` — a deliberate, separate act.

The `PRODUCTION=true` variable is the second lock on the production gate
(`src/lib/production.js`): scholarly identity claims (Signposting, DOIs,
`_headers`) only render when *both* the site URL is science.works *and* that
variable is set. Never set it on staging; never work around it. Both variables
are confirmed set on the production repo (as of 2026-07-14).

Pull requests run `.github/workflows/check.yml` (content validation + build).

**Recommended, not yet enabled — branch protection:** on both repos, GitHub →
Settings → Branches → add a rule for `main` requiring the "Validate content and
build" check to pass. With that in place, a broken piece physically cannot
stall a deploy.

## Domain & DNS — Porkbun

The `science.works` domain is registered at **Porkbun**, which also serves its
DNS. What the records do: the apex (`science.works`) points at GitHub Pages'
servers for the production repo; `staging.science.works` points at GitHub Pages
for the staging repo. The `CNAME` file GitHub Pages needs is written by the
deploy workflow automatically (from `SITE_URL`) — never add one to the repo.

Things that can silently kill the site and belong on a calendar/monitoring
list:

- **Domain renewal.** Confirm auto-renew is on in Porkbun and the payment card
  is current. An expired domain takes down the site *and* email.
- **DNS changes.** Any change to the apex records breaks the site within hours.
  Don't edit records without a reason written down.

## Access & business continuity

Current single points of access, and the plan for each:

| Asset | Where | Status / plan |
| --- | --- | --- |
| Both GitHub repos + Pages settings + Actions variables | Personal account `ersatzben` | **To do:** share admin with (or transfer to) a central Science Works GitHub organisation, so no personal account is load-bearing |
| Porkbun account (domain + DNS) | Porkbun | **In progress:** credentials going into the shared password manager as part of the business continuity plan |
| Email (contact@ / ben@ / laura@ science.works) | Wherever MX points (check Porkbun DNS) | Record the provider and admin access in the continuity plan |
| DOI / preservation accounts (Zenodo etc.) | Not yet minted | When created, record credentials in the continuity plan (see fair-signposting.md) |

When the GitHub organisation move happens, remember the parts that do **not**
transfer automatically: Actions variables (`SITE_URL`, `PRODUCTION`), Pages
custom-domain settings, and branch protection rules must be re-checked on the
new owner, and the Porkbun DNS records re-pointed if the Pages hostname
changes.

## When a deploy fails

The live site never breaks from a failed build — it just stays on the previous
version. Diagnose from the repo's **Actions** tab: open the red run, read the
log, or paste it to Claude Code.

**The PDF step is the most fragile part** (it downloads a headless Chromium and
renders every article to PDF). If deploys are failing on "Install Chromium" or
`generate-pdfs`, and you need to ship *now*:

1. In `.github/workflows/deploy.yml`, change the build step from
   `npm run build` to `npx astro build && node scripts/generate-headers.mjs`
   (this skips only the PDFs) and remove/comment the "Install Chromium" step.
2. Push, deploy, breathe. Note: article "Download PDF" buttons will 404 until
   the step is restored — revert the workflow change as soon as the underlying
   problem is fixed (usually a Playwright version bump: `npm update playwright`).

## Dependencies

`npm ci` pins everything via `package-lock.json`, so builds are reproducible
and nothing updates by itself. Guidance for non-technical maintainers:

- Routine security bumps: ask Claude Code to run `npm audit` and apply safe fixes.
- **Never take an Astro major-version upgrade casually** — that's a real
  migration; do it with technical help and test on staging first.

## Emergency contacts / escalation

Anything not covered here: open Claude Code in this folder and describe the
problem — `CLAUDE.md` gives it the context. Failing that, the repo history and
these docs are written to let any competent web developer take over cold.
