/**
 * Shared test factories for popup integration tests.
 *
 * Extracted from PopupApp.test.tsx to enable reuse across view tests.
 * Pattern: message-passing mocks + dashboard factory + snapshot hydration.
 */
import type { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Data factories
// ---------------------------------------------------------------------------

export function makeDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: 'draft-1',
    interpretationId: 'interp-1',
    extractId: 'extract-1',
    sourceCandidateId: 'candidate-1',
    title: 'River restoration lead',
    summary: 'A rounded-up draft that still needs quick review.',
    whyItMatters: 'Important context.',
    suggestedNextStep: 'Review and share.',
    category: 'opportunity',
    confidence: 0.62,
    rationale: 'Captured from a relevant tab.',
    tags: [],
    previewImageUrl: 'https://example.com/preview.png',
    sources: [
      {
        label: 'Example',
        url: 'https://example.com/article',
        domain: 'example.com',
      },
    ],
    createdAt: new Date('2026-03-17T12:00:00.000Z').toISOString(),
    createdBy: 'member-1',
    reviewStatus: 'draft',
    workflowStage: 'candidate',
    suggestedTargetCoopIds: ['coop-1'],
    provenance: {
      type: 'tab-candidate',
      candidateId: 'candidate-1',
    },
    archiveStatus: 'not-archived',
    archiveReceiptIds: [],
    ...overrides,
  };
}

export function makeArtifact(overrides: Record<string, unknown> = {}) {
  return {
    id: 'artifact-1',
    originId: 'origin-1',
    targetCoopId: 'coop-1',
    title: 'Shared watershed note',
    summary: 'A published artifact in the feed.',
    sources: [
      {
        label: 'Example',
        url: 'https://example.com/article',
        domain: 'example.com',
      },
    ],
    tags: ['shared'],
    category: 'note',
    whyItMatters: 'It helps the coop stay aligned on the latest research.',
    suggestedNextStep: 'Open the note, skim the summary, and decide what to share next.',
    previewImageUrl: 'https://example.com/artifact.png',
    createdBy: 'member-1',
    createdAt: new Date('2026-03-17T11:45:00.000Z').toISOString(),
    reviewStatus: 'approved',
    archiveStatus: 'not-archived',
    archiveReceiptIds: [],
    ...overrides,
  };
}

