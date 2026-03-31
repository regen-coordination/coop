import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sharedMocks = vi.hoisted(() => ({
  isArchiveReceiptRefreshable: vi.fn(),
  listAgentMemories: vi.fn(),
  listAgentObservations: vi.fn(),
  listReceiverCaptures: vi.fn(),
  listReviewDrafts: vi.fn(),
  saveAgentObservation: vi.fn(async () => undefined),
  updateAgentObservation: vi.fn(
    (observation: Record<string, unknown>, patch: Record<string, unknown>) => ({
      ...observation,
      ...patch,
    }),
  ),
}));

const contextMocks = vi.hoisted(() => ({
  getCoops: vi.fn(),
}));

const conditionMocks = vi.hoisted(() => ({
  getLatestReviewDigestDraft: vi.fn(),
  isGreenGoodsGapAdminSyncNeeded: vi.fn(),
  isGreenGoodsSyncNeeded: vi.fn(),
  isMemoryInsightDue: vi.fn(),
  isRitualReviewDue: vi.fn(),
  resolveDesiredGreenGoodsGapAdmins: vi.fn(),
  resolveObservationInactiveReason: vi.fn(),
}));

const emitterMocks = vi.hoisted(() => ({
  emitAgentObservationIfMissing: vi.fn(async (input: Record<string, unknown>) => input),
  syncHighConfidenceDraftObservations: vi.fn(async () => undefined),
}));

vi.mock('@coop/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@coop/shared')>();
  return {
    ...actual,
    isArchiveReceiptRefreshable: sharedMocks.isArchiveReceiptRefreshable,
    listAgentMemories: sharedMocks.listAgentMemories,
    listAgentObservations: sharedMocks.listAgentObservations,
    listReceiverCaptures: sharedMocks.listReceiverCaptures,
    listReviewDrafts: sharedMocks.listReviewDrafts,
    saveAgentObservation: sharedMocks.saveAgentObservation,
    updateAgentObservation: sharedMocks.updateAgentObservation,
  };
});

vi.mock('../../context', () => ({
  db: {},
  getCoops: contextMocks.getCoops,
}));

vi.mock('../agent-observation-conditions', () => ({
  getLatestReviewDigestDraft: conditionMocks.getLatestReviewDigestDraft,
  isGreenGoodsGapAdminSyncNeeded: conditionMocks.isGreenGoodsGapAdminSyncNeeded,
  isGreenGoodsSyncNeeded: conditionMocks.isGreenGoodsSyncNeeded,
  isMemoryInsightDue: conditionMocks.isMemoryInsightDue,
  isRitualReviewDue: conditionMocks.isRitualReviewDue,
  resolveDesiredGreenGoodsGapAdmins: conditionMocks.resolveDesiredGreenGoodsGapAdmins,
  resolveObservationInactiveReason: conditionMocks.resolveObservationInactiveReason,
}));

vi.mock('../agent-observation-emitters', () => ({
  emitAgentObservationIfMissing: emitterMocks.emitAgentObservationIfMissing,
  syncHighConfidenceDraftObservations: emitterMocks.syncHighConfidenceDraftObservations,
}));

const { reconcileAgentObservations, syncAgentObservations } = await import(
  '../agent-reconciliation'
);

function makeCoop(overrides: Record<string, unknown> = {}) {
  return {
    profile: {
      id: 'coop-1',
      name: 'Alpha Coop',
    },
    members: [
      {
        id: 'member-1',
        role: 'creator',
        address: '0x1111111111111111111111111111111111111111',
      },
      {
        id: 'member-2',
        role: 'trusted',
        address: '0x2222222222222222222222222222222222222222',
      },
    ],
    onchainState: {
      safeAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      safeCapability: 'ready',
    },
    greenGoods: undefined,
    archiveReceipts: [],
    rituals: [],
    ...overrides,
  };
}

