import { toSafeSmartAccount } from 'permissionless/accounts';
import {
  http,
  type Address,
  createPublicClient,
  decodeFunctionData,
  toHex,
  parseAbi,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { CoopChainKey } from '../packages/shared/src/contracts';
import {
  GREEN_GOODS_HYPERCERT_TOTAL_UNITS,
  getGreenGoodsDeployment,
  mintGreenGoodsHypercert,
} from '../packages/shared/src/modules/greengoods/greengoods';
import { getCoopChainConfig } from '../packages/shared/src/modules/onchain/onchain';
import { loadRootEnv } from './load-root-env';

loadRootEnv();

const PROBE_OWNER_PRIVATE_KEY =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;
const HYPERCERTS_MODULE_ABI = parseAbi([
  'function mintAndRegister(address garden, uint256 totalUnits, bytes32 merkleRoot, string metadataUri)',
]);

type PreparedCall = {
  to: Address;
  data: `0x${string}`;
  value?: bigint;
};

function parseChainKey(): CoopChainKey {
  if (process.env.COOP_GREENGOODS_HYPERCERT_SIM_CHAIN === 'arbitrum') {
    return 'arbitrum';
  }
  if (process.env.COOP_GREENGOODS_HYPERCERT_SIM_CHAIN === 'sepolia') {
    return 'sepolia';
  }
  return process.env.VITE_COOP_CHAIN === 'arbitrum' ? 'arbitrum' : 'sepolia';
}

function parseBlockTag(value: string | undefined) {
  if (!value || value === 'latest') {
    return 'latest';
  }
  if (/^0x[a-fA-F0-9]+$/.test(value)) {
    return value;
  }
  if (/^\d+$/.test(value)) {
    return toHex(BigInt(value));
  }

  throw new Error(
    'COOP_GREENGOODS_HYPERCERT_SIM_BLOCK must be "latest", a decimal block number, or a hex block tag.',
  );
}

function formatBlockLabel(value: string) {
  return value === 'latest' ? 'latest' : `${value} (${BigInt(value).toString()})`;
}

function formatProbeResult(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function formatRpcValue(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function simulatePreparedCall(input: {
  publicClient: ReturnType<typeof createPublicClient>;
  safeAccount: Awaited<ReturnType<typeof toSafeSmartAccount>>;
  safeAddress: Address;
  blockTag: string;
  call: PreparedCall;
}) {
  const directCall = {
    from: input.safeAddress,
    to: input.call.to,
    data: input.call.data,
    value: toHex(input.call.value ?? 0n),
  } as const;
  const safeWrapperData = await input.safeAccount.encodeCalls([
    {
      to: input.call.to,
      data: input.call.data,
      value: input.call.value ?? 0n,
    },
  ]);
  const safeCall = {
    from: input.safeAccount.entryPoint.address,
    to: input.safeAddress,
    data: safeWrapperData,
  } as const;

  try {
    const estimate = await input.publicClient.request({
      method: 'eth_estimateGas',
      params: [directCall],
    });
    console.log(
      `[probe:greengoods-hypercert-sim] direct estimateGas -> ${BigInt(estimate).toString()}`,
    );
  } catch (error) {
    console.log(
      `[probe:greengoods-hypercert-sim] direct estimateGas failed -> ${formatProbeResult(error)}`,
    );
  }

  try {
    const estimate = await input.publicClient.request({
      method: 'eth_estimateGas',
      params: [safeCall],
    });
    console.log(
      `[probe:greengoods-hypercert-sim] Safe wrapper estimateGas -> ${BigInt(estimate).toString()}`,
    );
  } catch (error) {
    console.log(
      `[probe:greengoods-hypercert-sim] Safe wrapper estimateGas failed -> ${formatProbeResult(error)}`,
    );
  }

  try {
    const result = await input.publicClient.request({
      method: 'eth_call',
      params: [directCall, input.blockTag],
    });
    console.log(
      `[probe:greengoods-hypercert-sim] direct eth_call -> ${formatRpcValue(result)}`,
    );
  } catch (error) {
    console.log(
      `[probe:greengoods-hypercert-sim] direct eth_call failed -> ${formatProbeResult(error)}`,
    );
  }

  try {
    const result = await input.publicClient.request({
      method: 'eth_call',
      params: [safeCall, input.blockTag],
    });
    console.log(
      `[probe:greengoods-hypercert-sim] Safe wrapper eth_call -> ${formatRpcValue(result)}`,
    );
  } catch (error) {
    console.log(
      `[probe:greengoods-hypercert-sim] Safe wrapper eth_call failed -> ${formatProbeResult(error)}`,
    );
  }
}

async function main() {
  const chainKey = parseChainKey();
  const safeAddress = process.env.COOP_GREENGOODS_HYPERCERT_SIM_SAFE_ADDRESS as Address | undefined;
  if (!safeAddress || !/^0x[a-fA-F0-9]{40}$/.test(safeAddress)) {
    console.log(
      '[probe:greengoods-hypercert-sim] Skipping Hypercert probe. Set COOP_GREENGOODS_HYPERCERT_SIM_SAFE_ADDRESS to a real coop Safe address.',
    );
    process.exit(0);
  }

  const gardenAddress = process.env
    .COOP_GREENGOODS_HYPERCERT_SIM_GARDEN_ADDRESS as Address | undefined;
  if (!gardenAddress || !/^0x[a-fA-F0-9]{40}$/.test(gardenAddress)) {
    console.log(
      '[probe:greengoods-hypercert-sim] Skipping Hypercert probe. Set COOP_GREENGOODS_HYPERCERT_SIM_GARDEN_ADDRESS to a real Green Goods garden address.',
    );
    process.exit(0);
  }

  const chainConfig = getCoopChainConfig(chainKey);
  const rpcUrl = process.env.COOP_GREENGOODS_HYPERCERT_SIM_RPC_URL;
  const blockTag = parseBlockTag(process.env.COOP_GREENGOODS_HYPERCERT_SIM_BLOCK);
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(rpcUrl ?? chainConfig.chain.rpcUrls.default.http[0]),
  });
  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    owners: [privateKeyToAccount(PROBE_OWNER_PRIVATE_KEY)],
    address: safeAddress,
    version: '1.4.1',
  });
  const safeCode = await publicClient.getCode({ address: safeAddress });
  const gardenCode = await publicClient.getCode({ address: gardenAddress });
  const deployment = getGreenGoodsDeployment(chainKey);

  console.log(
    `[probe:greengoods-hypercert-sim] Dry-running Green Goods Hypercert packaging on ${chainConfig.label}.`,
  );
  console.log(
    `[probe:greengoods-hypercert-sim] RPC: ${rpcUrl ?? chainConfig.chain.rpcUrls.default.http[0]}`,
  );
  console.log(`[probe:greengoods-hypercert-sim] Block: ${formatBlockLabel(blockTag)}`);
  console.log(`[probe:greengoods-hypercert-sim] Safe: ${safeAddress}`);
  console.log(
    `[probe:greengoods-hypercert-sim] Safe code present: ${safeCode && safeCode !== '0x' ? 'yes' : 'no'}`,
  );
  console.log(`[probe:greengoods-hypercert-sim] Garden: ${gardenAddress}`);
  console.log(
    `[probe:greengoods-hypercert-sim] Garden code present: ${gardenCode && gardenCode !== '0x' ? 'yes' : 'no'}`,
  );
  console.log(
    `[probe:greengoods-hypercert-sim] Hypercerts module: ${deployment.hypercertsModule}`,
  );
  console.log(
    '[probe:greengoods-hypercert-sim] Karma GAP remains part of this package through existing work approval / assessment resolver flows plus optional gapProjectUid metadata.',
  );

  let captured: PreparedCall | undefined;
  const request = {
    gardenAddress,
    title: 'Season one stewardship package',
    description: 'Approved Green Goods work bundled into an operator-side Hypercert package.',
    workScopes: ['planting', 'maintenance'],
    impactScopes: ['ecosystem restoration'],
    domain: 'agro' as const,
    sdgs: [13, 15],
    capitals: ['living', 'social'] as const,
    outcomes: {
      predefined: {},
      custom: {},
    },
    allowlist: [
      {
        address: '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa',
        units: 60_000_000,
        label: 'Lead steward',
      },
      {
        address: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
        units: 40_000_000,
        label: 'Field operator',
      },
    ],
    attestations: [
      {
        uid: `0x${'11'.repeat(32)}`,
        workUid: `0x${'aa'.repeat(32)}`,
        title: 'Watershed planting day',
        domain: 'agro',
        workScope: ['planting'],
        gardenerAddress: '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa',
        gardenerName: 'Ari',
        mediaUrls: ['ipfs://photo-1'],
        metrics: {
          trees_planted: { value: 120, unit: 'count' },
        },
        createdAt: 1_711_929_600,
        approvedAt: 1_711_936_800,
        approvedBy: '0x3333333333333333333333333333333333333333',
        feedback: 'Verified in the field.',
        actionType: 'planting',
      },
    ],
    gapProjectUid:
      (process.env.COOP_GREENGOODS_HYPERCERT_SIM_GAP_PROJECT_UID as `0x${string}` | undefined) ??
      (`0x${'44'.repeat(32)}` as const),
    rationale: 'Mint a Green Goods Hypercert package for approved work and assessments.',
  };

  const packaged = await mintGreenGoodsHypercert({
    mode: 'live',
    authSession: { passkey: { id: 'probe-passkey' } } as never,
    pimlicoApiKey: 'probe-pimlico-key',
    onchainState: {
      chainId: chainConfig.chain.id,
      chainKey,
      safeAddress,
      safeCapability: 'executed',
      statusNote: 'Probe Safe attached for dry-runs.',
    },
    request,
    uploader: async ({ kind }) => ({
      cid: kind === 'metadata' ? 'bafyprobehypercertmetadata' : 'bafyprobehypercertallowlist',
      uri: kind === 'metadata' ? 'ipfs://bafyprobehypercertmetadata' : 'ipfs://bafyprobehypercertallowlist',
    }),
    liveExecutor: async (input) => {
      captured = input;
      return {
        txHash: `0x${'a'.repeat(64)}`,
        safeAddress,
      };
    },
  });

  if (!captured) {
    throw new Error('Expected Hypercert mint rehearsal to produce a call.');
  }

  const decoded = decodeFunctionData({
    abi: HYPERCERTS_MODULE_ABI,
    data: captured.data,
  });
  console.log(
    `[probe:greengoods-hypercert-sim] Packaged metadata URI: ${packaged.metadataUri}`,
  );
  console.log(
    `[probe:greengoods-hypercert-sim] Packaged allowlist URI: ${packaged.allowlistUri}`,
  );
  console.log(`[probe:greengoods-hypercert-sim] Merkle root: ${packaged.merkleRoot}`);
  console.log(
    `[probe:greengoods-hypercert-sim] Decoded mintAndRegister args -> garden=${decoded.args[0]} totalUnits=${decoded.args[1].toString()} merkleRoot=${decoded.args[2]} metadataUri=${decoded.args[3]}`,
  );
  if (decoded.args[1] !== GREEN_GOODS_HYPERCERT_TOTAL_UNITS) {
    throw new Error('Hypercert dry-run encoded an unexpected totalUnits value.');
  }

  await simulatePreparedCall({
    publicClient,
    safeAccount,
    safeAddress,
    blockTag,
    call: captured,
  });
}

main().catch((error) => {
  console.error(
    `[probe:greengoods-hypercert-sim] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
