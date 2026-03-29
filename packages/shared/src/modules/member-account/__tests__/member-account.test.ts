import { describe, expect, it, vi } from 'vitest';
import type { Member, MemberOnchainAccount } from '../../../contracts/schema';
import {
  computeMemberAccountStatus,
  createLocalMemberSignerBinding,
  createMemberAccountRecord,
  findMemberAccount,
  findMemberAccountByAddress,
  formatMemberAccountStatus,
  formatMemberAccountType,
  getActiveMemberAccounts,
  isMemberAccountPending,
  isMemberAccountReady,
  markAccountActive,
  markAccountDeploying,
  markAccountPredicted,
  markAccountRecovery,
  provisionMemberAccounts,
  reactivateMemberAccount,
  resolveMembersNeedingAccounts,
  suspendMemberAccount,
} from '../member-account';

const TX_HASH =
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
const USER_OP_HASH =
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`;
const DEPLOYED_ADDRESS = '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF' as `0x${string}`;

const mockMember: Member = {
  id: 'member-1',
  displayName: 'Alice',
  role: 'creator',
  authMode: 'passkey',
  address: '0x1234567890123456789012345678901234567890',
  joinedAt: '2026-03-20T00:00:00.000Z',
  identityWarning: 'Device-bound identity',
  passkeyCredentialId: 'cred-abc',
};

const mockMember2: Member = {
  id: 'member-2',
  displayName: 'Bob',
  role: 'member',
  authMode: 'passkey',
  address: '0x2234567890123456789012345678901234567890',
  joinedAt: '2026-03-20T00:00:00.000Z',
  identityWarning: 'Device-bound identity',
  passkeyCredentialId: 'cred-def',
};

const mockMember3: Member = {
  id: 'member-3',
  displayName: 'Carol',
  role: 'trusted',
  authMode: 'passkey',
  address: '0x3234567890123456789012345678901234567890',
  joinedAt: '2026-03-20T00:00:00.000Z',
  identityWarning: 'Device-bound identity',
};

describe('createMemberAccountRecord', () => {
  it('creates a valid record with pending status', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });

    expect(record.id).toMatch(/^macct-/);
    expect(record.memberId).toBe('member-1');
    expect(record.coopId).toBe('coop-1');
    expect(record.accountAddress).toBeUndefined();
    expect(record.accountType).toBe('kernel');
    expect(record.ownerPasskeyCredentialId).toBe('cred-abc');
    expect(record.chainKey).toBe('sepolia');
    expect(record.status).toBe('pending');
    expect(record.statusNote).toBe('Account record created, awaiting local provisioning');
    expect(record.createdAt).toBeDefined();
    expect(record.updatedAt).toBe(record.createdAt);
    expect(record.deploymentTxHash).toBeUndefined();
    expect(record.userOperationHash).toBeUndefined();
    expect(record.predictedAt).toBeUndefined();
    expect(record.deployedAt).toBeUndefined();
    expect(record.suspendedAt).toBeUndefined();
  });

  it('uses explicit accountAddress when provided', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
      accountAddress: DEPLOYED_ADDRESS,
    });

    expect(record.accountAddress).toBe(DEPLOYED_ADDRESS);
    expect(record.predictedAt).toBeDefined();
  });

  it('accepts custom accountType', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'arbitrum',
      accountType: 'kernel',
    });

    expect(record.accountType).toBe('kernel');
    expect(record.chainKey).toBe('arbitrum');
  });
});

describe('markAccountDeploying', () => {
  it('transitions status to deploying', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20T00:00:00.000Z'));

    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });

    vi.setSystemTime(new Date('2026-03-20T01:00:00.000Z'));
    const deploying = markAccountDeploying(record, USER_OP_HASH);

    expect(deploying.status).toBe('deploying');
    expect(deploying.statusNote).toBe('Deployment transaction submitted');
    expect(deploying.userOperationHash).toBe(USER_OP_HASH);
    expect(deploying.updatedAt).not.toBe(record.updatedAt);

    vi.useRealTimers();
  });

  it('preserves existing userOperationHash if none provided', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });

    const deploying = markAccountDeploying(record);

    expect(deploying.status).toBe('deploying');
    expect(deploying.userOperationHash).toBeUndefined();
  });
});

describe('markAccountPredicted', () => {
  it('records a counterfactual address before deployment', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });

    const predicted = markAccountPredicted(record, DEPLOYED_ADDRESS);

    expect(predicted.status).toBe('predicted');
    expect(predicted.accountAddress).toBe(DEPLOYED_ADDRESS);
    expect(predicted.predictedAt).toBeDefined();
    expect(predicted.statusNote).toMatch(/counterfactual/i);
  });
});

describe('markAccountActive', () => {
  it('sets deployedAt and deploymentTxHash', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });
    const deploying = markAccountDeploying(record, USER_OP_HASH);
    const active = markAccountActive(deploying, TX_HASH);

    expect(active.status).toBe('active');
    expect(active.statusNote).toBe('Account deployed and ready');
    expect(active.deploymentTxHash).toBe(TX_HASH);
    expect(active.deployedAt).toBeDefined();
    expect(active.updatedAt).toBe(active.deployedAt);
  });

  it('updates accountAddress when deployedAccountAddress provided', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });
    const active = markAccountActive(record, TX_HASH, DEPLOYED_ADDRESS);

    expect(active.accountAddress).toBe(DEPLOYED_ADDRESS);
  });
});

describe('suspendMemberAccount', () => {
  it('sets suspendedAt and reason', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });
    const active = markAccountActive(record, TX_HASH);
    const suspended = suspendMemberAccount(active, 'Suspicious activity detected');

    expect(suspended.status).toBe('suspended');
    expect(suspended.statusNote).toBe('Suspicious activity detected');
    expect(suspended.suspendedAt).toBeDefined();
  });
});

describe('reactivateMemberAccount', () => {
  it('clears suspended state', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });
    const active = markAccountActive(record, TX_HASH);
    const suspended = suspendMemberAccount(active, 'Reason');
    const reactivated = reactivateMemberAccount(suspended);

    expect(reactivated.status).toBe('active');
    expect(reactivated.statusNote).toBe('Account reactivated');
    expect(reactivated.suspendedAt).toBeUndefined();
  });
});

describe('markAccountRecovery', () => {
  it('transitions to recovery status with reason', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });
    const active = markAccountActive(record, TX_HASH);
    const recovery = markAccountRecovery(active, 'Lost passkey');

    expect(recovery.status).toBe('recovery');
    expect(recovery.statusNote).toBe('Lost passkey');
  });
});

describe('computeMemberAccountStatus', () => {
  it('returns suspended when suspendedAt is set and status is not active', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });
    const suspended = suspendMemberAccount(record, 'test');

    expect(computeMemberAccountStatus(suspended)).toBe('suspended');
  });

  it('returns active when deployedAt is set and status is not suspended', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });
    const active = markAccountActive(record, TX_HASH);

    expect(computeMemberAccountStatus(active)).toBe('active');
  });

  it('returns the stored status as fallback', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });

    expect(computeMemberAccountStatus(record)).toBe('pending');
  });
});

describe('isMemberAccountReady', () => {
  it('returns true only for active + deployed', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });

    expect(isMemberAccountReady(record)).toBe(false);

    const active = markAccountActive(record, TX_HASH);
    expect(isMemberAccountReady(active)).toBe(true);
  });

  it('returns false for suspended accounts', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });
    const active = markAccountActive(record, TX_HASH);
    const suspended = suspendMemberAccount(active, 'Reason');

    expect(isMemberAccountReady(suspended)).toBe(false);
  });
});

describe('isMemberAccountPending', () => {
  it('returns true for pending accounts', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });

    expect(isMemberAccountPending(record)).toBe(true);
  });

  it('returns false for non-pending accounts', () => {
    const record = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });
    const active = markAccountActive(record, TX_HASH);

    expect(isMemberAccountPending(active)).toBe(false);
  });
});

describe('resolveMembersNeedingAccounts', () => {
  it('filters out members who already have accounts', () => {
    const existingAccount = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });

    const result = resolveMembersNeedingAccounts(
      [mockMember, mockMember2, mockMember3],
      [existingAccount],
    );

    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toEqual(['member-2', 'member-3']);
  });

  it('returns all members when no existing accounts', () => {
    const result = resolveMembersNeedingAccounts([mockMember, mockMember2], []);

    expect(result).toHaveLength(2);
  });

  it('returns empty when all members have accounts', () => {
    const acct1 = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });
    const acct2 = createMemberAccountRecord({
      memberId: 'member-2',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-def',
      chainKey: 'sepolia',
    });

    const result = resolveMembersNeedingAccounts([mockMember, mockMember2], [acct1, acct2]);

    expect(result).toHaveLength(0);
  });
});

describe('provisionMemberAccounts', () => {
  it('creates account records for unprovisioned members', () => {
    const existingAccount = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });

    const newAccounts = provisionMemberAccounts({
      members: [mockMember, mockMember2, mockMember3],
      existingAccounts: [existingAccount],
      coopId: 'coop-1',
      chainKey: 'sepolia',
    });

    // Carol (member-3) has no passkeyCredentialId so she is skipped
    expect(newAccounts).toHaveLength(1);
    expect(newAccounts[0].memberId).toBe('member-2');
    expect(newAccounts[0].coopId).toBe('coop-1');
    expect(newAccounts[0].ownerPasskeyCredentialId).toBe('cred-def');
    expect(newAccounts[0].chainKey).toBe('sepolia');
    expect(newAccounts[0].status).toBe('pending');
  });

  it('respects custom account type', () => {
    const accounts = provisionMemberAccounts({
      members: [mockMember],
      existingAccounts: [],
      coopId: 'coop-1',
      chainKey: 'arbitrum',
      accountType: 'kernel',
    });

    expect(accounts).toHaveLength(1);
    expect(accounts[0].accountType).toBe('kernel');
    expect(accounts[0].chainKey).toBe('arbitrum');
  });
});

describe('findMemberAccount', () => {
  it('finds by memberId', () => {
    const acct1 = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });
    const acct2 = createMemberAccountRecord({
      memberId: 'member-2',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-def',
      chainKey: 'sepolia',
    });

    expect(findMemberAccount([acct1, acct2], 'member-2')?.memberId).toBe('member-2');
    expect(findMemberAccount([acct1, acct2], 'member-99')).toBeUndefined();
  });
});

describe('findMemberAccountByAddress', () => {
  it('finds by address case-insensitively', () => {
    const acct = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
      accountAddress: '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
    });

    const found = findMemberAccountByAddress([acct], '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
    expect(found).toBeDefined();
    expect(found?.memberId).toBe('member-1');
  });

  it('returns undefined when not found', () => {
    const acct = createMemberAccountRecord({
      memberId: 'member-1',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-abc',
      chainKey: 'sepolia',
    });

    expect(
      findMemberAccountByAddress([acct], '0x0000000000000000000000000000000000000000'),
    ).toBeUndefined();
  });
});

describe('getActiveMemberAccounts', () => {
  it('filters by coop and active status', () => {
    const acct1 = markAccountActive(
      createMemberAccountRecord({
        memberId: 'member-1',
        coopId: 'coop-1',
        ownerPasskeyCredentialId: 'cred-abc',
        chainKey: 'sepolia',
      }),
      TX_HASH,
    );
    const acct2 = createMemberAccountRecord({
      memberId: 'member-2',
      coopId: 'coop-1',
      ownerPasskeyCredentialId: 'cred-def',
      chainKey: 'sepolia',
    }); // pending
    const acct3 = markAccountActive(
      createMemberAccountRecord({
        memberId: 'member-3',
        coopId: 'coop-2',
        ownerPasskeyCredentialId: 'cred-ghi',
        chainKey: 'sepolia',
      }),
      TX_HASH,
    ); // different coop

    const result = getActiveMemberAccounts([acct1, acct2, acct3], 'coop-1');

    expect(result).toHaveLength(1);
    expect(result[0].memberId).toBe('member-1');
  });
});

describe('formatMemberAccountStatus', () => {
  it('returns human-readable labels', () => {
    expect(formatMemberAccountStatus('pending')).toBe('Pending provisioning');
    expect(formatMemberAccountStatus('predicted')).toBe('Address predicted');
    expect(formatMemberAccountStatus('deploying')).toBe('Deploying');
    expect(formatMemberAccountStatus('active')).toBe('Active');
    expect(formatMemberAccountStatus('suspended')).toBe('Suspended');
    expect(formatMemberAccountStatus('recovery')).toBe('Recovery in progress');
    expect(formatMemberAccountStatus('error')).toBe('Provisioning error');
  });
});

describe('formatMemberAccountType', () => {
  it('returns human-readable labels', () => {
    expect(formatMemberAccountType('safe')).toBe('Safe smart account');
    expect(formatMemberAccountType('kernel')).toBe('Kernel smart account');
    expect(formatMemberAccountType('smart-account')).toBe('Generic smart account');
  });
});

describe('createLocalMemberSignerBinding', () => {
  it('creates a local-only signer binding with passkey metadata', () => {
    const binding = createLocalMemberSignerBinding({
      coopId: 'coop-1',
      memberId: 'member-1',
      accountAddress: DEPLOYED_ADDRESS,
      passkeyCredentialId: 'cred-abc',
    });

    expect(binding.id).toMatch(/^msigner-/);
    expect(binding.coopId).toBe('coop-1');
    expect(binding.memberId).toBe('member-1');
    expect(binding.accountAddress).toBe(DEPLOYED_ADDRESS);
    expect(binding.passkeyCredentialId).toBe('cred-abc');
    expect(binding.lastUsedAt).toBe(binding.createdAt);
  });
});
