import { createStore, entries, get, set } from "idb-keyval";

export interface StoredItem {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
}

export interface IndexedDbStoreConfig {
  dbName?: string;
  storeName?: string;
}

const DEFAULT_DB_NAME = "coop-local-node";
const DEFAULT_STORE_NAME = "artifacts";

export function createIndexedDbStore(config: IndexedDbStoreConfig = {}) {
  const dbName = config.dbName ?? DEFAULT_DB_NAME;
  const storeName = config.storeName ?? DEFAULT_STORE_NAME;
  return createStore(dbName, storeName);
}

const artifactStore = createIndexedDbStore();

export async function saveArtifact(item: StoredItem): Promise<void> {
  await set(item.id, item, artifactStore);
}

export async function listArtifacts(): Promise<StoredItem[]> {
  const allEntries = await entries(artifactStore);
  return allEntries.map(([, value]) => value as StoredItem);
}
