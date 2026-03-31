import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActionBundle, CoopSharedState } from '@coop/shared';
import { makeCoopState } from '../../../../__tests__/fixtures';
import { buildGreenGoodsExecutors } from '../green-goods';

const mocks = vi.hoisted(() => ({
  addGreenGoodsGardener: vi.fn(),
  applyArchiveDelegationToClient: vi.fn(),
  applyGreenGoodsGardenerActionSuccess: vi.fn(),
  applyGreenGoodsMemberBindingError: vi.fn(),
  buildGreenGoodsSessionExecutor: vi.fn(),
  configuredOnchainMode: 'mock',
  configuredPimlicoApiKey: undefined as string | undefined,
  createGreenGoodsAssessment: vi.fn(),
  createGreenGoodsGarden: vi.fn(),
  createGreenGoodsGardenPools: vi.fn(),
  createStorachaArchiveClient: vi.fn(),
  emitAgentObservationIfMissing: vi.fn(),
  ensureReceiverSyncOffscreenDocument: vi.fn(),
  issueArchiveDelegation: vi.fn(),
  logPrivilegedAction: vi.fn(),
  mintGreenGoodsHypercert: vi.fn(),
  removeGreenGoodsGardener: vi.fn(),
  resolveGreenGoodsGapAdminChanges: vi.fn(),
  requestAgentCycle: vi.fn(),
  resolveArchiveConfigForCoop: vi.fn(),
  resolveScopedActionPayload: vi.fn(),
  setGreenGoodsGardenDomains: vi.fn(),
  submitGreenGoodsWorkApproval: vi.fn(),
  syncGreenGoodsGapAdmins: vi.fn(),
  syncGreenGoodsGardenProfile: vi.fn(),
  updateCoopGreenGoodsState: vi.fn(),
  updateGreenGoodsState: vi.fn(),
}));

vi.mock('@coop/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@coop/shared')>();
  return {
    ...actual,
    addGreenGoodsGardener: mocks.addGreenGoodsGardener,
    applyArchiveDelegationToClient: mocks.applyArchiveDelegationToClient,
    applyGreenGoodsGardenerActionSuccess: mocks.applyGreenGoodsGardenerActionSuccess,
    applyGreenGoodsMemberBindingError: mocks.applyGreenGoodsMemberBindingError,
    createGreenGoodsAssessment: mocks.createGreenGoodsAssessment,
    createGreenGoodsGarden: mocks.createGreenGoodsGarden,
    createGreenGoodsGardenPools: mocks.createGreenGoodsGardenPools,
    createStorachaArchiveClient: mocks.createStorachaArchiveClient,
    issueArchiveDelegation: mocks.issueArchiveDelegation,
    mintGreenGoodsHypercert: mocks.mintGreenGoodsHypercert,
    removeGreenGoodsGardener: mocks.removeGreenGoodsGardener,
    resolveGreenGoodsGapAdminChanges: mocks.resolveGreenGoodsGapAdminChanges,
    resolveScopedActionPayload: mocks.resolveScopedActionPayload,
    setGreenGoodsGardenDomains: mocks.setGreenGoodsGardenDomains,
    submitGreenGoodsWorkApproval: mocks.submitGreenGoodsWorkApproval,
    syncGreenGoodsGapAdmins: mocks.syncGreenGoodsGapAdmins,
    syncGreenGoodsGardenProfile: mocks.syncGreenGoodsGardenProfile,
    updateGreenGoodsState: mocks.updateGreenGoodsState,
  };
});

vi.mock('../../../context', () => ({
  get configuredOnchainMode() {
    return mocks.configuredOnchainMode;
  },
  get configuredPimlicoApiKey() {
    return mocks.configuredPimlicoApiKey;
  },
  ensureReceiverSyncOffscreenDocument: mocks.ensureReceiverSyncOffscreenDocument,
  resolveArchiveConfigForCoop: mocks.resolveArchiveConfigForCoop,
  updateCoopGreenGoodsState: mocks.updateCoopGreenGoodsState,
}));

