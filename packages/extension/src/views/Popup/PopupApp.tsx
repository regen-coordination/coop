import type { Artifact, ReviewDraft, SoundPreferences, UiPreferences } from '@coop/shared';
import { useEffect, useMemo, useState } from 'react';
import { type PopupSidepanelState, sendRuntimeMessage } from '../../runtime/messages';
import { useCaptureActions } from '../shared/useCaptureActions';
import { useCoopActions } from '../shared/useCoopActions';
import { useQuickDraftActions } from '../shared/useQuickDraftActions';
import { PopupArtifactDialog } from './PopupArtifactDialog';
import { PopupCoopsScreen } from './PopupCoopsScreen';
import { PopupCreateCoopScreen } from './PopupCreateCoopScreen';
import { PopupDraftDetailScreen } from './PopupDraftDetailScreen';
import { PopupDraftListScreen } from './PopupDraftListScreen';
import { PopupFeedScreen } from './PopupFeedScreen';
import { PopupFooterNav } from './PopupFooterNav';
import { PopupHeader } from './PopupHeader';
import { PopupHomeScreen } from './PopupHomeScreen';
import { PopupJoinCoopScreen } from './PopupJoinCoopScreen';
import { PopupNoCoopScreen } from './PopupNoCoopScreen';
import { PopupSettingsScreen } from './PopupSettingsScreen';
import { PopupShell } from './PopupShell';
import { usePopupDashboard } from './hooks/usePopupDashboard';
import { usePopupNavigation } from './hooks/usePopupNavigation';
import { usePopupTheme } from './hooks/usePopupTheme';
import type {
  PopupFeedArtifactItem,
  PopupFooterTab,
  PopupHomeQueueItem,
  PopupScreen,
} from './popup-types';

type PopupSidepanelApi = typeof chrome.sidePanel & {
  close?: (options: { windowId?: number; tabId?: number }) => Promise<void>;
};

