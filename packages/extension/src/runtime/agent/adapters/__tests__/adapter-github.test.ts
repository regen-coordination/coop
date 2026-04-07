import { describe, expect, it } from 'vitest';
import { parseGitHubRepoContext } from '../github';
import notFoundFixture from './fixtures/github-404.json';
import repoFixture from './fixtures/github-repo-contents.json';

describe('parseGitHubRepoContext', () => {
  it('returns StructuredContent for fixture', () => {
    const result = parseGitHubRepoContext(repoFixture, 'anthropics/claude-code');

    expect(result.title).toBe('anthropics/claude-code');
    expect(result.body).toContain('Claude Code');
    expect(result.body).toContain('CLI');
    expect(result.sourceRef).toBe('github:anthropics/claude-code');
    expect(result.fetchedAt).toBeTruthy();
    expect(result.metadata).toHaveProperty('language', 'TypeScript');
    expect(result.metadata).toHaveProperty('stars', 12500);
  });

  it('handles 404 fixture gracefully', () => {
    const result = parseGitHubRepoContext(notFoundFixture, 'nonexistent/repo');

    expect(result.title).toBe('nonexistent/repo');
    expect(result.body).toBe('');
    expect(result.metadata).toHaveProperty('error', true);
  });
});