vi.mock('../../../operator', () => ({
  logPrivilegedAction: mocks.logPrivilegedAction,
}));

vi.mock('../../agent', () => ({
  emitAgentObservationIfMissing: mocks.emitAgentObservationIfMissing,
  requestAgentCycle: mocks.requestAgentCycle,
}));

vi.mock('../../session', () => ({
  buildGreenGoodsSessionExecutor: mocks.buildGreenGoodsSessionExecutor,
}));

function makeCoop(overrides: Partial<CoopSharedState> = {}): CoopSharedState {
  const baseState = makeCoopState({
    profile: {
      id: 'coop-1',
      name: 'Alpha Coop',
      purpose: 'Green Goods',
      safeAddress: '0x1111111111111111111111111111111111111111',
    },
    members: [
      {
        id: 'member-1',
        displayName: 'Ari',
        role: 'creator',
        authMode: 'passkey',
        address: '0x1111111111111111111111111111111111111111',
        joinedAt: '2026-01-01T00:00:00.000Z',
        identityWarning: '',
      },
      {
        id: 'member-2',
        displayName: 'Bo',
        role: 'member',
        authMode: 'passkey',
        address: '0x2222222222222222222222222222222222222222',
        joinedAt: '2026-01-02T00:00:00.000Z',
        identityWarning: '',
      },
    ],
    onchainState: {
      chainId: 11155111,
      chainKey: 'sepolia',
      safeAddress: '0x1111111111111111111111111111111111111111',
      safeCapability: 'ready',
      statusNote: '',
    },
  });

  return {
    ...baseState,
    greenGoods: {
      enabled: true,
      status: 'linked',
      gardenAddress: '0xgarden',
      memberBindings: [],
      domains: [],
      ...(baseState.greenGoods ?? {}),
      ...(overrides.greenGoods ?? {}),
    },
    ...overrides,
  } as CoopSharedState;
}

function makeBundle(actionClass: ActionBundle['actionClass']): ActionBundle {
  return {
    id: `bundle-${actionClass}`,
    coopId: 'coop-1',
    actionClass,
    status: 'queued',
    createdAt: '2026-03-01T00:00:00.000Z',
    payload: {},
  } as unknown as ActionBundle;
}

