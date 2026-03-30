import {
  http,
  type Address,
  createPublicClient,
  decodeEventLog,
  encodeFunctionData,
  toHex,
} from 'viem';
import type {
  AuthSession,
  GreenGoodsDomain,
  GreenGoodsGardenState,
  GreenGoodsGardenSyncOutput,
  OnchainState,
} from '../../contracts/schema';
import { hashJson, toDeterministicAddress, unique } from '../../utils';
import { type CoopOnchainMode, getCoopChainConfig } from '../onchain/onchain';
import { createCoopPublicClient } from '../onchain/provider';
import {
  greenGoodsActionRegistryAbi,
  greenGoodsEnsAbi,
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

export function buildGreenGoodsLiveMintConfig(input: {
  garden: GreenGoodsGardenState;
  operatorAddresses: Address[];
  gardenerAddresses: Address[];
}) {
  return {
    name: input.garden.name,
    slug: input.garden.slug ?? '',
    description: input.garden.description,
    location: input.garden.location,
    bannerImage: input.garden.bannerImage,
    metadata: input.garden.metadata,
    openJoining: input.garden.openJoining,
    weightScheme: greenGoodsWeightSchemeValue[input.garden.weightScheme],
    domainMask: toGreenGoodsDomainMask(input.garden.domains),
    gardeners: unique(input.gardenerAddresses),
    operators: unique(input.operatorAddresses),
  };
}

type GreenGoodsPreflightClient = {
  getBalance(args: { address: Address }): Promise<bigint>;
  getBlockNumber(): Promise<bigint>;
  getLogs(args: {
    address?: Address;
    fromBlock?: bigint;
    toBlock?: bigint;
  }): Promise<Array<{ data: `0x${string}`; topics: readonly `0x${string}`[] }>>;
  readContract(args: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }): Promise<unknown>;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

const GARDEN_NAME_SCAN_BLOCK_SPAN = 999n;

function buildGreenGoodsMintCall(input: {
  deployment: ReturnType<typeof getGreenGoodsDeployment>;
  safeAddress: Address;
  mintConfig: ReturnType<typeof buildGreenGoodsLiveMintConfig>;
  value?: bigint;
}) {
  return {
    from: input.safeAddress,
    to: input.deployment.gardenToken,
    data: encodeFunctionData({
      abi: greenGoodsGardenTokenAbi,
      functionName: 'mintGarden',
      args: [input.mintConfig],
    }),
    value: toHex(input.value ?? 0n),
  } as const;
}

export async function assertGreenGoodsGardenNameAvailable(input: {
  client: Pick<GreenGoodsPreflightClient, 'getBlockNumber' | 'getLogs'>;
  chainKey: OnchainState['chainKey'];
  name: string;
}) {
  const deployment = getGreenGoodsDeployment(input.chainKey);
  const normalizedName = input.name.trim();
  const normalizedNameLower = normalizedName.toLowerCase();
  const deploymentBlock = deployment.gardenTokenDeploymentBlock;
  const latestBlock = await input.client.getBlockNumber();

  if (latestBlock < deploymentBlock) {
    return;
  }

  let toBlock = latestBlock;
  while (toBlock >= deploymentBlock) {
    const fromBlock =
      toBlock - deploymentBlock > GARDEN_NAME_SCAN_BLOCK_SPAN
        ? toBlock - GARDEN_NAME_SCAN_BLOCK_SPAN
        : deploymentBlock;
    const logs = await input.client.getLogs({
      address: deployment.gardenToken,
      fromBlock,
      toBlock,
    });
    const existingMint = logs
      .map((log) => decodeGardenMintLog(log))
      .find(
        (decoded) =>
          decoded !== null && decoded.args.name.trim().toLowerCase() === normalizedNameLower,
      );
    if (existingMint) {
      throw new Error(
        `Green Goods garden name "${normalizedName}" is already in use. Choose a unique garden name before minting via the coop Safe.`,
      );
    }
    if (fromBlock === deploymentBlock) {
      return;
    }
    toBlock = fromBlock - 1n;
  }
}

export async function estimateGreenGoodsGardenRegistrationFee(input: {
  client: Pick<GreenGoodsPreflightClient, 'readContract'>;
  chainKey: OnchainState['chainKey'];
  safeAddress: Address;
  slug?: string;
}) {
  const slug = input.slug?.trim() ?? '';
  if (!slug) {
    return 0n;
  }

  const deployment = getGreenGoodsDeployment(input.chainKey);
  return (await input.client.readContract({
    address: deployment.greenGoodsENS,
    abi: greenGoodsEnsAbi,
    functionName: 'getRegistrationFee',
    args: [slug, input.safeAddress, 1],
  })) as bigint;
}

export async function assertGreenGoodsSlugAvailable(input: {
  client: Pick<GreenGoodsPreflightClient, 'readContract'>;
  chainKey: OnchainState['chainKey'];
  slug?: string;
}) {
  const slug = input.slug?.trim() ?? '';
  if (!slug) {
    return;
  }

  const deployment = getGreenGoodsDeployment(input.chainKey);
  const available = (await input.client.readContract({
    address: deployment.greenGoodsENS,
    abi: greenGoodsEnsAbi,
    functionName: 'available',
    args: [slug],
  })) as boolean;
  if (available) {
    return;
  }

  throw new Error(
    `Green Goods slug "${slug}" is unavailable. Choose a different slug before minting via the coop Safe.`,
  );
}

export async function assertGreenGoodsSafeBalanceCoversMintValue(input: {
  client: Pick<GreenGoodsPreflightClient, 'getBalance'>;
  safeAddress: Address;
  requiredValue: bigint;
}) {
  if (input.requiredValue <= 0n) {
    return;
  }

  const safeBalance = await input.client.getBalance({
    address: input.safeAddress,
  });
  if (safeBalance >= input.requiredValue) {
    return;
  }

  throw new Error(
    `The coop Safe needs at least ${input.requiredValue.toString()} wei to cover the Green Goods ENS registration fee, but its balance is ${safeBalance.toString()} wei. Fund the Safe before minting a slug-backed garden.`,
  );
}

export async function preflightGreenGoodsGardenMint(input: {
  client: GreenGoodsPreflightClient;
  chainKey: OnchainState['chainKey'];
  safeAddress: Address;
  mintConfig: ReturnType<typeof buildGreenGoodsLiveMintConfig>;
  value?: bigint;
}) {
  const call = buildGreenGoodsMintCall({
    deployment: getGreenGoodsDeployment(input.chainKey),
    safeAddress: input.safeAddress,
    mintConfig: input.mintConfig,
    value: input.value,
  });

  await input.client.request({
    method: 'eth_call',
    params: [call, 'latest'],
  });
}

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

function decodeGardenMintLog(log: { data: `0x${string}`; topics: readonly `0x${string}`[] }) {
  try {
    const decoded = decodeEventLog({
      abi: greenGoodsGardenTokenAbi,
      data: log.data,
      topics: [...log.topics] as [`0x${string}`, ...`0x${string}`[]],
      eventName: 'GardenMinted',
    });
    return decoded.eventName === 'GardenMinted' ? decoded : null;
  } catch {
    return null;
  }
}

async function resolveGardenMintEvent(input: {
  chainKey: OnchainState['chainKey'];
  txHash: `0x${string}`;
  receipt: {
    blockNumber?: bigint;
    logs: Array<{ data: `0x${string}`; topics: readonly `0x${string}`[] }>;
  };
}) {
  const matchFromReceipt = input.receipt.logs
    .map((log) => decodeGardenMintLog(log))
    .find((decoded) => decoded !== null);
  if (matchFromReceipt) {
    return matchFromReceipt;
  }

  const publicClient = await createCoopPublicClient(input.chainKey);
  const canonicalReceipt = await publicClient.waitForTransactionReceipt({
    hash: input.txHash,
    pollingInterval: 1_000,
    timeout: 60_000,
  });
  const matchFromCanonicalReceipt = canonicalReceipt.logs
    .map((log) => decodeGardenMintLog(log))
    .find((decoded) => decoded !== null);
  if (matchFromCanonicalReceipt) {
    return matchFromCanonicalReceipt;
  }

  if (canonicalReceipt.blockNumber === null || canonicalReceipt.blockNumber === undefined) {
    return null;
  }

  const deployment = getGreenGoodsDeployment(input.chainKey);
  const blockLogs = await publicClient.getLogs({
    address: deployment.gardenToken,
    fromBlock: canonicalReceipt.blockNumber,
    toBlock: canonicalReceipt.blockNumber,
  });
  return (
    blockLogs
      .filter((log) => log.transactionHash === input.txHash)
      .map((log) => decodeGardenMintLog(log))
      .find((decoded) => decoded !== null) ?? null
  );
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
  const mintConfig = buildGreenGoodsLiveMintConfig({
    garden: input.garden,
    operatorAddresses: input.operatorAddresses,
    gardenerAddresses: input.gardenerAddresses,
  });
  const publicClient = (await createCoopPublicClient(
    input.onchainState.chainKey,
  )) as unknown as GreenGoodsPreflightClient;
  await assertGreenGoodsGardenNameAvailable({
    client: publicClient,
    chainKey: input.onchainState.chainKey,
    name: mintConfig.name,
  });
  await assertGreenGoodsSlugAvailable({
    client: publicClient,
    chainKey: input.onchainState.chainKey,
    slug: mintConfig.slug,
  });
  const mintValue = await estimateGreenGoodsGardenRegistrationFee({
    client: publicClient,
    chainKey: input.onchainState.chainKey,
    safeAddress: input.onchainState.safeAddress as Address,
    slug: mintConfig.slug,
  });
  await assertGreenGoodsSafeBalanceCoversMintValue({
    client: publicClient,
    safeAddress: input.onchainState.safeAddress as Address,
    requiredValue: mintValue,
  });
  await preflightGreenGoodsGardenMint({
    client: publicClient,
    chainKey: input.onchainState.chainKey,
    safeAddress: input.onchainState.safeAddress as Address,
    mintConfig,
    value: mintValue,
  });
  const result = input.liveExecutor
    ? await input.liveExecutor({
        to: deployment.gardenToken,
        data: encodeFunctionData({
          abi: greenGoodsGardenTokenAbi,
          functionName: 'mintGarden',
          args: [mintConfig],
        }),
        value: mintValue,
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
          value: mintValue,
        });
      })();

  if (!result.receipt) {
    throw new Error('Green Goods live executor did not return a transaction receipt.');
  }

  const decoded = await resolveGardenMintEvent({
    chainKey: input.onchainState.chainKey,
    txHash: result.txHash,
    receipt: result.receipt,
  });

  if (!decoded) {
    throw new Error(
      `Green Goods mint tx ${result.txHash} succeeded, but the GardenMinted event was not found.`,
    );
  }

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
  liveExecutor?: GreenGoodsLiveExecutor;
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
  const addAdmins = unique(input.addAdmins);
  const removeAdmins = unique(input.removeAdmins);

  for (const admin of addAdmins) {
    const data = encodeFunctionData({
      abi: greenGoodsKarmaGapModuleAbi,
      functionName: 'addProjectAdmin',
      args: [input.gardenAddress, admin],
    });
    const result = input.liveExecutor
      ? await input.liveExecutor({
          to: deployment.karmaGapModule,
          data,
        })
      : await (async () => {
          const credentials = requireLiveExecutionCredentials(input);
          return sendViaCoopSafe({
            authSession: credentials.authSession,
            pimlicoApiKey: credentials.pimlicoApiKey,
            onchainState: input.onchainState,
            to: deployment.karmaGapModule,
            data,
          });
        })();
    lastTxHash = result.txHash;
  }

  for (const admin of removeAdmins) {
    const data = encodeFunctionData({
      abi: greenGoodsKarmaGapModuleAbi,
      functionName: 'removeProjectAdmin',
      args: [input.gardenAddress, admin],
    });
    const result = input.liveExecutor
      ? await input.liveExecutor({
          to: deployment.karmaGapModule,
          data,
        })
      : await (async () => {
          const credentials = requireLiveExecutionCredentials(input);
          return sendViaCoopSafe({
            authSession: credentials.authSession,
            pimlicoApiKey: credentials.pimlicoApiKey,
            onchainState: input.onchainState,
            to: deployment.karmaGapModule,
            data,
          });
        })();
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
