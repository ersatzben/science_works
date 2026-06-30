// Per-piece licensing. The license is declared in each piece's frontmatter
// (`license:`) as a short code; omit it and the site default applies. This
// replaces the old "site-wide CC BY 4.0 in the footer/terms" assumption with an
// explicit, per-object claim — which is what FAIR Signposting's rel="license"
// and the JSON-LD `license` need.
//
// Codes are SPDX-style so they read well in frontmatter and map cleanly to a URL
// (rel="license" / JSON-LD) and a human label. Add rows here as new licenses are
// needed — this is the single source of truth.
export const DEFAULT_LICENSE = 'CC-BY-4.0';

export const LICENSES = {
  'CC-BY-4.0':    { url: 'https://creativecommons.org/licenses/by/4.0/',    label: 'CC BY 4.0',    spdx: 'CC-BY-4.0' },
  'CC-BY-SA-4.0': { url: 'https://creativecommons.org/licenses/by-sa/4.0/', label: 'CC BY-SA 4.0', spdx: 'CC-BY-SA-4.0' },
  'CC-BY-ND-4.0': { url: 'https://creativecommons.org/licenses/by-nd/4.0/', label: 'CC BY-ND 4.0', spdx: 'CC-BY-ND-4.0' },
  'CC-BY-NC-4.0': { url: 'https://creativecommons.org/licenses/by-nc/4.0/', label: 'CC BY-NC 4.0', spdx: 'CC-BY-NC-4.0' },
  'CC0-1.0':      { url: 'https://creativecommons.org/publicdomain/zero/1.0/', label: 'CC0 1.0',   spdx: 'CC0-1.0' },
  // No public reuse grant. `url: null` → no rel="license" is emitted; the piece
  // is simply not advertised as openly licensed.
  'all-rights-reserved': { url: null, label: 'All rights reserved', spdx: null },
};

// Resolve a frontmatter code to a license record, falling back to the site
// default for an unset or unknown code.
export function resolveLicense(code) {
  return LICENSES[code] ?? LICENSES[DEFAULT_LICENSE];
}
