import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { type DecisionEntry, RoostDecisionHistory } from '../RoostDecisionHistory';

afterEach(cleanup);

const FIXED_NOW = '2026-03-22T12:00:00.000Z';

function makeDecision(overrides: Partial<DecisionEntry> = {}): DecisionEntry {
  return {
    id: `dec-${Math.random().toString(36).slice(2, 8)}`,
    skillId: 'assess-watershed',
    confidence: 0.87,
    timestamp: FIXED_NOW,
    outcome: 'approved',
    sourceRefs: ['source-1', 'source-2'],
    ...overrides,
  };
}

describe('RoostDecisionHistory', () => {
  it('renders decision entries with badges', () => {
    const decisions = [makeDecision({ id: 'dec-1' })];
    render(<RoostDecisionHistory decisions={decisions} />);

    expect(screen.getByText('Decision History')).toBeInTheDocument();
    const entries = screen.getAllByTestId('decision-entry');
    expect(entries).toHaveLength(1);
  });

  it('shows skill ID and confidence percentage for each entry', () => {
    const decisions = [
      makeDecision({ id: 'dec-1', skillId: 'assess-watershed', confidence: 0.87 }),
    ];
    render(<RoostDecisionHistory decisions={decisions} />);

    expect(screen.getByText('assess-watershed')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('shows outcome badge for each entry', () => {
    const decisions = [
      makeDecision({ id: 'dec-1', outcome: 'approved' }),
      makeDecision({ id: 'dec-2', outcome: 'rejected' }),
      makeDecision({ id: 'dec-3', outcome: 'skipped' }),
    ];
    render(<RoostDecisionHistory decisions={decisions} />);

    expect(screen.getByText('approved')).toBeInTheDocument();
    expect(screen.getByText('rejected')).toBeInTheDocument();
    expect(screen.getByText('skipped')).toBeInTheDocument();
  });

  it('shows "Based on" source refs', () => {
    const decisions = [
      makeDecision({ id: 'dec-1', sourceRefs: ['ref-alpha', 'ref-beta', 'ref-gamma'] }),
    ];
    render(<RoostDecisionHistory decisions={decisions} />);

    expect(screen.getByText(/Based on/)).toBeInTheDocument();
    expect(screen.getByText(/ref-alpha/)).toBeInTheDocument();
    expect(screen.getByText(/ref-beta/)).toBeInTheDocument();
    expect(screen.getByText(/ref-gamma/)).toBeInTheDocument();
  });

  it('shows precedent note when present', () => {
    const decisions = [
      makeDecision({
        id: 'dec-1',
        precedentNote: 'Similar watershed assessment was approved last cycle',
      }),
    ];
    render(<RoostDecisionHistory decisions={decisions} />);

    expect(
      screen.getByText('Similar watershed assessment was approved last cycle'),
    ).toBeInTheDocument();
  });

  it('applies muted styling to skipped decisions', () => {
    const decisions = [makeDecision({ id: 'dec-1', outcome: 'skipped' })];
    render(<RoostDecisionHistory decisions={decisions} />);

    const entry = screen.getByTestId('decision-entry');
    expect(entry.className).toContain('muted');
  });

  it('displays at most 12 items', () => {
    const decisions = Array.from({ length: 15 }, (_, i) => makeDecision({ id: `dec-${i}` }));
    render(<RoostDecisionHistory decisions={decisions} />);

    const entries = screen.getAllByTestId('decision-entry');
    expect(entries).toHaveLength(12);
  });

  it('shows empty state when no decisions', () => {
    render(<RoostDecisionHistory decisions={[]} />);

    expect(screen.getByText('No decisions recorded yet')).toBeInTheDocument();
  });
});
