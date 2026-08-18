// Scaffold a new writing piece: the MDX file with template frontmatter, and
// its image folder under public/assets/images/writing/<slug>/.
//
// Usage:
//   npm run new-post -- "Title of the Piece"
//   npm run new-post -- "Title" --type report --project "AI and Science" --author "Laura Ryan"
//
// Options (all optional):
//   --type <essay|report|longread>   defaults to essay
//   --project "<name>"               defaults to a TODO placeholder
//   --author "<name>"                repeatable; defaults to "Ben Johnson"
//   --date <YYYY-MM-DD>              defaults to today
//   --slug <custom-slug>             defaults to a slugified title
//
// New pieces start as draft: true — they build a page you can preview by URL
// but never appear in listings, feeds, or the homepage until you flip it.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { TYPE_KEYS } from '../src/lib/scholarly.js';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const args = process.argv.slice(2);
const title = args[0];
if (!title || title.startsWith('--')) {
  console.error('usage: npm run new-post -- "Title of the Piece" [--type essay|report|longread] [--project "Name"] [--author "Name"] [--date YYYY-MM-DD] [--slug custom-slug]');
  process.exit(1);
}

const opt = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const optAll = (flag) => {
  const out = [];
  for (let i = 1; i < args.length; i++) if (args[i] === flag && args[i + 1]) out.push(args[i + 1]);
  return out;
};

const slugify = (s) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const slug = opt('--slug', slugify(title));
const type = opt('--type', 'essay');
if (!TYPE_KEYS.includes(type)) {
  console.error(`✗ --type must be essay, report, longread, or note (got "${type}")`);
  process.exit(1);
}
const project = opt('--project', 'TODO — set the project name');
const date = opt('--date', new Date().toISOString().slice(0, 10));
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error(`✗ --date must be YYYY-MM-DD (got "${date}")`);
  process.exit(1);
}
const authors = optAll('--author');
if (!authors.length) authors.push('Ben Johnson');

const mdxPath = join(ROOT, 'src/content/writing', `${slug}.mdx`);
const mdPath = join(ROOT, 'src/content/writing', `${slug}.md`);
if (existsSync(mdxPath) || existsSync(mdPath)) {
  console.error(`✗ A piece with the slug "${slug}" already exists — pass --slug to pick another.`);
  process.exit(1);
}

const yq = (s) => `"${s.replace(/"/g, '\\"')}"`;

const frontmatter = `---
title: ${yq(title)}
# shortTitle: "Compact title for tight surfaces (homepage carousel)"
subtitle: "TODO — one- or two-sentence standfirst shown under the title"
# shortSubtitle: "Compact subtitle for the title block"
# summary: "Longer blurb for cards and the writing index; falls back to subtitle"
authors: [${authors.map(yq).join(', ')}]
date: ${date}
type: ${type}
project: ${yq(project)}
# contributors: ["Name"]
# related: ["another-piece-slug"]
# cover: "${slug}"          # cover JSON in src/data/covers (no extension); defaults to this slug
# license: "CC-BY-4.0"      # a code from src/lib/licensing.js; omit for the site default (CC BY 4.0)
# writers:                  # only for authors NOT on the /about page
#   - name: "Guest Author"
#     role: "Their role"
#     bio: "One-paragraph bio."
draft: true                 # excluded from all listings until you set this to false
---
import Figure from '../../components/Figure.astro';

## First section heading

Start writing here. Delete this placeholder text.

{/* How-tos — delete this comment block when you're done. Nothing inside it renders.

Images: put the files in public/assets/images/writing/${slug}/ and embed them with:

<Figure src="/assets/images/writing/${slug}/example.jpg" caption="A caption, with an optional <a href='https://example.com'>source link</a>." />

To give a long heading a short name in the sidebar table of contents, add a
marker at the very end of the heading line:

## A very long heading that would crowd the sidebar [[TOC: Short name]]

*/}
`;

writeFileSync(mdxPath, frontmatter);

const imgDir = join(ROOT, 'public/assets/images/writing', slug);
mkdirSync(imgDir, { recursive: true });
writeFileSync(join(imgDir, '.gitkeep'), '');

console.log(`✓ Created src/content/writing/${slug}.mdx (draft: true)`);
console.log(`✓ Created public/assets/images/writing/${slug}/ for this piece's images`);
console.log('');
console.log('Next steps:');
console.log('  1. Write the piece — fill in the TODO frontmatter fields as you go.');
console.log(`  2. Ask Laura for a cover: src/data/covers/${slug}.json (see docs/art-formats.md).`);
console.log(`     Until it exists the piece shows a neutral pixel placeholder — that's fine.`);
console.log('  3. Preview locally: npm run dev, then open http://localhost:4321/writing/' + slug);
console.log('  4. Validate: npm run check');
console.log('  5. When ready to publish, set draft: false and merge to main.');
