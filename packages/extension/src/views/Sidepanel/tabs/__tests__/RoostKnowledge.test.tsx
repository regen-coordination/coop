import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { type KnowledgeTopic, RoostKnowledgeSection } from '../RoostKnowledgeSection';

afterEach(cleanup);

const TOPICS: KnowledgeTopic[] = [
  { topic: 'Watershed Restoration', depth: 72, sourceCount: 3 },
  { topic: 'Soil Carbon', depth: 90, sourceCount: 5 },
  { topic: 'Agroforestry', depth: 45, sourceCount: 2 },
];

const STATS = { entities: 42, relationships: 18, sources: 5 };

describe('RoostKnowledgeSection', () => {
  it('renders topic bars sorted by depth descending', () => {
    render(<RoostKnowledgeSection topics={TOPICS} stats={STATS} />);

    const topicNames = screen.getAllByTestId('topic-bar-label').map((el) => el.textContent);
    expect(topicNames).toEqual(['Soil Carbon', 'Watershed Restoration', 'Agroforestry']);
  });

  it('shows summary stats', () => {
    render(<RoostKnowledgeSection topics={TOPICS} stats={STATS} />);

    expect(screen.getByText(/42 entities/)).toBeInTheDocument();
    expect(screen.getByText(/18 relationships/)).toBeInTheDocument();
    // Use getAllByText since "5 sources" appears in both TopicBar meta and stats
    const sourceMatches = screen.getAllByText(/5 sources/);
    expect(sourceMatches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when topics array is empty', () => {
    render(
      <RoostKnowledgeSection topics={[]} stats={{ entities: 0, relationships: 0, sources: 0 }} />,
    );

    expect(
      screen.getByText('No knowledge yet \u2014 add sources in Nest to get started'),
    ).toBeInTheDocument();
  });

  it('shows correct number of TopicBar components', () => {
    render(<RoostKnowledgeSection topics={TOPICS} stats={STATS} />);

    const bars = screen.getAllByTestId('topic-bar');
    expect(bars).toHaveLength(3);
  });
});
