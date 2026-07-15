# The homepage, top to bottom

Everything on the homepage lives in one file, `src/pages/index.astro`. This is
the high-level map of its containers — what each block is called, what content
feeds it, and where to edit the common things. (It is not every element; open
the file and search for the class names below.)

```
<section id="splash">              Hero
├─ .stage                          desktop hero
│  ├─ #splash-canvas               animated pixel-mosaic landscape
│  └─ .hero-box                    headline overlay
│     ├─ .hero-title               the H1 headline
│     └─ .hero-tag                 the strapline under the rule
└─ .mobile-hero                    mobile hero (SEPARATE text — see note)
   └─ .mhero-hero
      ├─ .mhero-title              mobile headline
      ├─ .mhero-blurb              mobile intro paragraph
      └─ .mhero-actions            the two buttons

.rr-promo                          full-bleed promo band (→ /reorganising-research)
├─ .rr-heading-block               band heading
└─ .rr-promo-cards
   ├─ .rr-promo-essay              left card (the essay)
   └─ .rr-promo-cfe                right card (call for evidence)

<section class="spotlight" id="projects">   Featured projects
├─ .spotlight-intro                left, pinned while scrolling
│  ├─ .intro-pic                   mobile intro illustration
│  └─ .spotlight-intro-footer      the small stat/link items
└─ .spotlight-main
   └─ .projects                    one .project-body + .project-detail
                                   per project, each with its art strip

.content-wrap-lower                lower page wrapper
├─ <section class="infocus">       "In Focus" + quote
│  ├─ .infocus-card                one highlighted piece of writing
│  └─ .quote-box                   a pull quote
├─ <section class="reports">       writing carousel
│  └─ .reports-box
│     ├─ .carousel-track           the .report-card items
│     └─ .carousel-arrows
└─ <section class="community">     community band
   └─ .community-grid
      ├─ .mg-viewer                visitor-mosaic gallery (arrows + 20×20 grid)
      ├─ .mg-text                  gallery heading + blurb
      └─ .community-join           the CTA cards (Build Club, live calls)
```

## Where the content comes from (and how to change it)

| What | Fed by | To change it |
| --- | --- | --- |
| Hero headline & strapline | Hard-coded text in `.hero-box` **and again** in `.mhero-hero` | Edit **both** — desktop and mobile heroes are separate markup |
| Hero animation | `src/data/splash/canvas.json` + `src/lib/splashConfig.mjs` | Paint it live at `/dev/canvas-editor` while `npm run dev` is running |
| Promo band art | `src/data/decor/reorganising-research-banner.json` | Replace the JSON (see [art-formats.md](art-formats.md)) |
| Featured project cards | Text hard-coded in each `.project-detail`; art from `src/data/projects/<slug>.json` (18×37) | Edit the text in place; new project also needs `src/lib/projects.js` updated |
| "In Focus" piece | The first piece with `featured: true` in its frontmatter (newest piece if none is flagged) | Set `featured: true` on the piece you want; unset the old one |
| Pull quote | First entry in `src/data/quotes.json` | Edit that file (`text` can be a string or a list of paragraphs; `author` is the attribution) |
| Writing carousel | All published pieces (not draft/hidden), newest first; covers shown **square** | Nothing to do — it updates itself when pieces publish |
| Mosaic gallery | One `{ "code": "…", "name": "…" }` JSON per mosaic in `src/data/gallery/` — `code` is the 400-char `mosaic_code` from a submission email, `name` the artist credit | Add a file (filename order = display order); colours come from the shared palette in `src/lib/mosaicPalette.js`, which is **append-only** |
| Community CTA cards | Hard-coded in `.community-join`; the Build Club URL is the `BUILD_CLUB_URL` constant at the top of the file | Edit in place |
| Page `<title>` and structured data | The `BaseLayout` line and the `orgJsonLd` block at the top of the file | Edit with care — the JSON-LD feeds Google's understanding of the organisation |

The header and footer are not in this file — they're `src/components/Header.astro`
and `src/components/Footer.astro`, shared across every page via
`src/layouts/BaseLayout.astro`.

After any homepage change: `npm run dev`, eyeball desktop *and* a narrow
window (the hero and project strips swap to different markup on mobile), then
`npm run check` before pushing.
