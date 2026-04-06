import type { KnowledgeSource } from '../../contracts/schema-knowledge';
import type { CoopDexie } from '../storage/db-schema';

export interface ListKnowledgeSourcesFilter {
  coopId: string;
  type?: KnowledgeSource['type'];
  active?: boolean;
}

export interface UpdateKnowledgeSourceMetaInput {
  lastFetchedAt?: string;
  entityCount?: number;
}

/**
 * Insert a new KnowledgeSource. Throws if the (coopId, identifier) pair already exists.
 */
export async function createKnowledgeSource(
  db: CoopDexie,
  source: KnowledgeSource,
): Promise<KnowledgeSource> {
  const existing = await db.knowledgeSources
    .where('[coopId+identifier]')
    .equals([source.coopId, source.identifier])
    .first();

  if (existing) {
    throw new Error(
      `Duplicate knowledge source: identifier "${source.identifier}" already exists for coop "${source.coopId}"`,
    );
  }

  await db.knowledgeSources.add(source);
  return source;
}

/**
 * Delete a KnowledgeSource by id. No-op if it does not exist.
 */
export async function removeKnowledgeSource(db: CoopDexie, id: string): Promise<void> {
  await db.knowledgeSources.delete(id);
}

/**
 * List KnowledgeSources for a coop with optional filters.
 */
export async function listKnowledgeSources(
  db: CoopDexie,
  filter: ListKnowledgeSourcesFilter,
): Promise<KnowledgeSource[]> {
  let collection = db.knowledgeSources.where('coopId').equals(filter.coopId);

  let results = await collection.toArray();

  if (filter.type !== undefined) {
    results = results.filter((s) => s.type === filter.type);
  }

  if (filter.active !== undefined) {
    results = results.filter((s) => s.active === filter.active);
  }

  return results;
}

/**
 * Partially update a KnowledgeSource's mutable metadata fields.
 * Throws if the source does not exist.
 */
export async function updateKnowledgeSourceMeta(
  db: CoopDexie,
  id: string,
  update: UpdateKnowledgeSourceMetaInput,
): Promise<KnowledgeSource> {
  const existing = await db.knowledgeSources.get(id);
  if (!existing) {
    throw new Error(`KnowledgeSource not found: ${id}`);
  }

  const updated: KnowledgeSource = {
    ...existing,
    ...(update.lastFetchedAt !== undefined ? { lastFetchedAt: update.lastFetchedAt } : {}),
    ...(update.entityCount !== undefined ? { entityCount: update.entityCount } : {}),
  };

  await db.knowledgeSources.put(updated);
  return updated;
}
