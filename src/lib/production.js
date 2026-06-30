// The single production gate for the whole site.
//
// A "production identity claim" is anything that asserts this deploy IS the
// canonical science.works of record: FAIR Signposting cite-as / DOI / license
// links, the machine-readable metadata record, the HTTP Link headers. Those must
// NEVER be emitted from staging, a preview, or a local build — a stray staging
// copy claiming the production identity would poison citation/preservation tools.
//
// So the gate is deliberately belt-and-braces: BOTH conditions must hold.
//   1. site-URL match — the configured `Astro.site` host is exactly the
//      production host. (Same check robots.txt already uses.)
//   2. explicit env flag — PRODUCTION=true, set ONLY in the production repo's
//      deploy workflow (Settings → Variables → PRODUCTION=true).
//
// Why both: if staging is ever misconfigured with SITE_URL=https://science.works
// the env flag is still absent, so it stays inert. If a local build sets
// PRODUCTION=true the host is still staging, so it stays inert. Neither lock
// alone can fail open.
export const PROD_HOST = 'science.works';

// `site` is a URL (Astro.site / the endpoint `site`); guard for undefined.
export function isProduction(site) {
  const hostMatch = site?.host === PROD_HOST;
  const flag =
    typeof process !== 'undefined' && process.env && process.env.PRODUCTION === 'true';
  return Boolean(hostMatch && flag);
}
