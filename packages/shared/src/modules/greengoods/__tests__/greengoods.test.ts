import { describe, expect, it } from 'vitest';
import type { SetupInsights } from '../../../contracts/schema';
import {
  applyGreenGoodsGardenerActionSuccess,
  createGreenGoodsBootstrapOutput,
  createGreenGoodsGapAdminSyncOutput,
  createGreenGoodsSyncOutput,
  createInitialGreenGoodsState,
  fromGreenGoodsDomainMask,
  inspectGreenGoodsGardenMintAuthorization,
  resolveGreenGoodsGapAdminChanges,
  resolveGreenGoodsGardenerBindingActions,
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
});
