import type { SessionCapability } from '@coop/shared';

/**
 * Structural comparison of session capability mutable fields.
 * Replaces JSON.stringify equality which is fragile and key-order dependent.
 */
export function sessionCapabilityChanged(
  a: Pick<
    SessionCapability,
    | 'status'
    | 'updatedAt'
    | 'usedCount'
    | 'lastValidationFailure'
    | 'statusDetail'
    | 'revokedAt'
    | 'lastUsedAt'
    | 'moduleInstalledAt'
    | 'enableSignature'
    | 'permissionId'
  >,
  b: Pick<
    SessionCapability,
    | 'status'
    | 'updatedAt'
    | 'usedCount'
    | 'lastValidationFailure'
    | 'statusDetail'
    | 'revokedAt'
    | 'lastUsedAt'
    | 'moduleInstalledAt'
    | 'enableSignature'
    | 'permissionId'
  >,
): boolean {
  return (
    a.status !== b.status ||
    a.updatedAt !== b.updatedAt ||
    a.usedCount !== b.usedCount ||
    a.lastValidationFailure !== b.lastValidationFailure ||
    a.statusDetail !== b.statusDetail ||
    a.revokedAt !== b.revokedAt ||
    a.lastUsedAt !== b.lastUsedAt ||
    a.moduleInstalledAt !== b.moduleInstalledAt ||
    a.enableSignature !== b.enableSignature ||
    a.permissionId !== b.permissionId
  );
}
