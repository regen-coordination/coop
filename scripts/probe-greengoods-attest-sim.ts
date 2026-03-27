import { toSafeSmartAccount } from 'permissionless/accounts';
import { http, type Address, createPublicClient, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { CoopChainKey } from '../packages/shared/src/contracts';
import {
  GREEN_GOODS_IMPACT_REPORTING_UNSUPPORTED_MESSAGE,
  createGreenGoodsAssessment,
  getGreenGoodsDeployment,
  submitGreenGoodsWorkApproval,
  submitGreenGoodsWorkSubmission,
} from '../packages/shared/src/modules/greengoods/greengoods';
import { getCoopChainConfig } from '../packages/shared/src/modules/onchain/onchain';
import { loadRootEnv } from './load-root-env';

loadRootEnv();

const DEFAULT_WORK_UID = `0x${'ab'.repeat(32)}` as const;
const PROBE_OWNER_PRIVATE_KEY =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;

type PreparedCall = {
  label: string;
  to: Address;
  data: `0x${string}`;
  value?: bigint;
};

function parseChainKey(): CoopChainKey {
  if (process.env.COOP_GREENGOODS_ATTEST_SIM_CHAIN === 'arbitrum') {
    return 'arbitrum';
  }
  if (process.env.COOP_GREENGOODS_ATTEST_SIM_CHAIN === 'sepolia') {
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
    'COOP_GREENGOODS_ATTEST_SIM_BLOCK must be "latest", a decimal block number, or a hex block tag.',
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

  console.log(
    `[probe:greengoods-attest-sim] ${input.call.label}: target=${input.call.to} selector=${input.call.data.slice(0, 10)}`,
  );

  try {
    const estimate = await input.publicClient.request({
      method: 'eth_estimateGas',
      params: [directCall],
    });
    console.log(
      `[probe:greengoods-attest-sim] ${input.call.label}: direct estimateGas -> ${BigInt(estimate).toString()}`,
    );
  } catch (error) {
    console.log(
      `[probe:greengoods-attest-sim] ${input.call.label}: direct estimateGas failed -> ${formatProbeResult(error)}`,
    );
  }

  try {
    const estimate = await input.publicClient.request({
      method: 'eth_estimateGas',
      params: [safeCall],
    });
    console.log(
      `[probe:greengoods-attest-sim] ${input.call.label}: Safe wrapper estimateGas -> ${BigInt(estimate).toString()}`,
    );
  } catch (error) {
    console.log(
      `[probe:greengoods-attest-sim] ${input.call.label}: Safe wrapper estimateGas failed -> ${formatProbeResult(error)}`,
    );
  }

  try {
    const result = await input.publicClient.request({
      method: 'eth_call',
      params: [directCall, input.blockTag],
    });
    console.log(
      `[probe:greengoods-attest-sim] ${input.call.label}: direct eth_call -> ${formatRpcValue(result)}`,
    );
  } catch (error) {
    console.log(
      `[probe:greengoods-attest-sim] ${input.call.label}: direct eth_call failed -> ${formatProbeResult(error)}`,
    );
  }

  try {
    const result = await input.publicClient.request({
      method: 'eth_call',
      params: [safeCall, input.blockTag],
    });
    console.log(
      `[probe:greengoods-attest-sim] ${input.call.label}: Safe wrapper eth_call -> ${formatRpcValue(result)}`,
    );
  } catch (error) {
    console.log(
      `[probe:greengoods-attest-sim] ${input.call.label}: Safe wrapper eth_call failed -> ${formatProbeResult(error)}`,
    );
  }
}

async function captureCall(input: {
  label: string;
  safeAddress: Address;
  producer: (
    liveExecutor: (input: {
      to: Address;
      data: `0x${string}`;
      value?: bigint;
    }) => Promise<{ txHash: `0x${string}`; safeAddress: Address }>,
  ) => Promise<void>;
}) {
  let captured: PreparedCall | undefined;

  await input.producer(async (call) => {
    captured = {
      label: input.label,
      ...call,
    };
    return {
      txHash: `0x${'a'.repeat(64)}`,
      safeAddress: input.safeAddress,
    };
  });

  if (!captured) {
    throw new Error(`Expected ${input.label} to produce a call.`);
  }

  return captured;
}

async function main() {
  const chainKey = parseChainKey();
  const safeAddress =
    (process.env.COOP_GREENGOODS_ATTEST_SIM_SAFE_ADDRESS as Address | undefined) ??
    (process.env.COOP_GREENGOODS_ADMIN_SIM_SAFE_ADDRESS as Address | undefined);
  if (!safeAddress || !/^0x[a-fA-F0-9]{40}$/.test(safeAddress)) {
    console.log(
      '[probe:greengoods-attest-sim] Skipping attestation probe. Set COOP_GREENGOODS_ATTEST_SIM_SAFE_ADDRESS (or COOP_GREENGOODS_ADMIN_SIM_SAFE_ADDRESS) to a real coop Safe address to rehearse EAS submission flows.',
    );
    process.exit(0);
  }
  const gardenAddress =
    (process.env.COOP_GREENGOODS_ATTEST_SIM_GARDEN_ADDRESS as Address | undefined) ??
    (process.env.COOP_GREENGOODS_ADMIN_SIM_GARDEN_ADDRESS as Address | undefined);
  if (!gardenAddress || !/^0x[a-fA-F0-9]{40}$/.test(gardenAddress)) {
    console.log(
      '[probe:greengoods-attest-sim] Skipping attestation probe. Set COOP_GREENGOODS_ATTEST_SIM_GARDEN_ADDRESS (or COOP_GREENGOODS_ADMIN_SIM_GARDEN_ADDRESS) to the Green Goods garden recipient you want to rehearse.',
    );
    process.exit(0);
  }
  const blockTag = parseBlockTag(process.env.COOP_GREENGOODS_ATTEST_SIM_BLOCK);
  const rpcUrl = process.env.COOP_GREENGOODS_ATTEST_SIM_RPC_URL;
  const chainConfig = getCoopChainConfig(chainKey);
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(rpcUrl ?? chainConfig.chain.rpcUrls.default.http[0]),
  });
  const safeCode = await publicClient.getCode({
    address: safeAddress,
  });
  const gardenCode = await publicClient.getCode({
    address: gardenAddress,
  });
  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    owners: [privateKeyToAccount(PROBE_OWNER_PRIVATE_KEY)],
    address: safeAddress,
    version: '1.4.1',
  });
  const deployment = getGreenGoodsDeployment(chainKey);

  console.log(
    `[probe:greengoods-attest-sim] Dry-running Green Goods attestations on ${chainConfig.label}.`,
  );
  console.log(
    `[probe:greengoods-attest-sim] RPC: ${rpcUrl ?? chainConfig.chain.rpcUrls.default.http[0]}`,
  );
  console.log(`[probe:greengoods-attest-sim] Block: ${formatBlockLabel(blockTag)}`);
  console.log(`[probe:greengoods-attest-sim] Safe: ${safeAddress}`);
  console.log(
    `[probe:greengoods-attest-sim] Safe code present: ${safeCode && safeCode !== '0x' ? 'yes' : 'no'}`,
  );
  console.log(`[probe:greengoods-attest-sim] Garden recipient: ${gardenAddress}`);
  console.log(
    `[probe:greengoods-attest-sim] Garden code present: ${gardenCode && gardenCode !== '0x' ? 'yes' : 'no'}`,
  );
  console.log(`[probe:greengoods-attest-sim] EAS target: ${deployment.eas}`);
  console.log(`[probe:greengoods-attest-sim] Hypercerts module: ${deployment.hypercertsModule}`);
  console.log(`[probe:greengoods-attest-sim] Karma GAP module: ${deployment.karmaGapModule}`);

  const liveInput = {
    mode: 'live' as const,
    authSession: { passkey: { id: 'probe-passkey' } } as never,
    pimlicoApiKey: 'probe-pimlico-key',
    onchainState: {
      chainId: chainConfig.chain.id,
      chainKey,
      safeAddress,
      safeCapability: 'executed' as const,
      statusNote: 'Probe Safe attached for dry-runs.',
    },
    gardenAddress,
  };

  const calls = [
    await captureCall({
      label: 'attest.work-submission',
      safeAddress,
      producer: (liveExecutor) =>
        submitGreenGoodsWorkSubmission({
          ...liveInput,
          output: {
            gardenAddress,
            actionUid: 6,
            title: 'Planting day',
            feedback: 'Completed and documented.',
            metadataCid: 'ipfs://work-metadata',
            mediaCids: ['ipfs://work-photo'],
          },
          liveExecutor,
        }),
    }),
    await captureCall({
      label: 'attest.work-approval',
      safeAddress,
      producer: (liveExecutor) =>
        submitGreenGoodsWorkApproval({
          ...liveInput,
          output: {
            actionUid: 6,
            workUid: DEFAULT_WORK_UID,
            approved: true,
            feedback: 'Verification passed.',
            confidence: 100,
            verificationMethod: 1,
            reviewNotesCid: 'ipfs://review-notes',
            rationale: 'Approve the work attestation.',
          },
          liveExecutor,
        }),
    }),
    await captureCall({
      label: 'attest.assessment',
      safeAddress,
      producer: (liveExecutor) =>
        createGreenGoodsAssessment({
          ...liveInput,
          output: {
            title: 'Q2 assessment',
            description: 'Quarterly assessment window.',
            assessmentConfigCid: 'ipfs://assessment-config',
            domain: 'agro',
            startDate: 1_711_929_600,
            endDate: 1_712_534_400,
            location: 'Watershed field lab',
            rationale: 'Open the quarterly assessment.',
          },
          liveExecutor,
        }),
    }),
  ];

  for (const call of calls) {
    await simulatePreparedCall({
      publicClient,
      safeAccount,
      safeAddress,
      blockTag,
      call,
    });
  }
  console.log(
    `[probe:greengoods-attest-sim] attest.impact-report: not simulated -> ${GREEN_GOODS_IMPACT_REPORTING_UNSUPPORTED_MESSAGE}`,
  );
  console.log(
    '[probe:greengoods-attest-sim] attest.impact-report: source-backed note -> Green Goods deploys Hypercerts and Karma GAP modules for impact packaging/reporting, but only work submission, work approval, and assessment are direct EAS attestation flows.',
  );
}

await main();
