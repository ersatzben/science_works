import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

// "Writing" is the umbrella: essays AND reports share one pipeline + index.
const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    authors: z.array(z.string()),
    date: z.coerce.date(),
    type: z.enum(['essay', 'report']),
    project: z.string(),
    summary: z.string().optional(),          // longer blurb for cards/index; falls back to subtitle
    illustration: z.string().optional(),     // pixel-art essay image
    illustrationPixelated: z.boolean().default(false),  // nearest-neighbour render for low-res pixel art
    contributors: z.array(z.string()).optional(),
    pdf: z.string().optional(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    // Structural, placed by the layout (not authored inline):
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
