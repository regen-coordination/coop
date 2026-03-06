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

export async function replicateToAllLayers<T>(
  storage: ThreeLayerStorage<T>,
  key: string,
  value: T,
): Promise<void> {
  await storage.local.put(key, value);
  await storage.shared.put(key, value);
  await storage.cold.put(key, value);
}
