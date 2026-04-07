import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NestSourcesSection, type NestSourcesSectionProps } from '../NestSourcesSection';

// ---------------------------------------------------------------------------
// Deterministic test data
// ---------------------------------------------------------------------------

const FIXED_NOW = '2026-04-01T00:00:00.000Z';
const FRESH_DATE = '2026-03-28T12:00:00.000Z'; // 4 days before FIXED_NOW
const STALE_DATE = '2026-03-01T00:00:00.000Z'; // 31 days before FIXED_NOW

function makeSources(): NestSourcesSectionProps['sources'] {
  return [
    {
      id: 'src-1',
      type: 'youtube',
      identifier: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
      label: 'Google Developers',
      active: true,
      lastFetchedAt: FRESH_DATE,
      entityCount: 42,
    },
    {
      id: 'src-2',
      type: 'github',
      identifier: 'facebook/react',
      label: 'React',
      active: false,
      lastFetchedAt: STALE_DATE,
      entityCount: 18,
    },
    {
      id: 'src-3',
      type: 'rss',
      identifier: 'https://blog.example.com/feed',
      label: 'Example Blog',
      active: true,
      lastFetchedAt: null,
      entityCount: 0,
    },
  ];
}

function buildProps(overrides: Partial<NestSourcesSectionProps> = {}): NestSourcesSectionProps {
  return {
    sources: makeSources(),
    onAddSource: vi.fn(),
    onRemoveSource: vi.fn(),
    onToggleSource: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(cleanup);

describe('NestSourcesSection', () => {
  it('renders empty state when sources array is empty', () => {
    render(<NestSourcesSection {...buildProps({ sources: [] })} />);

    expect(screen.getByText(/no sources configured yet/i)).toBeInTheDocument();
  });

  it('renders source list with correct count', () => {
    render(<NestSourcesSection {...buildProps()} />);

    expect(screen.getByText('Google Developers')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Example Blog')).toBeInTheDocument();
  });

  it('each source shows SourceBadge with type and label', () => {
    const { container } = render(<NestSourcesSection {...buildProps()} />);

    // SourceBadge renders icons (▶, ⌥, ◉) + name — check for type CSS classes
    expect(container.querySelector('.source-icon--youtube')).toBeTruthy();
    expect(container.querySelector('.source-icon--github')).toBeTruthy();
    expect(container.querySelector('.source-icon--rss')).toBeTruthy();
  });

  it('each source shows entity count', () => {
    render(<NestSourcesSection {...buildProps()} />);

    // Use getAllByText for "0 entities" since it also partially matches the footer
    expect(screen.getByText('42 entities')).toBeInTheDocument();
    expect(screen.getByText('18 entities')).toBeInTheDocument();
    expect(screen.getByText('0 entities')).toBeInTheDocument();
  });

  it('active toggle calls onToggleSource with correct args', async () => {
    const user = userEvent.setup();
    const onToggleSource = vi.fn();
    render(<NestSourcesSection {...buildProps({ onToggleSource })} />);

    const toggles = screen.getAllByRole('checkbox', { name: /active/i });
    expect(toggles).toHaveLength(3);

    await user.click(toggles[0]); // youtube: active=true -> toggle to false
    expect(onToggleSource).toHaveBeenCalledWith('src-1', false);

    await user.click(toggles[1]); // github: active=false -> toggle to true
    expect(onToggleSource).toHaveBeenCalledWith('src-2', true);
  });

  it('"Add source" button reveals add form', async () => {
    const user = userEvent.setup();
    render(<NestSourcesSection {...buildProps()} />);

    expect(screen.queryByLabelText(/identifier/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add source/i }));

    expect(screen.getByLabelText(/identifier/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/label/i)).toBeInTheDocument();
  });

  it('add form submits with type, identifier, and label', async () => {
    const user = userEvent.setup();
    const onAddSource = vi.fn();
    render(<NestSourcesSection {...buildProps({ onAddSource })} />);

    await user.click(screen.getByRole('button', { name: /add source/i }));

    await user.click(screen.getByRole('radio', { name: /reddit/i }));

    await user.type(screen.getByLabelText(/identifier/i), 'r/reactjs');
    await user.type(screen.getByLabelText(/label/i), 'React Subreddit');

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(onAddSource).toHaveBeenCalledWith('reddit', 'r/reactjs', 'React Subreddit');
  });

  it('remove button calls onRemoveSource with correct id', async () => {
    const user = userEvent.setup();
    const onRemoveSource = vi.fn();
    render(<NestSourcesSection {...buildProps({ onRemoveSource })} />);

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    expect(removeButtons).toHaveLength(3);

    await user.click(removeButtons[1]); // second source = src-2
    expect(onRemoveSource).toHaveBeenCalledWith('src-2');
  });

  it('health dot shows fresh/stale/none based on lastFetchedAt', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW));

    try {
      const { container } = render(<NestSourcesSection {...buildProps()} />);

      const freshDots = container.querySelectorAll('.source-card__health--fresh');
      const staleDots = container.querySelectorAll('.source-card__health--stale');

      // src-1 (FRESH_DATE, 4 days ago) should be fresh
      expect(freshDots).toHaveLength(1);
      // src-2 (STALE_DATE, 31 days ago) should be stale
      expect(staleDots).toHaveLength(1);
      // src-3 (null) should have no health dot at all
      const allHealthDots = container.querySelectorAll('.source-card__health');
      expect(allHealthDots).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('footer shows total sources and entity count', () => {
    render(<NestSourcesSection {...buildProps()} />);

    expect(screen.getByText(/3 sources/i)).toBeInTheDocument();
    expect(screen.getByText(/60 entities total/i)).toBeInTheDocument();
  });
});
