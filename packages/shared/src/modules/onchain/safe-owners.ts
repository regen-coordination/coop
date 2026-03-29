import { type Address, type Hex, encodeFunctionData } from 'viem';
import type { CoopChainKey } from '../../contracts/schema';
import { createId, hashJson, nowIso } from '../../utils';

// ─── Types ───────────────────────────────────────────────────────────

export interface SafeOwnerChange {
  id: string;
  changeType: 'add-owner' | 'remove-owner' | 'swap-owner' | 'change-threshold';
  safeAddress: Address;
  chainKey: CoopChainKey;
  previousOwners?: Address[];
  newOwners?: Address[];
  previousThreshold?: number;
  newThreshold?: number;
  ownerToAdd?: Address;
  ownerToRemove?: Address;
  ownerToSwapOut?: Address;
  ownerToSwapIn?: Address;
  status: 'proposed' | 'executed' | 'failed';
  statusNote: string;
  txHash?: Hex;
  userOperationHash?: Hex;
  createdAt: string;
  executedAt?: string;
}

// ─── Safe Contract ABI fragments (Safe v1.4.1) ──────────────────────

const SAFE_ABI = [
  {
    name: 'addOwnerWithThreshold',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: '_threshold', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'removeOwner',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'prevOwner', type: 'address' },
      { name: 'owner', type: 'address' },
      { name: '_threshold', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'swapOwner',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'prevOwner', type: 'address' },
      { name: 'oldOwner', type: 'address' },
      { name: 'newOwner', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'changeThreshold',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_threshold', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getOwners',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'getThreshold',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isOwner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// Sentinel address used by Safe's linked list for owner management
const SENTINEL_ADDRESS: Address = '0x0000000000000000000000000000000000000001';

// ─── Calldata Encoding ───────────────────────────────────────────────

/** Encode addOwnerWithThreshold calldata */
export function encodeAddOwnerCalldata(owner: Address, threshold: number): Hex {
  return encodeFunctionData({
    abi: SAFE_ABI,
    functionName: 'addOwnerWithThreshold',
    args: [owner, BigInt(threshold)],
  });
}

/** Encode removeOwner calldata (requires prevOwner from linked list) */
export function encodeRemoveOwnerCalldata(
  prevOwner: Address,
  owner: Address,
  threshold: number,
): Hex {
  return encodeFunctionData({
    abi: SAFE_ABI,
    functionName: 'removeOwner',
    args: [prevOwner, owner, BigInt(threshold)],
  });
}

/** Encode swapOwner calldata */
export function encodeSwapOwnerCalldata(
  prevOwner: Address,
  oldOwner: Address,
  newOwner: Address,
): Hex {
  return encodeFunctionData({
    abi: SAFE_ABI,
    functionName: 'swapOwner',
    args: [prevOwner, oldOwner, newOwner],
  });
}

/** Encode changeThreshold calldata */
export function encodeChangeThresholdCalldata(threshold: number): Hex {
  return encodeFunctionData({
    abi: SAFE_ABI,
    functionName: 'changeThreshold',
    args: [BigInt(threshold)],
  });
}

// ─── Owner List Helpers ──────────────────────────────────────────────

/**
 * Resolve the previous owner in Safe's linked list.
 * Safe uses a sentinel-linked list: SENTINEL -> owner1 -> owner2 -> ... -> SENTINEL
 * To remove or swap an owner, you need the previous entry.
 */
export function resolvePreviousOwner(owners: Address[], targetOwner: Address): Address {
  const index = owners.findIndex((o) => o.toLowerCase() === targetOwner.toLowerCase());
  if (index === -1) {
    throw new Error(`Owner ${targetOwner} not found in owner list`);
  }
  return index === 0 ? SENTINEL_ADDRESS : owners[index - 1];
}

// ─── Change Record Creation ─────────────────────────────────────────

/** Create a proposed add-owner change */
export function proposeAddOwner(input: {
  safeAddress: Address;
  chainKey: CoopChainKey;
  ownerToAdd: Address;
  newThreshold: number;
  currentOwners: Address[];
}): SafeOwnerChange {
  return {
    id: createId('soc'),
    changeType: 'add-owner',
    safeAddress: input.safeAddress,
    chainKey: input.chainKey,
    previousOwners: [...input.currentOwners],
    newOwners: [...input.currentOwners, input.ownerToAdd],
    ownerToAdd: input.ownerToAdd,
    newThreshold: input.newThreshold,
    status: 'proposed',
    statusNote: `Add owner ${input.ownerToAdd} with threshold ${input.newThreshold}`,
    createdAt: nowIso(),
  };
}

/** Create a proposed remove-owner change */
export function proposeRemoveOwner(input: {
  safeAddress: Address;
  chainKey: CoopChainKey;
  ownerToRemove: Address;
  newThreshold: number;
  currentOwners: Address[];
}): SafeOwnerChange {
  if (input.currentOwners.length <= 1) {
    throw new Error('Cannot remove the last owner');
  }
  const newOwners = input.currentOwners.filter(
    (o) => o.toLowerCase() !== input.ownerToRemove.toLowerCase(),
  );
  if (input.newThreshold > newOwners.length) {
    throw new Error(
      `Threshold ${input.newThreshold} exceeds remaining owner count ${newOwners.length}`,
    );
  }
  return {
    id: createId('soc'),
    changeType: 'remove-owner',
    safeAddress: input.safeAddress,
    chainKey: input.chainKey,
    previousOwners: [...input.currentOwners],
    newOwners,
    ownerToRemove: input.ownerToRemove,
    newThreshold: input.newThreshold,
    status: 'proposed',
    statusNote: `Remove owner ${input.ownerToRemove} with threshold ${input.newThreshold}`,
    createdAt: nowIso(),
  };
}

/** Create a proposed swap-owner change */
export function proposeSwapOwner(input: {
  safeAddress: Address;
  chainKey: CoopChainKey;
  ownerToSwapOut: Address;
  ownerToSwapIn: Address;
  currentOwners: Address[];
}): SafeOwnerChange {
  const newOwners = input.currentOwners.map((o) =>
    o.toLowerCase() === input.ownerToSwapOut.toLowerCase() ? input.ownerToSwapIn : o,
  );
  return {
    id: createId('soc'),
    changeType: 'swap-owner',
    safeAddress: input.safeAddress,
    chainKey: input.chainKey,
    previousOwners: [...input.currentOwners],
    newOwners,
    ownerToSwapOut: input.ownerToSwapOut,
    ownerToSwapIn: input.ownerToSwapIn,
    status: 'proposed',
    statusNote: `Swap owner ${input.ownerToSwapOut} → ${input.ownerToSwapIn}`,
    createdAt: nowIso(),
  };
}

/** Create a proposed threshold change */
export function proposeChangeThreshold(input: {
  safeAddress: Address;
  chainKey: CoopChainKey;
  currentThreshold: number;
  newThreshold: number;
  currentOwners: Address[];
}): SafeOwnerChange {
  if (input.newThreshold < 1) {
    throw new Error('Threshold must be at least 1');
  }
  if (input.newThreshold > input.currentOwners.length) {
    throw new Error(
      `Threshold ${input.newThreshold} exceeds owner count ${input.currentOwners.length}`,
    );
  }
  return {
    id: createId('soc'),
    changeType: 'change-threshold',
    safeAddress: input.safeAddress,
    chainKey: input.chainKey,
    previousThreshold: input.currentThreshold,
    newThreshold: input.newThreshold,
    previousOwners: [...input.currentOwners],
    newOwners: [...input.currentOwners],
    status: 'proposed',
    statusNote: `Change threshold ${input.currentThreshold} → ${input.newThreshold}`,
    createdAt: nowIso(),
  };
}

// ─── Execution Result Handling ───────────────────────────────────────

/** Mark an owner change as executed */
export function markOwnerChangeExecuted(
  change: SafeOwnerChange,
  txHash: Hex,
  userOperationHash?: Hex,
): SafeOwnerChange {
  return {
    ...change,
    status: 'executed',
    statusNote: 'Owner change executed successfully',
    txHash,
    userOperationHash,
    executedAt: nowIso(),
  };
}

/** Mark an owner change as failed */
export function markOwnerChangeFailed(change: SafeOwnerChange, reason: string): SafeOwnerChange {
  return {
    ...change,
    status: 'failed',
    statusNote: reason,
  };
}

// ─── Mock Execution ──────────────────────────────────────────────────

/** Create a mock execution result (for testing/demo) */
export function createMockOwnerChangeResult(change: SafeOwnerChange): SafeOwnerChange {
  const mockHash = hashJson({
    changeType: change.changeType,
    safeAddress: change.safeAddress,
    createdAt: change.createdAt,
  }) as Hex;
  return markOwnerChangeExecuted(change, mockHash);
}

// ─── Validation ──────────────────────────────────────────────────────

/** Validate that an owner change is safe to execute */
export function validateOwnerChange(
  change: SafeOwnerChange,
  currentOwners: Address[],
): { ok: true } | { ok: false; reason: string } {
  if (change.status !== 'proposed') {
    return { ok: false, reason: `Change is ${change.status}, not proposed` };
  }

  switch (change.changeType) {
    case 'add-owner': {
      if (!change.ownerToAdd) return { ok: false, reason: 'Missing ownerToAdd' };
      if (currentOwners.some((o) => o.toLowerCase() === change.ownerToAdd?.toLowerCase())) {
        return { ok: false, reason: `${change.ownerToAdd} is already an owner` };
      }
      break;
    }
    case 'remove-owner': {
      if (!change.ownerToRemove) return { ok: false, reason: 'Missing ownerToRemove' };
      if (!currentOwners.some((o) => o.toLowerCase() === change.ownerToRemove?.toLowerCase())) {
        return { ok: false, reason: `${change.ownerToRemove} is not an owner` };
      }
      if (currentOwners.length <= 1) {
        return { ok: false, reason: 'Cannot remove the last owner' };
      }
      break;
    }
    case 'swap-owner': {
      if (!change.ownerToSwapOut || !change.ownerToSwapIn) {
        return { ok: false, reason: 'Missing swap addresses' };
      }
      if (!currentOwners.some((o) => o.toLowerCase() === change.ownerToSwapOut?.toLowerCase())) {
        return { ok: false, reason: `${change.ownerToSwapOut} is not an owner` };
      }
      if (currentOwners.some((o) => o.toLowerCase() === change.ownerToSwapIn?.toLowerCase())) {
        return { ok: false, reason: `${change.ownerToSwapIn} is already an owner` };
      }
      break;
    }
    case 'change-threshold': {
      if (!change.newThreshold) return { ok: false, reason: 'Missing newThreshold' };
      if (change.newThreshold < 1) return { ok: false, reason: 'Threshold must be >= 1' };
      if (change.newThreshold > currentOwners.length) {
        return { ok: false, reason: 'Threshold exceeds owner count' };
      }
      break;
    }
  }
  return { ok: true };
}

// ─── Threshold Progression ─────────────────────────────────────────

/**
 * Compute the recommended Safe threshold for a given owner count.
 *
 * Progression:
 *   1 owner  → threshold 1
 *   2 owners → threshold 1
 *   3 owners → threshold 2
 *   4 owners → threshold 2
 *   5 owners → threshold 2
 *   6 owners → threshold 3
 *   7 owners → threshold 3
 */
export function computeThresholdForOwnerCount(ownerCount: number): number {
  if (ownerCount <= 0) return 1;
  return Math.max(1, Math.ceil((ownerCount * 2) / 5));
}
