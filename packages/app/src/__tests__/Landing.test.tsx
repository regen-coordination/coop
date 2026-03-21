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
    window.localStorage.clear();
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

  it('renders the simplified landing structure and footer links', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /no more loose chickens/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^how coop works$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^curate your coop$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^why we build$/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /curate your coop/i })).toHaveLength(2);
    expect(screen.getByText(/local, secure & private/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /github/i })).toBeInTheDocument();
  });

  it('fills flashcards and copies a setup packet', async () => {
    vi.useFakeTimers();

    render(<App />);

    fireEvent.change(screen.getByLabelText(/coop name/i), {
      target: { value: 'Pocket Flock' },
    });
    fireEvent.change(screen.getByLabelText(/what opportunity are you organizing around/i), {
      target: { value: 'Turn scattered notes into momentum.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^family$/i }));
    fireEvent.click(screen.getByRole('button', { name: /open knowledge flashcard/i }));

    fireEvent.change(screen.getByLabelText(/transcript notes for knowledge/i), {
      target: { value: 'We keep links in chats.' },
    });
    fireEvent.change(screen.getByLabelText(/how does your family handle knowledge today/i), {
      target: { value: 'Everyone keeps tabs in separate browsers.' },
    });
    fireEvent.change(
      screen.getByLabelText(/where does knowledge get stuck or scattered for your family/i),
      {
        target: { value: 'Good context disappears after calls.' },
      },
    );
    fireEvent.change(
      screen.getByLabelText(/what opportunity should coop unlock for your family/i),
      {
        target: { value: 'One reusable place for the best notes.' },
      },
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy setup packet/i }));
      await Promise.resolve();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledOnce();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('"coopName": "Pocket Flock"'),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('"purpose": "Turn scattered notes into momentum."'),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('"audience": "family"'),
    );

    act(() => {
      vi.runAllTimers();
    });

    vi.useRealTimers();
  });

  it('restores ritual progress from localStorage after a remount', () => {
    const firstRender = render(<App />);

    fireEvent.change(screen.getByLabelText(/coop name/i), {
      target: { value: 'Pocket Flock' },
    });
    fireEvent.click(screen.getByRole('button', { name: /open capital flashcard/i }));
    fireEvent.change(screen.getByLabelText(/transcript notes for capital/i), {
      target: { value: 'Grant leads from calls.' },
    });
    fireEvent.change(screen.getByLabelText(/meeting notes or transcript paste-in/i), {
      target: { value: 'Shared follow-up notes.' },
    });

    firstRender.unmount();

    render(<App />);

    expect(screen.getByLabelText(/coop name/i)).toHaveValue('Pocket Flock');
    expect(screen.getByLabelText(/transcript notes for capital/i)).toHaveValue(
      'Grant leads from calls.',
    );
    expect(screen.getByLabelText(/meeting notes or transcript paste-in/i)).toHaveValue(
      'Shared follow-up notes.',
    );
  });

  it('moves focus into an opened flashcard and returns it when the card closes', () => {
    render(<App />);

    const trigger = screen.getByRole('button', { name: /open knowledge flashcard/i });
    fireEvent.click(trigger);

    const transcriptField = screen.getByLabelText(/transcript notes for knowledge/i);
    expect(transcriptField).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: /close card/i }));
    expect(screen.getByRole('button', { name: /open knowledge flashcard/i })).toHaveFocus();
  });

  it('fills the open flashcard transcript when browser speech recognition is available', () => {
    let activeRecognition: MockSpeechRecognition | null = null;

    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = '';
      onend: (() => void) | null = null;
      onerror: ((event: { error?: string }) => void) | null = null;
      onresult:
        | ((event: {
            resultIndex?: number;
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

    fireEvent.click(screen.getByRole('button', { name: /open knowledge flashcard/i }));
    fireEvent.click(screen.getByRole('button', { name: /record knowledge notes/i }));

    act(() => {
      activeRecognition?.onresult?.({
        resultIndex: 0,
        results: [
          {
            0: { transcript: 'We keep grant links in chat.' },
            isFinal: true,
          },
        ],
      });
    });

    act(() => {
      activeRecognition?.onresult?.({
        resultIndex: 1,
        results: [
          {
            0: { transcript: 'We keep grant links in chat.' },
            isFinal: true,
          },
          {
            0: { transcript: 'We also keep follow-ups in calls.' },
            isFinal: true,
          },
        ],
      });
    });

    act(() => {
      activeRecognition?.onend?.();
    });

    expect(screen.getByLabelText(/transcript notes for knowledge/i)).toHaveValue(
      'We keep grant links in chat. We also keep follow-ups in calls.',
    );
    expect(screen.getByText(/transcript is ready to edit/i)).toBeInTheDocument();
  });

  it('renders a static story stage when reduced motion is preferred', () => {
    installMatchMediaMock(true);
    const { container } = render(<App />);

    expect(container.querySelector('.journey-scene-story.is-static')).not.toBeNull();
  });

  it('builds a setup packet with saved audience and shared notes', () => {
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
      {
        audience: 'friends',
        sharedNotes: 'Shared notes go here.',
      },
    );

    expect(packet.setupInsights.lenses).toHaveLength(4);
    expect(packet.summary).toContain('Pocket Flock uses Coop');
    expect(packet.transcripts.moneyAndResources).toBe('Grant notes');
    expect(packet.audience).toBe('friends');
    expect(packet.sharedNotes).toBe('Shared notes go here.');
  });
});
