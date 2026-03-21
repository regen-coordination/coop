import { type AgentMemory, agentMemorySchema } from '../../contracts/schema';
import { createId, hashJson, nowIso } from '../../utils';
import {
  type CoopDexie,
  deleteAgentMemories,
  listAgentMemories,
  saveAgentMemory,
} from '../storage/db';

export async function createAgentMemory(
  db: CoopDexie,
  input: Omit<AgentMemory, 'id' | 'createdAt' | 'contentHash' | 'domain' | 'scope'> &
    Partial<Pick<AgentMemory, 'scope'>> & {
      createdAt?: string;
      domain?: string;
    },
): Promise<AgentMemory> {
  const memory: AgentMemory = {
    ...input,
    scope: input.scope ?? 'coop',
    id: createId('agent-memory'),
    contentHash: hashJson({
      content: input.content,
      scope: input.scope ?? 'coop',
      coopId: input.coopId,
      memberId: input.memberId,
    }),
    createdAt: input.createdAt ?? nowIso(),
    domain: input.domain ?? 'general',
  };
  const validated = agentMemorySchema.parse(memory);
  await saveAgentMemory(db, validated);
  return validated;
}

type MemoryQueryScope =
  | string
  | {
      scope?: AgentMemory['scope'];
      coopId?: string;
      memberId?: string;
    };

function filterMemoriesByScope(memories: AgentMemory[], scope: MemoryQueryScope) {
  if (typeof scope === 'string') {
    return memories.filter((memory) => memory.scope === 'coop' && memory.coopId === scope);
  }

  if ((scope.scope ?? 'coop') === 'member') {
    return memories.filter(
      (memory) =>
        memory.scope === 'member' &&
        memory.memberId === scope.memberId &&
        (!scope.coopId || memory.coopId === scope.coopId || !memory.coopId),
    );
  }

  return memories.filter((memory) => memory.scope === 'coop' && memory.coopId === scope.coopId);
}

export async function queryRecentMemories(
  db: CoopDexie,
  scope: MemoryQueryScope,
  options?: { limit?: number; domain?: string; type?: AgentMemory['type'] },
): Promise<AgentMemory[]> {
  const limit = options?.limit ?? 10;
  let results = filterMemoriesByScope(await listAgentMemories(db), scope);

  if (options?.domain) {
    results = results.filter((m) => m.domain === options.domain);
  }
  if (options?.type) {
    results = results.filter((m) => m.type === options.type);
  }

  results.sort((a, b) => (b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0));

  return results.slice(0, limit);
}

export async function pruneExpiredMemories(db: CoopDexie): Promise<number> {
  const now = nowIso();
  const expired = (await listAgentMemories(db)).filter(
    (memory) => typeof memory.expiresAt === 'string' && memory.expiresAt < now,
  );

  if (expired.length === 0) return 0;

  await deleteAgentMemories(
    db,
    expired.map((memory) => memory.id),
  );
  return expired.length;
}

export async function deduplicateMemories(db: CoopDexie, coopId: string): Promise<number> {
  const memories = await queryRecentMemories(db, coopId, { limit: Number.MAX_SAFE_INTEGER });

  const byHash = new Map<string, AgentMemory[]>();
  for (const m of memories) {
    const group = byHash.get(m.contentHash) ?? [];
    group.push(m);
    byHash.set(m.contentHash, group);
  }

  const toDelete: string[] = [];
  for (const group of byHash.values()) {
    if (group.length <= 1) continue;
    // Sort newest first, delete all but the first
    group.sort((a, b) => (b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0));
    for (let i = 1; i < group.length; i++) {
      toDelete.push(group[i].id);
    }
  }

  if (toDelete.length === 0) return 0;

  await deleteAgentMemories(db, toDelete);
  return toDelete.length;
}

export async function queryMemoriesForSkill(
  db: CoopDexie,
  scope: string | { coopId: string; memberId?: string },
  _trigger?: string,
  options?: { limit?: number },
): Promise<AgentMemory[]> {
  const limit = options?.limit ?? 8;
  const coopId = typeof scope === 'string' ? scope : scope.coopId;
  const memberId = typeof scope === 'string' ? undefined : scope.memberId;

  const [memberMemories, coopSkillPatterns, coopOutcomes, coopDecisionContext, coopGeneral] =
    await Promise.all([
      memberId
        ? queryRecentMemories(
            db,
            {
              scope: 'member',
              memberId,
            },
            { limit },
          )
        : Promise.resolve([]),
      queryRecentMemories(db, { scope: 'coop', coopId }, { type: 'skill-pattern', limit }),
      queryRecentMemories(db, { scope: 'coop', coopId }, { type: 'observation-outcome', limit }),
      queryRecentMemories(db, { scope: 'coop', coopId }, { type: 'decision-context', limit }),
      queryRecentMemories(db, { scope: 'coop', coopId }, { limit }),
    ]);

  const seen = new Set<string>();
  const merged: AgentMemory[] = [];

  for (const memory of [
    ...memberMemories,
    ...coopSkillPatterns,
    ...coopOutcomes,
    ...coopDecisionContext,
    ...coopGeneral,
  ]) {
    if (seen.has(memory.id)) continue;
    seen.add(memory.id);
    merged.push(memory);
    if (merged.length >= limit) break;
  }

  return merged;
}

export async function enforceMemoryLimit(
  db: CoopDexie,
  coopId: string,
  maxEntries = 500,
): Promise<number> {
  const memories = await queryRecentMemories(db, coopId, { limit: Number.MAX_SAFE_INTEGER });

  if (memories.length <= maxEntries) return 0;

  // Sort oldest first
  memories.sort((a, b) => (a.createdAt > b.createdAt ? 1 : a.createdAt < b.createdAt ? -1 : 0));

  const excess = memories.length - maxEntries;
  const toDelete = memories.slice(0, excess).map((m) => m.id);

  await deleteAgentMemories(db, toDelete);
  return toDelete.length;
}
