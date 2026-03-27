import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  parseAbi,
  parseAbiParameters,
  type Address,
} from 'viem';
import { describe, expect, it } from 'vitest';
import type { GreenGoodsHypercertMintRequest } from '../../../contracts/schema';
import {
  GREEN_GOODS_HYPERCERT_PROTOCOL_VERSION,
  GREEN_GOODS_HYPERCERT_TOTAL_UNITS,
  buildGreenGoodsHypercertMetadata,
  getGreenGoodsDeployment,
  mintGreenGoodsHypercert,
  packageGreenGoodsHypercert,
} from '../greengoods';

const SAFE_ADDRESS = '0x4444444444444444444444444444444444444444' as Address;
const GARDEN_ADDRESS = '0x1111111111111111111111111111111111111111' as Address;
const POOL_ADDRESS = '0x2222222222222222222222222222222222222222' as Address;
const HYPERCERT_ABI = parseAbi([
  'function mintAndRegister(address garden, uint256 totalUnits, bytes32 merkleRoot, string metadataUri)',
  'event HypercertMintedAndRegistered(address indexed garden, uint256 indexed hypercertId, address pool)',
]);

const baseRequest: GreenGoodsHypercertMintRequest = {
  gardenAddress: GARDEN_ADDRESS,
  title: 'Season one stewardship package',
  description: 'Approved Green Goods work bundled into a Hypercert package.',
  workScopes: ['planting', 'maintenance'],
  impactScopes: ['ecosystem restoration'],
  externalUrl: 'https://coop.town/green-goods',
  imageUri: 'ipfs://hypercert-cover',
  domain: 'agro' as const,
  sdgs: [13, 15],
  capitals: ['living', 'social'],
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
    {
      uid: `0x${'22'.repeat(32)}`,
      workUid: `0x${'bb'.repeat(32)}`,
      title: 'Nursery maintenance',
      domain: 'agroforestry',
      workScope: ['maintenance'],
      gardenerAddress: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
      gardenerName: 'Bo',
      mediaUrls: ['ipfs://photo-2'],
      metrics: {
        hours: { value: 8, unit: 'hours' },
      },
      createdAt: 1_712_016_000,
      approvedAt: 1_712_022_000,
      approvedBy: '0x3333333333333333333333333333333333333333',
      feedback: 'Maintenance completed.',
      actionType: 'maintenance',
    },
  ],
  gapProjectUid: `0x${'44'.repeat(32)}`,
  rationale: 'Mint a season-one Green Goods Hypercert package.',
};

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

describe('Green Goods Hypercert packaging', () => {
  it('derives Green Goods Hypercert metadata from approved work and GAP context', () => {
    const metadata = buildGreenGoodsHypercertMetadata({
      request: baseRequest,
    });

    expect(metadata.name).toBe(baseRequest.title);
    expect(metadata.description).toBe(baseRequest.description);
    expect(metadata.image).toBe(baseRequest.imageUri);
    expect(metadata.external_url).toBe(baseRequest.externalUrl);
    expect(metadata.hypercert.work_scope.value).toEqual(['planting', 'maintenance']);
    expect(metadata.hypercert.impact_scope.value).toEqual(['ecosystem restoration']);
    expect(metadata.hidden_properties?.domain).toBe('agroforestry');
    expect(metadata.hidden_properties?.karmaGapProjectId).toBe(baseRequest.gapProjectUid);
    expect(metadata.hidden_properties?.protocolVersion).toBe(
      GREEN_GOODS_HYPERCERT_PROTOCOL_VERSION,
    );
    expect(metadata.hidden_properties?.outcomes.predefined.trees_planted?.value).toBe(120);
    expect(metadata.hidden_properties?.outcomes.predefined.attestation_count?.value).toBe(2);
  });

  it('packages deterministic mock Hypercert metadata and allowlist artifacts', async () => {
    const first = await packageGreenGoodsHypercert({
      mode: 'mock',
      request: baseRequest,
    });
    const second = await packageGreenGoodsHypercert({
      mode: 'mock',
      request: baseRequest,
    });

    expect(first.merkleRoot).toMatch(/^0x[a-f0-9]{64}$/);
    expect(first.merkleRoot).toBe(second.merkleRoot);
    expect(first.metadataCid).toBe(second.metadataCid);
    expect(first.allowlistCid).toBe(second.allowlistCid);
    expect(first.metadataUri).toBe(`ipfs://${first.metadataCid}`);
    expect(first.allowlistUri).toBe(`ipfs://${first.allowlistCid}`);
    expect(first.allowlistTree.values).toHaveLength(2);
  });

  it('requires a live uploader before packaging a live Hypercert mint', async () => {
    await expect(
      packageGreenGoodsHypercert({
        mode: 'live',
        request: baseRequest,
      }),
    ).rejects.toThrow(
      'A live archive-backed uploader is required before Green Goods Hypercert packaging can execute.',
    );
  });

  it('mints through the Hypercerts module with archive-backed metadata and decodes the minted hypercert id', async () => {
    const deployment = getGreenGoodsDeployment('sepolia');
    const uploads: string[] = [];
    let captured:
      | {
          to: Address;
          data: `0x${string}`;
          value?: bigint;
        }
      | undefined;

    const result = await mintGreenGoodsHypercert({
      ...liveExecutionInput,
      request: baseRequest,
      uploader: async ({ kind }) => {
        uploads.push(kind);
        return {
          cid: kind === 'metadata' ? 'bafyhypercertmetadata' : 'bafyhypercertallowlist',
        };
      },
      liveExecutor: async (input) => {
        captured = input;
        const topics = encodeEventTopics({
          abi: HYPERCERT_ABI,
          eventName: 'HypercertMintedAndRegistered',
          args: {
            garden: GARDEN_ADDRESS,
            hypercertId: 123n,
          },
        });
        const data = encodeAbiParameters(parseAbiParameters('address pool'), [POOL_ADDRESS]);

        return {
          txHash: `0x${'9'.repeat(64)}`,
          safeAddress: SAFE_ADDRESS,
          receipt: {
            logs: [
              {
                address: deployment.hypercertsModule,
                data,
                topics,
              },
            ],
          } as never,
        };
      },
    });

    expect(uploads).toEqual(['metadata', 'allowlist']);
    expect(captured?.to).toBe(deployment.hypercertsModule);

    const decoded = decodeFunctionData({
      abi: HYPERCERT_ABI,
      data: captured?.data as `0x${string}`,
    });
    expect(decoded.functionName).toBe('mintAndRegister');
    expect(decoded.args[0]).toBe(GARDEN_ADDRESS);
    expect(decoded.args[1]).toBe(GREEN_GOODS_HYPERCERT_TOTAL_UNITS);
    expect(decoded.args[2]).toBe(result.merkleRoot);
    expect(decoded.args[3]).toBe('ipfs://bafyhypercertmetadata');

    expect(result.txHash).toBe(`0x${'9'.repeat(64)}`);
    expect(result.hypercertId).toBe('123');
    expect(result.metadataUri).toBe('ipfs://bafyhypercertmetadata');
    expect(result.allowlistUri).toBe('ipfs://bafyhypercertallowlist');
  });
});
