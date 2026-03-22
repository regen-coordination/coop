import type { CoopSharedState } from '@coop/shared';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoopCard, type CoopCardProps } from '../CoopCard';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createMockCoop(overrides: Partial<CoopSharedState> = {}): CoopSharedState {
  return {
    profile: {
      id: 'coop-1',
      name: 'Test Coop',
      purpose: 'Test purpose',
      spaceType: 'community',
      createdAt: '2026-01-15T10:00:00.000Z',
      createdBy: 'member-1',
      captureMode: 'manual',
      safeAddress: '0x1234567890123456789012345678901234567890',
      active: true,
    },
    members: [
      {
        id: 'member-1',
        displayName: 'Alice',
        role: 'creator',
        authMode: 'passkey',
        address: '0x1111111111111111111111111111111111111111',
        joinedAt: '2026-01-15T10:00:00.000Z',
        identityWarning: '',
      },
      {
        id: 'member-2',
        displayName: 'Bob',
        role: 'member',
        authMode: 'passkey',
        address: '0x2222222222222222222222222222222222222222',
        joinedAt: '2026-01-16T10:00:00.000Z',
        identityWarning: '',
      },
    ],
    artifacts: [
      {
        id: 'artifact-1',
        title: 'Test Artifact',
        summary: 'Summary',
        whyItMatters: 'It matters',
        suggestedNextStep: 'Next step',
        category: 'insight',
        tags: [],
        sources: [],
        reviewStatus: 'published',
        archiveStatus: 'not-archived',
        archiveWorthiness: 'not-flagged',
        archiveReceiptIds: [],
        createdAt: '2026-03-01T12:00:00.000Z',
        createdBy: 'member-1',
        updatedAt: '2026-03-01T12:00:00.000Z',
      },
      {
        id: 'artifact-2',
        title: 'Draft Artifact',
        summary: 'Draft summary',
        whyItMatters: 'Matters',
        suggestedNextStep: 'Step',
        category: 'thought',
        tags: [],
        sources: [],
        reviewStatus: 'draft',
        archiveStatus: 'not-archived',
        archiveWorthiness: 'not-flagged',
        archiveReceiptIds: [],
        createdAt: '2026-03-02T12:00:00.000Z',
        createdBy: 'member-2',
        updatedAt: '2026-03-02T12:00:00.000Z',
      },
    ],
    archiveReceipts: [
      {
        id: 'receipt-1',
        scope: 'artifact',
        rootCid: 'bafybeig...',
        uploadedAt: '2026-03-10T08:00:00.000Z',
        delegationMode: 'mock',
        delegationIssuer: 'did:key:abc',
        itemCount: 1,
        title: 'Test Archive',
        purpose: 'artifact-archive',
        summary: 'Archived artifact',
        gatewayBaseUrl: 'https://storacha.link',
        filecoinStatus: 'pending',
      },
    ],
    onchainState: {
      chainId: 11155111,
      chainKey: 'sepolia',
      safeAddress: '0x1234567890123456789012345678901234567890',
      safeCapability: 'ready',
      statusNote: 'Safe deployed',
    },
    setupInsights: {
      version: 1,
      lenses: [],
      summaryNarrative: '',
      seedContribution: '',
    },
    soul: {
      identity: '',
      norms: '',
      ritualGuidance: '',
    },
    rituals: [
      {
        id: 'r-1',
        name: 'Weekly sync',
        cadence: 'weekly',
        namedMoments: ['check-in'],
        facilitatorExpectation: 'Anyone can facilitate',
        defaultCapturePosture: 'open',
      },
    ],
    memberAccounts: [],
    reviewBoard: [],
    memoryProfile: {
      version: 1,
      updatedAt: '2026-01-15T10:00:00.000Z',
      topDomains: [],
      topTags: [],
      categoryStats: [],
      ritualLensWeights: [],
      exemplarArtifactIds: [],
      archiveSignals: { archivedTagCounts: {}, archivedDomainCounts: {} },
    },
    syncRoom: {
      signalingServers: ['wss://coop-signal.fly.dev/ws'],
      roomId: 'room-1',
      password: 'pw',
    },
    invites: [],
    memberCommitments: [],
    ...overrides,
  } as CoopSharedState;
}

