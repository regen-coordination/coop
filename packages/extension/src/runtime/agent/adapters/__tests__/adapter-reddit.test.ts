import { describe, expect, it } from 'vitest';
import { parseRedditPosts } from '../reddit';
import redditFixture from './fixtures/reddit-subreddit-hot.json';

describe('parseRedditPosts', () => {
  it('returns posts with content from fixture', () => {
    const results = parseRedditPosts(redditFixture, 'r/ethereum');

    expect(results.length).toBe(2);
    expect(results[0].title).toBe('EIP-4337 Account Abstraction Update');
    expect(results[0].body).toContain('account abstraction');
    expect(results[0].sourceRef).toContain('reddit:r/ethereum');
    expect(results[0].metadata).toHaveProperty('score', 342);
    expect(results[0].metadata).toHaveProperty('author', 'eth_dev');
  });
});
