# Supplied PDFs

Hand-laid-out PDFs for pieces that must NOT use the auto-generated,
page-scraped version — an open letter on letterhead, a designed report.

To use one:

1. Drop the file here, named after the piece's slug:
   `assets/pdfs/<slug>.pdf`
2. Add `pdf: "/assets/pdfs/<slug>.pdf"` to that piece's frontmatter.

That one frontmatter line does everything: the Download PDF button points at
your file, the `rel="item"` signpost cites it, and the build stops generating a
competing version (see `scripts/generate-pdfs.mjs`).

`npm run check` will tell you if the frontmatter points at a file that isn't
here.
