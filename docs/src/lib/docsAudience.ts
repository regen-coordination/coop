export type DocsAudience = 'community' | 'builder';

export const DEFAULT_AUDIENCE_PATHS: Record<DocsAudience, string> = {
  community: '/',
  builder: '/builder/getting-started',
};

const STORAGE_KEYS: Record<DocsAudience, string> = {
  community: 'coop-docs:last-community-path',
  builder: 'coop-docs:last-builder-path',
};

export function getDocsAudience(pathname: string): DocsAudience {
  return pathname.startsWith('/builder/') ? 'builder' : 'community';
}

function joinLocationParts(pathname: string, search = '', hash = ''): string {
  return `${pathname}${search}${hash}`;
}

function normalizeAudiencePath(path: string | null | undefined, audience: DocsAudience): string {
  if (!path) {
    return DEFAULT_AUDIENCE_PATHS[audience];
  }

  if (audience === 'builder' && !path.startsWith('/builder/')) {
    return DEFAULT_AUDIENCE_PATHS.builder;
  }

  if (audience === 'community' && path.startsWith('/builder/')) {
    return DEFAULT_AUDIENCE_PATHS.community;
  }

  return path;
}

export function rememberAudiencePath(pathname: string, search = '', hash = ''): void {
  if (typeof window === 'undefined') {
    return;
  }

  const audience = getDocsAudience(pathname);
  const value = normalizeAudiencePath(joinLocationParts(pathname, search, hash), audience);
  window.localStorage.setItem(STORAGE_KEYS[audience], value);
}

export function getRememberedAudiencePath(audience: DocsAudience): string {
  if (typeof window === 'undefined') {
    return DEFAULT_AUDIENCE_PATHS[audience];
  }

  return normalizeAudiencePath(window.localStorage.getItem(STORAGE_KEYS[audience]), audience);
}
