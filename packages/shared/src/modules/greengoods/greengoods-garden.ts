import { http, type Address, createPublicClient, decodeEventLog, encodeFunctionData } from 'viem';
import type {
  AuthSession,
  GreenGoodsDomain,
  GreenGoodsGardenState,
  GreenGoodsGardenSyncOutput,
  OnchainState,
} from '../../contracts/schema';
import { hashJson, toDeterministicAddress, unique } from '../../utils';
import { type CoopOnchainMode, getCoopChainConfig } from '../onchain/onchain';
import {
  greenGoodsActionRegistryAbi,
  greenGoodsGardenAccountAbi,
  greenGoodsGardenTokenAbi,
  greenGoodsGardensModuleAbi,
  greenGoodsKarmaGapModuleAbi,
} from './greengoods-abis';
import { inspectGreenGoodsGardenMintAuthorization } from './greengoods-authorization';
import {
  type GreenGoodsCreateGardenResult,
  type GreenGoodsLiveExecutor,
  type GreenGoodsTransactionResult,
  compactDefined,
  describeGreenGoodsMode,
  ensureLiveExecutionReady,
  getGreenGoodsDeployment,
  greenGoodsWeightSchemeValue,
  normalizeBytes32,
  requireLiveExecutionCredentials,
  sendViaCoopSafe,
} from './greengoods-deployments';
import { toGreenGoodsDomainMask } from './greengoods-state';

async function readGreenGoodsProjectUid(input: {
  onchainState: OnchainState;
  gardenAddress: Address;
}) {
  const chainConfig = getCoopChainConfig(input.onchainState.chainKey);
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.chain.rpcUrls.default.http[0]),
  });
  const deployment = getGreenGoodsDeployment(input.onchainState.chainKey);
  const projectUid = await publicClient.readContract({
    address: deployment.karmaGapModule,
    abi: greenGoodsKarmaGapModuleAbi,
    functionName: 'getProjectUID',
    args: [input.gardenAddress],
  });
  return normalizeBytes32(projectUid);
}

export async function createGreenGoodsGarden(input: {
  mode: CoopOnchainMode;
  coopId: string;
  authSession?: AuthSession | null;
  pimlicoApiKey?: string;
  onchainState: OnchainState;
  garden: GreenGoodsGardenState;
  operatorAddresses: Address[];
  gardenerAddresses: Address[];
  liveExecutor?: GreenGoodsLiveExecutor;
}): Promise<GreenGoodsCreateGardenResult> {
  ensureLiveExecutionReady(input);

  if (input.mode !== 'live') {
    return {
      gardenAddress: toDeterministicAddress(
        `green-goods-garden:${input.coopId}:${input.onchainState.safeAddress}`,
      ),
      tokenId: '1',
      txHash: hashJson({
        kind: 'green-goods-create-garden',
        coopId: input.coopId,
        safeAddress: input.onchainState.safeAddress,
      }),
      detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} created a mock garden.`,
    };
  }

  const mintAuthorization = await inspectGreenGoodsGardenMintAuthorization({
    onchainState: input.onchainState,
  });
  if (!mintAuthorization.authorized) {
    throw new Error(mintAuthorization.detail);
  }

  const deployment = getGreenGoodsDeployment(input.onchainState.chainKey);
  const mintConfig = {
    name: input.garden.name,
    slug: input.garden.slug ?? '',
    description: input.garden.description,
    location: input.garden.location ?? '',
    bannerImage: input.garden.bannerImage ?? '',
    metadata: input.garden.metadata ?? '',
    openJoining: input.garden.openJoining,
    weightScheme: greenGoodsWeightSchemeValue[input.garden.weightScheme],
    domainMask: toGreenGoodsDomainMask(input.garden.domains),
    gardeners: unique(input.gardenerAddresses),
    operators: unique(input.operatorAddresses),
  };
  const result = input.liveExecutor
    ? await input.liveExecutor({
        to: deployment.gardenToken,
        data: encodeFunctionData({
          abi: greenGoodsGardenTokenAbi,
          functionName: 'mintGarden',
          args: [mintConfig],
        }),
      })
    : await (async () => {
        const credentials = requireLiveExecutionCredentials(input);
        return sendViaCoopSafe({
          authSession: credentials.authSession,
          pimlicoApiKey: credentials.pimlicoApiKey,
          onchainState: input.onchainState,
          to: deployment.gardenToken,
          data: encodeFunctionData({
            abi: greenGoodsGardenTokenAbi,
            functionName: 'mintGarden',
            args: [mintConfig],
          }),
        });
      })();

  if (!result.receipt) {
    throw new Error('Green Goods live executor did not return a transaction receipt.');
  }

  const mintLog = result.receipt.logs.find((log) => {
    try {
      const decoded = decodeEventLog({
        abi: greenGoodsGardenTokenAbi,
        data: log.data,
        topics: log.topics,
        eventName: 'GardenMinted',
      });
      return decoded.eventName === 'GardenMinted';
    } catch {
      return false;
    }
  });

  if (!mintLog) {
    throw new Error('Green Goods mint succeeded, but the GardenMinted event was not found.');
  }

  const decoded = decodeEventLog({
    abi: greenGoodsGardenTokenAbi,
    data: mintLog.data,
    topics: mintLog.topics,
    eventName: 'GardenMinted',
  });

  return {
    gardenAddress: decoded.args.account,
    tokenId: decoded.args.tokenId.toString(),
    txHash: result.txHash,
    gapProjectUid:
      input.mode === 'live'
        ? await readGreenGoodsProjectUid({
            onchainState: input.onchainState,
            gardenAddress: decoded.args.account,
          })
        : normalizeBytes32(
            hashJson({
              kind: 'green-goods-gap-project',
              coopId: input.coopId,
              gardenAddress: decoded.args.account,
            }),
          ),
    detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} created a garden owned by the coop Safe.`,
  };
}

