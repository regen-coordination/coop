import type {
  ArchiveRecoveryRecord,
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
  archiveRecoveryRecordSchema,
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
import {
  buildEncryptedLocalPayloadId,
  buildEncryptedLocalPayloadRecord,
  decryptEncryptedLocalPayloadRecord,
  getEncryptedLocalPayloadRecord,
} from './db-encryption';

const ARCHIVE_SECRETS_SETTING_PREFIX = 'archive-secrets:';
const ARCHIVE_RECOVERY_SETTING_PREFIX = 'archive-recovery:';

function buildArchiveSecretsSettingKey(coopId: string) {
  return `${ARCHIVE_SECRETS_SETTING_PREFIX}${coopId}`;
}

function buildArchiveRecoverySettingKey(recoveryId: string) {
  return `${ARCHIVE_RECOVERY_SETTING_PREFIX}${recoveryId}`;
}

function normalizeCoopArchiveSecrets(value: unknown, coopId: string) {
  const direct = coopArchiveSecretsSchema.safeParse(value);
  if (direct.success) {
    return direct.data;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const withCoopId = coopArchiveSecretsSchema.safeParse({ ...value, coopId });
    if (withCoopId.success) {
      return withCoopId.data;
    }
  }

  return null;
}

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
  const parsed = coopArchiveSecretsSchema.parse({ ...secrets, coopId });
  const payload = await buildEncryptedLocalPayloadRecord({
    db,
    kind: 'archive-secrets',
    entityId: coopId,
    bytes: new TextEncoder().encode(JSON.stringify(parsed)),
  });

  await db.transaction('rw', db.settings, db.encryptedLocalPayloads, async () => {
    await db.encryptedLocalPayloads.put(payload);
    await db.settings.delete(buildArchiveSecretsSettingKey(coopId));
  });
}

export async function getCoopArchiveSecrets(
  db: CoopDexie,
  coopId: string,
): Promise<CoopArchiveSecrets | null> {
  const encryptedRecord = await getEncryptedLocalPayloadRecord(db, 'archive-secrets', coopId);
  if (encryptedRecord) {
    try {
      const bytes = await decryptEncryptedLocalPayloadRecord(db, encryptedRecord);
      return normalizeCoopArchiveSecrets(JSON.parse(new TextDecoder().decode(bytes)), coopId);
    } catch (error) {
      console.warn(
        `[storage] Failed to decrypt archive secrets payload for ${coopId}. Returning null.`,
        error,
      );
      return null;
    }
  }

  const legacyRecord = await db.settings.get(buildArchiveSecretsSettingKey(coopId));
  if (!legacyRecord?.value) return null;

  const normalized = normalizeCoopArchiveSecrets(legacyRecord.value, coopId);
  if (!normalized) return null;

  await setCoopArchiveSecrets(db, coopId, normalized);
  return normalized;
}

export async function removeCoopArchiveSecrets(db: CoopDexie, coopId: string) {
  await db.transaction('rw', db.settings, db.encryptedLocalPayloads, async () => {
    await db.encryptedLocalPayloads.delete(buildEncryptedLocalPayloadId('archive-secrets', coopId));
    await db.settings.delete(buildArchiveSecretsSettingKey(coopId));
  });
}

export async function listCoopArchiveSecrets(
  db: CoopDexie,
): Promise<Array<{ key: string; value: CoopArchiveSecrets }>> {
  const encryptedRecords = await db.encryptedLocalPayloads
    .where('kind')
    .equals('archive-secrets')
    .toArray();
  const encryptedSecrets = new Map<string, CoopArchiveSecrets>();

  for (const record of encryptedRecords) {
    const bytes = await decryptEncryptedLocalPayloadRecord(db, record);
    const parsed = normalizeCoopArchiveSecrets(
      JSON.parse(new TextDecoder().decode(bytes)),
      record.entityId,
    );
    if (!parsed) {
      throw new Error(`Invalid encrypted archive secrets payload for coop ${record.entityId}`);
    }
    encryptedSecrets.set(parsed.coopId, parsed);
  }

  const legacyRecords = await db.settings
    .filter((record) => record.key.startsWith(ARCHIVE_SECRETS_SETTING_PREFIX))
    .toArray();

  for (const record of legacyRecords) {
    const coopId = record.key.slice(ARCHIVE_SECRETS_SETTING_PREFIX.length);
    if (!coopId || encryptedSecrets.has(coopId)) {
      continue;
    }

    const parsed = normalizeCoopArchiveSecrets(record.value, coopId);
    if (!parsed) {
      throw new Error(`Invalid legacy archive secrets setting for coop ${coopId}`);
    }
    encryptedSecrets.set(parsed.coopId, parsed);
  }

  return Array.from(encryptedSecrets.values()).map((value) => ({
    key: buildArchiveSecretsSettingKey(value.coopId),
    value,
  }));
}

export async function setArchiveRecoveryRecord(db: CoopDexie, recovery: ArchiveRecoveryRecord) {
  await db.settings.put({
    key: buildArchiveRecoverySettingKey(recovery.id),
    value: archiveRecoveryRecordSchema.parse(recovery),
  });
}

export async function listArchiveRecoveryRecords(
  db: CoopDexie,
  coopId?: string,
): Promise<ArchiveRecoveryRecord[]> {
  const records = await db.settings
    .filter((record) => record.key.startsWith(ARCHIVE_RECOVERY_SETTING_PREFIX))
    .toArray();

  return records.flatMap((record) => {
    const parsed = archiveRecoveryRecordSchema.safeParse(record.value);
    if (!parsed.success) {
      console.warn(
        `[storage] Ignoring invalid archive recovery record ${record.key}.`,
        parsed.error,
      );
      return [];
    }

    if (coopId && parsed.data.coopId !== coopId) {
      return [];
    }

    return [parsed.data];
  });
}

export async function removeArchiveRecoveryRecord(db: CoopDexie, recoveryId: string) {
  await db.settings.delete(buildArchiveRecoverySettingKey(recoveryId));
}

export async function upsertLocalIdentity(db: CoopDexie, identity: LocalPasskeyIdentity) {
  await db.identities.put(identity);
}

export async function listLocalIdentities(db: CoopDexie) {
  return db.identities.orderBy('lastUsedAt').reverse().toArray();
}
