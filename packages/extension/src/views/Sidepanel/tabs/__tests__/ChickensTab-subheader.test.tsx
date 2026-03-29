import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * ChickensTab subheader regression fix:
 * - Action buttons use popup-icon-button class + Tooltip wrapping inside sidepanel-action-row
 * - Round Up gets popup-icon-button--primary
 * - Filter popovers rendered inline in the same action row
 * - Uses SidepanelSubheader sticky wrapper
 */

import type { ReviewDraft } from '@coop/shared';
import type { InferenceBridgeState } from '../../../../runtime/inference-bridge';
import type { AgentDashboardResponse, DashboardResponse } from '../../../../runtime/messages';
import type { useDraftEditor } from '../../hooks/useDraftEditor';
import type { useTabCapture } from '../../hooks/useTabCapture';
import { ChickensTab, type ChickensTabProps } from '../ChickensTab';

function buildDashboard(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    candidates: [],
    coops: [],
    drafts: [],
    tabRoutings: [],
    proactiveSignals: [],
    runtimeConfig: {
      chainKey: 'sepolia',
      onchainMode: 'mock',
      archiveMode: 'mock',
      sessionMode: 'off',
      privacyMode: 'off',
      providerMode: 'rpc',
      receiverAppUrl: 'http://localhost:3000',
      signalingUrls: [],
    },
    summary: {
      iconState: 'ready',
      iconLabel: 'Coop',
      pendingDrafts: 0,
      routedTabs: 0,
      insightDrafts: 0,
      pendingActions: 0,
      staleObservationCount: 0,
      pendingAttentionCount: 0,
      coopCount: 0,
      syncState: 'idle',
      syncLabel: 'Idle',
      syncDetail: 'Idle',
      syncTone: 'ok',
      captureMode: 'manual',
      agentCadenceMinutes: 64,
      localEnhancement: 'none',
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
    observations: [],
    plans: [],
    skillRuns: [],
    manifests: [],
    autoRunSkillIds: [],
    memories: [],
    ...overrides,
  };
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
    draftValue: vi.fn().mockReturnValue({
      title: '',
      summary: '',
      category: 'insight',
      tags: [],
      whyItMatters: '',
      suggestedNextStep: '',
      sources: [],
      workflowStage: 'candidate',
      provenance: { type: 'tab' },
      suggestedTargetCoopIds: [],
      rationale: '',
      archiveWorthiness: 'not-flagged',
    }),
    updateDraft: vi.fn(),
    toggleDraftTargetCoop: vi.fn(),
    saveDraft: vi.fn(),
    publishDraft: vi.fn(),
    refineDraft: vi.fn(),
    refineResults: {},
    refiningDrafts: new Set(),
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
    visibleDrafts: [],
    draftEditor: buildDraftEditor(),
    inferenceState: null,
    runtimeConfig: buildDashboard().runtimeConfig,
    tabCapture: buildTabCapture(),
    synthesisSegment: 'signals',
    onSelectSynthesisSegment: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ChickensTab subheader regression (popup-icon-button)', () => {
  it('renders Round Up as popup-icon-button--primary inside sidepanel-action-row', () => {
    render(<ChickensTab {...buildProps()} />);

    const actionRow = document.querySelector('.sidepanel-action-row');
    expect(actionRow).not.toBeNull();

    const roundUpBtn = screen.getByLabelText('Round Up');
    expect(roundUpBtn.classList.contains('popup-icon-button')).toBe(true);
    expect(roundUpBtn.classList.contains('popup-icon-button--primary')).toBe(true);
  });

  it('renders Capture Tab and Screenshot as default popup-icon-button', () => {
    render(<ChickensTab {...buildProps()} />);

    const captureBtn = screen.getByLabelText('Capture Tab');
    expect(captureBtn.classList.contains('popup-icon-button')).toBe(true);
    expect(captureBtn.classList.contains('popup-icon-button--primary')).toBe(false);

    const screenshotBtn = screen.getByLabelText('Screenshot');
    expect(screenshotBtn.classList.contains('popup-icon-button')).toBe(true);
    expect(screenshotBtn.classList.contains('popup-icon-button--primary')).toBe(false);
  });

  it('renders filter popovers inline in the action row', () => {
    render(<ChickensTab {...buildProps()} />);

    const actionRow = document.querySelector('.sidepanel-action-row');
    expect(actionRow).not.toBeNull();

    // Status and Time filter buttons should be present
    expect(screen.getByRole('button', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /time/i })).toBeInTheDocument();
  });

  it('wraps action row in a sticky sidepanel-subheader', () => {
    render(<ChickensTab {...buildProps()} />);

    const wrapper = document.querySelector('.sidepanel-subheader');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector('.sidepanel-action-row')).not.toBeNull();
    // Old BEM sub-element classes remain absent
    expect(document.querySelector('.sidepanel-subheader__action')).toBeNull();
    expect(document.querySelector('.sidepanel-subheader__actions')).toBeNull();
  });

  it('renders all three action buttons as icon-only with aria-label', () => {
    render(<ChickensTab {...buildProps()} />);

    const actionButtons = document.querySelectorAll('.popup-icon-button');
    expect(actionButtons.length).toBe(3);
    for (const btn of actionButtons) {
      expect(btn.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('renders the synthesis queue with signals counts and support text', () => {
    render(
      <ChickensTab
        {...buildProps({
          dashboard: buildDashboard({
            proactiveSignals: [
              {
                id: 'signal-1',
                sourceCandidateId: 'candidate-1',
                extractId: 'extract-1',
                title: 'River signal',
                url: 'https://example.com/river',
                domain: 'example.com',
                category: 'insight',
                tags: ['water'],
                archiveWorthinessHint: false,
                draftId: 'draft-1',
                topRelevanceScore: 0.82,
                targetCoops: [
                  {
                    coopId: 'coop-1',
                    coopName: 'Starter Coop',
                    relevanceScore: 0.82,
                    rationale: 'Matches current watershed priorities.',
                    suggestedNextStep: 'Review and merge context.',
                    matchedRitualLenses: ['knowledge-garden-resources'],
                  },
                ],
                support: [
                  {
                    id: 'memory-1',
                    kind: 'memory',
                    title: 'Memory from Starter Coop',
                    detail: 'Earlier work connected this topic to wetlands restoration.',
                  },
                ],
                updatedAt: new Date().toISOString(),
              },
            ],
          }),
        })}
      />,
    );

    expect(screen.getByText('Synthesis Queue')).toBeInTheDocument();
    expect(screen.getByText('River signal')).toBeInTheDocument();
    expect(screen.getByText('Memory from Starter Coop')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /signals/i })).toBeInTheDocument();
  });
});
