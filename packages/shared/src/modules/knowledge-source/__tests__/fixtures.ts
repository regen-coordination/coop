import type { KnowledgeSource } from '../../../contracts/schema-knowledge';

/**
 * Factory for KnowledgeSource test records.
 * Provide only the fields you care about; the rest get sensible defaults.
 */
export function makeKnowledgeSource(
  overrides: Partial<KnowledgeSource> & { type: KnowledgeSource['type'] },
): KnowledgeSource {
  const base: KnowledgeSource = {
    id: `ks-${overrides.type}-${crypto.randomUUID()}`,
    type: overrides.type,
    identifier: defaultIdentifier(overrides.type),
    label: `Test ${overrides.type} source`,
    coopId: 'coop-test-1',
    addedBy: 'member-test-1',
    addedAt: '2026-04-06T00:00:00.000Z',
    lastFetchedAt: undefined,
    entityCount: 0,
    active: true,
  };
  return { ...base, ...overrides };
}

function defaultIdentifier(type: KnowledgeSource['type']): string {
  switch (type) {
    case 'youtube':
      return 'https://www.youtube.com/@CoopChannel';
    case 'github':
      return 'greenpill-dev-guild/coop';
    case 'rss':
      return 'https://feeds.example.com/tech.rss';
    case 'reddit':
      return 'r/ethereum';
    case 'npm':
      return 'viem';
    case 'wikipedia':
      return 'Ethereum';
    default:
      return 'unknown';
  }
}

// Pre-built fixtures for each type
export const youtubeSource = makeKnowledgeSource({
  type: 'youtube',
  id: 'ks-youtube-1',
  identifier: 'https://www.youtube.com/@CoopChannel',
  label: 'Coop YouTube Channel',
});

export const githubSource = makeKnowledgeSource({
  type: 'github',
  id: 'ks-github-1',
  identifier: 'greenpill-dev-guild/coop',
  label: 'Coop GitHub Repo',
});

export const rssSource = makeKnowledgeSource({
  type: 'rss',
  id: 'ks-rss-1',
  identifier: 'https://feeds.example.com/tech.rss',
  label: 'Tech RSS Feed',
});

export const redditSource = makeKnowledgeSource({
  type: 'reddit',
  id: 'ks-reddit-1',
  identifier: 'r/ethereum',
  label: 'Ethereum Subreddit',
});

export const npmSource = makeKnowledgeSource({
  type: 'npm',
  id: 'ks-npm-1',
  identifier: 'viem',
  label: 'Viem NPM Package',
});

export const wikipediaSource = makeKnowledgeSource({
  type: 'wikipedia',
  id: 'ks-wikipedia-1',
  identifier: 'Ethereum',
  label: 'Ethereum Wikipedia Article',
});

// Denylist fixture URLs — these must all be blocked by assertAllowedSource
export const DENYLIST_URLS = [
  'http://127.0.0.1/secret',
  'http://localhost/data',
  'http://0.0.0.0/dump',
  'http://[::1]/admin',
  'http://10.0.0.1/internal',
  'http://10.255.255.255/api',
  'http://192.168.1.1/router',
  'http://192.168.0.100/config',
  'http://172.16.0.1/priv',
  'http://172.31.255.254/priv',
  'https://example.com/.env',
  'https://example.com/config/.ssh/id_rsa',
  'https://example.com/../../../etc/passwd',
  'https://user:password@example.com/resource',
] as const;