export async function syncGreenGoodsGardenProfile(input: {
  mode: CoopOnchainMode;
  authSession?: AuthSession | null;
  pimlicoApiKey?: string;
  onchainState: OnchainState;
  gardenAddress: Address;
  output: GreenGoodsGardenSyncOutput;
  liveExecutor?: GreenGoodsLiveExecutor;
}): Promise<GreenGoodsTransactionResult> {
  ensureLiveExecutionReady(input);

  if (input.mode !== 'live') {
    return {
      txHash: hashJson({
        kind: 'green-goods-sync-garden-profile',
        safeAddress: input.onchainState.safeAddress,
        gardenAddress: input.gardenAddress,
        output: input.output,
      }),
      detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} synced mock garden profile fields.`,
    };
  }

  const calls = compactDefined([
    {
      label: 'name',
      data: encodeFunctionData({
        abi: greenGoodsGardenAccountAbi,
        functionName: 'updateName',
        args: [input.output.name],
      }),
    },
    {
      label: 'description',
      data: encodeFunctionData({
        abi: greenGoodsGardenAccountAbi,
        functionName: 'updateDescription',
        args: [input.output.description],
      }),
    },
    {
      label: 'location',
      data: encodeFunctionData({
        abi: greenGoodsGardenAccountAbi,
        functionName: 'updateLocation',
        args: [input.output.location],
      }),
    },
    {
      label: 'bannerImage',
      data: encodeFunctionData({
        abi: greenGoodsGardenAccountAbi,
        functionName: 'updateBannerImage',
        args: [input.output.bannerImage],
      }),
    },
    {
      label: 'metadata',
      data: encodeFunctionData({
        abi: greenGoodsGardenAccountAbi,
        functionName: 'updateMetadata',
        args: [input.output.metadata],
      }),
    },
    {
      label: 'openJoining',
      data: encodeFunctionData({
        abi: greenGoodsGardenAccountAbi,
        functionName: 'setOpenJoining',
        args: [input.output.openJoining],
      }),
    },
    {
      label: 'maxGardeners',
      data: encodeFunctionData({
        abi: greenGoodsGardenAccountAbi,
        functionName: 'setMaxGardeners',
        args: [BigInt(input.output.maxGardeners)],
      }),
    },
  ]);

  let lastTxHash: `0x${string}` | null = null;
  for (const call of calls) {
    const result = input.liveExecutor
      ? await input.liveExecutor({
          to: input.gardenAddress,
          data: call.data,
        })
      : await (async () => {
          const credentials = requireLiveExecutionCredentials(input);
          return sendViaCoopSafe({
            authSession: credentials.authSession,
            pimlicoApiKey: credentials.pimlicoApiKey,
            onchainState: input.onchainState,
            to: input.gardenAddress,
            data: call.data,
          });
        })();
    lastTxHash = result.txHash;
  }

  if (!lastTxHash) {
    throw new Error('No Green Goods garden profile transactions were prepared.');
  }

  return {
    txHash: lastTxHash,
    detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} synced Green Goods garden profile fields.`,
  };
}

