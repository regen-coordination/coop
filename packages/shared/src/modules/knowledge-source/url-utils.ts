/**
 * Shared URL safety utilities used by both assertAllowedSource() and
 * (in the extension package) assertSafeSkillUrl().
 *
 * These run in the shared package so they can be tested independently of
 * the extension runtime.
 */

const CREDENTIAL_PATH_PATTERNS = [
  /\/\.env($|\/)/i,
  /\/\.env\./i,
  /\/\.ssh\//i,
  /\/\.aws\//i,
  /\/\.gnupg\//i,
  /credentials/i,
];

const PATH_TRAVERSAL_PATTERN = /\.\.\//;

/**
 * Check whether a URL targets a private / reserved network address.
 * Returns an error string if blocked, null if safe.
 */
export function checkPrivateAddress(hostname: string): string | null {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, ''); // strip IPv6 brackets

  if (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '0.0.0.0'
  ) {
    return `URL must not target private or local addresses: ${hostname}`;
  }

  if (
    normalized.startsWith('10.') ||
    normalized.startsWith('192.168.') ||
    normalized.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(normalized)
  ) {
    return `URL must not target private or local addresses: ${hostname}`;
  }

  return null;
}

/**
 * Check whether a URL path references credential files.
 * Returns an error string if blocked, null if safe.
 */
export function checkCredentialPaths(url: URL): string | null {
  // Reject URLs with embedded credentials (user:pass@host)
  if (url.username || url.password) {
    return `URL must not contain embedded credentials: ${url.host}`;
  }

  const pathname = url.pathname;
  for (const pattern of CREDENTIAL_PATH_PATTERNS) {
    if (pattern.test(pathname)) {
      return `URL is blocked — credential file path detected: ${pathname}`;
    }
  }

  return null;
}

/**
 * Check for path traversal attempts.
 * Returns an error string if blocked, null if safe.
 */
export function checkPathTraversal(url: URL): string | null {
  // Normalize the URL first; if the resolved pathname differs from the raw
  // pathname that means traversal sequences were collapsed
  const raw = url.pathname;
  if (PATH_TRAVERSAL_PATTERN.test(raw)) {
    return `URL is blocked — path traversal detected: ${raw}`;
  }
  return null;
}

/**
 * Run all denylist checks against a raw URL string.
 * Throws an Error with a descriptive message if the URL is blocked.
 */
export function assertDenylist(raw: string): URL {
  // Check path traversal on raw string BEFORE URL normalization resolves ../
  if (PATH_TRAVERSAL_PATTERN.test(raw)) {
    throw new Error(`URL is blocked — path traversal detected: ${raw}`);
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`URL must use HTTP or HTTPS. Received: ${url.protocol}`);
  }

  const privateError = checkPrivateAddress(url.hostname);
  if (privateError) throw new Error(privateError);

  const credError = checkCredentialPaths(url);
  if (credError) throw new Error(credError);

  const traversalError = checkPathTraversal(url);
  if (traversalError) throw new Error(traversalError);

  return url;
}
