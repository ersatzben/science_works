import type { APIRoute } from 'astro';
import { PROD_HOST } from '../lib/production.js';

// robots.txt is generated per-environment from the configured `site` (driven by
// SITE_URL in the deploy workflow). Non-production hosts stay fully blocked so
// staging never lands in an index; production opens up with the policy below.
//
// NB: indexing is gated on the host alone (not the full isProduction() identity
// gate), deliberately. Coupling it to the PRODUCTION env flag would deindex the
// live site if that var were ever unset — too sharp an edge for the indexing
// switch. The signposting/identity claims use the stricter two-lock gate; this
// only decides "is this the public host", which the host match answers.
//
// Policy (production): open to search engines and social/link-preview crawlers,
// and to AI *citation/search* bots (OAI-SearchBot, PerplexityBot) — these surface
// our work in AI answers with a link back, so they ride the open `User-agent: *`
// rules. AI *training / bulk* scrapers are blocked individually below.
const BLOCKED_AI_BOTS = [
  'GPTBot',             // OpenAI — model training
  'Google-Extended',    // Google — Gemini training (distinct from Googlebot)
  'ClaudeBot',          // Anthropic — training
  'anthropic-ai',       // Anthropic — legacy user-agent
  'CCBot',              // Common Crawl — feeds many training corpora
  'Bytespider',         // ByteDance / TikTok
  'Amazonbot',          // Amazon
  'Applebot-Extended',  // Apple — model training (distinct from Applebot)
  'Meta-ExternalAgent', // Meta — model training
  'Diffbot',
  'Omgilibot',
  'PetalBot',
];

export const GET: APIRoute = ({ site }) => {
  const isProd = site?.host === PROD_HOST;

  const lines = isProd
    ? [
        '# Production — open to search, social, and AI citation/search bots.',
        'User-agent: *',
        'Allow: /',
        '',
        '# AI training / bulk scrapers — blocked.',
        '# (AI citation bots like OAI-SearchBot and PerplexityBot are allowed above.)',
        ...BLOCKED_AI_BOTS.flatMap((bot) => [`User-agent: ${bot}`, 'Disallow: /']),
        '',
        `Sitemap: ${new URL('sitemap-index.xml', site).href}`,
      ]
    : [
        '# Non-production environment — keep the whole site out of every index.',
        'User-agent: *',
        'Disallow: /',
      ];

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
