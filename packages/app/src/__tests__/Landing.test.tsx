import { emptySetupInsightsInput } from '@coop/shared';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App, buildLandingSetupPacket, emptyLandingTranscripts } from '../views/Landing';

function installMatchMediaMock(matches = false) {
  const matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  });

  return matchMedia;
}

describe('landing page', () => {
  beforeEach(() => {
    installMatchMediaMock(false);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    const speechWindow = window as typeof window & {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };

    speechWindow.SpeechRecognition = undefined;
    speechWindow.webkitSpeechRecognition = undefined;
  });

  it('renders the merged narrative sections and support footer', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /gather your flock/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /coop gives scattered context one path into shared memory/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /pause the migration and define how this coop actually works/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /the flock finally has somewhere to stay/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start the ritual/i })).toBeInTheDocument();
    expect(screen.getByText(/privacy first/i)).toBeInTheDocument();
    expect(screen.getByText(/install extension/i)).toBeInTheDocument();
  });

  it('progresses through ritual cards and copies setup notes from the synthesis view', async () => {
    vi.useFakeTimers();

    render(<App />);

    fireEvent.change(screen.getByLabelText(/coop name/i), {
      target: { value: 'Pocket Flock' },
    });
    fireEvent.change(screen.getByLabelText(/why this coop exists/i), {
      target: { value: 'Keep good ideas from getting loose.' },
    });
    fireEvent.change(screen.getByLabelText(/how do you do this now/i), {
      target: { value: 'Funding context is scattered across chats and tabs.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /next lens/i }));
    expect(screen.getByRole('heading', { name: /impact & progress/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /view setup notes/i }));
    expect(
      screen.getByRole('heading', { name: /turn the ritual into setup notes/i }),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy setup notes/i }));
      await Promise.resolve();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledOnce();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('"coopName": "Pocket Flock"'),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('"purpose": "Keep good ideas from getting loose."'),
    );

    act(() => {
      vi.runAllTimers();
    });

    vi.useRealTimers();
  });

  it('fills the active transcript panel when browser speech recognition is available', () => {
    let activeRecognition: MockSpeechRecognition | null = null;

    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      onend: (() => void) | null = null;
      onerror: ((event: { error?: string }) => void) | null = null;
      onresult:
        | ((event: {
            results: ArrayLike<{ isFinal: boolean; 0: { transcript?: string } }>;
          }) => void)
        | null = null;
      onstart: (() => void) | null = null;

      start() {
        activeRecognition = this;
        this.onstart?.();
      }

      stop() {
        this.onend?.();
      }

      abort() {
        this.onend?.();
      }
    }

    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      writable: true,
      value: MockSpeechRecognition,
    });

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /record lens notes/i }));

    act(() => {
      activeRecognition?.onresult?.({
        results: [
          {
            0: { transcript: 'We keep grant links in chat.' },
            isFinal: true,
          },
        ],
      });
    });

    act(() => {
      activeRecognition?.onend?.();
    });

    expect(screen.getByLabelText(/transcript notes for this lens/i)).toHaveValue(
      'We keep grant links in chat.',
    );
    expect(screen.getByText(/transcript is ready to edit/i)).toBeInTheDocument();
  });

  it('renders a static story stage when reduced motion is preferred', () => {
    installMatchMediaMock(true);
    const { container } = render(<App />);

    expect(container.querySelector('.journey-scene-story.is-static')).not.toBeNull();
  });

  it('builds a setup packet that keeps transcript buckets alongside shared setup insights', () => {
    const packet = buildLandingSetupPacket(
      {
        ...emptySetupInsightsInput,
        coopName: 'Pocket Flock',
        purpose: 'Keep useful context from getting loose.',
      },
      {
        ...emptyLandingTranscripts,
        capital: 'Grant notes',
      },
    );

    expect(packet.setupInsights.lenses).toHaveLength(4);
    expect(packet.summary).toContain('Pocket Flock uses Coop');
    expect(packet.transcripts.moneyAndResources).toBe('Grant notes');
  });
});
