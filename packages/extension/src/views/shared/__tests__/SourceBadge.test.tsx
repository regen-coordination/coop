import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SourceBadge } from '../SourceBadge';

afterEach(cleanup);

describe('SourceBadge', () => {
  it('renders a badge with the source name', () => {
    render(<SourceBadge type="youtube" name="3Blue1Brown" />);
    expect(screen.getByText('3Blue1Brown')).toBeInTheDocument();
  });

  it('applies the .badge class to the root span', () => {
    const { container } = render(<SourceBadge type="github" name="openai/tiktoken" />);
    const badge = container.querySelector('.badge');
    expect(badge).toBeInTheDocument();
    expect(badge?.tagName).toBe('SPAN');
  });

  it('renders a source icon element with type-specific class', () => {
    const { container } = render(<SourceBadge type="rss" name="Hacker News" />);
    const icon = container.querySelector('.source-icon');
    expect(icon).toBeInTheDocument();
    expect(container.querySelector('.source-icon--rss')).toBeInTheDocument();
  });

  it.each([
    ['youtube', '\u25B6'],
    ['github', '\u2325'],
    ['rss', '\u25C9'],
    ['reddit', '\u2B21'],
    ['npm', '\u2B22'],
    ['wikipedia', 'W'],
  ] as const)('renders the correct icon symbol for %s', (type, expectedSymbol) => {
    const { container } = render(<SourceBadge type={type} name="test" />);
    const icon = container.querySelector(`.source-icon--${type}`);
    expect(icon).toBeInTheDocument();
    expect(icon?.textContent).toBe(expectedSymbol);
  });

  it('renders both icon and name text within the badge', () => {
    const { container } = render(<SourceBadge type="npm" name="lodash" />);
    const badge = container.querySelector('.badge');
    expect(badge).toBeInTheDocument();
    expect(badge?.textContent).toContain('lodash');
    expect(badge?.querySelector('.source-icon')).toBeInTheDocument();
  });
});
