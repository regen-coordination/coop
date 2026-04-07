import type { GraphRelationship } from '../../contracts/schema-knowledge';
import type { GraphStore } from './store';

/**
 * Get all currently valid facts (edges) for an entity.
 * Returns only relationships where t_invalid is null.
 */
export function currentFacts(store: GraphStore, entityId: string): GraphRelationship[] {
  return store.relationships.filter(
    (r) => (r.from === entityId || r.to === entityId) && r.t_invalid === null,
  );
}

/**
 * Get facts (edges) that were valid at a specific point in time.
 * Returns relationships where t_valid <= timestamp AND (t_invalid is null OR t_invalid > timestamp).
 */
export function factsAt(
  store: GraphStore,
  entityId: string,
  timestamp: string,
): GraphRelationship[] {
  const ts = new Date(timestamp).getTime();

  return store.relationships.filter((r) => {
    if (r.from !== entityId && r.to !== entityId) return false;

    const validAt = new Date(r.t_valid).getTime();
    if (validAt > ts) return false;

    if (r.t_invalid !== null) {
      const invalidAt = new Date(r.t_invalid).getTime();
      if (invalidAt <= ts) return false;
    }

    return true;
  });
}

/**
 * Get the full temporal history of all facts for an entity,
 * ordered by t_valid ascending (oldest first).
 */
export function factHistory(store: GraphStore, entityId: string): GraphRelationship[] {
  return store.relationships
    .filter((r) => r.from === entityId || r.to === entityId)
    .sort((a, b) => new Date(a.t_valid).getTime() - new Date(b.t_valid).getTime());
}
