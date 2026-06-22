// Build-time PDF generator for the /writing articles.
//
// Runs as a `postbuild` step: after `astro build` produces dist/, we serve dist/
// over a throwaway local HTTP server, load each article in headless Chromium
// (so the page's own JS runs — PathSplit panels, collapsibles, etc. enhance),
// emulate print media to pick up the @media print rules in WritingLayout, and
// write a paper-clean PDF next to the page at dist/writing/<slug>.pdf.
//
// Running header (every page): the Science Works logo-mark + wordmark, top-right.
// On pages 2+ the essay title is added top-left. Because headless Chromium can't
// (a) render custom fonts inside page.pdf header/footer templates, nor (b) vary a
// running header by page number, we:
//   1. render the header strip to a PNG using the real brand fonts (isolated page),
//      once with the title (pages 2+) and once logo-only (page 1);
//   2. produce TWO full PDFs — one with each header image;
//   3. stitch page 1 from the logo-only PDF onto pages 2..n of the titled PDF.
// (See git history / the prototype for why fixed-position DOM headers don't work:
// Chromium clips them to the content box, so they can't live in the page margin.)
//
// The "Download PDF" button in WritingLayout links to /writing/<slug>.pdf.
//
// Env knobs (local iteration only):
//   PDF_ONLY_SLUG=<slug>   generate just one article
import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { createServer } from 'node:http';
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const WRITING = join(DIST, 'writing');

// A4 content width (210mm − 2×16mm side margins) in CSS px at 96dpi. Drives the
// header strip width so it lines up edge-to-edge with the article body.
const CONTENT_W = 673;

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.otf': 'font/otf', '.xml': 'application/xml', '.txt': 'text/plain',
};

// Minimal static file server over dist/ — enough to resolve absolute asset
// paths (/assets/..., fonts, css) and pretty URLs (/writing/<slug>/).
function serveDist(root) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        let p = decodeURIComponent((req.url || '/').split('?')[0]);
        let fp = join(root, p);
        if (existsSync(fp) && (await stat(fp)).isDirectory()) fp = join(fp, 'index.html');
        else if (!existsSync(fp) && existsSync(fp + '.html')) fp = fp + '.html';
        if (!existsSync(fp)) { res.statusCode = 404; res.end('not found'); return; }
        const body = await readFile(fp);
        res.setHeader('Content-Type', MIME[extname(fp)] || 'application/octet-stream');
        res.end(body);
      } catch (err) {
        res.statusCode = 500; res.end(String(err));
      }
    });
    server.listen(0, () => resolve(server));
  });
}

// Article slugs = subdirectories of dist/writing/ that hold an index.html
// (this naturally excludes dist/writing/index.html, the listing page itself).
async function articleSlugs() {
  const entries = await readdir(WRITING, { withFileTypes: true });
  const slugs = [];
  for (const e of entries) {
    if (e.isDirectory() && existsSync(join(WRITING, e.name, 'index.html'))) slugs.push(e.name);
  }
  return slugs.sort();
}