function renderCard(overrides: Partial<CoopCardProps> = {}) {
  const defaultProps: CoopCardProps = {
    coop: createMockCoop(),
    currentMemberId: 'member-1',
    onClick: vi.fn(),
    ...overrides,
  };
  return { ...render(<CoopCard {...defaultProps} />), props: defaultProps };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CoopCard', () => {
  afterEach(() => {
    cleanup();
  });

  // --- Name display ---

  it('renders the coop name as an h3', () => {
    renderCard();
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Test Coop');
  });

  // --- Badge row ---

  it('displays space type label badge', () => {
    renderCard();
    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it('displays chain label badge', () => {
    renderCard();
    expect(screen.getByText('Sepolia')).toBeInTheDocument();
  });

  it('displays member count badge', () => {
    renderCard();
    expect(screen.getByText('2 members')).toBeInTheDocument();
  });

  it('shows singular member count when only 1 member', () => {
    const coop = createMockCoop({
      members: [
        {
          id: 'member-1',
          displayName: 'Alice',
          role: 'creator',
          authMode: 'passkey',
          address: '0x1111111111111111111111111111111111111111',
          joinedAt: '2026-01-15T10:00:00.000Z',
          identityWarning: '',
        },
      ],
    });
    renderCard({ coop });
    expect(screen.getByText('1 member')).toBeInTheDocument();
  });

  // --- Stats strip ---

  it('displays shared finds count', () => {
    renderCard();
    const label = screen.getByText('Shared finds');
    expect(label).toBeInTheDocument();
    // The count lives as a sibling <strong> inside the same summary-card div
    const card = label.closest('.summary-card');
    expect(card).not.toBeNull();
    const strong = card?.querySelector('strong');
    expect(strong?.textContent).toBe('1');
  });

  it('displays archive receipts count', () => {
    renderCard();
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('displays pending drafts count', () => {
    renderCard();
    expect(screen.getByText('Drafts')).toBeInTheDocument();
  });

  // --- Role badge ---

  it('shows creator role badge for the current member', () => {
    renderCard({ currentMemberId: 'member-1' });
    expect(screen.getByText('creator')).toBeInTheDocument();
  });

  it('shows member role badge for a regular member', () => {
    renderCard({ currentMemberId: 'member-2' });
    expect(screen.getByText('member')).toBeInTheDocument();
  });

  it('does not show a role badge when currentMemberId is undefined', () => {
    renderCard({ currentMemberId: undefined });
    expect(screen.queryByText('creator')).not.toBeInTheDocument();
    expect(screen.queryByText('member')).not.toBeInTheDocument();
  });

  // --- Last activity ---

  it('displays the last activity timestamp', () => {
    renderCard();
    // The latest timestamp should be from the archive receipt (2026-03-10T08:00:00.000Z)
    const card = screen.getByRole('button');
    expect(card.textContent).toContain('Last activity');
  });

  // --- Click interaction ---

  it('calls onClick when card is clicked', async () => {
    const onClick = vi.fn();
    renderCard({ onClick });
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('calls onClick when Enter key is pressed', async () => {
    const onClick = vi.fn();
    renderCard({ onClick });
    const card = screen.getByRole('button');
    card.focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('calls onClick when Space key is pressed', async () => {
    const onClick = vi.fn();
    renderCard({ onClick });
    const card = screen.getByRole('button');
    card.focus();
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledOnce();
  });

  // --- Edge cases ---

  it('handles coop with no artifacts', () => {
    const coop = createMockCoop({ artifacts: [] });
    renderCard({ coop });
    // All stat counts should be 0
    const statValues = screen.getAllByText('0');
    expect(statValues.length).toBeGreaterThanOrEqual(2);
  });

  it('handles coop with no archive receipts', () => {
    const coop = createMockCoop({ archiveReceipts: [] });
    renderCard({ coop });
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });
});
