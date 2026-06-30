// Maps a piece's content `type` to the vocabularies it needs to present as a
// scholarly object:
//   • schemaType  — schema.org @type used in the page's JSON-LD
//   • signpost    — the URI used for FAIR Signposting `rel="type"` (the generic
//                   scholarly class crawlers key off, independent of @type)
//   • csl         — CSL type for the machine-readable bibliographic record
//                   (src/pages/writing/[slug].json.ts), what Zotero et al. ingest
//   • label       — human label
//
// IMPORTANT — forthcoming taxonomy. The content model is moving to a richer set
// of output types (Notes, Essays, Long Reads, Reports, and later software
// outputs). When those land, (1) widen the `type` enum in content.config.ts and
// (2) add a row here — every consumer (JSON-LD, signposting, CSL, _headers) reads
// from this one table, so there is no other code to touch. Today's `schemaType`
// values are intentionally left as the existing output (Article/Report) so this
// change doesn't alter current structured data; revisit `schemaType` alongside
// the taxonomy work.
export const SCHOLARLY_TYPES = {
  essay:  { schemaType: 'Article', signpost: 'https://schema.org/ScholarlyArticle', csl: 'article-magazine', label: 'Essay' },
  report: { schemaType: 'Report',  signpost: 'https://schema.org/Report',           csl: 'report',           label: 'Report' },
  // Placeholders for the forthcoming taxonomy — uncomment + enum-widen when ready:
  // note:     { schemaType: 'Article', signpost: 'https://schema.org/ScholarlyArticle', csl: 'article-magazine', label: 'Note' },
  // longread: { schemaType: 'Article', signpost: 'https://schema.org/ScholarlyArticle', csl: 'article-magazine', label: 'Long Read' },
};

export function scholarlyType(type) {
  return SCHOLARLY_TYPES[type] ?? SCHOLARLY_TYPES.essay;
}
