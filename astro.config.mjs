import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import remarkTocAlias from './src/plugins/remark-toc-alias.mjs';

export default defineConfig({
  integrations: [mdx()],
  markdown: {
    remarkPlugins: [remarkTocAlias],   // [[TOC: Short]] heading aliases (also inherited by MDX)
  },
});
