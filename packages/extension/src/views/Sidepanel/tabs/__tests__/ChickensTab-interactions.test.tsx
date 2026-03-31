import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Artifact, ReviewDraft, TabCandidate } from '@coop/shared';
import type {
  AgentDashboardResponse,
  DashboardResponse,
  ProactiveSignal,
} from '../../../../runtime/messages';
import type { useDraftEditor } from '../../hooks/useDraftEditor';
import type { useTabCapture } from '../../hooks/useTabCapture';
import { ChickensTab, type ChickensTabProps } from '../ChickensTab';

vi.mock('../../cards', () => ({
  SkeletonCards: ({ label }: { label: string }) => <div data-testid="skeleton-cards">{label}</div>,
}));

function makeCandidate(overrides: Partial<TabCandidate> = {}): TabCandidate {
  return {
    id: 'candidate-1',
    tabId: 1,
    windowId: 1,
    url: 'https://news.example/river',
    canonicalUrl: 'https://news.example/river',
    title: 'River candidate',
    domain: 'news.example',
    tabGroupHint: 'news.example',
    capturedAt: '2026-03-01T09:00:00.000Z',
    ...overrides,
  } as TabCandidate;
}

function makeDraft(overrides: Partial<ReviewDraft> = {}): ReviewDraft {
  return {
    id: 'draft-1',
    title: 'Restore wetland corridor',
    summary: 'Draft summary',
    category: 'insight',
    tags: ['water'],
    whyItMatters: 'Shared habitat restoration opportunity',
    suggestedNextStep: 'Review and publish',
    sources: [],
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
    workflowStage: 'candidate',
    targetCoopIds: [],
    suggestedTargetCoopIds: [],
    archiveWorthiness: 'not-flagged',
    rationale: '',
    provenance: { type: 'agent' },
    ...overrides,
  } as unknown as ReviewDraft;
}

function makeArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: 'artifact-1',
    targetCoopId: 'coop-1',
    title: 'Shared watershed plan',
    summary: 'Shared summary',
    category: 'insight',
    tags: ['water'],
    whyItMatters: 'Matters because coordination is needed',
    suggestedNextStep: 'Review the shared plan',
    sources: [{ url: 'https://coop.example/plan', domain: 'coop.example' }],
    attachments: [],
    createdAt: '2026-03-01T11:00:00.000Z',
    ...overrides,
  } as unknown as Artifact;
}

function makeSignal(overrides: Partial<ProactiveSignal> = {}): ProactiveSignal {
  return {
    id: 'signal-1',
    sourceCandidateId: 'candidate-1',
    extractId: 'extract-1',
    title: 'River restoration signal',
    url: 'https://news.example/river',
    domain: 'news.example',
    category: 'insight',
    tags: ['water'],
    archiveWorthinessHint: false,
    draftId: 'draft-1',
    topRelevanceScore: 0.82,
    targetCoops: [
      {
        coopId: 'coop-1',
        coopName: 'Alpha Coop',
        relevanceScore: 0.82,
        rationale: 'Matches the coop restoration focus.',
        suggestedNextStep: 'Review the linked draft.',
        matchedRitualLenses: ['knowledge-garden-resources'],
      },
    ],
    support: [
      {
        id: 'support-1',
        kind: 'memory',
        title: 'Earlier note',
        detail: 'Previous memory supports this route.',
      },
    ],
    updatedAt: '2026-03-01T12:00:00.000Z',
    ...overrides,
  } as ProactiveSignal;
}

function buildDashboard(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    activeCoopId: 'coop-1',
    candidates: [makeCandidate()],
    coops: [
      {
        profile: {
          id: 'coop-1',
          name: 'Alpha Coop',
        },
        artifacts: [makeArtifact()],
      },
    ],
    drafts: [],
    tabRoutings: [],
    proactiveSignals: [makeSignal()],
    runtimeConfig: {
      chainKey: 'sepolia',
      onchainMode: 'mock',
      archiveMode: 'mock',
      sessionMode: 'off',
      privacyMode: 'off',
      providerMode: 'rpc',
      receiverAppUrl: 'https://receiver.test',
      signalingUrls: ['wss://api.coop.town'],
      websocketSyncUrl: 'wss://api.coop.town/yws',
    },
    summary: {
      iconState: 'ready',
      iconLabel: 'Coop',
      pendingDrafts: 1,
      routedTabs: 1,
      insightDrafts: 1,
      pendingActions: 0,
      staleObservationCount: 1,
      pendingAttentionCount: 2,
      coopCount: 1,
      syncState: 'idle',
      syncLabel: 'Idle',
      syncDetail: 'Idle',
      syncTone: 'ok',
      captureMode: 'manual',
      agentCadenceMinutes: 64,
      localEnhancement: 'ready',
      localInferenceOptIn: true,
      pendingOutboxCount: 0,
    },
    ...overrides,
  } as DashboardResponse;
}

function buildAgentDashboard(
  overrides: Partial<AgentDashboardResponse> = {},
): AgentDashboardResponse {
  return {
    observations: [
      {
        id: 'observation-1',
        title: 'Older observation',
        summary: 'Needs attention',
        trigger: 'roundup',
        status: 'pending',
        createdAt: '2026-02-01T08:00:00.000Z',
        draftId: 'draft-1',
      },
      {
        id: 'observation-2',
        title: 'Newer observation',
        summary: 'Still pending',
        trigger: 'roundup',
        status: 'pending',
        createdAt: '2026-02-02T08:00:00.000Z',
        draftId: 'draft-2',
      },
    ],
    plans: [],
    skillRuns: [],
    manifests: [],
    autoRunSkillIds: [],
    memories: [],
    ...overrides,
  } as AgentDashboardResponse;
}

