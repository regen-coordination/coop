import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getActiveTabCaptureAccessStatus,
  preflightActiveTabCapture,
  preflightManualCapture,
  toOriginPattern,
} from '../capture-preflight';

describe('capture preflight', () => {
  const contains = vi.fn();
  const request = vi.fn();
  const query = vi.fn();

  beforeEach(() => {
    contains.mockReset();
    request.mockReset();
    query.mockReset();

    Object.defineProperty(globalThis, 'chrome', {
      configurable: true,
      value: {
        tabs: {
          query,
        },
        permissions: {
          contains,
          request,
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'chrome');
  });

  it('skips permission prompts when the standard tab origins are already granted', async () => {
    query.mockResolvedValue([
      { url: 'http://127.0.0.1:3001/manual-roundup-fixture.html' },
      { url: 'chrome-extension://abc123/popup.html' },
    ]);
    contains.mockResolvedValue(true);

    const result = await preflightManualCapture();

    expect(result).toEqual({ ok: true });
    expect(contains).toHaveBeenCalledWith({
      origins: ['http://127.0.0.1/*'],
    });
    expect(request).not.toHaveBeenCalled();
  });

  it('relies on the activeTab grant for user-initiated active-tab capture', async () => {
    query.mockResolvedValue([{ url: 'https://example.com/path?q=1' }]);
    contains.mockResolvedValue(false);
    request.mockResolvedValue(true);

    const result = await preflightActiveTabCapture();

    expect(result).toMatchObject({ ok: true, tab: { url: 'https://example.com/path?q=1' } });
    expect(query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(contains).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('builds stable origin patterns for standard web urls', () => {
    expect(toOriginPattern('http://127.0.0.1:3001/fixture')).toBe('http://127.0.0.1/*');
    expect(toOriginPattern('https://example.com/foo?bar=1')).toBe('https://example.com/*');
    expect(toOriginPattern('chrome-extension://coop/popup.html')).toBe('chrome-extension://coop/*');
  });

  it('reports active-site access when the origin permission is already granted', async () => {
    query.mockResolvedValue([{ url: 'https://example.com/path?q=1' }]);
    contains.mockResolvedValue(true);

    const result = await getActiveTabCaptureAccessStatus();

    expect(result).toEqual({
      label: 'This site',
      detail:
        'Coop already has site access here, so roundup can inspect this page without another prompt.',
      tone: 'ok',
    });
    expect(contains).toHaveBeenCalledWith({
      origins: ['https://example.com/*'],
    });
  });

  it('reports on-demand access when the active site is standard but not yet granted', async () => {
    query.mockResolvedValue([{ url: 'https://example.com/path?q=1' }]);
    contains.mockResolvedValue(false);

    const result = await getActiveTabCaptureAccessStatus();

    expect(result).toEqual({
      label: 'On demand',
      detail:
        'Capture this tab still works from the popup. Coop will ask for broader roundup access only when needed.',
      tone: 'ok',
    });
  });
});
