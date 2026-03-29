import {
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  padHex,
  stringToHex,
  toHex,
} from 'viem';
import { describe, expect, it } from 'vitest';
import type { SetupInsights } from '../../../contracts/schema';
import {
  applyGreenGoodsGardenerActionSuccess,
  assertGreenGoodsGardenNameAvailable,
  assertGreenGoodsSafeBalanceCoversMintValue,
  assertGreenGoodsSlugAvailable,
  buildGreenGoodsLiveMintConfig,
  createGreenGoodsBootstrapOutput,
  createGreenGoodsGapAdminSyncOutput,
  createGreenGoodsGardenPools,
  createGreenGoodsSyncOutput,
  createInitialGreenGoodsState,
  deriveGreenGoodsGardenDraft,
  estimateGreenGoodsGardenRegistrationFee,
  fromGreenGoodsDomainMask,
  getGreenGoodsDeployment,
  greenGoodsActionRegistryAbi,
  greenGoodsGardenAccountAbi,
  greenGoodsGardenTokenAbi,
  greenGoodsGardensModuleAbi,
  inspectGreenGoodsGardenMintAuthorization,
  resolveGreenGoodsGapAdminChanges,
  resolveGreenGoodsGardenerBindingActions,
  setGreenGoodsGardenDomains,
  syncGreenGoodsGardenProfile,
  toGreenGoodsDomainMask,
  updateGreenGoodsState,
} from '../greengoods';

function buildSetupInsights(): SetupInsights {
  return {
    summary:
      'This coop coordinates ecological research, watershed stewardship, and knowledge sharing.',
    crossCuttingPainPoints: ['Funding leads are fragmented'],
    crossCuttingOpportunities: ['Shared ecological action library'],
    lenses: [
      {
        lens: 'capital-formation',
        currentState: 'Funding research lives in tabs.',
        painPoints: 'No durable context.',
        improvements: 'Shared capital formation flow.',
      },
      {
        lens: 'impact-reporting',
        currentState: 'Watershed evidence is scattered.',
        painPoints: 'Late reporting.',
        improvements: 'Continuous evidence collection.',
      },
      {
        lens: 'governance-coordination',
        currentState: 'Stewardship meetings are hard to follow.',
        painPoints: 'Low follow-through.',
        improvements: 'Clear action memory.',
      },
      {
        lens: 'knowledge-garden-resources',
        currentState: 'Research and field notes are disconnected.',
        painPoints: 'Repeated work.',
        improvements: 'Shared knowledge garden.',
      },
    ],
  };
}

