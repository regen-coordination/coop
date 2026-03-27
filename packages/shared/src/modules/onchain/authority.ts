import type { AuthorityActionMapping, AuthorityClass } from '../../contracts/schema';

/**
 * Canonical authority action mappings.
 * Defines which authority class is responsible for each action domain.
 */
export const AUTHORITY_ACTION_MAPPINGS: AuthorityActionMapping[] = [
  {
    authorityClass: 'safe-owner',
    actionClasses: [
      'safe-deployment',
      'safe-add-owner',
      'safe-remove-owner',
      'safe-swap-owner',
      'safe-change-threshold',
      'green-goods-submit-work-approval',
      'green-goods-create-assessment',
      'green-goods-sync-gap-admins',
      'green-goods-mint-hypercert',
    ],
    description: 'Treasury and governance actions requiring Safe owner authority',
  },
  {
    authorityClass: 'session-executor',
    actionClasses: [
      'green-goods-create-garden',
      'green-goods-sync-garden-profile',
      'green-goods-set-garden-domains',
      'green-goods-create-garden-pools',
    ],
    description: 'Bounded automation actions eligible for session key execution',
  },
  {
    authorityClass: 'member-account',
    actionClasses: [
      'green-goods-add-gardener',
      'green-goods-remove-gardener',
      'green-goods-submit-work-submission',
    ],
    description: 'Individual member actions requiring per-user smart account',
  },
  {
    authorityClass: 'semaphore-identity',
    actionClasses: [],
    description:
      'Privacy layer for anonymous membership proofs and signaling — not a signer system',
  },
];

/** Resolve the authority class for a given action class */
export function resolveAuthorityClass(actionClass: string): AuthorityClass | undefined {
  for (const mapping of AUTHORITY_ACTION_MAPPINGS) {
    if (mapping.actionClasses.includes(actionClass)) {
      return mapping.authorityClass;
    }
  }
  return undefined;
}

/** Get all action classes for a given authority level */
export function getActionsForAuthority(authorityClass: AuthorityClass): string[] {
  const mapping = AUTHORITY_ACTION_MAPPINGS.find((m) => m.authorityClass === authorityClass);
  return mapping?.actionClasses ?? [];
}

/** Check if an action requires Safe owner authority */
export function requiresSafeOwner(actionClass: string): boolean {
  return resolveAuthorityClass(actionClass) === 'safe-owner';
}

/** Check if an action is session-key eligible */
export function isSessionKeyEligible(actionClass: string): boolean {
  return resolveAuthorityClass(actionClass) === 'session-executor';
}

/** Check if an action requires a per-member smart account */
export function requiresMemberAccount(actionClass: string): boolean {
  return resolveAuthorityClass(actionClass) === 'member-account';
}
