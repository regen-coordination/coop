import { describe, expect, it } from 'vitest';
import { formatSourceRef } from '../card-shared';

describe('formatSourceRef', () => {
  it('parses youtube:channelId into type youtube', () => {
    const result = formatSourceRef('youtube:UC_x5XG1OV2P6uZZ5FSM9Ttw');
    expect(result).toEqual({ type: 'youtube', name: 'UC_x5XG1OV2P6uZZ5FSM9Ttw' });
  });

  it('parses github:owner/repo into type github', () => {
    const result = formatSourceRef('github:greenpill/coop');
    expect(result).toEqual({ type: 'github', name: 'greenpill/coop' });
  });

  it('parses rss:feedUrl into type rss', () => {
    const result = formatSourceRef('rss:https://example.com/feed.xml');
    expect(result).toEqual({ type: 'rss', name: 'https://example.com/feed.xml' });
  });

  it('parses web:domain into type web', () => {
    const result = formatSourceRef('web:example.com');
    expect(result).toEqual({ type: 'web', name: 'example.com' });
  });

  it('returns null for unknown format without colon', () => {
    expect(formatSourceRef('no-colon-here')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(formatSourceRef('')).toBeNull();
  });

  it('returns null for unknown type prefix', () => {
    expect(formatSourceRef('ftp:something')).toBeNull();
  });

  it('returns null when name portion is empty', () => {
    expect(formatSourceRef('youtube:')).toBeNull();
  });
});
