import type { Address } from 'viem';
import { describe, expect, it } from 'vitest';
import type { SetupInsights } from '../../../contracts/schema';
import {
  applyGreenGoodsGardenerActionSuccess,
  buildGreenGoodsLiveMintConfig,
  createGreenGoodsGapAdminSyncOutput,
  createGreenGoodsSyncOutput,
  createInitialGreenGoodsState,
  resolveGreenGoodsGardenerBindingActions,
  syncGreenGoodsMemberBindings,
  updateGreenGoodsState,
} from '../greengoods';

const CREATOR_ACCOUNT = '0x1111111111111111111111111111111111111111' as Address;
const TRUSTED_ACCOUNT = '0x2222222222222222222222222222222222222222' as Address;
const OLD_OPERATOR = '0x3333333333333333333333333333333333333333' as Address;
const GARDEN_ADDRESS = '0x4444444444444444444444444444444444444444' as Address;

function buildSetupInsights(): SetupInsights {
  return {
    summary: 'This coop coordinates watershed work, ecological research, and shared learning.',
    crossCuttingPainPoints: ['Operator decisions and field work get separated.'],
    crossCuttingOpportunities: ['Keep operations, evidence, and governance aligned in one place.'],
    lenses: [
      {
        lens: 'capital-formation',
        currentState: 'Funding context is fragmented.',
        painPoints: 'Important work slips between meetings.',
        improvements: 'Use one shared action loop for onchain follow-through.',
      },
      {
        lens: 'impact-reporting',
        currentState: 'Evidence is gathered after the fact.',
        painPoints: 'Reviewers lose confidence.',
        improvements: 'Keep submissions and assessments close to the garden state.',
      },
      {
        lens: 'governance-coordination',
        currentState: 'Trusted operators reconcile access manually.',
        painPoints: 'Admin drift appears over time.',
        improvements: 'Drive gardener and GAP admin sync from the same source state.',
      },
      {
        lens: 'knowledge-garden-resources',
        currentState: 'Useful context is scattered.',
        painPoints: 'People redo work.',
        improvements: 'Keep the shared garden configuration canonical.',
      },
    ],
  };
}

