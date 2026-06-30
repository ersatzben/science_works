import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { resolveLicense } from '../../lib/licensing.js';
import { scholarlyType } from '../../lib/scholarly.js';
import { doiToURL } from '../../lib/signposting.js';

// Per-piece machine-readable bibliographic record at /writing/<slug>.json, in
// CSL-JSON (the format Zotero / reference managers ingest). It is the target of
// the page's rel="describedby" signpost, turning each essay into a citable
// scholarly object that tools can import without scraping the HTML.
//
// Emitted in every environment: the URLs/identifiers are derived from the env's
// own `site`, so a staging record describes the staging URL — self-consistent,
// never a production-identity claim. (rel="describedby" only POINTS here in
// production; see WritingLayout + production.js.)

export async function getStaticPaths() {
  const entries = await getCollection('writing');
  return entries
    .filter((entry) => !entry.data.hidden)
    .map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}

// "Given Family" → CSL { family, given }. Single-token names → family only.
// (Good enough; a per-author override can come with the people/ORCID work.)
function cslName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { family: parts[0] };
  return { family: parts[parts.length - 1], given: parts.slice(0, -1).join(' ') };
}

export const GET: APIRoute = ({ props, site }) => {
  const { entry } = props as { entry: any };
  const d = entry.data;
  const canonical = new URL(`/writing/${entry.id}/`, site).href;
  const lic = resolveLicense(d.license);
  const date: Date = d.date;

  const csl: Record<string, unknown> = {
    id: canonical,
    type: scholarlyType(d.type).csl,
    title: d.title,
    author: d.authors.map(cslName),
    issued: { 'date-parts': [[date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]] },
    URL: canonical,
    publisher: 'Science Works',
    language: 'en-GB',
    ...(d.summary || d.subtitle ? { abstract: d.summary ?? d.subtitle } : {}),
    ...(d.doi ? { DOI: String(d.doi).trim().replace(/^doi:/i, ''), 'cite-as': doiToURL(d.doi) } : {}),
    // Non-standard but harmless extension fields; importers ignore unknown keys.
    ...(lic.url ? { license: lic.url } : {}),
  };

  return new Response(JSON.stringify(csl, null, 2), {
    headers: { 'Content-Type': 'application/vnd.citationstyles.csl+json; charset=utf-8' },
  });
};
