import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()),
    kind: z.enum(['Note', 'Project', 'Essay']).default('Note'),
    featured: z.boolean().default(false),
    // Keep this ID when renaming a published note to retain its likes.
    reactionId: z.string().min(1).max(160).regex(/^[a-zA-Z0-9/_-]+$/).optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    imageLabel: z.string().optional()
  })
});

export const collections = { notes };
