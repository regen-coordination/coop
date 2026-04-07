import type { KnowledgeSourceType } from '../../contracts/schema-knowledge';
import type { CoopDexie } from '../storage/db-schema';

const SENSITIVE_PATH_PATTERNS = [/\/\.env\b/, /\/\.ssh\b/, /\/\.git\b/, /\/\.aws\b/];

const PATH_TRAVERSAL_PATTERN = /\.\.\//;

/**
 * Extracts the identifier from a URL based on source type.
 * For example, a GitHub URL https://github.com/owner/repo → "owner/repo"
 */
function extractIdentifier(url: URL, sourceType: KnowledgeSourceType): string {
  const hostname = url.hostname.replace(/^www\./, '');

  switch (sourceType) {
    case 'youtube': {
      // https://youtube.com/channel/UC_xxx or https://www.youtube.com/channel/UC_xxx
      const channelMatch = url.pathname.match(/\/channel\/([^/]+)/);
      if (channelMatch) return channelMatch[1];
      return url.pathname.replace(/^\//, '');
    }
    case 'github': {
      // https://github.com/owner/repo → owner/repo
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
      return url.pathname.replace(/^\//, '');
    }
    case 'rss':
      // Full URL as identifier for RSS feeds
      return `${hostname}${url.pathname}`;
    case 'reddit': {
      // https://reddit.com/r/subreddit → r/subreddit
      const match = url.pathname.match(/\/(r\/[^/]+)/);
      if (match) return match[1];
      return url.pathname.replace(/^\//, '');
    }
    case 'npm':
      // https://npmjs.com/package/name → name
      return url.pathname.replace(/^\/package\//, '').replace(/^\//, '');
    case 'wikipedia': {
      // https://en.wikipedia.org/wiki/Title → Title
      const wikiMatch = url.pathname.match(/\/wiki\/(.+)/);
      if (wikiMatch) return decodeURIComponent(wikiMatch[1]);
      return url.pathname.replace(/^\//, '');
    }
  }
}

/**
 * Assert that a URL is safe (not targeting private/local addresses or sensitive paths)
 * and is registered as an allowed source for the given coop.
 */
export async function assertAllowedSource(
  db: CoopDexie,
  rawUrl: string,
  sourceType: KnowledgeSourceType,
  coopId: string,
): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid source URL: ${rawUrl}`);
  }

  // Block private/reserved IP ranges and localhost
  const hostname = url.hostname;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname === '0.0.0.0';
  const isPrivateRange =
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

  if (isLocal || isPrivateRange) {
    throw new Error(`Source URL must not target private or local addresses: ${hostname}`);
  }

  // Block path traversal (check raw URL since URL constructor normalizes ../)
  if (PATH_TRAVERSAL_PATTERN.test(rawUrl)) {
    throw new Error(`Source URL contains path traversal: ${rawUrl}`);
  }

  // Block sensitive file paths
  for (const pattern of SENSITIVE_PATH_PATTERNS) {
    if (pattern.test(url.pathname)) {
      throw new Error(`Source URL targets a sensitive credential path: ${url.pathname}`);
    }
  }

  // Check that identifier is registered in the source registry
  const identifier = extractIdentifier(url, sourceType);
  const sources = await db.knowledgeSources
    .where('coopId')
    .equals(coopId)
    .filter((s) => s.active && s.type === sourceType)
    .toArray();

  const isRegistered = sources.some((s) => {
    // Exact match or normalized match
    if (s.identifier === identifier) return true;
    // For RSS, also try matching the full URL
    if (sourceType === 'rss' && s.identifier === rawUrl) return true;
    // Partial match for identifiers that may be embedded in longer identifiers
    if (identifier.includes(s.identifier)) return true;
    return false;
  });

  if (!isRegistered) {
    throw new Error(
      `Source not registered: "${identifier}" (type: ${sourceType}) is not in the allowlist for coop "${coopId}"`,
    );
  }
}
