import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrecedentIndicator } from '../PrecedentIndicator';

const positivePrecedent = {
  decision: 'approved',
  outcome: 'acted on',
  timeAgo: '2w ago',
};

const negativePrecedent = {
  decision: 'rejected',
  outcome: 'dismissed',
  timeAgo: '1w ago',
};

describe('PrecedentIndicator', () => {
  it('renders positive precedent text with decision, timeAgo, and outcome', () => {
    render(<PrecedentIndicator precedent={positivePrecedent} />);
    expect(screen.getByText(/approved/i)).toBeInTheDocument();
    expect(screen.getByText(/2w ago/i)).toBeInTheDocument();
    expect(screen.getByText(/acted on/i)).toBeInTheDocument();
  });

  it('renders negative precedent text', () => {
    render(<PrecedentIndicator precedent={negativePrecedent} />);
    expect(screen.getByText(/rejected/i)).toBeInTheDocument();
    expect(screen.getByText(/1w ago/i)).toBeInTheDocument();
  });

  it('renders null state as "No precedent"', () => {
    render(<PrecedentIndicator precedent={null} />);
    expect(screen.getByText(/no precedent/i)).toBeInTheDocument();
  });

  it('applies .draft-card__track-record class', () => {
    const { container } = render(<PrecedentIndicator precedent={positivePrecedent} />);
    expect(container.querySelector('.draft-card__track-record')).toBeInTheDocument();
  });

  it('applies positive modifier class for approved decisions', () => {
    const { container } = render(<PrecedentIndicator precedent={positivePrecedent} />);
    expect(container.querySelector('.draft-card__track-record--positive')).toBeInTheDocument();
  });

  it('applies negative modifier class for rejected decisions', () => {
    const { container } = render(<PrecedentIndicator precedent={negativePrecedent} />);
    expect(container.querySelector('.draft-card__track-record--negative')).toBeInTheDocument();
  });

  it('applies muted modifier class for null state', () => {
    const { container } = render(<PrecedentIndicator precedent={null} />);
    expect(container.querySelector('.draft-card__track-record--none')).toBeInTheDocument();
  });
});
