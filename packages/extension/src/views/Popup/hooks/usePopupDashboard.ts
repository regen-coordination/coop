import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Ignore agent events older than this to avoid showing stale data on popup open. */
const STALE_EVENT_THRESHOLD_MS = 30_000;
/** Suppress events during initial mount to avoid racing with the first dashboard fetch. */
const MOUNT_SETTLE_MS = 500;
import {
  type AgentStateDeltaEvent,
  type BackgroundNotification,
  type DashboardResponse,
  POPUP_SNAPSHOT_KEY,
  type PopupSnapshot,
  sendRuntimeMessage,
} from '../../../runtime/messages';
import {
  selectActiveCoop,
  selectActiveMember,
  selectAggregateArtifacts,
  selectAggregateReadyDrafts,
  selectAggregateVisibleDrafts,
  selectReadyDrafts,
  selectRecentArtifacts,
  selectVisibleDrafts,
} from '../../shared/dashboard-selectors';

export function usePopupDashboard() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [snapshot, setSnapshot] = useState<PopupSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      const response = await sendRuntimeMessage<DashboardResponse>({ type: 'get-dashboard' });
      if (response.ok && response.data) {
        setDashboard(response.data);
        setMessage('');
      } else if (response.error) {
        setMessage(response.error);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Hydrate snapshot from chrome.storage.local on mount (~5ms).
  // This provides instant data for the first render before the
  // full dashboard arrives from the background script (~100-300ms).
  useEffect(() => {
    chrome.storage.local
      .get(POPUP_SNAPSHOT_KEY)
      .then((result) => {
        const cached = result[POPUP_SNAPSHOT_KEY] as PopupSnapshot | undefined;
        if (cached) {
          setSnapshot(cached);
        }
      })
      .catch(() => {});
  }, []);

  const [agentDelta, setAgentDelta] = useState<AgentStateDeltaEvent | null>(null);
  const mountedAtRef = useRef(Date.now());

  useEffect(() => {
    void loadDashboard();

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        void loadDashboard();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    // Listen for background push notifications (matching sidepanel pattern)
    const listener = (msg: BackgroundNotification) => {
      if (msg.type === 'DASHBOARD_UPDATED') {
        void loadDashboard();
      }
      if (msg.type === 'AGENT_STATE_DELTA') {
        // Ignore events older than 30s to avoid stale data on popup open
        const age = Date.now() - new Date(msg.emittedAt).getTime();
        if (age < STALE_EVENT_THRESHOLD_MS && Date.now() - mountedAtRef.current > MOUNT_SETTLE_MS) {
          setAgentDelta(msg);
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [loadDashboard]);

  // Derive hasCoops from the best available source:
  // snapshot resolves in ~5ms, dashboard in ~100-300ms.
  const hasCoops = dashboard ? dashboard.coops.length > 0 : (snapshot?.hasCoops ?? false);

  return {
    dashboard,
    snapshot,
    hasCoops,
    loading,
    dashboardError: message,
    loadDashboard,
    coops: dashboard?.coops ?? [],
    activeCoop: useMemo(() => selectActiveCoop(dashboard), [dashboard]),
    activeMember: useMemo(() => selectActiveMember(dashboard), [dashboard]),
    visibleDrafts: useMemo(() => selectAggregateVisibleDrafts(dashboard), [dashboard]),
    readyDrafts: useMemo(() => selectAggregateReadyDrafts(dashboard), [dashboard]),
    recentArtifacts: useMemo(() => selectAggregateArtifacts(dashboard), [dashboard]),
    activeCoopDrafts: useMemo(() => selectVisibleDrafts(dashboard), [dashboard]),
    activeCoopReadyDrafts: useMemo(() => selectReadyDrafts(dashboard), [dashboard]),
    activeCoopArtifacts: useMemo(() => selectRecentArtifacts(dashboard), [dashboard]),
    agentDelta,
    clearAgentDelta: useCallback(() => setAgentDelta(null), []),
  };
}
