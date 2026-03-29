import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Chrome API mock ---

beforeEach(() => {
  Object.assign(globalThis, {
    chrome: {
      alarms: { clear: vi.fn(), create: vi.fn() },
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  Reflect.deleteProperty(globalThis, 'chrome');
});

// --- Mocks ---

vi.mock('@coop/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@coop/shared')>();
  return {
    ...actual,
    getAuthSession: vi.fn().mockResolvedValue({
      displayName: 'Mina',
      primaryAddress: '0x1111111111111111111111111111111111111111',
      passkey: {
        credentialId: 'credential-1',
        rpId: 'coop.test',
        publicKey: 'public-key',
        counter: 0,
      },
    }),
    deployCoopSafe: vi.fn(),
  };
});

vi.mock('../../context', () => ({
  db: {
    settings: { get: vi.fn(), put: vi.fn() },
    coopDocs: { toArray: vi.fn().mockResolvedValue([]) },
    privacyIdentities: { get: vi.fn(), put: vi.fn() },
    stealthKeyPairs: { get: vi.fn(), put: vi.fn() },
  },
  getCoops: vi.fn().mockResolvedValue([]),
  saveState: vi.fn(),
  setLocalSetting: vi.fn(),
  stateKeys: {
    activeCoopId: 'active-coop-id',
    captureMode: 'capture-mode',
  },
  syncCaptureAlarm: vi.fn(),
  configuredChain: 'sepolia',
  configuredOnchainMode: 'live',
  notifyExtensionEvent: vi.fn(),
  ensureReceiverSyncOffscreenDocument: vi.fn(),
}));

vi.mock('../../dashboard', () => ({
  refreshBadge: vi.fn(),
}));

vi.mock('../../operator', () => ({
  getOperatorState: vi.fn().mockResolvedValue({
    authSession: null,
    anchorCapability: null,
    anchorStatus: {
      enabled: false,
      active: false,
      detail:
        'Anchor mode is off. Live archive, Safe actions, and archive follow-up stay disabled.',
    },
    liveOnchain: {
      available: false,
      detail:
        'Live Safe deployments are unavailable because anchor mode is off for this member context.',
    },
    activeCoop: undefined,
    activeMember: undefined,
  }),
  logPrivilegedAction: vi.fn(),
}));

vi.mock('../agent', () => ({
  emitAgentObservationIfMissing: vi.fn(),
  requestAgentCycle: vi.fn(),
  ensureOnboardingBurst: vi.fn().mockResolvedValue(undefined),
}));

const { handleCreateCoop, handleJoinCoop, handleResolveOnchainState, handleSetAnchorMode } =
  await import('../coop');
const { saveState, setLocalSetting } = await import('../../context');
const { getOperatorState, logPrivilegedAction } = await import('../../operator');
const { ensureOnboardingBurst } = await import('../agent');
const shared = await import('@coop/shared');

describe('coop handlers', () => {
  it('creates a coop with valid input and persists state', async () => {
    const result = await handleCreateCoop({
      type: 'create-coop',
      payload: {
        coopName: 'Test Coop',
        purpose: 'A coop created by handler tests to validate the create flow.',
        creatorDisplayName: 'Mina',
        captureMode: 'manual',
        seedContribution: 'I bring handler testing context and local-first patterns.',
        setupInsights: {
          summary: 'This coop needs a shared place for governance, evidence, and funding leads.',
          crossCuttingPainPoints: ['Knowledge is fragmented across tools and people'],
          crossCuttingOpportunities: ['Members can publish cleaner shared artifacts for the group'],
          lenses: [
            {
              lens: 'capital-formation',
              currentState: 'Funding links live in chat channels and get lost quickly.',
              painPoints: 'No shared memory for grant leads or funding rounds.',
              improvements: 'Capture leads into a structured coop feed.',
            },
            {
              lens: 'impact-reporting',
              currentState: 'Metrics are gathered manually before each report.',
              painPoints: 'Evidence arrives late and is often incomplete.',
              improvements: 'Collect evidence steadily from daily work.',
            },
            {
              lens: 'governance-coordination',
              currentState: 'Calls and decisions are spread across many tools.',
              painPoints: 'Follow-up items slip after calls end.',
              improvements: 'Keep next steps visible in a shared review queue.',
            },
            {
              lens: 'knowledge-garden-resources',
              currentState: 'Resources sit in individual browser tab sessions.',
              painPoints: 'People repeat research that others have already done.',
              improvements: 'Turn captured tabs into shared references for the coop.',
            },
          ],
        },
      },
    });

    expect(result.ok).toBe(true);
    expect(result.soundEvent).toBeDefined();
    expect(vi.mocked(saveState)).toHaveBeenCalled();
    expect(vi.mocked(setLocalSetting)).toHaveBeenCalledWith('active-coop-id', expect.any(String));
    expect(vi.mocked(ensureOnboardingBurst)).toHaveBeenCalledWith({
      coopId: expect.any(String),
      memberId: expect.any(String),
      reason: 'coop-create-first',
    });
  });

  it('returns a deferred live onchain state when anchor mode is off', async () => {
    vi.stubEnv('VITE_PIMLICO_API_KEY', 'pim_test_key');
    vi.mocked(getOperatorState).mockResolvedValueOnce({
      authSession: {
        displayName: 'Mina',
        primaryAddress: '0x1111111111111111111111111111111111111111',
      },
      anchorCapability: null,
      anchorStatus: {
        enabled: false,
        active: false,
        detail:
          'Anchor mode is off. Live archive, Safe actions, and archive follow-up stay disabled.',
      },
      liveOnchain: {
        available: false,
        detail:
          'Live Safe deployments are unavailable because anchor mode is off for this member context.',
      },
      activeCoop: undefined,
      activeMember: undefined,
      actionLog: [],
      activeContext: {
        activeCoopId: undefined,
        activeMemberId: undefined,
      },
      liveArchive: {
        available: false,
        detail:
          'Live archive uploads are unavailable because anchor mode is off for this member context.',
      },
    });

    const result = await handleResolveOnchainState({
      type: 'resolve-onchain-state',
      payload: { coopSeed: 'coop-seed' },
    });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      safeCapability: 'unavailable',
      senderAddress: '0x1111111111111111111111111111111111111111',
    });
    expect(result.data?.statusNote).toContain('pending until anchor mode is enabled on this node');
    expect(vi.mocked(shared.deployCoopSafe)).not.toHaveBeenCalled();
    expect(vi.mocked(logPrivilegedAction)).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'safe-deployment',
        status: 'failed',
      }),
    );
  });

  it('rejects anchor mode toggle when no auth session exists', async () => {
    const result = await handleSetAnchorMode({
      type: 'set-anchor-mode',
      payload: { enabled: true },
    });

    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining('authenticated passkey'),
    });
  });

  it('rejects joining with a malformed invite code', async () => {
    await expect(
      handleJoinCoop({
        type: 'join-coop',
        payload: {
          inviteCode: 'not-a-valid-invite',
          displayName: 'Ari',
          seedContribution: 'I bring field notes from the companion app.',
        },
      }),
    ).rejects.toThrow();
  });
});
