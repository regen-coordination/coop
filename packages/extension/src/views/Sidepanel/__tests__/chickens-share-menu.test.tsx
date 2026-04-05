import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeDashboardResponse } from '../../../__tests__/fixtures';
import type { DashboardResponse } from '../../../runtime/messages';
import { ChickensTab } from '../tabs/ChickensTab';

function makeDashboard(): DashboardResponse {
  return makeDashboardResponse({
    coops: [makeDashboardResponse().coops[0]],
  });
}

function makeTabCapture() {
  return {
    runManualCapture: vi.fn(),
    runActiveTabCapture: vi.fn(),
    captureVisibleScreenshotAction: vi.fn(),
  } as unknown as ReturnType<typeof import('../hooks/useTabCapture').useTabCapture>;
}

function makeDraftEditor() {
  return {
    draftValue: vi.fn(),
    updateDraft: vi.fn(),
    saveDraft: vi.fn(),
    publishDraft: vi.fn(),
    refineDraft: vi.fn(),
    toggleDraftTargetCoop: vi.fn(),
    changeDraftWorkflowStage: vi.fn(),
    toggleDraftArchiveWorthiness: vi.fn(),
    applyRefineResult: vi.fn(),
    dismissRefineResult: vi.fn(),
    refiningDrafts: new Set<string>(),
    refineResults: {},
    anonymousPublish: false,
    setAnonymousPublish: vi.fn(),
    convertReceiverCapture: vi.fn(),
    archiveReceiverCapture: vi.fn(),
    toggleReceiverCaptureArchiveWorthiness: vi.fn(),
  } as unknown as ReturnType<typeof import('../hooks/useDraftEditor').useDraftEditor>;
}

describe('ChickensTab compact cards', () => {
  afterEach(cleanup);

  it('renders the Review segment with an empty state when no items exist', () => {
    render(
      <ChickensTab
        dashboard={makeDashboard()}
        agentDashboard={null}
        visibleDrafts={[]}
        draftEditor={makeDraftEditor()}
        inferenceState={null}
        runtimeConfig={makeDashboard().runtimeConfig}
        tabCapture={makeTabCapture()}
        synthesisSegment="review"
        onSelectSynthesisSegment={vi.fn()}
      />,
    );

    expect(screen.getByText('Round up your loose chickens')).toBeTruthy();
  });
});
