import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PopupDraftListScreen } from '../PopupDraftListScreen';
import type { PopupDraftListItem } from '../popup-types';

function makeDraft(overrides: Partial<PopupDraftListItem> = {}): PopupDraftListItem {
  return {
    id: 'draft-1',
    interpretationId: 'interp-1',
    extractId: 'extract-1',
    sourceCandidateId: 'candidate-1',
    title: 'River restoration lead',
    summary: 'A test draft',
    sources: [{ url: 'https://example.com/river', domain: 'example.com', label: 'River' }],
    tags: [],
    category: 'opportunity',
    whyItMatters: 'Test relevance',
    suggestedNextStep: 'Follow up',
    suggestedTargetCoopIds: ['coop-1'],
    confidence: 0.8,
    rationale: 'Test rationale',
    status: 'draft',
    workflowStage: 'ready',
    attachments: [],
    provenance: {
      type: 'tab',
      sourceCandidateId: 'candidate-1',
      extractId: 'extract-1',
      interpretationId: 'interp-1',
    },
    createdAt: '2026-03-01T00:00:00.000Z',
    coopLabel: 'Test Coop',
    coopIds: ['coop-1'],
    sourceUrl: 'https://example.com/river',
    ...overrides,
  };
}

describe('PopupDraftListScreen', () => {
  afterEach(cleanup);

  it('renders Share button for ready drafts and Mark Ready for candidate drafts', () => {
    const drafts = [
      makeDraft({ id: 'draft-1', workflowStage: 'ready' }),
      makeDraft({ id: 'draft-2', workflowStage: 'candidate' }),
    ];

    render(
      <PopupDraftListScreen
        drafts={drafts}
        filterTags={[]}
        onOpenDraft={vi.fn()}
        onMarkReady={vi.fn()}
        onShare={vi.fn()}
        onRoundUp={vi.fn()}
      />,
    );

    expect(screen.getByText('Share')).toBeDefined();
    expect(screen.getByText('Mark Ready')).toBeDefined();
  });

  it('shows empty state with Roundup button when no drafts', () => {
    render(
      <PopupDraftListScreen
        drafts={[]}
        filterTags={[]}
        onOpenDraft={vi.fn()}
        onMarkReady={vi.fn()}
        onShare={vi.fn()}
        onRoundUp={vi.fn()}
      />,
    );

    expect(screen.getByText('No chickens here yet.')).toBeDefined();
    expect(screen.getByText('Roundup Chickens')).toBeDefined();
  });

  it('keeps the summary as the primary row copy when why-it-matters is also present', () => {
    render(
      <PopupDraftListScreen
        drafts={[
          makeDraft({
            summary: 'Concrete summary',
            whyItMatters: 'Interpretive why text',
            suggestedNextStep: 'Queue follow-up',
          }),
        ]}
        filterTags={[]}
        onOpenDraft={vi.fn()}
        onMarkReady={vi.fn()}
        onShare={vi.fn()}
        onRoundUp={vi.fn()}
      />,
    );

    expect(screen.getByText('Concrete summary')).toBeInTheDocument();
    expect(screen.queryByText('Interpretive why text')).not.toBeInTheDocument();
    expect(screen.getByText('Next: Queue follow-up')).toBeInTheDocument();
  });
});
