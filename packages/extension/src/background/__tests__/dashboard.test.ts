import { describe, expect, it } from 'vitest';
import { describeActionIndicator, summarizeSyncStatus } from '../dashboard';

describe('summarizeSyncStatus', () => {
  it('returns a healthy sync summary when runtime health is clear', () => {
    expect(
      summarizeSyncStatus({
        coopCount: 1,
        runtimeHealth: {
          offline: false,
          missingPermission: false,
          syncError: false,
        },
      }),
    ).toEqual({
      syncState: 'Peer-ready local-first sync',
      syncLabel: 'Healthy',
      syncDetail: 'Peer-ready local-first sync.',
      syncTone: 'ok',
    });
  });

  it('surfaces local-only sync when signaling is unavailable', () => {
    expect(
      summarizeSyncStatus({
        coopCount: 1,
        runtimeHealth: {
          offline: false,
          missingPermission: false,
          syncError: true,
          lastSyncError:
            'No signaling server connection. Shared sync is currently limited to this browser profile.',
        },
      }),
    ).toEqual({
      syncState:
        'No signaling server connection. Shared sync is currently limited to this browser profile.',
      syncLabel: 'Local',
      syncDetail:
        'No signaling server connection. Shared sync is currently limited to this browser profile.',
      syncTone: 'warning',
    });
  });

  it('prioritizes offline state over generic sync messaging', () => {
    expect(
      summarizeSyncStatus({
        coopCount: 1,
        runtimeHealth: {
          offline: true,
          missingPermission: false,
          syncError: false,
        },
      }),
    ).toEqual({
      syncState: 'Browser is offline. Shared sync will resume when the connection returns.',
      syncLabel: 'Offline',
      syncDetail: 'Browser is offline. Shared sync will resume when the connection returns.',
      syncTone: 'warning',
    });
  });

  it('describes a local-only toolbar state without visible badge text', () => {
    expect(
      describeActionIndicator({
        iconState: 'error-offline',
        coopCount: 1,
        pendingAttentionCount: 0,
        syncLabel: 'Local',
        syncDetail:
          'No signaling server connection. Shared sync is currently limited to this browser profile.',
        syncTone: 'warning',
      }),
    ).toEqual({
      badgeColor: '#a63b20',
      badgeText: '',
      title:
        'Coop: Local. No signaling server connection. Shared sync is currently limited to this browser profile.',
    });
  });

  it('prefers offline and error titles for the toolbar hover state', () => {
    expect(
      describeActionIndicator({
        iconState: 'error-offline',
        coopCount: 1,
        pendingAttentionCount: 2,
        syncLabel: 'Offline',
        syncDetail: 'Browser is offline. Shared sync will resume when the connection returns.',
        syncTone: 'warning',
      }).title,
    ).toBe(
      'Coop: Offline. Browser is offline. Shared sync will resume when the connection returns.',
    );

    expect(
      describeActionIndicator({
        iconState: 'error-offline',
        coopCount: 1,
        pendingAttentionCount: 2,
        syncLabel: 'Permission',
        syncDetail: 'Missing permission to reach the local sync runtime.',
        syncTone: 'error',
      }).title,
    ).toBe('Coop: Error. Missing permission to reach the local sync runtime.');
  });

  it('shows pending attention count as badge text when count > 0', () => {
    const result = describeActionIndicator({
      iconState: 'review-needed',
      coopCount: 1,
      pendingAttentionCount: 5,
      syncLabel: 'Healthy',
      syncDetail: 'Peer-ready local-first sync.',
      syncTone: 'ok',
    });
    expect(result.badgeText).toBe('5');
  });

  it('shows empty badge text when pending attention count is 0', () => {
    const result = describeActionIndicator({
      iconState: 'watching',
      coopCount: 1,
      pendingAttentionCount: 0,
      syncLabel: 'Healthy',
      syncDetail: 'Peer-ready local-first sync.',
      syncTone: 'ok',
    });
    expect(result.badgeText).toBe('');
  });

  it('caps badge text at 99+ for large counts', () => {
    const result = describeActionIndicator({
      iconState: 'review-needed',
      coopCount: 1,
      pendingAttentionCount: 150,
      syncLabel: 'Healthy',
      syncDetail: 'Peer-ready local-first sync.',
      syncTone: 'ok',
    });
    expect(result.badgeText).toBe('99+');
  });

  it('shows exact count at boundary value of 99', () => {
    const result = describeActionIndicator({
      iconState: 'review-needed',
      coopCount: 1,
      pendingAttentionCount: 99,
      syncLabel: 'Healthy',
      syncDetail: 'Peer-ready local-first sync.',
      syncTone: 'ok',
    });
    expect(result.badgeText).toBe('99');
  });
});
