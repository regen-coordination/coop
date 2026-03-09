import { entries, get, set } from "idb-keyval";
import {
  MEMBRANE_EVENT_TYPE,
  MembraneClient,
  createMembraneEvent,
} from "../protocols/membrane-client";
import { createIndexedDbStore } from "./indexeddb";

export interface StorageLayer<T> {
  put(key: string, value: T): Promise<void>;
  get(key: string): Promise<T | null>;
  list(): Promise<Array<{ key: string; value: T }>>;
}

export interface ThreeLayerStorage<T> {
  local: StorageLayer<T>;
  shared: StorageLayer<T>;
  cold: StorageLayer<T>;
}

export interface IndexedDBStorageOptions {
  dbName?: string;
  storeName?: string;
}

export class IndexedDBStorage<T> implements StorageLayer<T> {
  private readonly store;

  constructor(options: IndexedDBStorageOptions = {}) {
    this.store = createIndexedDbStore({
      dbName: options.dbName ?? "coop-three-layer",
      storeName: options.storeName ?? "local",
    });
  }

  async put(key: string, value: T): Promise<void> {
    await set(key, value, this.store);
  }

  async get(key: string): Promise<T | null> {
    const value = await get<T>(key, this.store);
    return value ?? null;
  }

  async list(): Promise<Array<{ key: string; value: T }>> {
    const allEntries = await entries(this.store);
    return allEntries.map(([key, value]) => ({ key: String(key), value: value as T }));
  }
}

interface StoragePutPayload<T> {
  key: string;
  value: T;
}

export class WebSocketStorage<T> implements StorageLayer<T> {
  private readonly cache = new Map<string, T>();

  constructor(
    private readonly membrane: MembraneClient,
    private readonly coopId: string,
  ) {
    this.membrane.subscribe((event) => {
      if (event.coopId !== this.coopId || event.type !== MEMBRANE_EVENT_TYPE.STORAGE_PUT) {
        return;
      }

      const payload = event.payload as Partial<StoragePutPayload<T>>;
      if (!payload || typeof payload.key !== "string" || !("value" in payload)) {
        return;
      }

      this.cache.set(payload.key, payload.value as T);
    });
  }

  async put(key: string, value: T): Promise<void> {
    this.cache.set(key, value);
    this.membrane.publish(
      createMembraneEvent({
        coopId: this.coopId,
        type: MEMBRANE_EVENT_TYPE.STORAGE_PUT,
        payload: { key, value },
      }),
    );
  }

  async get(key: string): Promise<T | null> {
    return this.cache.get(key) ?? null;
  }

  async list(): Promise<Array<{ key: string; value: T }>> {
    return Array.from(this.cache.entries()).map(([key, value]) => ({ key, value }));
  }
}

export interface StorachaStorageOptions {
  baseUrl?: string;
  apiKey?: string;
}

export class StorachaStorage<T> implements StorageLayer<T> {
  private readonly cache = new Map<string, T>();

  constructor(private readonly options: StorachaStorageOptions = {}) {}

  async put(key: string, value: T): Promise<void> {
    this.cache.set(key, value);

    // Upload to anchor cold storage endpoint if configured
    if (this.options.baseUrl) {
      try {
        await fetch(`${this.options.baseUrl}/api/storage/cold`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(this.options.apiKey && { Authorization: `Bearer ${this.options.apiKey}` }),
          },
          body: JSON.stringify({
            id: key,
            content: JSON.stringify(value),
          }),
        });
      } catch (error) {
        // Silent fail - cold storage is best-effort
        console.warn("Cold storage upload failed:", error);
      }
    }
  }

  async get(key: string): Promise<T | null> {
    return this.cache.get(key) ?? null;
  }

  async list(): Promise<Array<{ key: string; value: T }>> {
    return Array.from(this.cache.entries()).map(([key, value]) => ({ key, value }));
  }
}

/** @deprecated Use StorachaStorage instead */
export class ColdStorage<T> extends StorachaStorage<T> {}

export interface ThreeLayerStorageFactoryOptions<T> {
  coopId: string;
  membraneUrl?: string;
  membraneClient?: MembraneClient;
  localOptions?: IndexedDBStorageOptions;
  coldLayer?: StorageLayer<T>;
  storachaOptions?: StorachaStorageOptions;
}

export function createThreeLayerStorage<T>(
  options: ThreeLayerStorageFactoryOptions<T>,
): ThreeLayerStorage<T> {
  const membraneClient = options.membraneClient ?? new MembraneClient();
  if (options.membraneUrl) {
    membraneClient.connect(options.membraneUrl);
  }

  return {
    local: new IndexedDBStorage<T>(options.localOptions),
    shared: new WebSocketStorage<T>(membraneClient, options.coopId),
    cold: options.coldLayer ?? new StorachaStorage<T>(options.storachaOptions),
  };
}

export async function replicateToAllLayers<T>(
  storage: ThreeLayerStorage<T>,
  key: string,
  value: T,
): Promise<void> {
  await storage.local.put(key, value);
  await storage.shared.put(key, value);
  await storage.cold.put(key, value);
}