describe('Green Goods helpers', () => {
  it('accepts allowlisted Safe addresses for live garden minting', async () => {
    const result = await inspectGreenGoodsGardenMintAuthorization({
      onchainState: {
        chainId: 11155111,
        chainKey: 'sepolia',
        safeAddress: '0x4444444444444444444444444444444444444444',
        safeCapability: 'executed',
        statusNote: 'Safe executed.',
      },
      client: {
        readContract: async ({ functionName }) => {
          switch (functionName) {
            case 'owner':
              return '0x1111111111111111111111111111111111111111';
            case 'deploymentRegistry':
              return '0x2222222222222222222222222222222222222222';
            case 'openMinting':
              return false;
            case 'isInAllowlist':
              return true;
            default:
              throw new Error(`Unexpected read ${functionName}`);
          }
        },
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        authorized: true,
        reason: 'allowlist',
      }),
    );
  });

  it('returns an actionable detail when the Safe cannot mint a live garden', async () => {
    const safeAddress = '0x4444444444444444444444444444444444444444';
    const owner = '0x1111111111111111111111111111111111111111';
    const deploymentRegistry = '0x2222222222222222222222222222222222222222';
    const result = await inspectGreenGoodsGardenMintAuthorization({
      onchainState: {
        chainId: 11155111,
        chainKey: 'sepolia',
        safeAddress,
        safeCapability: 'executed',
        statusNote: 'Safe executed.',
      },
      client: {
        readContract: async ({ functionName }) => {
          switch (functionName) {
            case 'owner':
              return owner;
            case 'deploymentRegistry':
              return deploymentRegistry;
            case 'openMinting':
              throw new Error('getter not available');
            case 'isInAllowlist':
              return false;
            default:
              throw new Error(`Unexpected read ${functionName}`);
          }
        },
      },
    });

    expect(result.authorized).toBe(false);
    if (result.authorized) {
      throw new Error('Expected the Safe to be rejected.');
    }
    expect(result.detail).toContain(safeAddress);
    expect(result.detail).toContain(owner);
    expect(result.detail).toContain(deploymentRegistry);
    expect(result.detail).toContain('allowlist');
  });

  it('creates initial requested Green Goods state for a coop', () => {
    const state = createInitialGreenGoodsState({
      coopName: 'Watershed Coop',
      purpose: 'Coordinate watershed regeneration and ecological funding.',
      setupInsights: buildSetupInsights(),
      requestedAt: '2026-03-13T00:00:00.000Z',
    });

    expect(state.enabled).toBe(true);
    expect(state.status).toBe('requested');
    expect(state.domains).toContain('agro');
    expect(state.domainMask).toBeGreaterThan(0);
  });

  it('derives canonical garden draft fields from Coop signals', () => {
    const draft = deriveGreenGoodsGardenDraft({
      coopName: 'Watershed Knowledge and Stewardship Coop',
      purpose: 'Coordinate watershed regeneration and ecological funding.',
      setupInsights: buildSetupInsights(),
    });

    expect(draft.name).toBe('Watershed Knowledge and Stewardship Coop');
    expect(draft.slug).toBe('watershed-knowledge-and-stewardship-coop');
    expect(draft.description).toBe(
      'Coordinate watershed regeneration and ecological funding. This coop coordinates ecological research, watershed stewardship, and knowledge sharing.',
    );
    expect(draft.domains).toEqual(['agro', 'edu']);
    expect(draft.domainMask).toBe(0b0110);
  });

  it('falls back to setup insights when deriving a garden description without purpose text', () => {
    const draft = deriveGreenGoodsGardenDraft({
      coopName: 'Pocket Flock',
      purpose: '   ',
      setupInsights: buildSetupInsights(),
    });

    expect(draft.description).toBe(
      'This coop coordinates ecological research, watershed stewardship, and knowledge sharing.',
    );
  });

  it('round-trips Green Goods domain masks', () => {
    const mask = toGreenGoodsDomainMask(['agro', 'edu']);
    expect(mask).toBe(0b0110);
    expect(fromGreenGoodsDomainMask(mask)).toEqual(['agro', 'edu']);
  });

  it('updates Green Goods state and keeps domain mask aligned', () => {
    const state = createInitialGreenGoodsState({
      coopName: 'Watershed Coop',
      purpose: 'Coordinate watershed regeneration and ecological funding.',
      setupInsights: buildSetupInsights(),
      requestedAt: '2026-03-13T00:00:00.000Z',
    });
    const updated = updateGreenGoodsState(state, {
      status: 'linked',
      gardenAddress: '0x1111111111111111111111111111111111111111',
      tokenId: '12',
      domains: ['agro', 'edu'],
    });

    expect(updated.status).toBe('linked');
    expect(updated.domainMask).toBe(0b0110);
  });

  it('builds deterministic bootstrap and sync outputs from coop state', () => {
    const state = createInitialGreenGoodsState({
      coopName: 'Watershed Coop',
      purpose: 'Coordinate watershed regeneration and ecological funding.',
      setupInsights: buildSetupInsights(),
      requestedAt: '2026-03-13T00:00:00.000Z',
    });

    const bootstrap = createGreenGoodsBootstrapOutput({
      coopName: 'Watershed Coop',
      purpose: 'Coordinate watershed regeneration and ecological funding.',
      garden: state,
    });
    const sync = createGreenGoodsSyncOutput({
      coopName: 'Watershed Coop',
      purpose: 'Coordinate watershed regeneration and ecological funding.',
      garden: state,
    });

    expect(bootstrap.weightScheme).toBe('linear');
    expect(sync.ensurePools).toBe(true);
    expect(sync.domains).toContain('agro');
  });

  it('builds the canonical live mint config for Coop Safe Green Goods creation', () => {
    const state = createInitialGreenGoodsState({
      coopName: 'Live Garden Coop',
      purpose: 'Coordinate live Green Goods garden operations.',
      setupInsights: buildSetupInsights(),
      requestedAt: '2026-03-13T00:00:00.000Z',
    });
    const updated = updateGreenGoodsState(state, {
      description: 'Coordinate live Green Goods garden operations.',
      slug: 'live-garden-coop',
      location: 'Arbitrum',
      metadata: 'ipfs://example',
      bannerImage: 'ipfs://banner',
      domains: ['agro', 'edu'],
    });

    const config = buildGreenGoodsLiveMintConfig({
      garden: updated,
      operatorAddresses: ['0x1111111111111111111111111111111111111111'],
      gardenerAddresses: ['0x2222222222222222222222222222222222222222'],
    });

    expect(config.name).toBe('Live Garden Coop');
    expect(config.slug).toBe('live-garden-coop');
    expect(config.description).toBe('Coordinate live Green Goods garden operations.');
    expect(config.location).toBe('Arbitrum');
    expect(config.bannerImage).toBe('ipfs://banner');
    expect(config.metadata).toBe('ipfs://example');
    expect(config.domainMask).toBe(0b0110);
    expect(config.operators).toEqual(['0x1111111111111111111111111111111111111111']);
    expect(config.gardeners).toEqual(['0x2222222222222222222222222222222222222222']);
  });

  it('rejects duplicate Green Goods garden names before send', async () => {
    const deployment = getGreenGoodsDeployment('arbitrum');
    const encoded = {
      topics: [
        keccak256(stringToHex('GardenMinted(uint256,address,string,string,string,string,bool)')),
        toHex(1n, { size: 32 }),
        padHex('0x1111111111111111111111111111111111111111', { size: 32 }),
      ] as const,
      data: encodeAbiParameters(
        [
          { type: 'string' },
          { type: 'string' },
          { type: 'string' },
          { type: 'string' },
          { type: 'bool' },
        ],
        ['Live Garden Coop', 'Existing garden', 'Arbitrum', '', false],
      ),
    };

    await expect(
      assertGreenGoodsGardenNameAvailable({
        chainKey: 'arbitrum',
        name: 'live garden coop',
        client: {
          getBlockNumber: async () => deployment.gardenTokenDeploymentBlock,
          getLogs: async () => [
            {
              data: encoded.data,
              topics: encoded.topics,
            },
          ],
        },
      }),
    ).rejects.toThrow(/already in use/i);
  });

  it('requires Safe balance when ENS registration value is needed', async () => {
    await expect(
      assertGreenGoodsSafeBalanceCoversMintValue({
        safeAddress: '0x1111111111111111111111111111111111111111',
        requiredValue: 10n,
        client: {
          getBalance: async () => 0n,
        },
      }),
    ).rejects.toThrow(/fund the Safe/i);
  });

  it('checks Green Goods slug availability and estimates ENS registration fees', async () => {
    const readCalls: string[] = [];
    const client = {
      readContract: async ({ functionName }: { functionName: string }) => {
        readCalls.push(functionName);
        if (functionName === 'available') {
          return true;
        }
        if (functionName === 'getRegistrationFee') {
          return 123n;
        }
        throw new Error(`Unexpected read ${functionName}`);
      },
    };

    await expect(
      assertGreenGoodsSlugAvailable({
        chainKey: 'arbitrum',
        slug: 'live-garden-coop',
        client,
      }),
    ).resolves.toBeUndefined();
    await expect(
      estimateGreenGoodsGardenRegistrationFee({
        chainKey: 'arbitrum',
        safeAddress: '0x1111111111111111111111111111111111111111',
        slug: 'live-garden-coop',
        client,
      }),
    ).resolves.toBe(123n);
    expect(readCalls).toEqual(['available', 'getRegistrationFee']);
  });

  it('computes deterministic GAP admin sync changes', () => {
    const changes = resolveGreenGoodsGapAdminChanges({
      desiredAdmins: [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ],
      currentAdmins: [
        '0x1111111111111111111111111111111111111111',
        '0x3333333333333333333333333333333333333333',
      ],
    });

    expect(changes.addAdmins).toEqual(['0x2222222222222222222222222222222222222222']);
    expect(changes.removeAdmins).toEqual(['0x3333333333333333333333333333333333333333']);

    const output = createGreenGoodsGapAdminSyncOutput({
      desiredAdmins: [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ],
      currentAdmins: [
        '0x1111111111111111111111111111111111111111',
        '0x3333333333333333333333333333333333333333',
      ],
    });
    expect(output.addAdmins).toEqual(['0x2222222222222222222222222222222222222222']);
    expect(output.removeAdmins).toEqual(['0x3333333333333333333333333333333333333333']);
  });

  it('plans gardener reconciliation actions from member bindings', () => {
    const state = updateGreenGoodsState(
      createInitialGreenGoodsState({
        coopName: 'Watershed Coop',
        purpose: 'Coordinate watershed regeneration and ecological funding.',
        setupInsights: buildSetupInsights(),
        requestedAt: '2026-03-13T00:00:00.000Z',
      }),
      {
        status: 'linked',
        gardenAddress: '0x1111111111111111111111111111111111111111',
        memberBindings: [
          {
            memberId: 'member-1',
            actorAddress: '0x2222222222222222222222222222222222222222',
            desiredRoles: ['gardener'],
            currentRoles: [],
            status: 'pending-sync',
          },
          {
            memberId: 'member-2',
            actorAddress: '0x3333333333333333333333333333333333333333',
            syncedActorAddress: '0x4444444444444444444444444444444444444444',
            desiredRoles: ['gardener', 'operator'],
            currentRoles: ['gardener'],
            status: 'pending-sync',
          },
          {
            memberId: 'member-3',
            desiredRoles: ['gardener'],
            currentRoles: [],
            status: 'pending-account',
          },
          {
            memberId: 'member-4',
            actorAddress: '0x5555555555555555555555555555555555555555',
            syncedActorAddress: '0x5555555555555555555555555555555555555555',
            desiredRoles: [],
            currentRoles: ['gardener'],
            status: 'pending-sync',
          },
        ],
      },
    );

    const plan = resolveGreenGoodsGardenerBindingActions({ garden: state });

    expect(plan.skippedMemberIds).toEqual(['member-3']);
    expect(plan.actions).toEqual([
      expect.objectContaining({
        memberId: 'member-1',
        actionClass: 'green-goods-add-gardener',
        gardenerAddress: '0x2222222222222222222222222222222222222222',
      }),
      expect.objectContaining({
        memberId: 'member-2',
        actionClass: 'green-goods-remove-gardener',
        gardenerAddress: '0x4444444444444444444444444444444444444444',
      }),
      expect.objectContaining({
        memberId: 'member-2',
        actionClass: 'green-goods-add-gardener',
        gardenerAddress: '0x3333333333333333333333333333333333333333',
      }),
      expect.objectContaining({
        memberId: 'member-4',
        actionClass: 'green-goods-remove-gardener',
        gardenerAddress: '0x5555555555555555555555555555555555555555',
      }),
    ]);
  });

  it('marks member bindings synced after gardener execution succeeds', () => {
    const linkedState = updateGreenGoodsState(
      createInitialGreenGoodsState({
        coopName: 'Watershed Coop',
        purpose: 'Coordinate watershed regeneration and ecological funding.',
        setupInsights: buildSetupInsights(),
        requestedAt: '2026-03-13T00:00:00.000Z',
      }),
      {
        status: 'linked',
        gardenAddress: '0x1111111111111111111111111111111111111111',
        memberBindings: [
          {
            memberId: 'member-1',
            actorAddress: '0x2222222222222222222222222222222222222222',
            desiredRoles: ['gardener'],
            currentRoles: [],
            status: 'pending-sync',
          },
          {
            memberId: 'member-2',
            actorAddress: '0x3333333333333333333333333333333333333333',
            syncedActorAddress: '0x3333333333333333333333333333333333333333',
            desiredRoles: [],
            currentRoles: ['gardener'],
            status: 'pending-sync',
          },
        ],
      },
    );

    const afterAdd = applyGreenGoodsGardenerActionSuccess({
      garden: linkedState,
      memberId: 'member-1',
      actionClass: 'green-goods-add-gardener',
      gardenerAddress: '0x2222222222222222222222222222222222222222',
      syncedAt: '2026-03-20T10:00:00.000Z',
      txHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      detail: 'Added gardener.',
    });
    expect(afterAdd.memberBindings[0]).toMatchObject({
      memberId: 'member-1',
      currentRoles: ['gardener'],
      syncedActorAddress: '0x2222222222222222222222222222222222222222',
      status: 'synced',
      lastSyncedAt: '2026-03-20T10:00:00.000Z',
    });
    expect(afterAdd.lastMemberSyncAt).toBe('2026-03-20T10:00:00.000Z');
    expect(afterAdd.lastTxHash).toBe(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );

    const afterRemove = applyGreenGoodsGardenerActionSuccess({
      garden: afterAdd,
      memberId: 'member-2',
      actionClass: 'green-goods-remove-gardener',
      gardenerAddress: '0x3333333333333333333333333333333333333333',
      syncedAt: '2026-03-20T10:05:00.000Z',
    });
    expect(afterRemove.memberBindings[1]).toMatchObject({
      memberId: 'member-2',
      currentRoles: [],
      syncedActorAddress: undefined,
      status: 'synced',
      lastSyncedAt: '2026-03-20T10:05:00.000Z',
    });
  });

  it('sends canonical garden profile sync writes through the live executor in order', async () => {
    const calls: Array<{ to: string; data: `0x${string}`; value?: bigint }> = [];

    const result = await syncGreenGoodsGardenProfile({
      mode: 'live',
      authSession: { passkey: { id: 'test-passkey' } } as never,
      pimlicoApiKey: 'test-pimlico-key',
      onchainState: {
        chainId: 11155111,
        chainKey: 'sepolia',
        safeAddress: '0x5555555555555555555555555555555555555555',
        safeCapability: 'executed',
        statusNote: 'Safe executed.',
      },
      gardenAddress: '0x1111111111111111111111111111111111111111',
      output: {
        name: 'Watershed Coop',
        description: 'Canonical profile sync.',
        location: 'Arbitrum',
        bannerImage: 'ipfs://banner',
        metadata: 'ipfs://metadata',
        openJoining: true,
        maxGardeners: 12,
        domains: ['agro', 'edu'],
        ensurePools: true,
        rationale: 'Keep Green Goods in sync.',
      },
      liveExecutor: async (input) => {
        calls.push(input);
        return {
          txHash: `0x${String(calls.length).padStart(64, '0')}` as `0x${string}`,
          safeAddress: '0x5555555555555555555555555555555555555555',
        };
      },
    });

    expect(result.txHash).toBe(`0x${'7'.padStart(64, '0')}`);
    expect(calls).toEqual([
      {
        to: '0x1111111111111111111111111111111111111111',
        data: encodeFunctionData({
          abi: greenGoodsGardenAccountAbi,
          functionName: 'updateName',
          args: ['Watershed Coop'],
        }),
      },
      {
        to: '0x1111111111111111111111111111111111111111',
        data: encodeFunctionData({
          abi: greenGoodsGardenAccountAbi,
          functionName: 'updateDescription',
          args: ['Canonical profile sync.'],
        }),
      },
      {
        to: '0x1111111111111111111111111111111111111111',
        data: encodeFunctionData({
          abi: greenGoodsGardenAccountAbi,
          functionName: 'updateLocation',
          args: ['Arbitrum'],
        }),
      },
      {
        to: '0x1111111111111111111111111111111111111111',
        data: encodeFunctionData({
          abi: greenGoodsGardenAccountAbi,
          functionName: 'updateBannerImage',
          args: ['ipfs://banner'],
        }),
      },
      {
        to: '0x1111111111111111111111111111111111111111',
        data: encodeFunctionData({
          abi: greenGoodsGardenAccountAbi,
          functionName: 'updateMetadata',
          args: ['ipfs://metadata'],
        }),
      },
      {
        to: '0x1111111111111111111111111111111111111111',
        data: encodeFunctionData({
          abi: greenGoodsGardenAccountAbi,
          functionName: 'setOpenJoining',
          args: [true],
        }),
      },
      {
        to: '0x1111111111111111111111111111111111111111',
        data: encodeFunctionData({
          abi: greenGoodsGardenAccountAbi,
          functionName: 'setMaxGardeners',
          args: [12n],
        }),
      },
    ]);
  });

  it('routes domain and pool writes to the Green Goods deployment contracts', async () => {
    const deployment = getGreenGoodsDeployment('sepolia');
    const domainCalls: Array<{ to: string; data: `0x${string}`; value?: bigint }> = [];
    const poolCalls: Array<{ to: string; data: `0x${string}`; value?: bigint }> = [];

    await setGreenGoodsGardenDomains({
      mode: 'live',
      authSession: { passkey: { id: 'test-passkey' } } as never,
      pimlicoApiKey: 'test-pimlico-key',
      onchainState: {
        chainId: 11155111,
        chainKey: 'sepolia',
        safeAddress: '0x5555555555555555555555555555555555555555',
        safeCapability: 'executed',
        statusNote: 'Safe executed.',
      },
      gardenAddress: '0x1111111111111111111111111111111111111111',
      domains: ['agro', 'edu'],
      liveExecutor: async (input) => {
        domainCalls.push(input);
        return {
          txHash: `0x${'a'.repeat(64)}`,
          safeAddress: '0x5555555555555555555555555555555555555555',
        };
      },
    });

    await createGreenGoodsGardenPools({
      mode: 'live',
      authSession: { passkey: { id: 'test-passkey' } } as never,
      pimlicoApiKey: 'test-pimlico-key',
      onchainState: {
        chainId: 11155111,
        chainKey: 'sepolia',
        safeAddress: '0x5555555555555555555555555555555555555555',
        safeCapability: 'executed',
        statusNote: 'Safe executed.',
      },
      gardenAddress: '0x1111111111111111111111111111111111111111',
      liveExecutor: async (input) => {
        poolCalls.push(input);
        return {
          txHash: `0x${'b'.repeat(64)}`,
          safeAddress: '0x5555555555555555555555555555555555555555',
        };
      },
    });

    expect(domainCalls).toEqual([
      {
        to: deployment.actionRegistry,
        data: encodeFunctionData({
          abi: greenGoodsActionRegistryAbi,
          functionName: 'setGardenDomains',
          args: ['0x1111111111111111111111111111111111111111', 0b0110],
        }),
      },
    ]);
    expect(poolCalls).toEqual([
      {
        to: deployment.gardensModule,
        data: encodeFunctionData({
          abi: greenGoodsGardensModuleAbi,
          functionName: 'createGardenPools',
          args: ['0x1111111111111111111111111111111111111111'],
        }),
      },
    ]);
  });
});
