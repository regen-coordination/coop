import { z } from 'zod';

// ---------------------------------------------------------------------------
// Source types
// ---------------------------------------------------------------------------

export const knowledgeSourceTypeSchema = z.enum([
  'youtube',
  'github',
  'rss',
  'reddit',
  'npm',
  'wikipedia',
]);

export type KnowledgeSourceType = z.infer<typeof knowledgeSourceTypeSchema>;

// ---------------------------------------------------------------------------
// KnowledgeSource — one allowlisted external source per coop
// ---------------------------------------------------------------------------

export const knowledgeSourceSchema = z.object({
  id: z.string().min(1),
  type: knowledgeSourceTypeSchema,
  /** Type-specific identifier: YouTube channel URL, GitHub "owner/repo", RSS URL, etc. */
  identifier: z.string().min(1),
  label: z.string().min(1),
  coopId: z.string().min(1),
  addedBy: z.string().min(1),
  addedAt: z.string().datetime(),
  lastFetchedAt: z.string().datetime().optional(),
  entityCount: z.number().int().nonnegative().default(0),
  active: z.boolean().default(true),
});

export type KnowledgeSource = z.infer<typeof knowledgeSourceSchema>;
