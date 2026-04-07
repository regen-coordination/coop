import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TopicBar } from '../TopicBar';

afterEach(cleanup);

describe('TopicBar', () => {
  it('renders the topic label text', () => {
    render(<TopicBar topic="Regenerative Finance" depth={45} sourceCount={3} />);
    expect(screen.getByText('Regenerative Finance')).toBeInTheDocument();
  });

  it('renders the source count meta text', () => {
    render(<TopicBar topic="ZK Proofs" depth={60} sourceCount={7} />);
    expect(screen.getByText('(7 sources)')).toBeInTheDocument();
  });

  it('applies the .topic-bar container class', () => {
    const { container } = render(<TopicBar topic="DeFi" depth={30} sourceCount={2} />);
    expect(container.querySelector('.topic-bar')).toBeInTheDocument();
  });

  it('renders label, track, fill, and meta elements', () => {
    const { container } = render(<TopicBar topic="AI Safety" depth={50} sourceCount={4} />);
    expect(container.querySelector('.topic-bar__label')).toBeInTheDocument();
    expect(container.querySelector('.topic-bar__track')).toBeInTheDocument();
    expect(container.querySelector('.topic-bar__fill')).toBeInTheDocument();
    expect(container.querySelector('.topic-bar__meta')).toBeInTheDocument();
  });

  it('sets the fill width to the depth percentage', () => {
    const { container } = render(<TopicBar topic="Web3" depth={75} sourceCount={5} />);
    const fill = container.querySelector('.topic-bar__fill') as HTMLElement;
    expect(fill.style.width).toBe('75%');
  });

  it('handles 0% depth with an empty bar', () => {
    const { container } = render(<TopicBar topic="Empty" depth={0} sourceCount={0} />);
    const fill = container.querySelector('.topic-bar__fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('handles 100% depth with a full bar', () => {
    const { container } = render(<TopicBar topic="Full" depth={100} sourceCount={10} />);
    const fill = container.querySelector('.topic-bar__fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('displays singular source text for 1 source', () => {
    render(<TopicBar topic="Solo" depth={20} sourceCount={1} />);
    expect(screen.getByText('(1 source)')).toBeInTheDocument();
  });
});
