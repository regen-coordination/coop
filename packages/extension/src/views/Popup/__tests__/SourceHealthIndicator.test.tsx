import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SourceHealthIndicator } from '../SourceHealthIndicator';

afterEach(cleanup);

describe('SourceHealthIndicator', () => {
  it('shows active count and "all fresh" with green dot when nothing is stale', () => {
    render(<SourceHealthIndicator activeCount={12} staleCount={0} totalCount={12} />);

    expect(screen.getByText(/12 active/)).toBeDefined();
    expect(screen.getByText(/all fresh/)).toBeDefined();

    const dot = document.querySelector('.source-card__health--fresh');
    expect(dot).not.toBeNull();
    expect(document.querySelector('.source-card__health--stale')).toBeNull();
  });

  it('shows active and stale counts with yellow dot when sources are stale', () => {
    render(<SourceHealthIndicator activeCount={11} staleCount={1} totalCount={12} />);

    expect(screen.getByText(/11 active/)).toBeDefined();
    expect(screen.getByText(/1 stale/)).toBeDefined();

    const dot = document.querySelector('.source-card__health--stale');
    expect(dot).not.toBeNull();
    expect(document.querySelector('.source-card__health--fresh')).toBeNull();
  });

  it('shows "0 configured" with no health dot when totalCount is zero', () => {
    render(<SourceHealthIndicator activeCount={0} staleCount={0} totalCount={0} />);

    expect(screen.getByText(/0 configured/)).toBeDefined();
    expect(document.querySelector('.source-card__health')).toBeNull();
  });

  it('calls onOpenSources when clicked', async () => {
    const onOpenSources = vi.fn();
    render(
      <SourceHealthIndicator
        activeCount={5}
        staleCount={0}
        totalCount={5}
        onOpenSources={onOpenSources}
      />,
    );

    const button = screen.getByRole('button');
    await userEvent.click(button);
    expect(onOpenSources).toHaveBeenCalledTimes(1);
  });

  it('does not crash when onOpenSources is undefined and button is clicked', async () => {
    render(<SourceHealthIndicator activeCount={3} staleCount={0} totalCount={3} />);

    const button = screen.getByRole('button');
    await userEvent.click(button);
    // No throw -- test passes if we reach here
  });
});
