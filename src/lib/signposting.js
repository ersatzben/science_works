// FAIR Signposting (https://signposting.org) — make each published piece a
// machine-legible scholarly object using off-the-shelf link relations, so a
// crawler arriving at the landing page can discover the author, the persistent
// citation, the license, a machine-readable record, and the content (PDF)
// without scraping the HTML.
//
// This module is the single source of truth for the relation SET. It is consumed
// by two emitters:
//   • the HTML floor — <link> tags in WritingLayout (always available)
//   • the HTTP ceiling — Link: headers in dist/_headers (only on a host that
//     honours them; inert on GitHub Pages, lights up on Cloudflare Pages)
// Both render the SAME relations, so they can never drift.
//
// Everything here is pure JS (no astro:content) so the node postbuild script can
// import it too. Production gating lives in the callers, not here.
import { profilePath } from './people.js';
import { resolveLicense } from './licensing.js';
import { scholarlyType } from './scholarly.js';

// cite-as is the keystone (RFC 8574): the ONE persistent identifier to cite.
// Kept prefix-agnostic so switching DOI providers (Zenodo first, Crossref later)
// is a frontmatter change, never a refactor:
//   • a bare DOI (10.xxxx/yyyy) → resolved through doi.org
//   • a full URL                → used as-is
//   • absent                    → falls back to the canonical landing-page URL
export function doiToURL(doi) {
  if (!doi) return null;
  const v = String(doi).trim().replace(/^doi:/i, '');
  return /^https?:\/\//i.test(v) ? v : `https://doi.org/${v}`;
}

export function citeAsURL({ doi, canonical }) {
  return doiToURL(doi) || canonical;
}

// Build the ordered list of signposting relations for one piece. Returns
// [{ rel, href, type? }] — emitter-agnostic.
export function signpostingLinks({ citeAs, license, typeUrl, authors, describedby, pdf, collection }) {
  const links = [];
  for (const href of authors) links.push({ rel: 'author', href });
  links.push({ rel: 'cite-as', href: citeAs });
  links.push({ rel: 'type', href: typeUrl });
  links.push({ rel: 'type', href: 'https://schema.org/AboutPage' });
  if (license) links.push({ rel: 'license', href: license });
  if (describedby) links.push({ rel: 'describedby', href: describedby.href, type: describedby.type });
  if (pdf) links.push({ rel: 'item', href: pdf, type: 'application/pdf' });
  if (collection) links.push({ rel: 'collection', href: collection });
  return links;
}

// Resolve a content entry + the env's site URL into its full relation set.
// `site` is a URL (Astro.site or the endpoint `site`).
export function pieceSignposting(entry, site) {
  const d = entry.data;
  const canonical = new URL(`/writing/${entry.id}/`, site).href;
  const lic = resolveLicense(d.license);
  const st = scholarlyType(d.type);
  const authors = d.authors
    .map((name) => profilePath(name))
    .filter(Boolean)
    .map((p) => new URL(p, site).href);

  return signpostingLinks({
    citeAs: citeAsURL({ doi: d.doi, canonical }),
    license: lic.url,
    typeUrl: st.signpost,
    authors,
    describedby: {
      href: new URL(`/writing/${entry.id}.json`, site).href,
      type: 'application/vnd.citationstyles.csl+json',
    },
    pdf: new URL(d.pdf ?? `/writing/${entry.id}.pdf`, site).href,
    collection: new URL('/writing', site).href,
  });
}

// Format one relation as an HTTP Link field-value (for dist/_headers).
export function toLinkHeader({ rel, href, type }) {
  return `<${href}>; rel="${rel}"` + (type ? `; type="${type}"` : '');
}