describe('agent reconciliation helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharedMocks.listAgentObservations.mockResolvedValue([]);
    sharedMocks.listReviewDrafts.mockResolvedValue([]);
    sharedMocks.listReceiverCaptures.mockResolvedValue([]);
    sharedMocks.listAgentMemories.mockResolvedValue([]);
    contextMocks.getCoops.mockResolvedValue([]);
    conditionMocks.resolveObservationInactiveReason.mockReturnValue(null);
    conditionMocks.isGreenGoodsSyncNeeded.mockReturnValue(false);
    conditionMocks.isGreenGoodsGapAdminSyncNeeded.mockReturnValue(false);
    conditionMocks.resolveDesiredGreenGoodsGapAdmins.mockReturnValue([]);
    conditionMocks.isRitualReviewDue.mockReturnValue(false);
    conditionMocks.getLatestReviewDigestDraft.mockReturnValue(undefined);
    conditionMocks.isMemoryInsightDue.mockReturnValue(false);
    sharedMocks.isArchiveReceiptRefreshable.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('dismisses active observations once the current coop state marks them inactive', async () => {
    sharedMocks.listAgentObservations.mockResolvedValue([
      {
        id: 'obs-1',
        trigger: 'green-goods-sync-needed',
        status: 'pending',
        coopId: 'coop-1',
        fingerprint: 'fp-1',
      },
      {
        id: 'obs-2',
        trigger: 'receiver-backlog',
        status: 'dismissed',
        coopId: 'coop-1',
        fingerprint: 'fp-2',
      },
    ]);
    conditionMocks.resolveObservationInactiveReason.mockImplementation(
      ({ observation }: { observation: { id: string } }) =>
        observation.id === 'obs-1' ? 'Green Goods sync is no longer needed.' : null,
    );

    await reconcileAgentObservations({
      drafts: [],
      receiverCaptures: [],
      coops: [makeCoop()],
    });

    expect(sharedMocks.saveAgentObservation).toHaveBeenCalledTimes(1);
    expect(sharedMocks.saveAgentObservation).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        id: 'obs-1',
        status: 'dismissed',
        blockedReason: 'Green Goods sync is no longer needed.',
      }),
    );
  });

  it('emits the expected follow-up observations for backlog, Green Goods, ritual, archive, memory, and ERC-8004 state', async () => {
    const coopNeedingGarden = makeCoop({
      profile: { id: 'coop-1', name: 'Starter Coop' },
      greenGoods: {
        enabled: true,
        status: 'requested',
        requestedAt: '2026-03-28T00:00:00.000Z',
        weightScheme: 'equal',
        domainMask: ['food'],
      },
    });
    const linkedCoop = makeCoop({
      profile: { id: 'coop-2', name: 'Linked Coop' },
      onchainState: {
        safeAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        safeCapability: 'executed',
      },
      greenGoods: {
        enabled: true,
        status: 'linked',
        gardenAddress: '0xgarden',
        gapAdminAddresses: [],
      },
      archiveReceipts: [
        {
          id: 'receipt-1',
          rootCid: 'bafyroot',
          scope: 'artifact',
          filecoinStatus: 'submitted',
          followUp: {
            lastRefreshedAt: '2026-03-20T00:00:00.000Z',
          },
        },
      ],
      rituals: [{ weeklyReviewCadence: 'friday' }],
    });
    const drafts = [
      {
        id: 'draft-1',
        status: 'accepted',
        suggestedTargetCoopIds: ['coop-2'],
      },
    ];

    contextMocks.getCoops.mockResolvedValue([coopNeedingGarden, linkedCoop]);
    sharedMocks.listReviewDrafts.mockResolvedValue(drafts);
    sharedMocks.listReceiverCaptures.mockResolvedValue([
      {
        id: 'capture-1',
        coopId: 'coop-2',
        kind: 'note',
        title: 'Receiver note',
        note: 'Follow up on the neighborhood grant.',
        intakeStatus: 'candidate',
      },
    ]);
    sharedMocks.listAgentMemories.mockResolvedValue([
      {
        id: 'memory-1',
        coopId: 'coop-2',
        createdAt: '2026-03-29T00:00:00.000Z',
      },
    ]);
    conditionMocks.isGreenGoodsSyncNeeded.mockImplementation(
      (greenGoods: { gardenAddress?: string } | undefined) =>
        greenGoods?.gardenAddress === '0xgarden',
    );
    conditionMocks.isGreenGoodsGapAdminSyncNeeded.mockImplementation(
      (coop: { profile: { id: string } }) => coop.profile.id === 'coop-2',
    );
    conditionMocks.resolveDesiredGreenGoodsGapAdmins.mockReturnValue([
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
    ]);
    conditionMocks.isRitualReviewDue.mockImplementation(
      ({ coop }: { coop: { profile: { id: string } } }) => coop.profile.id === 'coop-2',
    );
    conditionMocks.isMemoryInsightDue.mockImplementation(
      ({ coopId }: { coopId: string }) => coopId === 'coop-2',
    );
    sharedMocks.isArchiveReceiptRefreshable.mockImplementation(
      (receipt: { id: string }) => receipt.id === 'receipt-1',
    );

    await syncAgentObservations();

    expect(emitterMocks.syncHighConfidenceDraftObservations).toHaveBeenCalledWith(drafts);
    const triggers = emitterMocks.emitAgentObservationIfMissing.mock.calls.map(
      (call) => call[0].trigger,
    );
    expect(triggers).toEqual(
      expect.arrayContaining([
        'receiver-backlog',
        'green-goods-garden-requested',
        'green-goods-sync-needed',
        'green-goods-gap-admin-sync-needed',
        'erc8004-registration-due',
        'stale-archive-receipt',
        'ritual-review-due',
        'memory-insight-due',
      ]),
    );
  });
});