function buildTabCapture(): ReturnType<typeof useTabCapture> {
  return {
    runManualCapture: vi.fn(),
    runActiveTabCapture: vi.fn(),
    captureVisibleScreenshotAction: vi.fn(),
  } as unknown as ReturnType<typeof useTabCapture>;
}

function buildDraftEditor(): ReturnType<typeof useDraftEditor> {
  return {
    draftValue: vi.fn(),
    updateDraft: vi.fn(),
    toggleDraftTargetCoop: vi.fn(),
    saveDraft: vi.fn(),
    publishDraft: vi.fn(),
    refineDraft: vi.fn(),
    refineResults: {},
    refiningDrafts: new Set<string>(),
    applyRefineResult: vi.fn(),
    dismissRefineResult: vi.fn(),
    toggleDraftArchiveWorthiness: vi.fn(),
    changeDraftWorkflowStage: vi.fn(),
    anonymousPublish: false,
    setAnonymousPublish: vi.fn(),
    convertReceiverCapture: vi.fn(),
    archiveReceiverCapture: vi.fn(),
    toggleReceiverCaptureArchiveWorthiness: vi.fn(),
  } as unknown as ReturnType<typeof useDraftEditor>;
}

function buildProps(overrides: Partial<ChickensTabProps> = {}): ChickensTabProps {
  return {
    dashboard: buildDashboard(),
    agentDashboard: buildAgentDashboard(),
    visibleDrafts: [makeDraft()],
    draftEditor: buildDraftEditor(),
    inferenceState: null,
    runtimeConfig: buildDashboard().runtimeConfig,
    tabCapture: buildTabCapture(),
    synthesisSegment: 'review',
    onSelectSynthesisSegment: vi.fn(),
    ...overrides,
  };
}

describe('ChickensTab interactions', () => {
  it('renders the loading skeleton when the dashboard has not loaded yet', () => {
    render(<ChickensTab {...buildProps({ dashboard: null })} />);

    expect(screen.getByTestId('skeleton-cards')).toHaveTextContent('Loading chickens');
  });

  it('switches between review and shared segments', async () => {
    const user = userEvent.setup();
    const onSelectSynthesisSegment = vi.fn();

    render(
      <ChickensTab
        {...buildProps({
          onSelectSynthesisSegment,
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Shared' }));

    expect(onSelectSynthesisSegment).toHaveBeenCalledWith('shared');
  });

  it('shows shared artifacts when the shared segment is active', () => {
    render(
      <ChickensTab
        {...buildProps({
          synthesisSegment: 'shared',
        })}
      />,
    );

    expect(screen.getByText('Shared watershed plan')).toBeInTheDocument();
  });

  it('shows review items including signals and drafts on the review segment', () => {
    render(<ChickensTab {...buildProps()} />);

    // Signal from makeSignal()
    expect(screen.getByText('River restoration signal')).toBeInTheDocument();
    // Draft from makeDraft()
    expect(screen.getByText('Restore wetland corridor')).toBeInTheDocument();
  });

  it('filters review items by category and clears the filter', async () => {
    const user = userEvent.setup();

    render(
      <ChickensTab
        {...buildProps({
          visibleDrafts: [
            makeDraft({ id: 'draft-insight', category: 'insight', title: 'Insight draft' }),
            makeDraft({
              id: 'draft-opportunity',
              category: 'opportunity',
              title: 'Opportunity draft',
            }),
          ],
          dashboard: buildDashboard({ proactiveSignals: [] }),
        })}
      />,
    );

    // Open the category filter and select opportunity
    await user.click(screen.getByRole('button', { name: /category/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Opportunity' }));

    expect(screen.getByText('Opportunity draft')).toBeInTheDocument();
    expect(screen.queryByText('Insight draft')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();

    // Clear the filter
    await user.click(screen.getByRole('button', { name: /clear/i }));

    expect(screen.getByText('Insight draft')).toBeInTheDocument();
    expect(screen.getByText('Opportunity draft')).toBeInTheDocument();
  });

  it('highlights the focused signal in the review segment', () => {
    render(
      <ChickensTab
        {...buildProps({
          focusedSignalId: 'signal-1',
        })}
      />,
    );

    const focusedCard = document.querySelector('[data-focused]');
    expect(focusedCard).not.toBeNull();
    expect(focusedCard?.textContent).toContain('River restoration signal');
  });

  it('shows the empty state when there are no review items', () => {
    render(
      <ChickensTab
        {...buildProps({
          dashboard: buildDashboard({ proactiveSignals: [] }),
          visibleDrafts: [],
          agentDashboard: buildAgentDashboard({ observations: [] }),
        })}
      />,
    );

    expect(screen.getByText(/round up your loose chickens/i)).toBeInTheDocument();
  });

  it('shows the empty state when there are no shared artifacts', () => {
    render(
      <ChickensTab
        {...buildProps({
          synthesisSegment: 'shared',
          dashboard: buildDashboard({ coops: [] }),
        })}
      />,
    );

    expect(screen.getByText(/nothing shared yet/i)).toBeInTheDocument();
  });
});