// Render the running-header strip to a PNG data URI, using the real brand fonts.
// Done in an isolated page so the article's own nav can't bleed into the capture.
// `title` empty → logo-only (page 1); non-empty → title left + logo right.
function makeStrip(stripPage, base) {
  return async (title) => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      @font-face{font-family:'AO';src:url('${base}/assets/fonts/antique-olive-std/Antique-Olive-Std-Bold_3863.woff2') format('woff2');font-weight:700;font-display:block;}
      @font-face{font-family:'CP';src:url('${base}/assets/fonts/Copperplate30.woff2') format('woff2');font-display:block;}
      html,body{margin:0;padding:0;background:#fff;}
      .strip{width:${CONTENT_W}px;box-sizing:border-box;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;border-bottom:1px solid #ddcac9;padding:0 0 6px;}
      .t{font-family:'CP',serif;font-size:11px;color:#66223b;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:64%;}
      .lg{display:flex;align-items:center;gap:6px;flex:0 0 auto;}
      .lg img{height:15px;width:auto;display:block;}
      .wm{font-family:'AO',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:-0.06em;font-size:15px;line-height:1;color:#eb3131;white-space:nowrap;transform:translateY(1px);}
    </style></head><body><div class="strip">
      <span class="t">${escapeHtml(title || '')}</span>
      <span class="lg"><img src="${base}/assets/images/FINAL4.svg" alt=""><span class="wm">Science Works</span></span>
    </div></body></html>`;
    await stripPage.setContent(html, { waitUntil: 'networkidle' });
    await stripPage.evaluate(() => document.fonts.ready);
    const buf = await stripPage.locator('.strip').screenshot();
    return 'data:image/png;base64,' + buf.toString('base64');
  };
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// page.pdf() never scrolls, so figures with loading="lazy" below the fold would
// come out blank. Make every image eager, scroll through once to trip any
// observer-based loaders, then wait for them all to settle (with a safety cap).
async function forceLoadImages(page) {
  await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll('img'));
    imgs.forEach((img) => { try { img.loading = 'eager'; img.removeAttribute('loading'); } catch (_) {} });
    const step = window.innerHeight || 800;
    for (let y = 0; y <= document.body.scrollHeight; y += step) window.scrollTo(0, y);
    window.scrollTo(0, 0);
    await Promise.all(imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return null;
      return Promise.race([
        new Promise((res) => {
          img.addEventListener('load', res, { once: true });
          img.addEventListener('error', res, { once: true });
        }),
        new Promise((res) => setTimeout(res, 8000)),   // never hang the build on one stuck image
      ]);
    }));
  });
  await page.waitForLoadState('networkidle');
}

const FOOTER =
  '<div style="width:100%;font-family:Roboto,Arial,sans-serif;font-size:8px;color:#9a8a90;text-align:center;">' +
  '<span class="pageNumber"></span> / <span class="totalPages"></span></div>';
const headerHtml = (src) =>
  `<div style="width:100%;margin:0;padding:0;-webkit-print-color-adjust:exact;">` +
  `<img src="${src}" style="display:block;width:178mm;margin:0 auto;"/></div>`;
const pdfOptions = (headerSrc) => ({
  format: 'A4',
  printBackground: true,
  margin: { top: '22mm', bottom: '18mm', left: '16mm', right: '16mm' },
  displayHeaderFooter: true,
  headerTemplate: headerHtml(headerSrc),
  footerTemplate: FOOTER,
});

async function main() {
  if (!existsSync(WRITING)) {
    console.error('[pdf] dist/writing not found — run `astro build` first.');
    process.exit(1);
  }

  const only = process.env.PDF_ONLY_SLUG;
  const server = await serveDist(DIST);
  const base = `http://localhost:${server.address().port}`;

  let slugs = await articleSlugs();
  if (only) slugs = slugs.filter((s) => s === only);
  if (slugs.length === 0) { console.warn('[pdf] no articles to render.'); server.close(); return; }

  const browser = await chromium.launch();
  const stripPage = await browser.newPage({ deviceScaleFactor: 2 });   // crisp logo/text
  const strip = makeStrip(stripPage, base);
  const page = await browser.newPage();
  console.log(`[pdf] rendering ${slugs.length} article(s)…`);

  for (const slug of slugs) {
    await page.emulateMedia({ media: 'screen' });   // reset so the print-change handlers re-fire
    await page.goto(`${base}/writing/${slug}/`, { waitUntil: 'networkidle' });
    await forceLoadImages(page);
    const title = await page.evaluate(() => {
      const h = document.querySelector('.article-title');
      return h ? h.textContent.trim() : document.title.replace(/\s+—\s+Science Works$/, '');
    });

    // Header images: logo-only for page 1, title+logo for the rest.
    const imgLogo = await strip('');
    const imgFull = await strip(title);

    await page.emulateMedia({ media: 'print' });
    // Belt-and-braces: make sure collapsibles are open for print.
    await page.evaluate(() => document.querySelectorAll('details.collapsible').forEach((d) => { d.open = true; }));
    await page.evaluate(() => (document.fonts ? document.fonts.ready : null));

    const bufLogo = await page.pdf(pdfOptions(imgLogo));
    const bufFull = await page.pdf(pdfOptions(imgFull));

    // Stitch: page 1 (logo-only) + pages 2..n (titled).
    const out = await PDFDocument.create();
    const docLogo = await PDFDocument.load(bufLogo);
    const docFull = await PDFDocument.load(bufFull);
    const [first] = await out.copyPages(docLogo, [0]);
    out.addPage(first);
    const restIdx = docFull.getPageIndices().slice(1);
    if (restIdx.length) (await out.copyPages(docFull, restIdx)).forEach((p) => out.addPage(p));
    await writeFile(join(WRITING, `${slug}.pdf`), await out.save());

    console.log(`  ✓ /writing/${slug}.pdf  (${out.getPageCount()}pp)`);
  }

  await browser.close();
  server.close();
  console.log('[pdf] done.');
}

main().catch((err) => { console.error('[pdf] failed:', err); process.exit(1); });
