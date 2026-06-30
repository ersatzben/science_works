import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

// "Writing" is the umbrella: essays AND reports share one pipeline + index.
const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    shortTitle: z.string().optional(),       // compact title for tight surfaces (homepage carousel); falls back to title
    subtitle: z.string().optional(),
    shortSubtitle: z.string().optional(),    // compact subtitle for the title block; falls back to subtitle
    authors: z.array(z.string()),
    date: z.coerce.date(),
    type: z.enum(['essay', 'report']),
    project: z.string(),
    summary: z.string().optional(),          // longer blurb for cards/index; falls back to subtitle
    cover: z.string().optional(),            // cover json name in src/data/covers (no extension); defaults to the slug
    contributors: z.array(z.string()).optional(),
    pdf: z.string().optional(),
    // Per-piece reuse license — a code from src/lib/licensing.js (e.g.
    // "CC-BY-4.0", "CC-BY-NC-4.0", "all-rights-reserved"). Omitted → site default
    // (CC BY 4.0). Drives rel="license", the JSON-LD license, and the CSL record.
    license: z.string().optional(),
    // Persistent identifier for citation/preservation. INERT until one is minted:
    // unset, cite-as falls back to the canonical URL. A bare DOI ("10.xxxx/yyyy")
    // or a full URL both work — kept provider-agnostic (Zenodo first, Crossref
    // later is just a different string here, no code change).
    doi: z.string().optional(),
    draft: z.boolean().default(false),
    hidden: z.boolean().default(false),     // exclude from the site entirely: no page is built and it appears in no listing
    featured: z.boolean().default(false),
    // Author details for writers NOT on the /about page (external/guest authors).
    // Authors who ARE on /about resolve automatically from people.json by name —
    // no need to list them here. An entry here whose `name` matches an `authors`
    // name supplies (or overrides) that author's role/bio/photo for this piece.
    writers: z.array(z.object({
      name: z.string(),
      role: z.string().optional(),
      bio: z.string().optional(),
      photo: z.string().optional(),
    })).optional(),
    related: z.array(reference('writing')).optional(),
  }),
});

export const collections = { writing };
