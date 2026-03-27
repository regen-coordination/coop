import { type Address, encodeFunctionData, toFunctionSelector } from 'viem';
import { describe, expect, it } from 'vitest';
import {
  getGreenGoodsDeployment,
  greenGoodsKarmaGapModuleAbi,
  syncGreenGoodsGapAdmins,
} from '../greengoods';

const SAFE_ADDRESS = '0x4444444444444444444444444444444444444444' as Address;
const GARDEN_ADDRESS = '0x1111111111111111111111111111111111111111' as Address;
const ADMIN_A = '0x2222222222222222222222222222222222222222' as Address;
const ADMIN_B = '0x3333333333333333333333333333333333333333' as Address;
const ADMIN_C = '0x5555555555555555555555555555555555555555' as Address;

const liveExecutionInput = {
  mode: 'live' as const,
  authSession: { passkey: { id: 'test-passkey' } } as never,
  pimlicoApiKey: 'test-pimlico-key',
  onchainState: {
    chainId: 11155111,
    chainKey: 'sepolia' as const,
    safeAddress: SAFE_ADDRESS,
    safeCapability: 'executed' as const,
    statusNote: 'Safe executed.',
  },
};

describe('syncGreenGoodsGapAdmins', () => {
  it('routes deduped live GAP admin writes through karmaGapModule in deterministic add-then-remove order', async () => {
    const deployment = getGreenGoodsDeployment('sepolia');
    const calls: Array<{ to: Address; data: `0x${string}`; value?: bigint }> = [];

    const result = await syncGreenGoodsGapAdmins({
      ...liveExecutionInput,
      gardenAddress: GARDEN_ADDRESS,
      addAdmins: [ADMIN_A, ADMIN_B, ADMIN_A],
      removeAdmins: [ADMIN_C, ADMIN_B, ADMIN_C],
      liveExecutor: async (input) => {
        calls.push(input);
        return {
          txHash: `0x${String(calls.length).padStart(64, '0')}` as `0x${string}`,
          safeAddress: SAFE_ADDRESS,
        };
      },
    });

    expect(result.txHash).toBe(`0x${'4'.padStart(64, '0')}`);
    expect(calls).toEqual([
      {
        to: deployment.karmaGapModule,
        data: encodeFunctionData({
          abi: greenGoodsKarmaGapModuleAbi,
          functionName: 'addProjectAdmin',
          args: [GARDEN_ADDRESS, ADMIN_A],
        }),
      },
      {
        to: deployment.karmaGapModule,
        data: encodeFunctionData({
          abi: greenGoodsKarmaGapModuleAbi,
          functionName: 'addProjectAdmin',
          args: [GARDEN_ADDRESS, ADMIN_B],
        }),
      },
      {
        to: deployment.karmaGapModule,
        data: encodeFunctionData({
          abi: greenGoodsKarmaGapModuleAbi,
          functionName: 'removeProjectAdmin',
          args: [GARDEN_ADDRESS, ADMIN_C],
        }),
      },
      {
        to: deployment.karmaGapModule,
        data: encodeFunctionData({
          abi: greenGoodsKarmaGapModuleAbi,
          functionName: 'removeProjectAdmin',
          args: [GARDEN_ADDRESS, ADMIN_B],
        }),
      },
    ]);
    expect(calls.map((call) => call.data.slice(0, 10))).toEqual([
      toFunctionSelector('addProjectAdmin(address,address)'),
      toFunctionSelector('addProjectAdmin(address,address)'),
      toFunctionSelector('removeProjectAdmin(address,address)'),
      toFunctionSelector('removeProjectAdmin(address,address)'),
    ]);
  });

  it('returns the expected deterministic no-op result when there are no GAP admin changes', async () => {
    const result = await syncGreenGoodsGapAdmins({
      ...liveExecutionInput,
      gardenAddress: GARDEN_ADDRESS,
      addAdmins: [],
      removeAdmins: [],
      liveExecutor: async () => {
        throw new Error('Expected no-op GAP admin sync to skip execution.');
      },
    });

    expect(result.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.detail).toContain('found no GAP admin changes to apply');
  });
});
