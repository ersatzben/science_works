import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

// RSS feed for the Writing section. Mirrors the listing's visibility rules
// (no hidden or draft pieces) and newest-first ordering.
export async function GET(context) {
  const entries = (await getCollection('writing'))
    .filter((e) => !e.data.hidden && !e.data.draft)
    .sort((a, b) => b.data.date - a.data.date);

  return rss({
    title: 'Science Works — Writing',
    description: 'Essays, research and policy writing from Science Works on reshaping the British research system.',
    site: context.site,
    items: entries.map((e) => ({
      title: e.data.title,
      description: e.data.summary ?? e.data.subtitle ?? '',
      pubDate: e.data.date,
      link: `/writing/${e.id}/`,
      author: e.data.authors.join(', '),
    })),
  });
}
