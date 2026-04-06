import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TopicBar } from '../TopicBar';

describe('TopicBar', () => {
  it('renders the topic label', () => {
    render(<TopicBar topic="Regenerative Agriculture" depth={0.75} sourceCount={4} />);
    expect(screen.getByText('Regenerative Agriculture')).toBeInTheDocument();
  });

  it('shows source count text', () => {
    render(<TopicBar topic="Web3" depth={0.5} sourceCount={4} />);
    expect(screen.getByText('4 sources')).toBeInTheDocument();
  });

  it('shows singular source count', () => {
    render(<TopicBar topic="Web3" depth={0.5} sourceCount={1} />);
    expect(screen.getByText('1 source')).toBeInTheDocument();
  });

  it('fill width matches depth percentage at 80%', () => {
    const { container } = render(<TopicBar topic="DeFi" depth={0.8} sourceCount={3} />);
    const fill = container.querySelector('.topic-bar__fill') as HTMLElement;
    expect(fill).toBeInTheDocument();
    expect(fill.style.width).toBe('80%');
  });

  it('handles 0% depth edge case', () => {
    const { container } = render(<TopicBar topic="Empty" depth={0} sourceCount={0} />);
    const fill = container.querySelector('.topic-bar__fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('handles 100% depth edge case', () => {
    const { container } = render(<TopicBar topic="Full" depth={1} sourceCount={10} />);
    const fill = container.querySelector('.topic-bar__fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('renders .topic-bar container', () => {
    const { container } = render(<TopicBar topic="X" depth={0.5} sourceCount={2} />);
    expect(container.querySelector('.topic-bar')).toBeInTheDocument();
  });

  it('renders .topic-bar__fill element', () => {
    const { container } = render(<TopicBar topic="X" depth={0.5} sourceCount={2} />);
    expect(container.querySelector('.topic-bar__fill')).toBeInTheDocument();
  });
});
