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

function makeInviteCode(
  coopId: string,
  coopName: string,
  inviteType: 'member' | 'trusted',
  createdBy: string,
  code: string,
) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return {
    id: `${inviteType}-invite-${code}`,
    type: inviteType,
    status: 'active',
    code,
    expiresAt,
    createdAt: new Date().toISOString(),
    createdBy,
    usedByMemberIds: [],
    bootstrap: {
      coopId,
      coopDisplayName: coopName,
      inviteId: `${inviteType}-invite-${code}`,
      inviteType,
      expiresAt,
      roomId: `room-${coopId}`,
      signalingUrls: [],
      inviteProof: `proof-${code}`,
    },
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
            role: 'creator',
            address: '0x1234567890abcdef1234567890abcdef12345678',
            authMode: 'passkey',
            joinedAt: '2026-03-17T10:00:00.000Z',
          },
        ],
        artifacts: [makeArtifact()],
        invites: [],
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
      authMode: 'passkey',
      displayName: 'Ava',
      primaryAddress: '0x1234567890abcdef1234567890abcdef12345678',
      createdAt: '2026-03-17T10:00:00.000Z',
      identityWarning: 'Device bound.',
      passkey: {
        id: 'passkey-1',
        publicKey: '0x1234',
        rpId: 'coop.test',
      },
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
  let coopIndex = currentDashboard.coops.length + 1;
  let inviteIndex = 1;

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
      if (message.type === 'resolve-onchain-state') {
        return {
          ok: true,
          data: {
            safeAddress: '0x1111111111111111111111111111111111111111',
            chainKey: 'sepolia',
            statusNote: 'Ready',
            mode: 'mock',
          },
        };
      }
      if (message.type === 'create-coop') {
        const payload = message.payload as {
          coopName: string;
          purpose: string;
          captureMode: 'manual' | 'automatic';
          creator: {
            id: string;
            displayName: string;
            role: 'creator';
            address: string;
            authMode?: 'passkey' | 'mock' | 'wallet';
            joinedAt?: string;
          };
          onchainState: {
            safeAddress: string;
            chainKey: 'sepolia' | 'arbitrum';
            statusNote: string;
            mode: 'mock' | 'live';
          };
        };
        const coopId = `coop-${coopIndex}`;
        coopIndex += 1;
        const nextCoop = {
          profile: {
            id: coopId,
            name: payload.coopName,
            purpose: payload.purpose,
            captureMode: payload.captureMode,
          },
          members: [payload.creator],
          artifacts: [],
          invites: [
            makeInviteCode(
              coopId,
              payload.coopName,
              'member',
              payload.creator.id,
              `COOP-MEMBER-${inviteIndex++}`,
            ),
            makeInviteCode(
              coopId,
              payload.coopName,
              'trusted',
              payload.creator.id,
              `COOP-TRUSTED-${inviteIndex++}`,
            ),
          ],
          onchainState: payload.onchainState,
        };
        currentDashboard = {
          ...currentDashboard,
          coops: [...currentDashboard.coops, nextCoop],
          activeCoopId: coopId,
          summary: {
            ...currentDashboard.summary,
            activeCoopId: coopId,
            coopCount: currentDashboard.coops.length + 1,
          },
        };
        return { ok: true, data: nextCoop };
      }
      if (message.type === 'ensure-invite-codes') {
        const payload = message.payload as {
          coopId: string;
          createdBy: string;
          inviteTypes?: Array<'member' | 'trusted'>;
        };
        const inviteTypes = payload.inviteTypes ?? ['member', 'trusted'];
        currentDashboard = {
          ...currentDashboard,
          coops: currentDashboard.coops.map((coop) => {
            if (coop.profile.id !== payload.coopId) {
              return coop;
            }
            const nextInvites = [...(coop.invites ?? [])];
            for (const inviteType of inviteTypes) {
              const hasHistory = nextInvites.some((invite) => invite.type === inviteType);
              if (!hasHistory) {
                nextInvites.push(
                  makeInviteCode(
                    coop.profile.id,
                    coop.profile.name,
                    inviteType,
                    payload.createdBy,
                    `COOP-${inviteType.toUpperCase()}-${inviteIndex++}`,
                  ),
                );
              }
            }
            return {
              ...coop,
              invites: nextInvites,
            };
          }),
        };
        return { ok: true };
      }
      if (message.type === 'regenerate-invite-code') {
        const payload = message.payload as {
          coopId: string;
          inviteType: 'member' | 'trusted';
          createdBy: string;
        };
        let regenerated = null;
        currentDashboard = {
          ...currentDashboard,
          coops: currentDashboard.coops.map((coop) => {
            if (coop.profile.id !== payload.coopId) {
              return coop;
            }
            regenerated = makeInviteCode(
              coop.profile.id,
              coop.profile.name,
              payload.inviteType,
              payload.createdBy,
              `COOP-${payload.inviteType.toUpperCase()}-${inviteIndex++}`,
            );
            return {
              ...coop,
              invites: [
                ...(coop.invites ?? []).map((invite) =>
                  invite.type === payload.inviteType && invite.status !== 'revoked'
                    ? {
                        ...invite,
                        status: 'revoked',
                        revokedBy: payload.createdBy,
                        revokedAt: new Date().toISOString(),
                      }
                    : invite,
                ),
                regenerated,
              ],
            };
          }),
        };
        return { ok: true, data: regenerated };
      }
      if (message.type === 'revoke-invite-type') {
        const payload = message.payload as {
          coopId: string;
          inviteType: 'member' | 'trusted';
          revokedBy: string;
        };
        currentDashboard = {
          ...currentDashboard,
          coops: currentDashboard.coops.map((coop) =>
            coop.profile.id === payload.coopId
              ? {
                  ...coop,
                  invites: (coop.invites ?? []).map((invite) =>
                    invite.type === payload.inviteType && invite.status !== 'revoked'
                      ? {
                          ...invite,
                          status: 'revoked',
                          revokedBy: payload.revokedBy,
                          revokedAt: new Date().toISOString(),
                        }
                      : invite,
                  ),
                }
              : coop,
          ),
        };
        return { ok: true, data: null };
      }
      return { ok: true };
    },
  );
}