describe('Green Goods orchestration', () => {
  it('composes initial state, canonical config, gardener reconciliation, GAP admin sync, and maintenance outputs', () => {
    const initial = createInitialGreenGoodsState({
      coopName: 'Watershed Stewardship Coop',
      purpose: 'Coordinate watershed restoration work and cooperative stewardship.',
      setupInsights: buildSetupInsights(),
      requestedAt: '2026-03-26T00:00:00.000Z',
    });

    const memberBindings = syncGreenGoodsMemberBindings({
      current: initial,
      members: [
        {
          id: 'member-1',
          displayName: 'Ari',
          role: 'creator',
          authMode: 'passkey',
          address: '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa',
          joinedAt: '2026-03-20T00:00:00.000Z',
          identityWarning: 'creator',
        },
        {
          id: 'member-2',
          displayName: 'Bea',
          role: 'trusted',
          authMode: 'passkey',
          address: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
          joinedAt: '2026-03-21T00:00:00.000Z',
          identityWarning: 'trusted',
        },
        {
          id: 'member-3',
          displayName: 'Cy',
          role: 'member',
          authMode: 'passkey',
          address: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
          joinedAt: '2026-03-22T00:00:00.000Z',
          identityWarning: 'member',
        },
      ],
      memberAccounts: [
        {
          id: 'acct-1',
          memberId: 'member-1',
          coopId: 'coop-1',
          accountAddress: CREATOR_ACCOUNT,
          accountType: 'smart-account',
          ownerPasskeyCredentialId: 'passkey-1',
          chainKey: 'sepolia',
          status: 'active',
          statusNote: 'Creator smart account deployed.',
          createdAt: '2026-03-20T00:00:00.000Z',
          updatedAt: '2026-03-20T00:00:00.000Z',
          deployedAt: '2026-03-20T00:00:00.000Z',
        },
        {
          id: 'acct-2',
          memberId: 'member-2',
          coopId: 'coop-1',
          accountAddress: TRUSTED_ACCOUNT,
          accountType: 'smart-account',
          ownerPasskeyCredentialId: 'passkey-2',
          chainKey: 'sepolia',
          status: 'active',
          statusNote: 'Trusted operator smart account deployed.',
          createdAt: '2026-03-21T00:00:00.000Z',
          updatedAt: '2026-03-21T00:00:00.000Z',
          deployedAt: '2026-03-21T00:00:00.000Z',
        },
      ],
    });

    const linked = updateGreenGoodsState(initial, {
      status: 'linked',
      linkedAt: '2026-03-26T01:00:00.000Z',
      gardenAddress: GARDEN_ADDRESS,
      description: 'Coordinate watershed restoration work and cooperative stewardship.',
      location: 'Sepolia watershed lab',
      metadata: 'ipfs://garden-metadata',
      bannerImage: 'ipfs://garden-banner',
      domains: ['agro', 'edu'],
      gapAdminAddresses: [OLD_OPERATOR],
      memberBindings,
    });

    const operatorAddresses = linked.memberBindings
      .filter((binding) => binding.desiredRoles.includes('operator') && binding.actorAddress)
      .map((binding) => binding.actorAddress as Address);
    const gardenerAddresses = linked.memberBindings
      .filter((binding) => binding.desiredRoles.includes('gardener') && binding.actorAddress)
      .map((binding) => binding.actorAddress as Address);

    const mintConfig = buildGreenGoodsLiveMintConfig({
      garden: linked,
      operatorAddresses,
      gardenerAddresses,
    });
    expect(mintConfig.name).toBe('Watershed Stewardship Coop');
    expect(mintConfig.domainMask).toBe(0b0110);
    expect(mintConfig.operators).toEqual([CREATOR_ACCOUNT, TRUSTED_ACCOUNT]);
    expect(mintConfig.gardeners).toEqual([CREATOR_ACCOUNT, TRUSTED_ACCOUNT]);

    const gardenerPlan = resolveGreenGoodsGardenerBindingActions({
      garden: linked,
    });
    expect(gardenerPlan.skippedMemberIds).toEqual(['member-3']);
    expect(gardenerPlan.actions).toEqual([
      expect.objectContaining({
        memberId: 'member-1',
        actionClass: 'green-goods-add-gardener',
        gardenerAddress: CREATOR_ACCOUNT,
      }),
      expect.objectContaining({
        memberId: 'member-2',
        actionClass: 'green-goods-add-gardener',
        gardenerAddress: TRUSTED_ACCOUNT,
      }),
    ]);

    const gapAdminSync = createGreenGoodsGapAdminSyncOutput({
      desiredAdmins: operatorAddresses,
      currentAdmins: linked.gapAdminAddresses as Address[],
    });
    expect(gapAdminSync.addAdmins).toEqual([CREATOR_ACCOUNT, TRUSTED_ACCOUNT]);
    expect(gapAdminSync.removeAdmins).toEqual([OLD_OPERATOR]);

    const afterFirstGardenerSync = applyGreenGoodsGardenerActionSuccess({
      garden: linked,
      memberId: 'member-1',
      actionClass: 'green-goods-add-gardener',
      gardenerAddress: CREATOR_ACCOUNT,
      syncedAt: '2026-03-26T01:05:00.000Z',
      txHash: `0x${'a'.repeat(64)}`,
    });
    const afterSecondGardenerSync = applyGreenGoodsGardenerActionSuccess({
      garden: afterFirstGardenerSync,
      memberId: 'member-2',
      actionClass: 'green-goods-add-gardener',
      gardenerAddress: TRUSTED_ACCOUNT,
      syncedAt: '2026-03-26T01:10:00.000Z',
      txHash: `0x${'b'.repeat(64)}`,
    });

    expect(afterSecondGardenerSync.memberBindings).toEqual([
      expect.objectContaining({
        memberId: 'member-1',
        currentRoles: ['gardener'],
        status: 'synced',
        syncedActorAddress: CREATOR_ACCOUNT,
      }),
      expect.objectContaining({
        memberId: 'member-2',
        currentRoles: ['gardener'],
        status: 'synced',
        syncedActorAddress: TRUSTED_ACCOUNT,
      }),
      expect.objectContaining({
        memberId: 'member-3',
        status: 'pending-account',
      }),
    ]);

    const remainingGardenerPlan = resolveGreenGoodsGardenerBindingActions({
      garden: afterSecondGardenerSync,
    });
    expect(remainingGardenerPlan.actions).toEqual([]);
    expect(remainingGardenerPlan.skippedMemberIds).toEqual(['member-3']);

    const maintenanceOutput = createGreenGoodsSyncOutput({
      garden: afterSecondGardenerSync,
      coopName: 'Watershed Stewardship Coop',
      purpose: 'Coordinate watershed restoration work and cooperative stewardship.',
    });
    expect(maintenanceOutput).toMatchObject({
      name: 'Watershed Stewardship Coop',
      description: 'Coordinate watershed restoration work and cooperative stewardship.',
      domains: ['agro', 'edu'],
      ensurePools: true,
    });
  });
});
