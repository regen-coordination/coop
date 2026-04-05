import type { Member } from '../../contracts/schema';
import { createId, nowIso, toDeterministicAddress } from '../../utils';

/**
 * Generates a warning message about device-bound passkey identity.
 * @param displayName - Human-readable name of the member
 * @returns Warning string about passkey storage risk
 */
export function createDeviceBoundWarning(displayName: string) {
  return `${displayName}'s passkey is stored on this device profile. Clearing extension data may remove access to this account.`;
}

/**
 * Creates a new coop member with a deterministic address and passkey identity.
 * @param displayName - Human-readable display name
 * @param role - Member role (creator, trusted, member)
 * @param options - Optional overrides for address, auth mode, identity warning, and passkey credential
 * @returns A fully populated Member record
 */
export function createMember(
  displayName: string,
  role: Member['role'],
  options?: Partial<
    Pick<Member, 'address' | 'authMode' | 'identityWarning' | 'passkeyCredentialId'>
  >,
): Member {
  const id = createId('member');
  return {
    id,
    displayName,
    role,
    authMode: options?.authMode ?? 'passkey',
    address: options?.address ?? toDeterministicAddress(`member:${displayName}:${id}`),
    joinedAt: nowIso(),
    identityWarning: options?.identityWarning ?? createDeviceBoundWarning(displayName),
    passkeyCredentialId: options?.passkeyCredentialId,
  };
}