export function makeDashboard(overrides: Record<string, unknown> = {}) {
  return {
    coops: [
      {
        profile: {
          id: 'coop-1',
          name: 'Starter Coop',
          purpose: 'Coordinate local research',
          captureMode: 'manual',
        },
        members: [
          {
            id: 'member-1',
            displayName: 'Ava',
            address: '0x1234567890abcdef1234567890abcdef12345678',
          },
        ],
        artifacts: [makeArtifact()],
      },
    ],
    activeCoopId: 'coop-1',
    coopBadges: [
      {
        coopId: 'coop-1',
        coopName: 'Starter Coop',
        pendingDrafts: 0,
        routedTabs: 0,
        insightDrafts: 0,
        artifactCount: 1,
        pendingActions: 0,
        pendingAttentionCount: 0,
      },
    ],
    drafts: [],
    candidates: [],
    tabRoutings: [],
    proactiveSignals: [],
    summary: {
      iconState: 'ready',
      iconLabel: 'Synced',
      pendingDrafts: 0,
      routedTabs: 0,
      insightDrafts: 0,
      pendingActions: 0,
      staleObservationCount: 0,
      pendingAttentionCount: 0,
      coopCount: 1,
      syncState: 'Peer-ready local-first sync',
      syncLabel: 'Healthy',
      syncDetail: 'Peer-ready local-first sync.',
      syncTone: 'ok',
      lastCaptureAt: new Date('2026-03-17T11:50:00.000Z').toISOString(),
      captureMode: 'manual',
      agentCadenceMinutes: 64,
      localEnhancement: 'Heuristics-first fallback',
      localInferenceOptIn: true,
      activeCoopId: 'coop-1',
      pendingOutboxCount: 0,
    },
    soundPreferences: {
      enabled: true,
      reducedMotion: false,
      reducedSound: false,
    },
    uiPreferences: {
      notificationsEnabled: true,
      localInferenceOptIn: true,
      preferredExportMethod: 'download',
      heartbeatEnabled: true,
      agentCadenceMinutes: 64,
      excludedCategories: [],
      customExcludedDomains: [],
      captureOnClose: false,
    },
    authSession: {
      primaryAddress: '0x1234567890abcdef1234567890abcdef12345678',
    },
    identities: [],
    receiverPairings: [],
    receiverIntake: [],
    runtimeConfig: {
      chainKey: 'sepolia',
      onchainMode: 'mock',
      archiveMode: 'mock',
      sessionMode: 'mock',
      providerMode: 'rpc',
      privacyMode: 'off',
      receiverAppUrl: 'http://localhost:3000',
      signalingUrls: [],
    },
    operator: {
      anchorCapability: null,
      anchorActive: false,
      anchorDetail: '',
      actionLog: [],
      archiveMode: 'mock',
      onchainMode: 'mock',
      liveArchiveAvailable: false,
      liveArchiveDetail: '',
      liveOnchainAvailable: false,
      liveOnchainDetail: '',
      policyActionQueue: [],
      policyActionLogEntries: [],
      permits: [],
      permitLog: [],
      sessionCapabilities: [],
      sessionCapabilityLog: [],
    },
    recentCaptureRuns: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Runtime handler installer
// ---------------------------------------------------------------------------

/**
 * Install a mock `sendRuntimeMessage` implementation that handles the standard
 * popup message types (get-dashboard, sidepanel state, capture, coop switching,
 * preferences). Returns a mutable dashboard that updates on set-active-coop and
 * set-*-preferences messages.
 */
export function installDefaultRuntimeHandlers(
  mockSendRuntimeMessage: ReturnType<typeof vi.fn>,
  dashboard = makeDashboard(),
) {
  let currentDashboard = dashboard;

  mockSendRuntimeMessage.mockImplementation(
    async (message: { type: string; payload?: unknown }) => {
      if (message.type === 'get-dashboard') {
        return { ok: true, data: currentDashboard };
      }
      if (message.type === 'get-sidepanel-state') {
        return { ok: true, data: { open: false, canClose: true } };
      }
      if (message.type === 'manual-capture') {
        return { ok: true, data: 2 };
      }
      if (message.type === 'capture-active-tab') {
        return { ok: true, data: 1 };
      }
      if (message.type === 'prepare-visible-screenshot') {
        return {
          ok: true,
          data: {
            kind: 'photo',
            dataBase64: btoa('image-data'),
            mimeType: 'image/png',
            fileName: 'coop-screenshot.png',
            title: 'Page screenshot',
            note: 'Captured from https://example.com via Extension Browser.',
            sourceUrl: 'https://example.com',
          },
        };
      }
      if (message.type === 'save-popup-capture') {
        return { ok: true, data: { id: 'capture-1' } };
      }
      if (message.type === 'toggle-sidepanel') {
        return { ok: true, data: { open: true, canClose: true } };
      }
      if (message.type === 'set-active-coop') {
        currentDashboard = {
          ...currentDashboard,
          activeCoopId: (message.payload as { coopId: string }).coopId,
        };
        return { ok: true };
      }
      if (message.type === 'set-ui-preferences') {
        currentDashboard = {
          ...currentDashboard,
          uiPreferences: {
            ...currentDashboard.uiPreferences,
            ...(message.payload as object),
          },
        };
        return { ok: true, data: currentDashboard.uiPreferences };
      }
      if (message.type === 'set-sound-preferences') {
        currentDashboard = {
          ...currentDashboard,
          soundPreferences: {
            ...currentDashboard.soundPreferences,
            ...(message.payload as object),
          },
        };
        return { ok: true, data: undefined };
      }
      return { ok: true };
    },
  );
}
