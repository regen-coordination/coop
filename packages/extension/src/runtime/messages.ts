import type {
  ArchiveReceipt,
  Artifact,
  AuthSession,
  CaptureMode,
  CoopSharedState,
  ExtensionIconState,
  InviteType,
  LocalPasskeyIdentity,
  Member,
  OnchainState,
  ReviewDraft,
  SoundEvent,
  SoundPreferences,
  TabCandidate,
} from '@coop/shared';

export interface RuntimeSummary {
  iconState: ExtensionIconState;
  iconLabel: string;
  pendingDrafts: number;
  coopCount: number;
  syncState: string;
  lastCaptureAt?: string;
  captureMode: CaptureMode;
  localEnhancement: string;
  activeCoopId?: string;
}

export interface DashboardResponse {
  coops: CoopSharedState[];
  activeCoopId?: string;
  drafts: ReviewDraft[];
  candidates: TabCandidate[];
  summary: RuntimeSummary;
  soundPreferences: SoundPreferences;
  authSession?: AuthSession | null;
  identities: LocalPasskeyIdentity[];
}

export type RuntimeRequest =
  | { type: 'get-auth-session' }
  | { type: 'set-auth-session'; payload: AuthSession | null }
  | { type: 'get-dashboard' }
  | { type: 'manual-capture' }
  | {
      type: 'create-coop';
      payload: {
        coopName: string;
        purpose: string;
        creatorDisplayName: string;
        captureMode: CaptureMode;
        seedContribution: string;
        setupInsights: unknown;
        signalingUrls?: string[];
        creator?: Member;
        onchainState?: OnchainState;
      };
    }
  | {
      type: 'create-invite';
      payload: { coopId: string; inviteType: InviteType; createdBy: string };
    }
  | {
      type: 'join-coop';
      payload: {
        inviteCode: string;
        displayName: string;
        seedContribution: string;
        member?: Member;
      };
    }
  | {
      type: 'publish-draft';
      payload: {
        draft: ReviewDraft;
        targetCoopIds: string[];
        actorId: string;
      };
    }
  | {
      type: 'archive-artifact';
      payload: { coopId: string; artifactId: string };
    }
  | {
      type: 'archive-snapshot';
      payload: { coopId: string };
    }
  | { type: 'export-snapshot'; payload: { coopId: string; format: 'json' | 'text' } }
  | {
      type: 'export-artifact';
      payload: { coopId: string; artifactId: string; format: 'json' | 'text' };
    }
  | {
      type: 'export-receipt';
      payload: { coopId: string; receiptId: string; format: 'json' | 'text' };
    }
  | { type: 'set-sound-preferences'; payload: SoundPreferences }
  | { type: 'set-capture-mode'; payload: { captureMode: CaptureMode } }
  | { type: 'set-active-coop'; payload: { coopId: string } }
  | { type: 'persist-coop-state'; payload: { state: CoopSharedState } }
  | { type: 'report-sync-health'; payload: { syncError: boolean; note?: string } };

export interface RuntimeActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  soundEvent?: SoundEvent;
}

export async function sendRuntimeMessage<T = unknown>(message: RuntimeRequest) {
  return chrome.runtime.sendMessage(message) as Promise<RuntimeActionResponse<T>>;
}
