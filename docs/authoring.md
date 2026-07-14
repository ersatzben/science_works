# Adding and editing writing on science.works

This is the runbook for publishing a new essay or report. It assumes **no
technical knowledge**. The strongly recommended way to work is with Claude Code
open in this project folder — you describe what you want in plain English and it
does the typing. Every step below tells you what to ask for, and (if you prefer
to do it by hand) exactly what to do yourself.

> **The one-minute version:** run `npm run new-post -- "Your Title"`, write your
> piece in the file it creates, preview with `npm run dev`, run `npm run check`,
> set `draft: false`, and push to main. The site rebuilds itself in a few
> minutes. Publishing to staging first is the default — production is a
> deliberate second step (see "Publishing" below).

## One-time setup

You need this folder on your computer with its tools installed. If someone gave
you the project already set up, skip this.

1. Install [Node.js](https://nodejs.org) (LTS version) and [GitHub Desktop](https://desktop.github.com),
   or ask Claude Code to check what's missing.
2. Clone the repository `ersatzben/science_works_new` (GitHub Desktop → File →
   Clone Repository).
3. In a terminal in the project folder, run `npm install` (once).

With Claude Code: open it in the project folder and say *"set me up to work on
this site"* — it will check all of the above.

## Starting a new piece

**Ask Claude Code:** *"Start a new essay called 'Why Institutions Forget', by me
and Laura, in the Institutional Dynamism project."*

**Or by hand:**

```
npm run new-post -- "Why Institutions Forget" --author "Ben Johnson" --author "Laura Ryan" --project "Institutional Dynamism"
```

This creates two things:

- `src/content/writing/why-institutions-forget.mdx` — the piece itself, with
  every metadata field templated and explained in comments
- `public/assets/images/writing/why-institutions-forget/` — the folder for this
  piece's images

New pieces start as **`draft: true`**: the page exists (you can preview it, and
share the URL for feedback once deployed) but it appears in no listing, feed, or
homepage surface until you flip it. Note that a draft is *unlisted*, not
*private* — anyone with the exact URL can read it on the live site.

## Writing

Open the `.mdx` file in any text editor. The top section between the `---`
lines is the metadata (frontmatter); everything below is the piece, written in
[Markdown](https://www.markdownguide.org/basic-syntax/):

- `## Section heading` for headings — see "Heading levels" below
- `*italics*`, `**bold**`, `[link text](https://example.com)`
- Footnotes: `like this.[^1]` then `[^1]: The footnote text.` anywhere below.

### Heading levels

The piece's title is rendered from the frontmatter, so **never use `#` (a
single hash) in the body**. Sections are `##`, subsections within them are
`###`. Every existing piece follows this, and the sidebar table of contents is
built from the `##` headings.

### Drafting in Google Docs

If a piece was drafted in Google Docs, don't copy-paste it — export it as
Markdown instead: in Docs, **File → Download → Markdown (.md)**, then paste
that file's contents below the frontmatter of your scaffolded piece. Two
things to fix up afterwards:

- **Heading levels:** Docs exports its "Heading 1" as `#`. Either use
  Heading 2/3 styles in the doc from the start, or demote every heading one
  level after pasting (`#` → `##`, `##` → `###`).
- **Images don't survive the export** — download them from the doc separately
  and add them with `<Figure>` as described below.

The easiest route: give Claude Code the exported file and say *"tip this into
the new piece and fix the headings and images"*.

The metadata fields you must fill in: `title`, `subtitle`, `authors`, `date`,
`type` (essay / report / longread), `project`. Everything else is optional and
explained by the comments in the template. Two useful ones:

- `summary:` — a longer blurb used on cards and the writing index (otherwise
  the subtitle is reused).
- `related:` — up to a few slugs of other pieces to cross-promote at the end.
- `featured: true` — puts the piece in the homepage "In Focus" slot (remember
  to remove the flag from whichever piece held it before; see
  [homepage.md](homepage.md)).

### Images

1. Put the image file (JPG/PNG, reasonable size — under ~500 KB each) in
   `public/assets/images/writing/<your-slug>/`.
2. Embed it in the text:

```
<Figure src="/assets/images/writing/why-institutions-forget/lab.jpg" caption="A caption, with an optional <a href='https://example.com'>source link</a>." />
```

Mind the quotes: the caption uses double quotes outside, single quotes for any
link inside. The `import Figure` line the template put at the top of the file
must stay.

### Long headings in the sidebar

The article's sidebar table of contents uses your headings. If one is too long,
give it a short label by ending the heading line with a marker:

```
## A very long heading that would crowd the sidebar [[TOC: Short name]]
```

The marker never appears in the article itself.

### Cover art

Every piece has pixel-art cover (the mosaic on its card). **Laura makes these**
— ask her for a cover for your slug; the file goes at
`src/data/covers/<your-slug>.json` (format details in [art-formats.md](art-formats.md)).
Until it exists, the piece shows a neutral placeholder — publishing without a
cover is fine; it can be added later.

## Previewing

**Ask Claude Code:** *"show me the piece in the browser"* — or run
`npm run dev` and open `http://localhost:4321/writing/<your-slug>`.

The preview updates live as you save the file.

## Checking your work

Run `npm run check` (or ask Claude Code to). It looks for the mistakes that
break pages — missing images, bad metadata, dangling links between pieces —
and explains each one in plain English. Fix errors; warnings are advisory.

This same check runs automatically on GitHub when you open a pull request, so
a broken piece can't take down the site.

## Publishing

1. Set `draft: false` in the frontmatter (delete the line or change the value).
2. Commit and push to `main` on GitHub Desktop (or ask Claude Code to). If
   you're not confident, open a pull request instead — the automatic checks
   will run and someone can review.
3. Pushing `main` deploys **staging** (staging.science.works) automatically,
   in about 3–5 minutes. Check your piece there.
4. Production (science.works) is a separate, deliberate push:
   `git push prod main` — or ask Claude Code / Ben. See
   [operations.md](operations.md) for how the two environments work.

## Editing an existing piece

Just edit its file in `src/content/writing/`, preview, `npm run check`, push.
The PDF version regenerates automatically on every deploy — no extra step.

## If something goes wrong

- **The site didn't update after a push** — the build probably failed. Check the
  "Actions" tab on the GitHub repository for a red ✗, open it, and read the
  log; or paste the log to Claude Code and ask it to diagnose. The live site
  is never broken by a failed build — it just stays on the previous version.
- **`npm run check` reports errors you don't understand** — paste them to
  Claude Code.
- **A red ✗ mentioning "PDF" or "playwright"** — the PDF generation step is the
  most fragile part of the build and it can fail for reasons unrelated to your
  writing. See the failure playbook in [operations.md](operations.md).