describe('Green Goods executors', () => {
  let currentCoop: CoopSharedState;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configuredOnchainMode = 'mock';
    mocks.configuredPimlicoApiKey = undefined;
    currentCoop = makeCoop();
    mocks.updateGreenGoodsState.mockImplementation((current, patch) => ({
      ...current,
      ...patch,
    }));
    mocks.applyGreenGoodsGardenerActionSuccess.mockImplementation(
      ({ garden, txHash, detail, memberId, gardenerAddress }) => ({
        ...garden,
        lastTxHash: txHash,
        statusNote: detail,
        memberBindings: [
          ...(garden.memberBindings ?? []),
          {
            memberId,
            status: 'pending-sync',
            actorAddress: gardenerAddress,
          },
        ],
      }),
    );
    mocks.applyGreenGoodsMemberBindingError.mockImplementation(({ garden, error }) => ({
      ...garden,
      status: 'error',
      lastError: error,
      statusNote: error,
    }));
    mocks.updateCoopGreenGoodsState.mockImplementation(async ({ apply }) => {
      const nextGreenGoods = apply(currentCoop.greenGoods);
      currentCoop = {
        ...currentCoop,
        greenGoods: nextGreenGoods,
      };
      return currentCoop;
    });
    mocks.resolveGreenGoodsGapAdminChanges.mockReturnValue({
      addAdmins: ['0x1111111111111111111111111111111111111111'],
      removeAdmins: [],
    });
  });

  it('rejects scoped payload mismatches before executing gardener actions', async () => {
    mocks.resolveScopedActionPayload.mockReturnValueOnce({
      ok: false,
      reason: 'Coop scope mismatch.',
    });

    const handlers = buildGreenGoodsExecutors({
      bundle: makeBundle('green-goods-add-gardener'),
      trustedNodeContext: {
        ok: true,
        coop: currentCoop,
        member: { id: 'member-1', displayName: 'Ari' },
        authSession: {
          primaryAddress: '0x1111111111111111111111111111111111111111',
        },
      },
    });

    const result = await handlers['green-goods-add-gardener']?.({});

    expect(result).toEqual({ ok: false, error: 'Coop scope mismatch.' });
    expect(mocks.addGreenGoodsGardener).not.toHaveBeenCalled();
  });

  it('adds a gardener and logs the successful Green Goods transaction', async () => {
    mocks.resolveScopedActionPayload.mockReturnValueOnce({
      ok: true,
      normalizedPayload: {
        coopId: 'coop-1',
        memberId: 'member-2',
        gardenAddress: '0xgarden',
        gardenerAddress: '0x2222222222222222222222222222222222222222',
      },
    });
    mocks.addGreenGoodsGardener.mockResolvedValueOnce({
      txHash: '0xadd',
      detail: 'Gardener added.',
    });

    const handlers = buildGreenGoodsExecutors({
      bundle: makeBundle('green-goods-add-gardener'),
      trustedNodeContext: {
        ok: true,
        coop: currentCoop,
        member: { id: 'member-1', displayName: 'Ari' },
        authSession: {
          primaryAddress: '0x1111111111111111111111111111111111111111',
        },
      },
    });

    const result = await handlers['green-goods-add-gardener']?.({});

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          lastTxHash: '0xadd',
          txHash: '0xadd',
        }),
      }),
    );
    expect(mocks.addGreenGoodsGardener).toHaveBeenCalledTimes(1);
    expect(mocks.logPrivilegedAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'green-goods-transaction',
        status: 'succeeded',
      }),
    );
  });

  it('creates a garden, emits follow-up work, and wakes the receiver sync runtime', async () => {
    mocks.resolveScopedActionPayload.mockReturnValueOnce({
      ok: true,
      normalizedPayload: {
        coopId: 'coop-1',
        name: 'Alpha Garden',
        slug: 'alpha-garden',
        description: 'Shared work for the coop.',
        location: 'Oakland',
        bannerImage: 'ipfs://banner',
        metadata: 'ipfs://metadata',
        openJoining: true,
        maxGardeners: 12,
        weightScheme: 'equal',
        domains: ['food'],
        operatorAddresses: ['0x1111111111111111111111111111111111111111'],
        gardenerAddresses: ['0x2222222222222222222222222222222222222222'],
      },
    });
    mocks.createGreenGoodsGarden.mockResolvedValueOnce({
      gardenAddress: '0xgarden-created',
      tokenId: 1n,
      gapProjectUid: 'gap-project-1',
      txHash: '0xgarden-create',
      detail: 'Garden created.',
    });

    const handlers = buildGreenGoodsExecutors({
      bundle: makeBundle('green-goods-create-garden'),
      trustedNodeContext: {
        ok: true,
        coop: currentCoop,
        member: { id: 'member-1', displayName: 'Ari' },
        authSession: {
          primaryAddress: '0x1111111111111111111111111111111111111111',
        },
      },
    });

    const result = await handlers['green-goods-create-garden']?.({});

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          gardenAddress: '0xgarden-created',
          lastTxHash: '0xgarden-create',
          gapProjectUid: 'gap-project-1',
        }),
      }),
    );
    expect(mocks.createGreenGoodsGarden).toHaveBeenCalledTimes(1);
    expect(mocks.emitAgentObservationIfMissing).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: 'green-goods-sync-needed',
      }),
    );
    expect(mocks.ensureReceiverSyncOffscreenDocument).toHaveBeenCalledTimes(1);
    expect(mocks.requestAgentCycle).toHaveBeenCalledWith('green-goods-sync:coop-1', true);
  });

  it('records binding errors when gardener removal fails', async () => {
    mocks.resolveScopedActionPayload.mockReturnValueOnce({
      ok: true,
      normalizedPayload: {
        coopId: 'coop-1',
        memberId: 'member-2',
        gardenAddress: '0xgarden',
        gardenerAddress: '0x2222222222222222222222222222222222222222',
      },
    });
    mocks.removeGreenGoodsGardener.mockRejectedValueOnce(new Error('Removal failed.'));

    const handlers = buildGreenGoodsExecutors({
      bundle: makeBundle('green-goods-remove-gardener'),
      trustedNodeContext: {
        ok: true,
        coop: currentCoop,
        member: { id: 'member-1', displayName: 'Ari' },
        authSession: {
          primaryAddress: '0x1111111111111111111111111111111111111111',
        },
      },
    });

    const result = await handlers['green-goods-remove-gardener']?.({});

    expect(result).toEqual({ ok: false, error: 'Removal failed.' });
    expect(mocks.applyGreenGoodsMemberBindingError).toHaveBeenCalledTimes(1);
    expect(mocks.logPrivilegedAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'green-goods-transaction',
        status: 'failed',
      }),
    );
  });

  it('syncs garden profile fields and records the latest profile sync timestamp', async () => {
    mocks.resolveScopedActionPayload.mockReturnValueOnce({
      ok: true,
      normalizedPayload: {
        coopId: 'coop-1',
        gardenAddress: '0xgarden',
        name: 'Alpha Garden',
        description: 'Shared local projects.',
        location: 'Oakland',
        bannerImage: 'ipfs://banner',
        metadata: 'ipfs://metadata',
        openJoining: true,
        maxGardeners: 12,
      },
    });
    mocks.syncGreenGoodsGardenProfile.mockResolvedValueOnce({
      txHash: '0xprofile',
      detail: 'Profile synced.',
    });

    const handlers = buildGreenGoodsExecutors({
      bundle: makeBundle('green-goods-sync-garden-profile'),
      trustedNodeContext: {
        ok: true,
        coop: currentCoop,
        member: { id: 'member-1', displayName: 'Ari' },
        authSession: {
          primaryAddress: '0x1111111111111111111111111111111111111111',
        },
      },
    });

    const result = await handlers['green-goods-sync-garden-profile']?.({});

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          lastProfileSyncAt: expect.any(String),
          lastTxHash: '0xprofile',
        }),
      }),
    );
    expect(mocks.syncGreenGoodsGardenProfile).toHaveBeenCalledTimes(1);
    expect(mocks.logPrivilegedAction).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'succeeded',
        detail: expect.stringContaining('Synced Green Goods garden profile'),
      }),
    );
  });

  it('updates garden domains and keeps the linked garden state in sync', async () => {
    mocks.resolveScopedActionPayload.mockReturnValueOnce({
      ok: true,
      normalizedPayload: {
        coopId: 'coop-1',
        gardenAddress: '0xgarden',
        domains: ['food', 'water'],
      },
    });
    mocks.setGreenGoodsGardenDomains.mockResolvedValueOnce({
      txHash: '0xdomains',
      detail: 'Domains updated.',
    });

    const handlers = buildGreenGoodsExecutors({
      bundle: makeBundle('green-goods-set-garden-domains'),
      trustedNodeContext: {
        ok: true,
        coop: currentCoop,
        member: { id: 'member-1', displayName: 'Ari' },
        authSession: {
          primaryAddress: '0x1111111111111111111111111111111111111111',
        },
      },
    });

    const result = await handlers['green-goods-set-garden-domains']?.({});

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          domains: ['food', 'water'],
          lastTxHash: '0xdomains',
        }),
      }),
    );
    expect(mocks.setGreenGoodsGardenDomains).toHaveBeenCalledTimes(1);
  });

  it('creates garden pools and marks the pool sync as complete', async () => {
    mocks.resolveScopedActionPayload.mockReturnValueOnce({
      ok: true,
      normalizedPayload: {
        coopId: 'coop-1',
        gardenAddress: '0xgarden',
      },
    });
    mocks.createGreenGoodsGardenPools.mockResolvedValueOnce({
      txHash: '0xpools',
      detail: 'Pools created.',
    });

    const handlers = buildGreenGoodsExecutors({
      bundle: makeBundle('green-goods-create-garden-pools'),
      trustedNodeContext: {
        ok: true,
        coop: currentCoop,
        member: { id: 'member-1', displayName: 'Ari' },
        authSession: {
          primaryAddress: '0x1111111111111111111111111111111111111111',
        },
      },
    });

    const result = await handlers['green-goods-create-garden-pools']?.({});

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          lastPoolSyncAt: expect.any(String),
          lastTxHash: '0xpools',
        }),
      }),
    );
    expect(mocks.createGreenGoodsGardenPools).toHaveBeenCalledTimes(1);
  });

  it('submits work approvals and records the work approval timestamp', async () => {
    mocks.resolveScopedActionPayload.mockReturnValueOnce({
      ok: true,
      normalizedPayload: {
        coopId: 'coop-1',
        gardenAddress: '0xgarden',
        actionUid: 7,
        workUid: '0xwork',
        approved: true,
        feedback: 'Looks good.',
        confidence: 90,
        verificationMethod: 2,
        reviewNotesCid: 'ipfs://notes',
      },
    });
    mocks.submitGreenGoodsWorkApproval.mockResolvedValueOnce({
      txHash: '0xapproval',
      detail: 'Work approved.',
    });

    const handlers = buildGreenGoodsExecutors({
      bundle: makeBundle('green-goods-submit-work-approval'),
      trustedNodeContext: {
        ok: true,
        coop: currentCoop,
        member: { id: 'member-1', displayName: 'Ari' },
        authSession: {
          primaryAddress: '0x1111111111111111111111111111111111111111',
        },
      },
    });

    const result = await handlers['green-goods-submit-work-approval']?.({});

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          lastWorkApprovalAt: expect.any(String),
          lastTxHash: '0xapproval',
        }),
      }),
    );
    expect(mocks.submitGreenGoodsWorkApproval).toHaveBeenCalledTimes(1);
  });

  it('creates an assessment and records the latest assessment timestamp', async () => {
    mocks.resolveScopedActionPayload.mockReturnValueOnce({
      ok: true,
      normalizedPayload: {
        coopId: 'coop-1',
        gardenAddress: '0xgarden',
        title: 'Spring Assessment',
        description: 'Measure neighborhood food resilience.',
        assessmentConfigCid: 'ipfs://assessment-config',
        domain: 'food',
        startDate: 1_712_000_000,
        endDate: 1_713_000_000,
        location: 'Oakland',
      },
    });
    mocks.createGreenGoodsAssessment.mockResolvedValueOnce({
      txHash: '0xassessment',
      detail: 'Assessment created.',
    });

    const handlers = buildGreenGoodsExecutors({
      bundle: makeBundle('green-goods-create-assessment'),
      trustedNodeContext: {
        ok: true,
        coop: currentCoop,
        member: { id: 'member-1', displayName: 'Ari' },
        authSession: {
          primaryAddress: '0x1111111111111111111111111111111111111111',
        },
      },
    });

    const result = await handlers['green-goods-create-assessment']?.({});

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          lastAssessmentAt: expect.any(String),
          lastTxHash: '0xassessment',
        }),
      }),
    );
    expect(mocks.createGreenGoodsAssessment).toHaveBeenCalledTimes(1);
    expect(mocks.logPrivilegedAction).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'succeeded',
        detail: expect.stringContaining('Created Green Goods assessment'),
      }),
    );
  });

  it('syncs GAP admins from trusted coop members', async () => {
    mocks.resolveScopedActionPayload.mockReturnValueOnce({
      ok: true,
      normalizedPayload: {
        coopId: 'coop-1',
        gardenAddress: '0xgarden',
        addAdmins: ['0x1111111111111111111111111111111111111111'],
        removeAdmins: ['0x9999999999999999999999999999999999999999'],
      },
    });
    mocks.syncGreenGoodsGapAdmins.mockResolvedValueOnce({
      txHash: '0xadmins',
      detail: 'Admins synced.',
    });

    const handlers = buildGreenGoodsExecutors({
      bundle: makeBundle('green-goods-sync-gap-admins'),
      trustedNodeContext: {
        ok: true,
        coop: currentCoop,
        member: { id: 'member-1', displayName: 'Ari' },
        authSession: {
          primaryAddress: '0x1111111111111111111111111111111111111111',
        },
      },
    });

    const result = await handlers['green-goods-sync-gap-admins']?.({});

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          gapAdminAddresses: ['0x1111111111111111111111111111111111111111'],
          lastTxHash: '0xadmins',
        }),
      }),
    );
    expect(mocks.syncGreenGoodsGapAdmins).toHaveBeenCalledTimes(1);
  });

  it('mints a hypercert in mock mode without requiring archive delegation', async () => {
    mocks.resolveScopedActionPayload.mockReturnValueOnce({
      ok: true,
      normalizedPayload: {
        coopId: 'coop-1',
        gardenAddress: '0xgarden',
        title: 'Season 1 impact',
      },
    });
    mocks.mintGreenGoodsHypercert.mockResolvedValueOnce({
      txHash: '0xmint',
      detail: 'Hypercert minted.',
      hypercertId: 'hypercert-1',
      metadataUri: 'ipfs://metadata',
      allowlistUri: 'ipfs://allowlist',
    });

    const handlers = buildGreenGoodsExecutors({
      bundle: makeBundle('green-goods-mint-hypercert'),
      trustedNodeContext: {
        ok: true,
        coop: currentCoop,
        member: { id: 'member-1', displayName: 'Ari' },
        authSession: {
          primaryAddress: '0x1111111111111111111111111111111111111111',
        },
      },
    });

    const result = await handlers['green-goods-mint-hypercert']?.({});

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          lastHypercertId: 'hypercert-1',
          lastHypercertMetadataUri: 'ipfs://metadata',
          lastHypercertAllowlistUri: 'ipfs://allowlist',
        }),
      }),
    );
    expect(mocks.resolveArchiveConfigForCoop).not.toHaveBeenCalled();
    expect(mocks.mintGreenGoodsHypercert).toHaveBeenCalledWith(
      expect.objectContaining({
        uploader: undefined,
      }),
    );
  });

  it('builds a live archive-backed uploader before minting a hypercert in live mode', async () => {
    mocks.configuredOnchainMode = 'live';
    mocks.resolveScopedActionPayload.mockReturnValueOnce({
      ok: true,
      normalizedPayload: {
        coopId: 'coop-1',
        gardenAddress: '0xgarden',
        title: 'Season 2 impact',
      },
    });
    mocks.resolveArchiveConfigForCoop.mockResolvedValueOnce({
      spaceDid: 'did:key:space',
      delegationIssuer: 'did:key:issuer',
      gatewayBaseUrl: 'https://storacha.link',
      spaceDelegation: 'space-proof',
      proofs: [],
      allowsFilecoinInfo: false,
      expirationSeconds: 600,
    });
    mocks.createStorachaArchiveClient.mockResolvedValueOnce({
      did: () => 'did:key:audience',
      uploadFile: vi.fn(),
    });
    mocks.issueArchiveDelegation.mockResolvedValueOnce({
      delegationIssuer: 'did:key:issuer',
      issuerUrl: 'https://issuer.coop.test',
    });
    mocks.mintGreenGoodsHypercert.mockResolvedValueOnce({
      txHash: '0xmint-live',
      detail: 'Live Hypercert minted.',
      hypercertId: 'hypercert-live',
      metadataUri: 'ipfs://metadata-live',
      allowlistUri: 'ipfs://allowlist-live',
    });

    const handlers = buildGreenGoodsExecutors({
      bundle: makeBundle('green-goods-mint-hypercert'),
      trustedNodeContext: {
        ok: true,
        coop: currentCoop,
        member: { id: 'member-1', displayName: 'Ari' },
        authSession: {
          primaryAddress: '0x1111111111111111111111111111111111111111',
        },
      },
    });

    const result = await handlers['green-goods-mint-hypercert']?.({});

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          lastHypercertId: 'hypercert-live',
          lastHypercertMetadataUri: 'ipfs://metadata-live',
        }),
      }),
    );
    expect(mocks.createStorachaArchiveClient).toHaveBeenCalledTimes(1);
    expect(mocks.issueArchiveDelegation).toHaveBeenCalledTimes(1);
    expect(mocks.applyArchiveDelegationToClient).toHaveBeenCalledTimes(1);
    expect(mocks.mintGreenGoodsHypercert).toHaveBeenCalledWith(
      expect.objectContaining({
        uploader: expect.any(Function),
      }),
    );
  });

  it('uploads live hypercert metadata through the archive-backed uploader when minting invokes it', async () => {
    mocks.configuredOnchainMode = 'live';
    mocks.resolveScopedActionPayload.mockReturnValueOnce({
      ok: true,
      normalizedPayload: {
        coopId: 'coop-1',
        gardenAddress: '0xgarden',
        title: 'Season 3 impact',
      },
    });
    mocks.resolveArchiveConfigForCoop.mockResolvedValueOnce({
      spaceDid: 'did:key:space',
      delegationIssuer: 'did:key:issuer',
      gatewayBaseUrl: 'https://storacha.link',
      spaceDelegation: 'space-proof',
      proofs: [],
      allowsFilecoinInfo: false,
      expirationSeconds: 600,
    });
    const uploadFile = vi.fn(async () => ({
      toString: () => 'bafyuploaded',
    }));
    mocks.createStorachaArchiveClient.mockResolvedValueOnce({
      did: () => 'did:key:audience',
      uploadFile,
    });
    mocks.issueArchiveDelegation.mockResolvedValueOnce({
      delegationIssuer: 'did:key:issuer',
      issuerUrl: 'https://issuer.coop.test',
    });
    mocks.mintGreenGoodsHypercert.mockImplementationOnce(async ({ uploader }) => {
      const uploaded = await uploader?.({
        payload: { title: 'Season 3 impact', contributors: ['Ari'] },
      });
      return {
        txHash: '0xmint-upload',
        detail: 'Live Hypercert minted.',
        hypercertId: 'hypercert-upload',
        metadataUri: uploaded?.uri ?? 'ipfs://missing',
        allowlistUri: 'ipfs://allowlist-upload',
      };
    });

    const handlers = buildGreenGoodsExecutors({
      bundle: makeBundle('green-goods-mint-hypercert'),
      trustedNodeContext: {
        ok: true,
        coop: currentCoop,
        member: { id: 'member-1', displayName: 'Ari' },
        authSession: {
          primaryAddress: '0x1111111111111111111111111111111111111111',
        },
      },
    });

    const result = await handlers['green-goods-mint-hypercert']?.({});

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          lastHypercertId: 'hypercert-upload',
          lastHypercertMetadataUri: 'ipfs://bafyuploaded',
        }),
      }),
    );
    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(uploadFile.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
  });

  it('returns a typed failure when live hypercert minting cannot resolve archive config', async () => {
    mocks.configuredOnchainMode = 'live';
    mocks.resolveScopedActionPayload.mockReturnValueOnce({
      ok: true,
      normalizedPayload: {
        coopId: 'coop-1',
        gardenAddress: '0xgarden',
        title: 'Season 4 impact',
      },
    });
    mocks.resolveArchiveConfigForCoop.mockResolvedValueOnce(null);

    const handlers = buildGreenGoodsExecutors({
      bundle: makeBundle('green-goods-mint-hypercert'),
      trustedNodeContext: {
        ok: true,
        coop: currentCoop,
        member: { id: 'member-1', displayName: 'Ari' },
        authSession: {
          primaryAddress: '0x1111111111111111111111111111111111111111',
        },
      },
    });

    const result = await handlers['green-goods-mint-hypercert']?.({});

    expect(result).toEqual({
      ok: false,
      error:
        'A live archive config is required before Green Goods Hypercert packaging can execute.',
    });
    expect(mocks.logPrivilegedAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'green-goods-transaction',
        status: 'failed',
        detail: expect.stringContaining('Hypercert minting failed'),
      }),
    );
  });
});