export async function setGreenGoodsGardenDomains(input: {
  mode: CoopOnchainMode;
  authSession?: AuthSession | null;
  pimlicoApiKey?: string;
  onchainState: OnchainState;
  gardenAddress: Address;
  domains: GreenGoodsDomain[];
  liveExecutor?: GreenGoodsLiveExecutor;
}): Promise<GreenGoodsTransactionResult> {
  ensureLiveExecutionReady(input);

  if (input.mode !== 'live') {
    return {
      txHash: hashJson({
        kind: 'green-goods-set-garden-domains',
        safeAddress: input.onchainState.safeAddress,
        gardenAddress: input.gardenAddress,
        domains: input.domains,
      }),
      detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} updated mock garden domains.`,
    };
  }

  const deployment = getGreenGoodsDeployment(input.onchainState.chainKey);
  const result = input.liveExecutor
    ? await input.liveExecutor({
        to: deployment.actionRegistry,
        data: encodeFunctionData({
          abi: greenGoodsActionRegistryAbi,
          functionName: 'setGardenDomains',
          args: [input.gardenAddress, toGreenGoodsDomainMask(input.domains)],
        }),
      })
    : await (async () => {
        const credentials = requireLiveExecutionCredentials(input);
        return sendViaCoopSafe({
          authSession: credentials.authSession,
          pimlicoApiKey: credentials.pimlicoApiKey,
          onchainState: input.onchainState,
          to: deployment.actionRegistry,
          data: encodeFunctionData({
            abi: greenGoodsActionRegistryAbi,
            functionName: 'setGardenDomains',
            args: [input.gardenAddress, toGreenGoodsDomainMask(input.domains)],
          }),
        });
      })();

  return {
    txHash: result.txHash,
    detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} updated Green Goods garden domains.`,
  };
}

export async function createGreenGoodsGardenPools(input: {
  mode: CoopOnchainMode;
  authSession?: AuthSession | null;
  pimlicoApiKey?: string;
  onchainState: OnchainState;
  gardenAddress: Address;
  liveExecutor?: GreenGoodsLiveExecutor;
}): Promise<GreenGoodsTransactionResult> {
  ensureLiveExecutionReady(input);

  if (input.mode !== 'live') {
    return {
      txHash: hashJson({
        kind: 'green-goods-create-garden-pools',
        safeAddress: input.onchainState.safeAddress,
        gardenAddress: input.gardenAddress,
      }),
      detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} created mock garden pools.`,
    };
  }

  const deployment = getGreenGoodsDeployment(input.onchainState.chainKey);
  const result = input.liveExecutor
    ? await input.liveExecutor({
        to: deployment.gardensModule,
        data: encodeFunctionData({
          abi: greenGoodsGardensModuleAbi,
          functionName: 'createGardenPools',
          args: [input.gardenAddress],
        }),
      })
    : await (async () => {
        const credentials = requireLiveExecutionCredentials(input);
        return sendViaCoopSafe({
          authSession: credentials.authSession,
          pimlicoApiKey: credentials.pimlicoApiKey,
          onchainState: input.onchainState,
          to: deployment.gardensModule,
          data: encodeFunctionData({
            abi: greenGoodsGardensModuleAbi,
            functionName: 'createGardenPools',
            args: [input.gardenAddress],
          }),
        });
      })();

  return {
    txHash: result.txHash,
    detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} created Green Goods garden pools.`,
  };
}

export async function syncGreenGoodsGapAdmins(input: {
  mode: CoopOnchainMode;
  authSession?: AuthSession | null;
  pimlicoApiKey?: string;
  onchainState: OnchainState;
  gardenAddress: Address;
  addAdmins: Address[];
  removeAdmins: Address[];
}): Promise<GreenGoodsTransactionResult> {
  ensureLiveExecutionReady(input);

  if (input.mode !== 'live') {
    return {
      txHash: hashJson({
        kind: 'green-goods-sync-gap-admins',
        safeAddress: input.onchainState.safeAddress,
        gardenAddress: input.gardenAddress,
        addAdmins: input.addAdmins,
        removeAdmins: input.removeAdmins,
      }),
      detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} synced mock GAP admins.`,
    };
  }

  const deployment = getGreenGoodsDeployment(input.onchainState.chainKey);
  let lastTxHash: `0x${string}` | null = null;
  const credentials = requireLiveExecutionCredentials(input);

  for (const admin of unique(input.addAdmins)) {
    const result = await sendViaCoopSafe({
      authSession: credentials.authSession,
      pimlicoApiKey: credentials.pimlicoApiKey,
      onchainState: input.onchainState,
      to: deployment.karmaGapModule,
      data: encodeFunctionData({
        abi: greenGoodsKarmaGapModuleAbi,
        functionName: 'addProjectAdmin',
        args: [input.gardenAddress, admin],
      }),
    });
    lastTxHash = result.txHash;
  }

  for (const admin of unique(input.removeAdmins)) {
    const result = await sendViaCoopSafe({
      authSession: credentials.authSession,
      pimlicoApiKey: credentials.pimlicoApiKey,
      onchainState: input.onchainState,
      to: deployment.karmaGapModule,
      data: encodeFunctionData({
        abi: greenGoodsKarmaGapModuleAbi,
        functionName: 'removeProjectAdmin',
        args: [input.gardenAddress, admin],
      }),
    });
    lastTxHash = result.txHash;
  }

  if (!lastTxHash) {
    return {
      txHash: hashJson({
        kind: 'green-goods-sync-gap-admins:no-op',
        safeAddress: input.onchainState.safeAddress,
        gardenAddress: input.gardenAddress,
      }),
      detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} found no GAP admin changes to apply.`,
    };
  }

  return {
    txHash: lastTxHash,
    detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} synced Green Goods GAP admins.`,
  };
}
