import type { CoopDexie } from '../storage/db-schema';
import { assertDenylist } from './url-utils';

/**
 * Assert that `url` is safe to fetch on behalf of `coopId`.
 *
 * Two-step check:
 *  1. Denylist — blocks private IPs, localhost, credential paths, path traversal.
 *  2. Registry  — the URL (or its domain) must match a registered KnowledgeSource
 *                 that is active for the given coop.
 *
 * Throws a descriptive Error if either check fails.
 */
export async function assertAllowedSource(
  db: CoopDexie,
  rawUrl: string,
  coopId: string,
): Promise<void> {
  // Step 1: denylist (throws on failure)
  const url = assertDenylist(rawUrl);

  // Step 2: registry check — the URL must match at least one active source for the coop
  const activeSources = await db.knowledgeSources
    .where('coopId')
    .equals(coopId)
    .filter((s) => s.active)
    .toArray();

  const isRegistered = activeSources.some((source) => {
    return matchesSource(url, source.identifier, source.type);
  });

  if (!isRegistered) {
    throw new Error(
      `URL is not allowed: "${rawUrl}" is not registered as a knowledge source for coop "${coopId}"`,
    );
  }
}

/**
 * Check if a URL matches a registered source identifier.
 * Each source type has its own matching strategy.
 */
function matchesSource(url: URL, identifier: string, type: string): boolean {
  switch (type) {
    case 'youtube': {
      // identifier is the channel URL; match by hostname + path prefix
      try {
        const src = new URL(identifier);
        return (
          url.hostname === src.hostname &&
          (url.pathname.startsWith(src.pathname) || src.pathname.startsWith(url.pathname))
        );
      } catch {
        return false;
      }
    }

    case 'github': {
      // identifier is "owner/repo"; match against api.github.com/repos/owner/repo paths
      // or github.com/owner/repo
      const cleanId = identifier.replace(/^\//, '');
      const repoPath = `/repos/${cleanId}`;
      return (
        (url.hostname === 'api.github.com' && url.pathname.startsWith(repoPath)) ||
        (url.hostname === 'github.com' && url.pathname.startsWith(`/${cleanId}`)) ||
        (url.hostname === 'raw.githubusercontent.com' && url.pathname.startsWith(`/${cleanId}`))
      );
    }

    case 'rss':
    case 'reddit':
    case 'npm':
    case 'wikipedia': {
      // identifier is a URL or partial path; match by hostname + pathname prefix
      try {
        const src = new URL(identifier);
        return url.hostname === src.hostname && url.pathname.startsWith(src.pathname);
      } catch {
        // identifier might not be a full URL (e.g. "r/ethereum", "viem") —
        // fall back to hostname check
        return url.href.includes(identifier);
      }
    }

    default:
      return false;
  }
}
