import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  loadAgentDashboardMock,
  loadDashboardMock,
  sendRuntimeMessageMock,
  setAgentDashboardMock,
  setMessageMock,
  subscribeMock,
  teardownMock,
  testState,
  unsubscribeMock,
  useSyncBindingsMock,
} = vi.hoisted(() => ({
  sendRuntimeMessageMock: vi.fn(),
  loadDashboardMock: vi.fn(async () => undefined),
  loadAgentDashboardMock: vi.fn(async () => undefined),
  setAgentDashboardMock: vi.fn(),
  setMessageMock: vi.fn(),
  subscribeMock: vi.fn(),
  teardownMock: vi.fn(),
  unsubscribeMock: vi.fn(),
  useSyncBindingsMock: vi.fn(),
  testState: {
    dashboard: {
      coops: [
        {
          profile: { id: 'coop-1', name: 'Field Coop' },
          members: [],
          artifacts: [],
          archiveReceipts: [],
        },
      ],
      activeCoopId: 'coop-1',
      summary: {
        localInferenceOptIn: true,
      },
      uiPreferences: {
        localInferenceOptIn: true,
      },
      operator: {
        policyActionQueue: [],
      },
    },
    agentDashboard: {
      manifests: [],
      skillRuns: [],
      memories: [],
    },
    actionPolicies: [],
    runtimeConfig: {
      privacyMode: 'on',
      sessionMode: 'mock',
      onchainMode: 'mock',
      archiveMode: 'mock',
      chainKey: 'sepolia',
      receiverAppUrl: 'https://receiver.test',
      signalingUrls: [],
    },
    activeCoop: {
      profile: { id: 'coop-1', name: 'Field Coop' },
      members: [],
      artifacts: [],
      archiveReceipts: [],
    },
  },
}));

vi.mock('../../../../runtime/messages', () => ({
  sendRuntimeMessage: sendRuntimeMessageMock,
}));

vi.mock('../../../../runtime/inference-bridge', () => ({
  InferenceBridge: class {
    subscribe = subscribeMock;
    setOptIn = vi.fn();
    teardown = teardownMock;
  },
}));

vi.mock('../useDashboard', () => ({
  useDashboard: () => ({
    dashboard: testState.dashboard,
    agentDashboard: testState.agentDashboard,
    setAgentDashboard: setAgentDashboardMock,
    actionPolicies: testState.actionPolicies,
    runtimeConfig: testState.runtimeConfig,
    activeCoop: testState.activeCoop,
    soundPreferences: { enabled: true },
    authSession: null,
    activeMember: null,
    hasTrustedNodeAccess: true,
    visibleReceiverPairings: [],
    activeReceiverPairing: null,
    activeReceiverPairingStatus: null,
    activeReceiverProtocolLink: null,
    receiverIntake: [],
    visibleDrafts: [],
    archiveStory: null,
    archiveReceipts: [],
    refreshableArchiveReceipts: [],
    browserUxCapabilities: {
      canSaveFile: false,
    },
    boardUrl: undefined,
    message: '',
    setMessage: setMessageMock,
    pairingResult: null,
    setPairingResult: vi.fn(),
    loadDashboard: loadDashboardMock,
    loadAgentDashboard: loadAgentDashboardMock,
    updateUiPreferences: vi.fn(async () => null),
    configuredSignalingUrls: [],
    configuredReceiverAppUrl: 'https://receiver.test',
  }),
}));

vi.mock('../useCoopForm', () => ({
  useCoopForm: () => ({}),
}));

vi.mock('../useDraftEditor', () => ({
  useDraftEditor: () => ({}),
}));

vi.mock('../useSyncBindings', () => ({
  useSyncBindings: useSyncBindingsMock,
}));

vi.mock('../useTabCapture', () => ({
  useTabCapture: () => ({}),
}));

vi.mock('../useSidepanelActions', () => ({
  useSidepanelActions: () => ({}),
}));

vi.mock('../useSidepanelAgent', () => ({
  useSidepanelAgent: () => ({}),
}));

vi.mock('../useSidepanelCoopManagement', () => ({
  useSidepanelCoopManagement: () => ({}),
}));

vi.mock('../useSidepanelDrafts', () => ({
  useSidepanelDrafts: () => ({}),
}));

vi.mock('../useSidepanelGreenGoods', () => ({
  useSidepanelGreenGoods: () => ({}),
}));

vi.mock('../useSidepanelInvites', () => ({
  useSidepanelInvites: () => ({}),
}));

vi.mock('../useSidepanelPermissions', () => ({
  useSidepanelPermissions: () => ({}),
}));

const { useSidepanelOrchestration } = await import('../useSidepanelOrchestration');

describe('useSidepanelOrchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscribeMock.mockReturnValue(unsubscribeMock);
    sendRuntimeMessageMock.mockResolvedValue({ ok: true, data: 'st:meta:addr' });
  });

  it('manages inference bridge lifecycle and sync binding wiring', async () => {
    const { result, unmount } = renderHook(() => useSidepanelOrchestration(vi.fn()));

    await waitFor(() => {
      expect(subscribeMock).toHaveBeenCalledTimes(1);
    });

    expect(useSyncBindingsMock).toHaveBeenCalledWith({
      coops: testState.dashboard.coops,
      loadDashboard: loadDashboardMock,
    });
    expect(result.current.inferenceState).toBeNull();

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    expect(teardownMock).toHaveBeenCalledTimes(1);
  });

  it('fetches a stealth meta-address when privacy mode is on for the active coop', async () => {
    const { result } = renderHook(() => useSidepanelOrchestration(vi.fn()));

    await waitFor(() => {
      expect(result.current.stealthMetaAddress).toBe('st:meta:addr');
    });

    expect(sendRuntimeMessageMock).toHaveBeenCalledWith({
      type: 'get-stealth-meta-address',
      payload: { coopId: 'coop-1' },
    });
  });
});
