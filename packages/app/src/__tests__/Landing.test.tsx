import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../views/Landing';

describe('landing page', () => {
  it('renders the locked v1 sections and copies the ritual prompt', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    });

    render(<App />);

    expect(
      screen.getByRole('heading', { name: /turn knowledge into opportunity/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/no more chickens loose/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /fragmented knowledge becomes missed opportunity/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /give coop a little context/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /passive capture stays local/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /four icon states/i })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy helper prompt/i }));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledOnce();
    act(() => {
      vi.runAllTimers();
    });
    vi.useRealTimers();
  });
});
