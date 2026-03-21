import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@coop/shared', async () => {
  const actual = await vi.importActual<typeof import('@coop/shared')>('@coop/shared');
  return {
    ...actual,
    listActionPolicies: vi.fn(async () => [
      {
        id: 'policy-add',
        actionClass: 'green-goods-add-gardener',
        approvalRequired: true,
        replayProtection: true,
        createdAt: '2026-03-20T00:00:00.000Z',
        updatedAt: '2026-03-20T00:00:00.000Z',
      },
      {
        id: 'policy-remove',
        actionClass: 'green-goods-remove-gardener',
        approvalRequired: true,
        replayProtection: true,
        createdAt: '2026-03-20T00:00:00.000Z',
        updatedAt: '2026-03-20T00:00:00.000Z',
      },
    ]),
    saveActionBundle: vi.fn(async () => undefined),
    saveActionLogEntry: vi.fn(async () => undefined),
    resolveGreenGoodsGardenerBindingActions: vi.fn(() => ({
      actions: [
        {
          memberId: 'member-1',
          actionClass: 'green-goods-add-gardener',
          gardenerAddress: '0x1111111111111111111111111111111111111111',
          reason: 'Add latest member account.',
        },
        {
          memberId: 'member-2',
          actionClass: 'green-goods-remove-gardener',
          gardenerAddress: '0x2222222222222222222222222222222222222222',
          reason: 'Remove stale member account.',
        },
      ],
      skippedMemberIds: ['member-3'],
    })),
  };
});

vi.mock('../../context', () => ({
  db: {},
}));

vi.mock('../../operator', () => ({
  getTrustedNodeContext: vi.fn(async () => ({
    ok: true,
    coop: {
      profile: { id: 'coop-1' },
      onchainState: {
        chainId: 11155111,
        chainKey: 'sepolia',
        safeAddress: '0x9999999999999999999999999999999999999999',
      },
      greenGoods: {
        gardenAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        memberBindings: [],
      },
    },
    member: {
      id: 'member-admin',
      displayName: 'Ari',
    },
  })),
}));

const { handleQueueGreenGoodsMemberSync } = await import('../actions');
const shared = await import('@coop/shared');

afterEach(() => {
  vi.clearAllMocks();
});

describe('handleQueueGreenGoodsMemberSync', () => {
  it('creates gardener action bundles from pending member bindings', async () => {
    const result = await handleQueueGreenGoodsMemberSync({
      type: 'queue-green-goods-member-sync',
      payload: { coopId: 'coop-1' },
    });

    expect(result.ok).toBe(true);
    expect(result.data?.proposed).toBe(2);
    expect(result.data?.skippedMemberIds).toEqual(['member-3']);
    expect(vi.mocked(shared.saveActionBundle)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(shared.saveActionBundle).mock.calls[0]?.[1]).toMatchObject({
      actionClass: 'green-goods-add-gardener',
      payload: expect.objectContaining({
        memberId: 'member-1',
        gardenerAddress: '0x1111111111111111111111111111111111111111',
      }),
    });
    expect(vi.mocked(shared.saveActionBundle).mock.calls[1]?.[1]).toMatchObject({
      actionClass: 'green-goods-remove-gardener',
      payload: expect.objectContaining({
        memberId: 'member-2',
        gardenerAddress: '0x2222222222222222222222222222222222222222',
      }),
    });
  });
});
