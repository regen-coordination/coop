import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SourceBadge } from '../SourceBadge';

describe('SourceBadge', () => {
  it('renders the source name text', () => {
    render(<SourceBadge type="youtube" name="Coop Channel" />);
    expect(screen.getByText('Coop Channel')).toBeInTheDocument();
  });

  it('applies .badge class', () => {
    const { container } = render(<SourceBadge type="youtube" name="Coop Channel" />);
    expect(container.querySelector('.badge')).toBeInTheDocument();
  });

  it('renders youtube source type with correct class', () => {
    const { container } = render(<SourceBadge type="youtube" name="My Channel" />);
    expect(container.querySelector('.source-icon--youtube')).toBeInTheDocument();
  });

  it('renders github source type with correct class', () => {
    const { container } = render(<SourceBadge type="github" name="my-repo" />);
    expect(container.querySelector('.source-icon--github')).toBeInTheDocument();
  });

  it('renders rss source type with correct class', () => {
    const { container } = render(<SourceBadge type="rss" name="My Blog" />);
    expect(container.querySelector('.source-icon--rss')).toBeInTheDocument();
  });

  it('renders reddit source type with correct class', () => {
    const { container } = render(<SourceBadge type="reddit" name="r/solarpunk" />);
    expect(container.querySelector('.source-icon--reddit')).toBeInTheDocument();
  });

  it('renders npm source type with correct class', () => {
    const { container } = render(<SourceBadge type="npm" name="viem" />);
    expect(container.querySelector('.source-icon--npm')).toBeInTheDocument();
  });

  it('renders wikipedia source type with correct class', () => {
    const { container } = render(<SourceBadge type="wikipedia" name="Solarpunk" />);
    expect(container.querySelector('.source-icon--wikipedia')).toBeInTheDocument();
  });

  it('applies source-specific class to wrapper', () => {
    const { container } = render(<SourceBadge type="github" name="owner/repo" />);
    expect(container.querySelector('.badge--source-github')).toBeInTheDocument();
  });
});
