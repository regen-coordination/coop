import type { Address } from 'viem';
import { describe, expect, it } from 'vitest';
import {
  type SafeOwnerChange,
  createMockOwnerChangeResult,
  encodeAddOwnerCalldata,
  encodeChangeThresholdCalldata,
  encodeRemoveOwnerCalldata,
  encodeSwapOwnerCalldata,
  markOwnerChangeExecuted,
  markOwnerChangeFailed,
  proposeAddOwner,
  proposeChangeThreshold,
  proposeRemoveOwner,
  proposeSwapOwner,
  resolvePreviousOwner,
  validateOwnerChange,
} from '../safe-owners';

const ALICE = '0x1111111111111111111111111111111111111111' as Address;
const BOB = '0x2222222222222222222222222222222222222222' as Address;
const CAROL = '0x3333333333333333333333333333333333333333' as Address;
const SENTINEL = '0x0000000000000000000000000000000000000001' as Address;

const SAFE_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address;

describe('safe-owners calldata encoding', () => {
  it('encodeAddOwnerCalldata returns valid hex', () => {
    const calldata = encodeAddOwnerCalldata(BOB, 2);
    expect(calldata).toMatch(/^0x[a-fA-F0-9]+$/);
    // addOwnerWithThreshold selector is 0x0d582f13
    expect(calldata.slice(0, 10)).toBe('0x0d582f13');
  });

  it('encodeRemoveOwnerCalldata returns valid hex', () => {
    const calldata = encodeRemoveOwnerCalldata(SENTINEL, ALICE, 1);
    expect(calldata).toMatch(/^0x[a-fA-F0-9]+$/);
    // removeOwner selector is 0xf8dc5dd9
    expect(calldata.slice(0, 10)).toBe('0xf8dc5dd9');
  });

  it('encodeSwapOwnerCalldata returns valid hex', () => {
    const calldata = encodeSwapOwnerCalldata(SENTINEL, ALICE, BOB);
    expect(calldata).toMatch(/^0x[a-fA-F0-9]+$/);
    // swapOwner selector is 0xe318b52b
    expect(calldata.slice(0, 10)).toBe('0xe318b52b');
  });

  it('encodeChangeThresholdCalldata returns valid hex', () => {
    const calldata = encodeChangeThresholdCalldata(2);
    expect(calldata).toMatch(/^0x[a-fA-F0-9]+$/);
    // changeThreshold selector is 0x694e80c3
    expect(calldata.slice(0, 10)).toBe('0x694e80c3');
  });
});

describe('resolvePreviousOwner', () => {
  it('returns sentinel for first owner', () => {
    const prev = resolvePreviousOwner([ALICE, BOB, CAROL], ALICE);
    expect(prev).toBe(SENTINEL);
  });

  it('returns previous owner for non-first owner', () => {
    const prev = resolvePreviousOwner([ALICE, BOB, CAROL], BOB);
    expect(prev).toBe(ALICE);
  });

  it('returns previous owner for last owner', () => {
    const prev = resolvePreviousOwner([ALICE, BOB, CAROL], CAROL);
    expect(prev).toBe(BOB);
  });

  it('throws for unknown owner', () => {
    expect(() => resolvePreviousOwner([ALICE, BOB], CAROL)).toThrow(/not found in owner list/);
  });

  it('handles case-insensitive matching', () => {
    const lower = '0x1111111111111111111111111111111111111111' as Address;
    const upper = '0x1111111111111111111111111111111111111111'.toUpperCase() as Address;
    const prev = resolvePreviousOwner([upper, BOB], lower);
    expect(prev).toBe(SENTINEL);
  });
});

describe('proposeAddOwner', () => {
  it('creates valid change record', () => {
    const change = proposeAddOwner({
      safeAddress: SAFE_ADDRESS,
      chainKey: 'sepolia',
      ownerToAdd: BOB,
      newThreshold: 2,
      currentOwners: [ALICE],
    });

    expect(change.id).toMatch(/^soc-/);
    expect(change.changeType).toBe('add-owner');
    expect(change.safeAddress).toBe(SAFE_ADDRESS);
    expect(change.chainKey).toBe('sepolia');
    expect(change.ownerToAdd).toBe(BOB);
    expect(change.newThreshold).toBe(2);
    expect(change.previousOwners).toEqual([ALICE]);
    expect(change.newOwners).toEqual([ALICE, BOB]);
    expect(change.status).toBe('proposed');
    expect(change.createdAt).toBeDefined();
  });
});

