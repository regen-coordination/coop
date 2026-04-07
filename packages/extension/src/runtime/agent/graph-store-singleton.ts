import { type CoopDexie, type GraphStore, initGraphStore, nowIso } from '@coop/shared';

/**
 * Singleton in-memory graph store for the extension runtime.
 * Lazy-initialized on first access. Persisted to Dexie as a JSON snapshot.
 */
let _store: GraphStore | null = null;
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
let _activeCoopId: string | null = null;

const SAVE_DEBOUNCE_MS = 5_000;

export function getGraphStore(): GraphStore {
  if (!_store) {
    _store = initGraphStore();
  }
  return _store;
}

export function resetGraphStore(): void {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  if (_store) {
    _store.entities.clear();
    _store.relationships.length = 0;
    _store.entityHistory.clear();
    _store.traces.length = 0;
    _store.insights.length = 0;
  }
  _store = null;
  _activeCoopId = null;
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function serializeStore(store: GraphStore): {
  entities: string;
  relationships: string;
  traces: string;
  insights: string;
  entityHistory: string;
} {
  return {
    entities: JSON.stringify(Array.from(store.entities.entries())),
    relationships: JSON.stringify(store.relationships),
    traces: JSON.stringify(store.traces),
    insights: JSON.stringify(store.insights),
    entityHistory: JSON.stringify(Array.from(store.entityHistory.entries())),
  };
}

function hydrateStore(
  store: GraphStore,
  data: {
    entities: string;
    relationships: string;
    traces: string;
    insights: string;
    entityHistory?: string;
  },
): void {
  try {
    const entries: [string, GraphStore['entities'] extends Map<string, infer V> ? V : never][] =
      JSON.parse(data.entities);
    store.entities = new Map(entries);
  } catch {
    store.entities = new Map();
  }
  try {
    store.relationships = JSON.parse(data.relationships);
  } catch {
    store.relationships = [];
  }
  try {
    store.traces = JSON.parse(data.traces);
  } catch {
    store.traces = [];
  }
  try {
    store.insights = JSON.parse(data.insights);
  } catch {
    store.insights = [];
  }
  try {
    if (data.entityHistory) {
      store.entityHistory = new Map(JSON.parse(data.entityHistory));
    }
  } catch {
    store.entityHistory = new Map();
  }
}

/**
 * Save the current graph store to Dexie. Debounced — safe to call after every mutation.
 */
export function scheduleSave(db: CoopDexie, coopId: string): void {
  _activeCoopId = coopId;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    void saveGraphSnapshot(db, coopId);
  }, SAVE_DEBOUNCE_MS);
}

export async function saveGraphSnapshot(db: CoopDexie, coopId: string): Promise<void> {
  const store = _store;
  if (!store) return;
  const serialized = serializeStore(store);
  await db.graphSnapshots.put({
    id: `graph:${coopId}`,
    coopId,
    ...serialized,
    updatedAt: nowIso(),
  });
}

/**
 * Load a graph snapshot from Dexie on first access for a coop.
 * Returns the hydrated store (same singleton reference).
 */
export async function loadGraphSnapshot(db: CoopDexie, coopId: string): Promise<GraphStore> {
  const store = getGraphStore();
  if (_activeCoopId === coopId && store.entities.size > 0) {
    return store;
  }
  // Clear stale data from a different coop before loading
  store.entities.clear();
  store.relationships.length = 0;
  store.entityHistory.clear();
  store.traces.length = 0;
  store.insights.length = 0;

  const snapshot = await db.graphSnapshots.get(`graph:${coopId}`);
  if (snapshot) {
    hydrateStore(store, snapshot);
  }
  _activeCoopId = coopId;
  return store;
}
