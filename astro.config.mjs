import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import fs from 'node:fs';
import remarkTocAlias from './src/plugins/remark-toc-alias.mjs';
import rehypeExternalLinks from './src/plugins/rehype-external-links.mjs';

import sitemap from '@astrojs/sitemap';

// Dev-only save endpoint for the splash canvas editor (/dev/canvas-editor):
// POST /__splash-save writes the painted artwork straight back to
// src/data/splash/canvas.json (Vite HMR then refreshes the homepage).
// configureServer only runs on the dev server — production builds and the
// deployed site have no trace of this.
const splashCanvasSave = {
  name: 'splash-canvas-save',
  configureServer(server) {
    server.middlewares.use('/__splash-save', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const ok = data && Number.isInteger(data.cols) && Number.isInteger(data.rows)
            && Array.isArray(data.palette) && data.palette.every((h) => /^#[0-9a-f]{6}$/i.test(h))
            && Array.isArray(data.cells) && data.cells.length === data.cols * data.rows;
          if (!ok) throw new Error('malformed canvas payload');
          const out = { cols: data.cols, rows: data.rows, palette: data.palette, cells: data.cells };
          fs.writeFileSync(new URL('./src/data/splash/canvas.json', import.meta.url), JSON.stringify(out) + '\n');
          res.setHeader('Content-Type', 'application/json');
          res.end('{"ok":true}');
        } catch (e) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: String(e.message) }));
        }
      });
    });
  },
};

export default defineConfig({
  // Per-environment site URL, driven by the SITE_URL repo variable in the deploy
  // workflow (set to https://science.works in the production repo). Falls back to
  // staging so local builds and the staging repo work with no variable set.
  site: process.env.SITE_URL ?? 'https://staging.science.works',
  integrations: [
    mdx(),
    // Keep the sitemap to indexable URLs: drop the noindex policy stubs, the
    // /aria redirect, and internal /dev/ tools so it matches the
    // canonical/robots story.
    sitemap({
      filter: (page) => !/\/(privacy|terms|cookies|aria)\/?$/.test(page) && !/\/dev\//.test(page),
    }),
  ],
  // science.works/aria → science.works (also applies on staging; harmless).
  redirects: {
    '/aria': '/',
  },
  markdown: {
    remarkPlugins: [remarkTocAlias],            // [[TOC: Short]] heading aliases (also inherited by MDX)
    rehypePlugins: [rehypeExternalLinks],       // external links open in a new tab (inherited by MDX)
  },
  vite: {
    plugins: [splashCanvasSave],
  },
});