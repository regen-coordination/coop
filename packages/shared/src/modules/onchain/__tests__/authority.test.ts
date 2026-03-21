import { describe, expect, it } from 'vitest';
import { authorityActionMappingSchema, authorityClassSchema } from '../../../contracts/schema';
import {
  AUTHORITY_ACTION_MAPPINGS,
  getActionsForAuthority,
  isSessionKeyEligible,
  requiresMemberAccount,
  requiresSafeOwner,
  resolveAuthorityClass,
} from '../authority';

describe('authorityClassSchema', () => {
  it('accepts valid authority classes', () => {
    expect(authorityClassSchema.parse('safe-owner')).toBe('safe-owner');
    expect(authorityClassSchema.parse('session-executor')).toBe('session-executor');
    expect(authorityClassSchema.parse('member-account')).toBe('member-account');
    expect(authorityClassSchema.parse('semaphore-identity')).toBe('semaphore-identity');
  });

  it('rejects invalid authority classes', () => {
    expect(() => authorityClassSchema.parse('admin')).toThrow();
    expect(() => authorityClassSchema.parse('')).toThrow();
  });
});

describe('authorityActionMappingSchema', () => {
  it('validates a well-formed mapping', () => {
    const mapping = authorityActionMappingSchema.parse({
      authorityClass: 'safe-owner',
      actionClasses: ['safe-deployment', 'safe-add-owner'],
      description: 'Treasury actions',
    });
    expect(mapping.authorityClass).toBe('safe-owner');
    expect(mapping.actionClasses).toHaveLength(2);
  });

  it('rejects mapping with invalid authority class', () => {
    expect(() =>
      authorityActionMappingSchema.parse({
        authorityClass: 'unknown',
        actionClasses: [],
        description: 'bad',
      }),
    ).toThrow();
  });
});

describe('AUTHORITY_ACTION_MAPPINGS', () => {
  it('contains all four authority classes', () => {
    const classes = AUTHORITY_ACTION_MAPPINGS.map((m) => m.authorityClass);
    expect(classes).toContain('safe-owner');
    expect(classes).toContain('session-executor');
    expect(classes).toContain('member-account');
    expect(classes).toContain('semaphore-identity');
  });

  it('has no duplicate action classes across mappings', () => {
    const allActions = AUTHORITY_ACTION_MAPPINGS.flatMap((m) => m.actionClasses);
    const uniqueActions = new Set(allActions);
    expect(allActions).toHaveLength(uniqueActions.size);
  });
});

describe('resolveAuthorityClass', () => {
  it('returns safe-owner for safe-deployment', () => {
    expect(resolveAuthorityClass('safe-deployment')).toBe('safe-owner');
  });

  it('returns safe-owner for safe-add-owner', () => {
    expect(resolveAuthorityClass('safe-add-owner')).toBe('safe-owner');
  });

  it('returns session-executor for green-goods-create-garden', () => {
    expect(resolveAuthorityClass('green-goods-create-garden')).toBe('session-executor');
  });

  it('returns member-account for green-goods-add-gardener', () => {
    expect(resolveAuthorityClass('green-goods-add-gardener')).toBe('member-account');
  });

  it('returns undefined for unknown action class', () => {
    expect(resolveAuthorityClass('unknown-action')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(resolveAuthorityClass('')).toBeUndefined();
  });
});

describe('getActionsForAuthority', () => {
  it('returns safe-owner actions', () => {
    const actions = getActionsForAuthority('safe-owner');
    expect(actions).toContain('safe-deployment');
    expect(actions).toContain('safe-add-owner');
    expect(actions).toContain('safe-remove-owner');
    expect(actions).toContain('safe-swap-owner');
    expect(actions).toContain('safe-change-threshold');
    expect(actions).toContain('green-goods-submit-work-approval');
    expect(actions).toContain('green-goods-create-assessment');
    expect(actions).toContain('green-goods-sync-gap-admins');
  });

  it('returns session-executor actions', () => {
    const actions = getActionsForAuthority('session-executor');
    expect(actions).toContain('green-goods-create-garden');
    expect(actions).toContain('green-goods-sync-garden-profile');
    expect(actions).toContain('green-goods-set-garden-domains');
    expect(actions).toContain('green-goods-create-garden-pools');
  });

  it('returns member-account actions', () => {
    const actions = getActionsForAuthority('member-account');
    expect(actions).toContain('green-goods-add-gardener');
    expect(actions).toContain('green-goods-remove-gardener');
    expect(actions).toContain('green-goods-submit-work-submission');
    expect(actions).toContain('green-goods-submit-impact-report');
  });

  it('returns empty array for semaphore-identity', () => {
    expect(getActionsForAuthority('semaphore-identity')).toEqual([]);
  });
});

describe('requiresSafeOwner', () => {
  it('returns true for safe-deployment', () => {
    expect(requiresSafeOwner('safe-deployment')).toBe(true);
  });

  it('returns true for green-goods-submit-work-approval', () => {
    expect(requiresSafeOwner('green-goods-submit-work-approval')).toBe(true);
  });

  it('returns false for session-executor action', () => {
    expect(requiresSafeOwner('green-goods-create-garden')).toBe(false);
  });

  it('returns false for unknown action', () => {
    expect(requiresSafeOwner('unknown')).toBe(false);
  });
});

describe('isSessionKeyEligible', () => {
  it('returns true for green-goods-create-garden', () => {
    expect(isSessionKeyEligible('green-goods-create-garden')).toBe(true);
  });

  it('returns true for green-goods-sync-garden-profile', () => {
    expect(isSessionKeyEligible('green-goods-sync-garden-profile')).toBe(true);
  });

  it('returns false for safe-owner action', () => {
    expect(isSessionKeyEligible('safe-deployment')).toBe(false);
  });

  it('returns false for unknown action', () => {
    expect(isSessionKeyEligible('unknown')).toBe(false);
  });
});

describe('requiresMemberAccount', () => {
  it('returns true for green-goods-add-gardener', () => {
    expect(requiresMemberAccount('green-goods-add-gardener')).toBe(true);
  });

  it('returns true for green-goods-submit-work-submission', () => {
    expect(requiresMemberAccount('green-goods-submit-work-submission')).toBe(true);
  });

  it('returns false for safe-owner action', () => {
    expect(requiresMemberAccount('safe-deployment')).toBe(false);
  });

  it('returns false for unknown action', () => {
    expect(requiresMemberAccount('unknown')).toBe(false);
  });
});
