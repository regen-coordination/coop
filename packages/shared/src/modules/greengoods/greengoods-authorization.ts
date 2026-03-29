import { http, type Address, createPublicClient } from 'viem';
import type { OnchainState } from '../../contracts/schema';
import { assertHexString } from '../../utils';
import { getCoopChainConfig } from '../onchain/onchain';
import { greenGoodsDeploymentRegistryAbi, greenGoodsGardenTokenAbi } from './greengoods-abis';
import { describeGreenGoodsChain, getGreenGoodsDeployment } from './greengoods-deployments';

type GreenGoodsReadClient = {
  readContract: (input: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }) => Promise<unknown>;
};

export type GreenGoodsGardenMintAuthorization =
  | {
      authorized: true;
      reason: 'owner' | 'allowlist' | 'open-minting';
      owner: Address;
      deploymentRegistry: Address;
    }
  | {
      authorized: false;
      owner: Address;
      deploymentRegistry: Address;
      detail: string;
    };

export async function inspectGreenGoodsGardenMintAuthorization(input: {
  onchainState: OnchainState;
  safeAddress?: Address;
  client?: GreenGoodsReadClient;
}): Promise<GreenGoodsGardenMintAuthorization> {
  const chainConfig = getCoopChainConfig(input.onchainState.chainKey);
  const client =
    input.client ??
    createPublicClient({
      chain: chainConfig.chain,
      transport: http(chainConfig.chain.rpcUrls.default.http[0]),
    });
  const deployment = getGreenGoodsDeployment(input.onchainState.chainKey);
  const safeAddress =
    input.safeAddress ?? assertHexString(input.onchainState.safeAddress, 'safeAddress');
  const owner = assertHexString(
    (await client.readContract({
      address: deployment.gardenToken,
      abi: greenGoodsGardenTokenAbi,
      functionName: 'owner',
    })) as string,
    'greenGoodsGardenToken.owner',
  );
  const deploymentRegistry = assertHexString(
    (await client.readContract({
      address: deployment.gardenToken,
      abi: greenGoodsGardenTokenAbi,
      functionName: 'deploymentRegistry',
    })) as string,
    'greenGoodsGardenToken.deploymentRegistry',
  );

  try {
    const openMinting = (await client.readContract({
      address: deployment.gardenToken,
      abi: greenGoodsGardenTokenAbi,
      functionName: 'openMinting',
    })) as boolean;
    if (openMinting) {
      return {
        authorized: true,
        reason: 'open-minting',
        owner,
        deploymentRegistry,
      };
    }
  } catch {
    // Older deployments may not expose openMinting; fall through to owner/allowlist checks.
  }

  if (owner.toLowerCase() === safeAddress.toLowerCase()) {
    return {
      authorized: true,
      reason: 'owner',
      owner,
      deploymentRegistry,
    };
  }

  const allowlisted = (await client.readContract({
    address: deploymentRegistry,
    abi: greenGoodsDeploymentRegistryAbi,
    functionName: 'isInAllowlist',
    args: [safeAddress],
  })) as boolean;
  if (allowlisted) {
    return {
      authorized: true,
      reason: 'allowlist',
      owner,
      deploymentRegistry,
    };
  }

  return {
    authorized: false,
    owner,
    deploymentRegistry,
    detail: `Green Goods garden minting is currently restricted on ${describeGreenGoodsChain(
      input.onchainState.chainKey,
    )}. Coop Safe ${safeAddress} is not the GardenToken owner ${owner} and is not allowlisted in deployment registry ${deploymentRegistry}. Ask Green Goods governance to allowlist this Safe or enable open minting before retrying.`,
  };
}
