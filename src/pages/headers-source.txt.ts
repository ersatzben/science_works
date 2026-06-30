import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { isProduction } from '../lib/production.js';
import { pieceSignposting, toLinkHeader } from '../lib/signposting.js';

// Build-time source for the host-level HTTP Link headers (the FAIR Signposting
// "ceiling"). It renders the SAME relation set as the page <link> tags, in
// Cloudflare/Netlify `_headers` syntax, which scripts/generate-headers.mjs then
// moves to dist/_headers and deletes this file.
//
// Why a route + a postbuild move (not a static public/_headers): the content is
// per-piece and derived from the collection, which only Astro can read. Why a
// move (not emitting dist/_headers directly): Astro ignores files starting with
// "_" in src/pages, so the route can't be named _headers.
//
// Prod-gated: off production this returns empty, so no _headers is written and
// the host advertises nothing. Inert on GitHub Pages (which ignores _headers);
// lights up automatically if/when the site moves to a host that honours it.

export const GET: APIRoute = async ({ site }) => {
  if (!isProduction(site)) {
    return new Response('', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const entries = (await getCollection('writing')).filter((e) => !e.data.hidden && !e.data.draft);

  const blocks = entries.map((entry) => {
    const links = pieceSignposting(entry, site).map((l) => `  Link: ${toLinkHeader(l)}`);
    // Match against the deployed (trailing-slash) landing-page path.
    return `/writing/${entry.id}/\n${links.join('\n')}`;
  });

  return new Response(blocks.join('\n\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
