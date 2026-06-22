// Build-time PDF generator for the /writing articles.
//
// Runs as a `postbuild` step: after `astro build` produces dist/, we serve dist/
// over a throwaway local HTTP server, load each article in headless Chromium
// (so the page's own JS runs — PathSplit panels, collapsibles, etc. enhance),
// emulate print media to pick up the @media print rules in WritingLayout, and
// write a paper-clean PDF next to the page at dist/writing/<slug>.pdf.
//
// The "Download PDF" button in WritingLayout links to that same path.
//
// Env knobs (for local iteration only):
//   PDF_ONLY_SLUG=<slug>   generate just one article
//   PDF_SCREENSHOT=1       also dump a print-emulated PNG to the OS temp dir,
//                          a quick visual proxy for the printed layout
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const WRITING = join(DIST, 'writing');

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

async function main() {
  if (!existsSync(WRITING)) {
    console.error('[pdf] dist/writing not found — run `astro build` first.');
    process.exit(1);
  }

  const only = process.env.PDF_ONLY_SLUG;
  const wantShot = !!process.env.PDF_SCREENSHOT;

  const server = await serveDist(DIST);
  const { port } = server.address();
  const base = `http://localhost:${port}`;

  let slugs = await articleSlugs();
  if (only) slugs = slugs.filter((s) => s === only);
  if (slugs.length === 0) { console.warn('[pdf] no articles to render.'); server.close(); return; }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  console.log(`[pdf] rendering ${slugs.length} article(s)…`);

  for (const slug of slugs) {
    const url = `${base}/writing/${slug}/`;
    await page.goto(url, { waitUntil: 'networkidle' });
    // Print rules + collapsible-expand listeners key off print media.
    await page.emulateMedia({ media: 'print' });
    // Don't shoot/print before webfonts have swapped in.
    await page.evaluate(() => (document.fonts ? document.fonts.ready : null));

    const out = join(WRITING, `${slug}.pdf`);
    await page.pdf({
      path: out,
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', bottom: '18mm', left: '16mm', right: '16mm' },
      displayHeaderFooter: true,
      // Slim footer: page number centred, muted. (Header left empty.)
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="width:100%;font-family:Roboto,Arial,sans-serif;font-size:8px;color:#9a8a90;text-align:center;">' +
        '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });

    if (wantShot) {
      const shot = join(tmpdir(), `pdf-preview-${slug}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      console.log(`  · preview → ${shot}`);
    }
    console.log(`  ✓ /writing/${slug}.pdf`);
  }

  await browser.close();
  server.close();
  console.log('[pdf] done.');
}

main().catch((err) => { console.error('[pdf] failed:', err); process.exit(1); });