describe('proposeRemoveOwner', () => {
  it('creates valid change record', () => {
    const change = proposeRemoveOwner({
      safeAddress: SAFE_ADDRESS,
      chainKey: 'sepolia',
      ownerToRemove: BOB,
      newThreshold: 1,
      currentOwners: [ALICE, BOB],
    });

    expect(change.changeType).toBe('remove-owner');
    expect(change.ownerToRemove).toBe(BOB);
    expect(change.newOwners).toEqual([ALICE]);
    expect(change.newThreshold).toBe(1);
    expect(change.status).toBe('proposed');
  });

  it('throws for last owner', () => {
    expect(() =>
      proposeRemoveOwner({
        safeAddress: SAFE_ADDRESS,
        chainKey: 'sepolia',
        ownerToRemove: ALICE,
        newThreshold: 1,
        currentOwners: [ALICE],
      }),
    ).toThrow(/Cannot remove the last owner/);
  });

  it('throws when threshold exceeds remaining owners', () => {
    expect(() =>
      proposeRemoveOwner({
        safeAddress: SAFE_ADDRESS,
        chainKey: 'sepolia',
        ownerToRemove: CAROL,
        newThreshold: 3,
        currentOwners: [ALICE, BOB, CAROL],
      }),
    ).toThrow(/Threshold 3 exceeds remaining owner count 2/);
  });
});

describe('proposeSwapOwner', () => {
  it('creates valid change record', () => {
    const change = proposeSwapOwner({
      safeAddress: SAFE_ADDRESS,
      chainKey: 'sepolia',
      ownerToSwapOut: ALICE,
      ownerToSwapIn: CAROL,
      currentOwners: [ALICE, BOB],
    });

    expect(change.changeType).toBe('swap-owner');
    expect(change.ownerToSwapOut).toBe(ALICE);
    expect(change.ownerToSwapIn).toBe(CAROL);
    expect(change.newOwners).toEqual([CAROL, BOB]);
    expect(change.status).toBe('proposed');
  });
});

describe('proposeChangeThreshold', () => {
  it('creates valid change record', () => {
    const change = proposeChangeThreshold({
      safeAddress: SAFE_ADDRESS,
      chainKey: 'sepolia',
      currentThreshold: 1,
      newThreshold: 2,
      currentOwners: [ALICE, BOB],
    });

    expect(change.changeType).toBe('change-threshold');
    expect(change.previousThreshold).toBe(1);
    expect(change.newThreshold).toBe(2);
    expect(change.status).toBe('proposed');
  });

  it('throws for threshold less than 1', () => {
    expect(() =>
      proposeChangeThreshold({
        safeAddress: SAFE_ADDRESS,
        chainKey: 'sepolia',
        currentThreshold: 1,
        newThreshold: 0,
        currentOwners: [ALICE],
      }),
    ).toThrow(/Threshold must be at least 1/);
  });

  it('throws for threshold exceeding owner count', () => {
    expect(() =>
      proposeChangeThreshold({
        safeAddress: SAFE_ADDRESS,
        chainKey: 'sepolia',
        currentThreshold: 1,
        newThreshold: 3,
        currentOwners: [ALICE, BOB],
      }),
    ).toThrow(/Threshold 3 exceeds owner count 2/);
  });
});