function formatRelativeTime(timestamp?: string) {
  if (!timestamp) {
    return 'Never';
  }

  const elapsed = Date.now() - new Date(timestamp).getTime();
  if (Number.isNaN(elapsed) || elapsed < 0) {
    return 'Just now';
  }

  const minutes = Math.round(elapsed / 60000);
  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatCoopLabel(targetCoopIds: string[], coopLabels: Map<string, string>) {
  const labels = targetCoopIds
    .map((coopId) => coopLabels.get(coopId))
    .filter((value): value is string => Boolean(value));

  if (labels.length === 0) {
    return 'This coop';
  }

  if (labels.length === 1) {
    return labels[0];
  }

  return `${labels[0]} +${labels.length - 1}`;
}

function toHomeQueueItems(input: {
  drafts: ReviewDraft[];
  coops: Array<{ id: string; name: string }>;
}): PopupHomeQueueItem[] {
  const coopLabels = new Map(input.coops.map((coop) => [coop.id, coop.name]));

  return input.drafts.slice(0, 3).map((draft) => ({
    id: draft.id,
    title: draft.title,
    summary: draft.summary,
    previewImageUrl: draft.previewImageUrl,
    category: draft.category,
    coopLabel: formatCoopLabel(draft.suggestedTargetCoopIds, coopLabels),
    workflowStage: draft.workflowStage,
  }));
}

function toFeedItems(input: {
  artifacts: Artifact[];
  coopLabel: string;
}): PopupFeedArtifactItem[] {
  return input.artifacts.map((artifact) => ({
    ...artifact,
    coopLabel: input.coopLabel,
  }));
}

function isCompatibilitySidepanelError(error?: string) {
  const normalized = error?.toLowerCase() ?? '';
  return (
    normalized.includes('unknown message') ||
    normalized.includes('receiving end does not exist') ||
    normalized.includes('could not establish connection') ||
    normalized.includes('message port closed')
  );
}

function popupSyncStatus(input: {
  syncLabel?: string;
  syncState?: string;
  syncDetail?: string;
  syncTone?: 'ok' | 'warning' | 'error';
  dashboardError?: string;
}) {
  const detail =
    input.syncDetail || input.syncState || input.dashboardError || 'Checking sync status.';
  const normalized = detail.toLowerCase();

  if (!input.syncLabel && !input.syncTone) {
    if (input.dashboardError) {
      return {
        label: 'Error',
        detail: input.dashboardError,
        tone: 'error' as const,
      };
    }

    return {
      label: 'Checking',
      detail: 'Checking sync status.',
      tone: 'ok' as const,
    };
  }

  if (input.syncTone === 'error') {
    return {
      label: 'Error',
      detail,
      tone: 'error' as const,
    };
  }

  if (
    normalized.includes('limited to this browser profile') ||
    normalized.includes('no signaling server connection')
  ) {
    return {
      label: 'Local',
      detail,
      tone: 'warning' as const,
    };
  }

  if (normalized.includes('offline')) {
    return {
      label: 'Offline',
      detail,
      tone: 'warning' as const,
    };
  }

  if (input.syncTone === 'warning') {
    return {
      label: input.syncLabel === 'Healthy' ? 'Degraded' : input.syncLabel || 'Degraded',
      detail,
      tone: 'warning' as const,
    };
  }

  return {
    label: 'Healthy',
    detail,
    tone: 'ok' as const,
  };
}

export function PopupApp() {
  const navigation = usePopupNavigation();
  const theme = usePopupTheme();
  const {
    dashboard,
    loading,
    dashboardError,
    loadDashboard,
    activeCoop,
    visibleDrafts,
    recentArtifacts,
  } = usePopupDashboard();
  const [message, setMessage] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftEdits, setDraftEdits] = useState<Record<string, ReviewDraft>>({});
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [settingsReturnScreen, setSettingsReturnScreen] = useState<PopupScreen>('home');
  const [workspaceState, setWorkspaceState] = useState<PopupSidepanelState>({
    open: false,
    canClose: false,
  });

  useEffect(() => {
    if (dashboardError) {
      setMessage(dashboardError);
    }
  }, [dashboardError]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const captureActions = useCaptureActions({
    setMessage,
    loadDashboard,
    afterManualCapture: () => navigation.navigate('drafts'),
    afterActiveTabCapture: () => navigation.navigate('drafts'),
  });

  const coopActions = useCoopActions({
    setMessage,
    loadDashboard,
    soundPreferences: dashboard?.soundPreferences ?? ({ enabled: false } as SoundPreferences),
    configuredSignalingUrls: dashboard?.runtimeConfig.signalingUrls ?? [],
  });

  const quickDraftActions = useQuickDraftActions({
    setMessage,
    loadDashboard,
    soundPreferences: dashboard?.soundPreferences ?? ({ enabled: false } as SoundPreferences),
  });

  const currentScreen =
    !activeCoop && !['create', 'join', 'settings'].includes(navigation.state.screen)
      ? 'no-coop'
      : navigation.state.screen;

  const selectedDraftBase = useMemo(
    () => visibleDrafts.find((draft) => draft.id === navigation.state.selectedDraftId) ?? null,
    [navigation.state.selectedDraftId, visibleDrafts],
  );

  const selectedDraft = selectedDraftBase
    ? (draftEdits[selectedDraftBase.id] ?? selectedDraftBase)
    : null;

  useEffect(() => {
    if (navigation.state.screen === 'draft-detail' && !selectedDraftBase) {
      navigation.navigate(activeCoop ? 'drafts' : 'home');
    }
  }, [activeCoop, navigation, selectedDraftBase]);

  useEffect(() => {
    if (currentScreen !== 'feed' && selectedArtifactId) {
      setSelectedArtifactId(null);
    }
  }, [currentScreen, selectedArtifactId]);

  const homeQueueItems = useMemo(
    () =>
      toHomeQueueItems({
        drafts: visibleDrafts,
        coops:
          dashboard?.coops.map((coop) => ({ id: coop.profile.id, name: coop.profile.name })) ?? [],
      }),
    [dashboard?.coops, visibleDrafts],
  );
  const feedArtifacts = useMemo(() => {
    const activeCoopLabel = activeCoop?.profile.name ?? 'This coop';
    return toFeedItems({
      artifacts: recentArtifacts,
      coopLabel: activeCoopLabel,
    });
  }, [activeCoop?.profile.name, recentArtifacts]);
  const selectedArtifact = useMemo(
    () => feedArtifacts.find((artifact) => artifact.id === selectedArtifactId) ?? null,
    [feedArtifacts, selectedArtifactId],
  );
  const otherCoopsAttentionCount = useMemo(
    () =>
      dashboard?.coopBadges
        .filter((badge) => badge.coopId !== dashboard.activeCoopId)
        .reduce((total, badge) => total + badge.pendingAttentionCount, 0) ?? 0,
    [dashboard?.activeCoopId, dashboard?.coopBadges],
  );
  const homePrimaryActionLabel = visibleDrafts.length > 0 ? 'Review' : 'Round up';

  async function resolveCurrentWindowId() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab?.windowId ?? null;
    } catch {
      return null;
    }
  }

  function getSidepanelApi() {
    return chrome.sidePanel as PopupSidepanelApi;
  }

  function updateWorkspaceFallbackState(open: boolean) {
    setWorkspaceState({
      open,
      canClose: typeof getSidepanelApi().close === 'function',
    });
  }

  async function refreshWorkspaceState() {
    const windowId = await resolveCurrentWindowId();
    if (!activeCoop || windowId == null) {
      setWorkspaceState({ open: false, canClose: false });
      return null;
    }

    try {
      const response = await sendRuntimeMessage<PopupSidepanelState>({
        type: 'get-sidepanel-state',
        payload: { windowId },
      });
      if (response.ok && response.data) {
        setWorkspaceState(response.data);
        return windowId;
      }
      if (isCompatibilitySidepanelError(response.error)) {
        updateWorkspaceFallbackState(workspaceState.open);
        return windowId;
      }
      if (response.error) {
        setMessage(response.error);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      if (isCompatibilitySidepanelError(detail)) {
        updateWorkspaceFallbackState(workspaceState.open);
        return windowId;
      }
      setMessage(detail || 'Could not read the sidepanel state.');
    }
    return windowId;
  }

  useEffect(() => {
    void refreshWorkspaceState();
  }, [activeCoop]);

  async function openWorkspace(windowIdOverride?: number) {
    try {
      const windowId = windowIdOverride ?? (await resolveCurrentWindowId());
      if (windowId != null) {
        await chrome.sidePanel.open({ windowId });
        updateWorkspaceFallbackState(true);
        return;
      }
    } catch {
      // Fall through to the standalone workspace tab.
    }

    await chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
  }

  async function toggleWorkspaceFallback(windowId: number) {
    const sidepanelApi = getSidepanelApi();
    if (workspaceState.open && typeof sidepanelApi.close === 'function') {
      await sidepanelApi.close({ windowId });
      updateWorkspaceFallbackState(false);
      return;
    }

    await openWorkspace(windowId);
  }

  async function toggleWorkspace() {
    const windowId = await resolveCurrentWindowId();
    if (windowId == null) {
      await openWorkspace();
      return;
    }

    try {
      const response = await sendRuntimeMessage<PopupSidepanelState>({
        type: 'toggle-sidepanel',
        payload: { windowId },
      });
      if (response.ok && response.data) {
        setWorkspaceState(response.data);
        return;
      }
      if (isCompatibilitySidepanelError(response.error)) {
        await toggleWorkspaceFallback(windowId);
        return;
      }
      setMessage(response.error ?? 'Could not toggle the sidepanel.');
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      if (isCompatibilitySidepanelError(detail)) {
        await toggleWorkspaceFallback(windowId);
        return;
      }
      setMessage(detail || 'Could not toggle the sidepanel.');
    }
  }

  async function updateUiPreferences(patch: Partial<UiPreferences>) {
    if (!dashboard) {
      return;
    }

    const response = await sendRuntimeMessage<UiPreferences>({
      type: 'set-ui-preferences',
      payload: {
        ...dashboard.uiPreferences,
        ...patch,
      },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not update settings.');
      return;
    }
    await loadDashboard();
    setMessage('Settings updated.');
  }

  async function updateSound(enabled: boolean) {
    if (!dashboard) {
      return;
    }

    const response = await sendRuntimeMessage({
      type: 'set-sound-preferences',
      payload: {
        ...dashboard.soundPreferences,
        enabled,
      },
    });
    if (!response.ok) {
      setMessage(response.error ?? 'Could not update sound settings.');
      return;
    }
    await loadDashboard();
    setMessage('Sound settings updated.');
  }

  async function handleCreateSubmit() {
    setCreateSubmitting(true);
    const created = await coopActions.createCoop(navigation.state.createForm);
    setCreateSubmitting(false);
    if (!created) {
      return;
    }
    navigation.resetCreateForm();
    navigation.goHome();
  }

  async function handleJoinSubmit() {
    setJoinSubmitting(true);
    const joined = await coopActions.joinCoop(navigation.state.joinForm);
    setJoinSubmitting(false);
    if (!joined) {
      return;
    }
    navigation.resetJoinForm();
    navigation.goHome();
  }

  function resolveDraftValue(draft: ReviewDraft) {
    return draftEdits[draft.id] ?? draft;
  }

  function updateSelectedDraft(patch: Partial<ReviewDraft>) {
    if (!selectedDraft) {
      return;
    }

    setDraftEdits((current) => ({
      ...current,
      [selectedDraft.id]: {
        ...selectedDraft,
        ...patch,
      },
    }));
  }

  async function handleSaveSelectedDraft() {
    if (!selectedDraft) {
      return;
    }

    setDraftSaving(true);
    const saved = await quickDraftActions.saveDraft(selectedDraft);
    setDraftSaving(false);
    if (!saved) {
      return;
    }
    setDraftEdits((current) => ({
      ...current,
      [saved.id]: saved,
    }));
  }

  async function handleToggleSelectedDraftReady() {
    if (!selectedDraft) {
      return;
    }

    setDraftSaving(true);
    const updated = await quickDraftActions.changeWorkflowStage(
      selectedDraft,
      selectedDraft.workflowStage === 'ready' ? 'candidate' : 'ready',
    );
    setDraftSaving(false);
    if (!updated) {
      return;
    }
    setDraftEdits((current) => ({
      ...current,
      [updated.id]: updated,
    }));
  }

  async function handleShareSelectedDraft() {
    if (!selectedDraft) {
      return;
    }

    setDraftSaving(true);
    const shared = await quickDraftActions.publishDraft(selectedDraft);
    setDraftSaving(false);
    if (!shared) {
      return;
    }

    setDraftEdits((current) => {
      const next = { ...current };
      delete next[selectedDraft.id];
      return next;
    });
    navigation.navigate('drafts');
  }

  async function handleMarkDraftReady(draft: ReviewDraft) {
    const updated = await quickDraftActions.changeWorkflowStage(resolveDraftValue(draft), 'ready');
    if (!updated) {
      return;
    }

    setDraftEdits((current) => ({
      ...current,
      [updated.id]: updated,
    }));
  }

  async function handleShareDraft(draft: ReviewDraft) {
    const shared = await quickDraftActions.publishDraft(resolveDraftValue(draft));
    if (!shared) {
      return;
    }

    setDraftEdits((current) => {
      const next = { ...current };
      delete next[draft.id];
      return next;
    });
  }

  async function handleSwitchCoop(coopId: string) {
    const switched = await coopActions.switchCoop(coopId);
    if (!switched) {
      return;
    }
    navigation.goHome();
    await refreshWorkspaceState();
  }

  function openSettingsScreen() {
    setSettingsReturnScreen(
      currentScreen === 'feed' || currentScreen === 'coops' ? currentScreen : 'home',
    );
    navigation.navigate('settings');
  }

  function navigateBack() {
    if (currentScreen === 'draft-detail') {
      navigation.navigate('drafts');
      return;
    }

    if (currentScreen === 'settings') {
      navigation.navigate(settingsReturnScreen);
      return;
    }

    if (currentScreen === 'create' || currentScreen === 'join') {
      navigation.navigate(activeCoop ? 'coops' : 'home');
      return;
    }

    navigation.navigate('home');
  }

  const headerTitle = activeCoop?.profile.name ?? 'Coop';
  const headerSubtitle = undefined;
  const syncStatus = useMemo(() => {
    return popupSyncStatus({
      syncLabel: dashboard?.summary?.syncLabel,
      syncState: dashboard?.summary?.syncState,
      syncDetail: dashboard?.summary?.syncDetail,
      syncTone: dashboard?.summary?.syncTone,
      dashboardError,
    });
  }, [dashboard?.summary, dashboardError]);
  const settingsOriginTab: PopupFooterTab =
    settingsReturnScreen === 'feed' ? 'feed' : settingsReturnScreen === 'coops' ? 'coops' : 'home';
  const activeFooterTab: PopupFooterTab =
    currentScreen === 'feed'
      ? 'feed'
      : currentScreen === 'settings'
        ? settingsOriginTab
        : currentScreen === 'coops' || currentScreen === 'create' || currentScreen === 'join'
          ? 'coops'
          : 'home';

  let content: JSX.Element;

  if (loading || navigation.loading) {
    content = (
      <section className="popup-screen">
        <p className="popup-empty-state">Loading popup...</p>
      </section>
    );
  } else if (currentScreen === 'no-coop') {
    content = (
      <PopupNoCoopScreen
        onCreate={() => navigation.navigate('create')}
        onJoin={() => navigation.navigate('join')}
      />
    );
  } else if (currentScreen === 'create') {
    content = (
      <PopupCreateCoopScreen
        form={navigation.state.createForm}
        submitting={createSubmitting}
        onChange={navigation.setCreateForm}
        onSubmit={handleCreateSubmit}
      />
    );
  } else if (currentScreen === 'join') {
    content = (
      <PopupJoinCoopScreen
        form={navigation.state.joinForm}
        submitting={joinSubmitting}
        onChange={navigation.setJoinForm}
        onSubmit={handleJoinSubmit}
      />
    );
  } else if (currentScreen === 'drafts') {
    content = (
      <PopupDraftListScreen
        drafts={visibleDrafts.map((draft) => resolveDraftValue(draft))}
        onOpenDraft={navigation.openDraft}
        onMarkReady={handleMarkDraftReady}
        onShare={handleShareDraft}
      />
    );
  } else if (currentScreen === 'draft-detail' && selectedDraft) {
    content = (
      <PopupDraftDetailScreen
        draft={selectedDraft}
        saving={draftSaving}
        onChange={updateSelectedDraft}
        onSave={handleSaveSelectedDraft}
        onToggleReady={handleToggleSelectedDraftReady}
        onShare={handleShareSelectedDraft}
      />
    );
  } else if (currentScreen === 'feed') {
    content = (
      <PopupFeedScreen
        artifacts={feedArtifacts}
        onOpenArtifact={(artifactId) => setSelectedArtifactId(artifactId)}
      />
    );
  } else if (currentScreen === 'settings' && dashboard) {
    content = (
      <PopupSettingsScreen
        soundPreferences={dashboard.soundPreferences}
        uiPreferences={dashboard.uiPreferences}
        onToggleSound={updateSound}
        onToggleNotifications={(enabled) =>
          void updateUiPreferences({ notificationsEnabled: enabled })
        }
        onSetAgentCadence={(minutes) => void updateUiPreferences({ agentCadenceMinutes: minutes })}
        onToggleLocalHelper={(enabled) =>
          void updateUiPreferences({ localInferenceOptIn: enabled })
        }
      />
    );
  } else if (currentScreen === 'coops' && dashboard) {
    content = (
      <PopupCoopsScreen
        coops={dashboard.coops.map((coop) => {
          const badge = dashboard.coopBadges.find((item) => item.coopId === coop.profile.id);
          return {
            id: coop.profile.id,
            name: coop.profile.name,
            badgeText:
              badge && badge.pendingAttentionCount > 0
                ? `${badge.pendingAttentionCount} waiting`
                : undefined,
          };
        })}
        activeCoopId={dashboard.activeCoopId}
        onSwitch={handleSwitchCoop}
        onCreate={() => navigation.navigate('create')}
        onJoin={() => navigation.navigate('join')}
      />
    );
  } else {
    content = (
      <PopupHomeScreen
        draftCount={visibleDrafts.length}
        lastCaptureLabel={formatRelativeTime(dashboard?.summary?.lastCaptureAt)}
        syncLabel={syncStatus.label}
        syncDetail={syncStatus.detail}
        syncTone={syncStatus.tone}
        reviewQueue={homeQueueItems}
        onPrimaryAction={() =>
          visibleDrafts.length > 0
            ? navigation.navigate('drafts')
            : void captureActions.runManualCapture()
        }
        primaryActionLabel={homePrimaryActionLabel}
        onCaptureTab={() => void captureActions.runActiveTabCapture()}
        onOpenDrafts={() => navigation.navigate('drafts')}
        onOpenDraft={navigation.openDraft}
      />
    );
  }

  const showDraftsAction = currentScreen === 'home' && Boolean(activeCoop);
  const showSettingsAction =
    ['home', 'feed', 'coops'].includes(currentScreen) && Boolean(activeCoop);
  const showWorkspaceAction =
    ['home', 'feed', 'coops', 'drafts', 'draft-detail', 'settings'].includes(currentScreen) &&
    Boolean(activeCoop);

  const header = (
    <PopupHeader
      title={headerTitle}
      subtitle={headerSubtitle}
      themePreference={theme.themePreference}
      onSetTheme={theme.setThemePreference}
      onBack={
        ['create', 'join', 'drafts', 'draft-detail', 'settings'].includes(currentScreen)
          ? navigateBack
          : undefined
      }
      onOpenDrafts={showDraftsAction ? () => navigation.navigate('drafts') : undefined}
      onOpenSettings={showSettingsAction ? openSettingsScreen : undefined}
      onToggleWorkspace={showWorkspaceAction ? () => void toggleWorkspace() : undefined}
      workspaceCanClose={workspaceState.canClose}
      workspaceOpen={workspaceState.open}
    />
  );
  const overlay = selectedArtifact ? (
    <PopupArtifactDialog
      artifact={selectedArtifact}
      onClose={() => setSelectedArtifactId(null)}
      onOpenInSidepanel={async () => {
        await openWorkspace();
        setSelectedArtifactId(null);
      }}
    />
  ) : null;
  const footer = activeCoop ? (
    <PopupFooterNav
      activeTab={activeFooterTab}
      coopsBadgeCount={otherCoopsAttentionCount}
      onNavigate={(tab) => {
        if (tab === 'home') {
          navigation.goHome();
          return;
        }
        navigation.navigateFooter(tab);
      }}
    />
  ) : null;

  return (
    <PopupShell
      footer={footer}
      header={header}
      message={message}
      overlay={overlay}
      theme={theme.resolvedTheme}
    >
      {content}
    </PopupShell>
  );
}
