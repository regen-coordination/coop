import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRSSFeed } from '../rss';

const atomFixture = readFileSync(resolve(__dirname, 'fixtures/rss-feed-atom.xml'), 'utf-8');
const rss2Fixture = readFileSync(resolve(__dirname, 'fixtures/rss-feed-rss2.xml'), 'utf-8');

describe('parseRSSFeed', () => {
  it('parses Atom fixture correctly', () => {
    const results = parseRSSFeed(atomFixture, 'https://blog.example.com/feed.xml');

    expect(results.length).toBe(2);
    expect(results[0].title).toBe('Understanding Knowledge Graphs');
    expect(results[0].body).toContain('Knowledge graphs');
    expect(results[0].sourceRef).toContain('blog.example.com');
  });

  it('parses RSS 2.0 fixture correctly', () => {
    const results = parseRSSFeed(rss2Fixture, 'https://technews.example.com/feed');

    expect(results.length).toBe(2);
    expect(results[0].title).toBe('WebAssembly Gets New Features');
    expect(results[0].body).toContain('WebAssembly');
  });

  it('deduplicates by article GUID', () => {
    const doubled = rss2Fixture;
    const results = parseRSSFeed(doubled, 'https://technews.example.com/feed');

    const guids = results.map((r) => r.metadata.guid);
    const unique = new Set(guids);
    expect(guids.length).toBe(unique.size);
  });

  it('returns only items after lastFetchedAt', () => {
    // Only items after March 31 2026 — should exclude "Browser Extensions in 2026"
    const results = parseRSSFeed(
      rss2Fixture,
      'https://technews.example.com/feed',
      '2026-03-31T12:00:00Z',
    );

    expect(results.length).toBe(1);
    expect(results[0].title).toBe('WebAssembly Gets New Features');
  });
});
