import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PrecedentIndicator } from '../PrecedentIndicator';

afterEach(cleanup);

describe('PrecedentIndicator', () => {
  it('renders nothing when precedent is null', () => {
    const { container } = render(<PrecedentIndicator precedent={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders positive outcome with decision text and acted-on suffix', () => {
    render(
      <PrecedentIndicator
        precedent={{ decision: 'Similar draft approved', outcome: 'positive', timeAgo: '2w ago' }}
      />,
    );
    expect(screen.getByText(/Similar draft approved/)).toBeInTheDocument();
    expect(screen.getByText(/2w ago/)).toBeInTheDocument();
    expect(screen.getByText(/acted on/)).toBeInTheDocument();
  });

  it('applies positive track-record class for positive outcome', () => {
    const { container } = render(
      <PrecedentIndicator
        precedent={{ decision: 'Draft approved', outcome: 'positive', timeAgo: '1w ago' }}
      />,
    );
    expect(container.querySelector('.draft-card__track-record--positive')).toBeInTheDocument();
  });

  it('renders negative outcome with decision text but no acted-on suffix', () => {
    const { container } = render(
      <PrecedentIndicator
        precedent={{ decision: 'Similar draft rejected', outcome: 'negative', timeAgo: '1w ago' }}
      />,
    );
    expect(screen.getByText(/Similar draft rejected/)).toBeInTheDocument();
    expect(screen.getByText(/1w ago/)).toBeInTheDocument();
    expect(container.textContent).not.toContain('acted on');
  });

  it('applies negative track-record class for negative outcome', () => {
    const { container } = render(
      <PrecedentIndicator
        precedent={{ decision: 'Draft rejected', outcome: 'negative', timeAgo: '3d ago' }}
      />,
    );
    expect(container.querySelector('.draft-card__track-record--negative')).toBeInTheDocument();
  });

  it('applies the base .draft-card__track-record class', () => {
    const { container } = render(
      <PrecedentIndicator
        precedent={{ decision: 'Some draft', outcome: 'positive', timeAgo: '5d ago' }}
      />,
    );
    expect(container.querySelector('.draft-card__track-record')).toBeInTheDocument();
  });
});