describe('validateOwnerChange', () => {
  it('rejects non-proposed changes', () => {
    const change = proposeAddOwner({
      safeAddress: SAFE_ADDRESS,
      chainKey: 'sepolia',
      ownerToAdd: BOB,
      newThreshold: 1,
      currentOwners: [ALICE],
    });
    const executed = markOwnerChangeExecuted(change, '0xabc123' as `0x${string}`);
    const result = validateOwnerChange(executed, [ALICE]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('not proposed');
    }
  });

  it('rejects adding an existing owner', () => {
    const change = proposeAddOwner({
      safeAddress: SAFE_ADDRESS,
      chainKey: 'sepolia',
      ownerToAdd: ALICE,
      newThreshold: 1,
      currentOwners: [BOB],
    });
    const result = validateOwnerChange(change, [ALICE, BOB]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('already an owner');
    }
  });

  it('rejects removing a non-owner', () => {
    const change = proposeRemoveOwner({
      safeAddress: SAFE_ADDRESS,
      chainKey: 'sepolia',
      ownerToRemove: BOB,
      newThreshold: 1,
      currentOwners: [ALICE, BOB],
    });
    const result = validateOwnerChange(change, [ALICE]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('not an owner');
    }
  });

  it('rejects removing the last owner', () => {
    const change: SafeOwnerChange = {
      id: 'soc-test',
      changeType: 'remove-owner',
      safeAddress: SAFE_ADDRESS,
      chainKey: 'sepolia',
      ownerToRemove: ALICE,
      newThreshold: 1,
      status: 'proposed',
      statusNote: 'test',
      createdAt: new Date().toISOString(),
    };
    const result = validateOwnerChange(change, [ALICE]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('Cannot remove the last owner');
    }
  });

  it('rejects swapping in an existing owner', () => {
    const change = proposeSwapOwner({
      safeAddress: SAFE_ADDRESS,
      chainKey: 'sepolia',
      ownerToSwapOut: ALICE,
      ownerToSwapIn: BOB,
      currentOwners: [ALICE, BOB],
    });
    const result = validateOwnerChange(change, [ALICE, BOB]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('already an owner');
    }
  });

  it('rejects swapping out a non-owner', () => {
    const change = proposeSwapOwner({
      safeAddress: SAFE_ADDRESS,
      chainKey: 'sepolia',
      ownerToSwapOut: CAROL,
      ownerToSwapIn: BOB,
      currentOwners: [ALICE, CAROL],
    });
    const result = validateOwnerChange(change, [ALICE]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('not an owner');
    }
  });

  it('rejects threshold exceeding owner count', () => {
    const change = proposeChangeThreshold({
      safeAddress: SAFE_ADDRESS,
      chainKey: 'sepolia',
      currentThreshold: 1,
      newThreshold: 2,
      currentOwners: [ALICE, BOB],
    });
    const result = validateOwnerChange(change, [ALICE]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('Threshold exceeds owner count');
    }
  });

  it('accepts valid add-owner change', () => {
    const change = proposeAddOwner({
      safeAddress: SAFE_ADDRESS,
      chainKey: 'sepolia',
      ownerToAdd: BOB,
      newThreshold: 2,
      currentOwners: [ALICE],
    });
    const result = validateOwnerChange(change, [ALICE]);
    expect(result.ok).toBe(true);
  });

  it('accepts valid change-threshold change', () => {
    const change = proposeChangeThreshold({
      safeAddress: SAFE_ADDRESS,
      chainKey: 'sepolia',
      currentThreshold: 1,
      newThreshold: 2,
      currentOwners: [ALICE, BOB],
    });
    const result = validateOwnerChange(change, [ALICE, BOB]);
    expect(result.ok).toBe(true);
  });
});

describe('markOwnerChangeExecuted / markOwnerChangeFailed', () => {
  it('transitions to executed with txHash', () => {
    const change = proposeAddOwner({
      safeAddress: SAFE_ADDRESS,
      chainKey: 'sepolia',
      ownerToAdd: BOB,
      newThreshold: 2,
      currentOwners: [ALICE],
    });
    const txHash =
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`;
    const executed = markOwnerChangeExecuted(change, txHash, '0x111' as `0x${string}`);

    expect(executed.status).toBe('executed');
    expect(executed.txHash).toBe(txHash);
    expect(executed.userOperationHash).toBe('0x111');
    expect(executed.executedAt).toBeDefined();
    expect(executed.statusNote).toBe('Owner change executed successfully');
  });

  it('transitions to failed with reason', () => {
    const change = proposeAddOwner({
      safeAddress: SAFE_ADDRESS,
      chainKey: 'sepolia',
      ownerToAdd: BOB,
      newThreshold: 2,
      currentOwners: [ALICE],
    });
    const failed = markOwnerChangeFailed(change, 'Bundler rejected user operation');

    expect(failed.status).toBe('failed');
    expect(failed.statusNote).toBe('Bundler rejected user operation');
  });
});

describe('createMockOwnerChangeResult', () => {
  it('returns executed change with mock hash', () => {
    const change = proposeAddOwner({
      safeAddress: SAFE_ADDRESS,
      chainKey: 'sepolia',
      ownerToAdd: BOB,
      newThreshold: 2,
      currentOwners: [ALICE],
    });
    const result = createMockOwnerChangeResult(change);

    expect(result.status).toBe('executed');
    expect(result.txHash).toMatch(/^0x[a-fA-F0-9]+$/);
    expect(result.executedAt).toBeDefined();
  });
});
