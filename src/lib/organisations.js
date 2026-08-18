// Organisations that can stand as the AUTHOR of a piece — house publications
// issued under the studio's own name rather than any individual's (an open
// letter, a collective statement, a submission to a consultation).
//
// These are deliberately not people. They must never go in people.json: that
// file feeds the /about page and the Organization `member` graph, so an entry
// there would list the studio as one of its own staff. Keeping them here means
// every surface that resolves an author name can ask "is this a person or an
// organisation?" and describe it correctly — a byline that links somewhere
// real, schema.org `Organization` instead of `Person`, and a CSL corporate
// author instead of a mangled personal name.
//
// Pure JS with no JSON or astro:content import, so the node-side content
// checker can import it as freely as the Astro pages do (the same constraint
// licensing.js is written to).

const ORGANISATIONS = {
  'Science Works': {
    name: 'Science Works',
    // Where the byline links, and what rel="author" signposts to. There is no
    // /people/<slug> page for the studio itself; /about is the page that
    // describes it.
    path: '/about',
    // Fragment identifying the canonical Organization node published on the
    // homepage (src/pages/index.astro). Reusing this @id makes an org-authored
    // piece reinforce the SAME entity that `worksFor` on every profile page
    // binds to, rather than minting a second, unlinked "Science Works".
    schemaId: '/#organization',
  },
};

// Returns the organisation record for an author name, or null if the name is a
// person (or simply unknown). `Object.hasOwn` rather than a bare lookup so an
// author unfortunate enough to be called "constructor" can't inherit a match
// from Object.prototype.
export function getOrganisation(name) {
  return Object.hasOwn(ORGANISATIONS, name) ? ORGANISATIONS[name] : null;
}
