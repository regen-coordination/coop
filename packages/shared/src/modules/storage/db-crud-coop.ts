import type {
  AnchorCapability,
  AuthSession,
  CoopArchiveSecrets,
  HapticPreferences,
  LocalPasskeyIdentity,
  PrivilegedActionLogEntry,
  SoundPreferences,
  TrustedNodeArchiveConfig,
  UiPreferences,
} from '../../contracts/schema';
import {
  anchorCapabilitySchema,
  authSessionSchema,
  coopArchiveSecretsSchema,
  hapticPreferencesSchema,
  privilegedActionLogEntrySchema,
  soundPreferencesSchema,
  trustedNodeArchiveConfigSchema,
  uiPreferencesSchema,
} from '../../contracts/schema';
import type { CoopDexie } from './db-schema';

export async function setSoundPreferences(db: CoopDexie, value: SoundPreferences) {
  await db.settings.put({
    key: 'sound-preferences',
    value,
  });
}

export async function getSoundPreferences(db: CoopDexie): Promise<SoundPreferences | null> {
  const record = await db.settings.get('sound-preferences');
  if (!record?.value) return null;
  const result = soundPreferencesSchema.safeParse(record.value);
  return result.success ? result.data : null;
}

export async function setHapticPreferences(db: CoopDexie, value: HapticPreferences) {
  await db.settings.put({
    key: 'haptic-preferences',
    value,
  });
}

export async function getHapticPreferences(db: CoopDexie): Promise<HapticPreferences | null> {
  const record = await db.settings.get('haptic-preferences');
  if (!record?.value) return null;
  const result = hapticPreferencesSchema.safeParse(record.value);
  return result.success ? result.data : null;
}

export async function setUiPreferences(db: CoopDexie, value: UiPreferences) {
  await db.settings.put({
    key: 'ui-preferences',
    value,
  });
}

export async function getUiPreferences(db: CoopDexie): Promise<UiPreferences | null> {
  const record = await db.settings.get('ui-preferences');
  if (!record?.value) return null;
  const result = uiPreferencesSchema.safeParse(record.value);
  return result.success ? result.data : null;
}

export async function setAuthSession(db: CoopDexie, value: AuthSession | null) {
  if (!value) {
    await db.settings.delete('auth-session');
    return;
  }
  await db.settings.put({
    key: 'auth-session',
    value,
  });
}

export async function getAuthSession(db: CoopDexie): Promise<AuthSession | null> {
  const record = await db.settings.get('auth-session');
  if (!record?.value) return null;
  const result = authSessionSchema.safeParse(record.value);
  return result.success ? result.data : null;
}

export async function setAnchorCapability(db: CoopDexie, value: AnchorCapability) {
  await db.settings.put({
    key: 'anchor-capability',
    value,
  });
}

export async function getAnchorCapability(db: CoopDexie): Promise<AnchorCapability | null> {
  const record = await db.settings.get('anchor-capability');
  if (!record?.value) return null;
  const result = anchorCapabilitySchema.safeParse(record.value);
  return result.success ? result.data : null;
}

export async function setPrivilegedActionLog(db: CoopDexie, entries: PrivilegedActionLogEntry[]) {
  await db.settings.put({
    key: 'privileged-action-log',
    value: entries,
  });
}

export async function listPrivilegedActionLog(db: CoopDexie): Promise<PrivilegedActionLogEntry[]> {
  const record = await db.settings.get('privileged-action-log');
  if (!record?.value || !Array.isArray(record.value)) {
    return [];
  }

  return record.value
    .map((entry) => privilegedActionLogEntrySchema.safeParse(entry))
    .filter((r) => r.success)
    .map((r) => r.data);
}

export async function setTrustedNodeArchiveConfig(db: CoopDexie, value: TrustedNodeArchiveConfig) {
  await db.settings.put({
    key: 'trusted-node-archive-config',
    value: trustedNodeArchiveConfigSchema.parse(value),
  });
}

export async function getTrustedNodeArchiveConfig(
  db: CoopDexie,
): Promise<TrustedNodeArchiveConfig | null> {
  const record = await db.settings.get('trusted-node-archive-config');
  if (!record?.value) return null;
  const result = trustedNodeArchiveConfigSchema.safeParse(record.value);
  return result.success ? result.data : null;
}

// --- Per-coop archive secrets (local-only, never synced) ---

export async function setCoopArchiveSecrets(
  db: CoopDexie,
  coopId: string,
  secrets: CoopArchiveSecrets,
) {
  await db.settings.put({
    key: `archive-secrets:${coopId}`,
    value: coopArchiveSecretsSchema.parse({ ...secrets, coopId }),
  });
}

export async function getCoopArchiveSecrets(
  db: CoopDexie,
  coopId: string,
): Promise<CoopArchiveSecrets | null> {
  const record = await db.settings.get(`archive-secrets:${coopId}`);
  if (!record?.value) return null;
  const result = coopArchiveSecretsSchema.safeParse(record.value);
  return result.success ? result.data : null;
}

export async function removeCoopArchiveSecrets(db: CoopDexie, coopId: string) {
  await db.settings.delete(`archive-secrets:${coopId}`);
}

export async function upsertLocalIdentity(db: CoopDexie, identity: LocalPasskeyIdentity) {
  await db.identities.put(identity);
}

export async function listLocalIdentities(db: CoopDexie) {
  return db.identities.orderBy('lastUsedAt').reverse().toArray();
}
