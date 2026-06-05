import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import remarkTocAlias from './src/plugins/remark-toc-alias.mjs';

export default defineConfig({
  // Staging deploy: GitHub Pages on a root-served subdomain (no `base` needed).
  // Swap this to the apex domain (https://science.works) at production launch.
  site: 'https://staging.science.works',
  integrations: [mdx()],
  markdown: {
    remarkPlugins: [remarkTocAlias],   // [[TOC: Short]] heading aliases (also inherited by MDX)
  },
});
