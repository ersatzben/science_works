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
  essay:    { schemaType: 'Article', signpost: 'https://schema.org/ScholarlyArticle', csl: 'article-magazine', label: 'Essay' },
  report:   { schemaType: 'Report',  signpost: 'https://schema.org/Report',           csl: 'report',           label: 'Report' },
  // A Long Read is an Essay editorially — longer-form — but structurally identical
  // (same schema.org/CSL vocab); only the human label differs.
  longread: { schemaType: 'Article', signpost: 'https://schema.org/ScholarlyArticle', csl: 'article-magazine', label: 'Long Read' },
  // A Note is a shorter piece; scholarly-metadata-wise it presents the same way
  // as an Essay (Article/ScholarlyArticle/article-magazine) — only the label differs.
  note:     { schemaType: 'Article', signpost: 'https://schema.org/ScholarlyArticle', csl: 'article-magazine', label: 'Note' },
  // An open letter. Editorially distinct — addressed to someone, signed, often
  // with its own laid-out PDF — but presented with the same scholarly vocab as
  // an Essay, per the note above about not disturbing existing structured data.
  // If the taxonomy work later wants true fidelity, schema.org/Message and the
  // CSL `document` type are the closer fits; `personal_communication` is NOT,
  // as it denotes unpublished correspondence and reference managers treat it
  // differently. Only the label differs today.
  letter:   { schemaType: 'Article', signpost: 'https://schema.org/ScholarlyArticle', csl: 'article-magazine', label: 'Letter' },
};

// The valid `type` values, in the order they should be offered to a reader.
// Derived here so the content schema, the validator, the scaffolder and the
// writing-index filter cannot drift from this table — adding a row above is
// genuinely the only edit a new type needs.
export const TYPE_KEYS = Object.keys(SCHOLARLY_TYPES);

export function scholarlyType(type) {
  return SCHOLARLY_TYPES[type] ?? SCHOLARLY_TYPES.essay;
}
