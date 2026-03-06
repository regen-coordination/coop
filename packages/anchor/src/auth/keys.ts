export interface ApiKeyRef {
  coopId: string;
  provider: 'anthropic' | 'openai' | 'storacha';
  token: string;
}

const keyStore = new Map<string, ApiKeyRef[]>();

export function registerKey(ref: ApiKeyRef): void {
  const current = keyStore.get(ref.coopId) ?? [];
  keyStore.set(ref.coopId, [...current, ref]);
}

export function getKeys(coopId: string): ApiKeyRef[] {
  return keyStore.get(coopId) ?? [];
}
