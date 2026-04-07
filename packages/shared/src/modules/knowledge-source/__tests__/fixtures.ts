import type { KnowledgeSource } from '../../../contracts/schema-knowledge';

let counter = 0;

export function makeKnowledgeSource(overrides: Partial<KnowledgeSource> = {}): KnowledgeSource {
  counter++;
  return {
    id: overrides.id ?? `ks-${counter}`,
    type: overrides.type ?? 'youtube',
    identifier: overrides.identifier ?? `test-source-${counter}`,
    label: overrides.label ?? `Test Source ${counter}`,
    coopId: overrides.coopId ?? 'coop-1',
    addedBy: overrides.addedBy ?? 'member-1',
    addedAt: overrides.addedAt ?? '2026-04-01T00:00:00.000Z',
    lastFetchedAt: overrides.lastFetchedAt ?? null,
    entityCount: overrides.entityCount ?? 0,
    active: overrides.active ?? true,
  };
}

export const YOUTUBE_SOURCE = makeKnowledgeSource({
  id: 'ks-yt-1',
  type: 'youtube',
  identifier: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  label: 'Google Developers',
});

export const GITHUB_SOURCE = makeKnowledgeSource({
  id: 'ks-gh-1',
  type: 'github',
  identifier: 'anthropics/claude-code',
  label: 'Claude Code',
});

export const RSS_SOURCE = makeKnowledgeSource({
  id: 'ks-rss-1',
  type: 'rss',
  identifier: 'https://example.com/feed.xml',
  label: 'Example Blog',
});

export const REDDIT_SOURCE = makeKnowledgeSource({
  id: 'ks-reddit-1',
  type: 'reddit',
  identifier: 'r/ethereum',
  label: 'Ethereum Subreddit',
});

export const NPM_SOURCE = makeKnowledgeSource({
  id: 'ks-npm-1',
  type: 'npm',
  identifier: 'viem',
  label: 'viem',
});

export const WIKIPEDIA_SOURCE = makeKnowledgeSource({
  id: 'ks-wiki-1',
  type: 'wikipedia',
  identifier: 'Ethereum',
  label: 'Ethereum (Wikipedia)',
});

/** URLs that should always be denied */
export const DENYLIST_URLS = [
  'http://127.0.0.1/secret',
  'http://localhost/admin',
  'http://10.0.0.1/internal',
  'http://192.168.1.1/config',
  'http://169.254.169.254/latest/meta-data/',
  'http://[::1]/admin',
  'http://0.0.0.0/admin',
  'https://example.com/.env',
  'https://example.com/.ssh/id_rsa',
  'https://example.com/../../etc/passwd',
];
