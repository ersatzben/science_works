# FAIR Signposting, licensing & DOI/preservation

How science.works presents each published piece as a machine-legible scholarly
object, using off-the-shelf standards and without depending on the host to
preserve us. This is the map; the code is the territory.

## The production gate (read this first)

A **production-identity claim** is anything asserting that *this* deploy is the
canonical science.works of record: the FAIR Signposting `cite-as` / `license` /
`describedby` / `item` links, the DOI, and the HTTP `Link` headers. None of these
may ever escape from staging, a preview, or a local build.

`src/lib/production.js` → `isProduction(site)` is the single gate. It is **two
locks, both required**:

1. **site-URL match** — `Astro.site.host === 'science.works'`
2. **env flag** — `process.env.PRODUCTION === 'true'`, set **only** in the
   production repo's Actions variables (`Settings → Variables → PRODUCTION=true`).

Either lock alone fails safe: misconfigure staging with `SITE_URL=https://science.works`
and the flag is still absent; set `PRODUCTION=true` locally and the host is still
staging. Signposting simply does not render off production.

> Indexing (`robots.txt`) is deliberately **not** behind this gate — it keys on
> host alone, so a missing `PRODUCTION` var can never deindex the live site. See
> the comment in `src/pages/robots.txt.ts`.

## What each piece emits (production)

On every non-hidden essay/report, in the HTML `<head>` (the floor) and in
`dist/_headers` as `Link:` headers (the ceiling — same relation set, one source):

| rel           | points at                                  |
|---------------|--------------------------------------------|
| `author`      | each author's `/people/<slug>` profile     |
| `cite-as`     | the DOI if minted, else the canonical URL  |
| `type`        | `schema.org/ScholarlyArticle` (+ `AboutPage`) |
| `license`     | the piece's license URL                    |
| `describedby` | `/writing/<slug>.json` (CSL-JSON record)   |
| `item`        | `/writing/<slug>.pdf`                       |
| `collection`  | `/writing`                                 |

Plus the existing Article/Report + Breadcrumb JSON-LD (now carrying `license`).
The license is currently machine-readable only — no visible on-page license line.

Single source of truth for the relation set: `src/lib/signposting.js`
(`pieceSignposting`). Both emitters call it, so the `<link>` tags and the `Link:`
headers cannot drift.

## Licensing (per-piece, not site-wide)

Declared in frontmatter, `license: <code>`, resolved by `src/lib/licensing.js`.
Omit it and the site default (`CC-BY-4.0`) applies — so nothing regresses, and any
piece can override. Codes: `CC-BY-4.0`, `CC-BY-SA-4.0`, `CC-BY-ND-4.0`,
`CC-BY-NC-4.0`, `CC0-1.0`, `all-rights-reserved`. Add rows to `LICENSES` as needed.

## DOIs (plumbing laid, inert)

Frontmatter `doi:` is unset everywhere today. The moment a DOI is minted, paste it
into the piece's frontmatter — `cite-as`, the CSL record, and the `Link` headers
pick it up; absent, they fall back to the canonical URL. No code change.

Kept **provider-agnostic** (`doiToURL` in `src/lib/signposting.js`): a bare DOI is
resolved through `doi.org`, a full URL is used as-is. **Zenodo first** (free, and
doubles as preservation), **Crossref own-prefix later** is just a different string
in `doi:`, never a refactor.

## Preservation (sketch — decoupled from signposting)

Signposting makes us *findable/citable*; preservation makes us *durable*. They are
separate concerns and should stay decoupled.

Recommended first step — **Zenodo**, which gives a DOI *and* a preserved copy in
one deposition:

1. A manual/dispatch GitHub Action takes a piece's built PDF + its
   `/writing/<slug>.json` (CSL) and metadata, and `POST`s a Zenodo deposition via
   the REST API.
2. Auth via a `ZENODO_TOKEN` **Actions secret** — never in the repo.
3. Zenodo returns a DOI → paste into the piece's `doi:` frontmatter → next deploy,
   signposting/cite-as switch from canonical-URL to DOI automatically.
4. (Later) Crossref own-prefix for first-class scholarly DOIs; the `doi:` field and
   `cite-as` don't care which registrar minted it.

This stays a separate workflow file and is **not wired up** in this pass.

## Host migration (planned, not done here)

GitHub Pages **cannot** emit custom HTTP response headers, so the `Link`-header
ceiling is dormant on the current host. `dist/_headers` is generated regardless
(`scripts/generate-headers.mjs`): inert on GitHub Pages, **honoured automatically
on Cloudflare Pages / Netlify**. So the ceiling already ships and the eventual move
(Cloudflare Pages — apex domain, private repos, real `_headers`) needs *zero*
signposting rework. Everything here is host-agnostic by design.
