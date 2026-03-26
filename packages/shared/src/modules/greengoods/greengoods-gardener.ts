import { type Address, encodeFunctionData } from 'viem';
import type { AuthSession, OnchainState } from '../../contracts/schema';
import { hashJson } from '../../utils';
import type { CoopOnchainMode } from '../onchain/onchain';
import { greenGoodsGardenerManagementAbi } from './greengoods-abis';
import {
  type GreenGoodsTransactionResult,
  describeGreenGoodsMode,
  ensureLiveExecutionReady,
  requireLiveExecutionCredentials,
  sendViaCoopSafe,
} from './greengoods-deployments';

export function buildAddGardenerCalldata(input: {
  gardenAddress: Address;
  gardenerAddress: Address;
}): `0x${string}` {
  return encodeFunctionData({
    abi: greenGoodsGardenerManagementAbi,
    functionName: 'addGardener',
    args: [input.gardenerAddress],
  });
}

export function buildRemoveGardenerCalldata(input: {
  gardenAddress: Address;
  gardenerAddress: Address;
}): `0x${string}` {
  return encodeFunctionData({
    abi: greenGoodsGardenerManagementAbi,
    functionName: 'removeGardener',
    args: [input.gardenerAddress],
  });
}

export async function addGreenGoodsGardener(input: {
  mode: CoopOnchainMode;
  authSession?: AuthSession | null;
  pimlicoApiKey?: string;
  onchainState: OnchainState;
  gardenAddress: Address;
  gardenerAddress: Address;
}): Promise<GreenGoodsTransactionResult> {
  ensureLiveExecutionReady(input);

  if (input.mode !== 'live') {
    return {
      txHash: hashJson({
        kind: 'green-goods-add-gardener',
        safeAddress: input.onchainState.safeAddress,
        gardenAddress: input.gardenAddress,
        gardenerAddress: input.gardenerAddress,
      }),
      detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} added a mock gardener.`,
    };
  }

  const calldata = buildAddGardenerCalldata({
    gardenAddress: input.gardenAddress,
    gardenerAddress: input.gardenerAddress,
  });
  const credentials = requireLiveExecutionCredentials(input);

  const result = await sendViaCoopSafe({
    authSession: credentials.authSession,
    pimlicoApiKey: credentials.pimlicoApiKey,
    onchainState: input.onchainState,
    to: input.gardenAddress,
    data: calldata,
  });

  return {
    txHash: result.txHash,
    detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} added a gardener to the garden.`,
  };
}

export async function removeGreenGoodsGardener(input: {
  mode: CoopOnchainMode;
  authSession?: AuthSession | null;
  pimlicoApiKey?: string;
  onchainState: OnchainState;
  gardenAddress: Address;
  gardenerAddress: Address;
}): Promise<GreenGoodsTransactionResult> {
  ensureLiveExecutionReady(input);

  if (input.mode !== 'live') {
    return {
      txHash: hashJson({
        kind: 'green-goods-remove-gardener',
        safeAddress: input.onchainState.safeAddress,
        gardenAddress: input.gardenAddress,
        gardenerAddress: input.gardenerAddress,
      }),
      detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} removed a mock gardener.`,
    };
  }

  const calldata = buildRemoveGardenerCalldata({
    gardenAddress: input.gardenAddress,
    gardenerAddress: input.gardenerAddress,
  });
  const credentials = requireLiveExecutionCredentials(input);

  const result = await sendViaCoopSafe({
    authSession: credentials.authSession,
    pimlicoApiKey: credentials.pimlicoApiKey,
    onchainState: input.onchainState,
    to: input.gardenAddress,
    data: calldata,
  });

  return {
    txHash: result.txHash,
    detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} removed a gardener from the garden.`,
  };
}
