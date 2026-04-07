import { describe, expect, it } from 'vitest';
import { parseWikipediaArticle } from '../wikipedia';
import articleFixture from './fixtures/wikipedia-article.json';
import notFoundFixture from './fixtures/wikipedia-not-found.json';

describe('parseWikipediaArticle', () => {
  it('returns StructuredContent with extract and categories', () => {
    const result = parseWikipediaArticle(articleFixture, 'Ethereum');

    expect(result.title).toBe('Ethereum');
    expect(result.body).toContain('decentralized blockchain platform');
    expect(result.sourceRef).toBe('wikipedia:Ethereum');
    expect(result.fetchedAt).toBeTruthy();
    expect(result.metadata).toHaveProperty('categories');
    expect(result.metadata.categories).toContain('Blockchains');
    expect(result.metadata.categories).toContain('Cryptocurrency');
  });

  it('handles not-found gracefully', () => {
    const result = parseWikipediaArticle(notFoundFixture, 'NonexistentPage');

    expect(result.title).toBe('NonexistentPage');
    expect(result.body).toBe('');
    expect(result.metadata).toHaveProperty('error', true);
  });

  it('extracts section headings as structured metadata', () => {
    const result = parseWikipediaArticle(articleFixture, 'Ethereum');

    expect(result.metadata).toHaveProperty('sections');
    const sections = result.metadata.sections as string[];
    expect(sections).toContain('History');
    expect(sections).toContain('Design');
  });
});
