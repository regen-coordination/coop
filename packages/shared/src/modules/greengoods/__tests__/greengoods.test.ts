import { describe, expect, it } from 'vitest';
import type { SetupInsights } from '../../../contracts/schema';
import {
  createGreenGoodsBootstrapOutput,
  createGreenGoodsGapAdminSyncOutput,
  createGreenGoodsSyncOutput,
  createInitialGreenGoodsState,
  fromGreenGoodsDomainMask,
  resolveGreenGoodsGapAdminChanges,
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
});
