import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import remarkTocAlias from './src/plugins/remark-toc-alias.mjs';

export default defineConfig({
  // Per-environment site URL, driven by the SITE_URL repo variable in the deploy
  // workflow (set to https://science.works in the production repo). Falls back to
  // staging so local builds and the staging repo work with no variable set.
  site: process.env.SITE_URL ?? 'https://staging.science.works',
  integrations: [mdx()],
  // science.works/aria → science.works (also applies on staging; harmless).
  redirects: {
    '/aria': '/',
  },
  markdown: {
    remarkPlugins: [remarkTocAlias],   // [[TOC: Short]] heading aliases (also inherited by MDX)
  },
});
