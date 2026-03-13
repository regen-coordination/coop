import { describe, expect, it } from 'vitest';
import {
  checkReplayId,
  createReplayGuard,
  exportConsumedReplayIds,
  isReplayIdConsumed,
  recordExecutedReplayId,
} from '../replay';

describe('replay', () => {
  describe('createReplayGuard', () => {
    it('starts empty', () => {
      const guard = createReplayGuard();
      expect(exportConsumedReplayIds(guard)).toHaveLength(0);
    });

    it('initializes with existing IDs', () => {
      const guard = createReplayGuard(['replay-1', 'replay-2']);
      const ids = exportConsumedReplayIds(guard);
      expect(ids).toHaveLength(2);
      expect(ids).toContain('replay-1');
      expect(ids).toContain('replay-2');
    });
  });

  describe('isReplayIdConsumed', () => {
    it('returns false for unknown ID', () => {
      const guard = createReplayGuard();
      expect(isReplayIdConsumed(guard, 'replay-unknown')).toBe(false);
    });

    it('returns true for consumed ID', () => {
      const guard = createReplayGuard(['replay-1']);
      expect(isReplayIdConsumed(guard, 'replay-1')).toBe(true);
    });
  });

  describe('recordExecutedReplayId', () => {
    it('adds ID to guard', () => {
      const guard = createReplayGuard();
      const next = recordExecutedReplayId(guard, 'replay-new');

      expect(isReplayIdConsumed(next, 'replay-new')).toBe(true);
      // Original guard is not mutated
      expect(isReplayIdConsumed(guard, 'replay-new')).toBe(false);
    });
  });

  describe('checkReplayId', () => {
    it('returns ok for new ID', () => {
      const guard = createReplayGuard();
      const result = checkReplayId(guard, 'replay-fresh');
      expect(result.ok).toBe(true);
    });

    it('returns error for consumed ID', () => {
      const guard = createReplayGuard(['replay-used']);
      const result = checkReplayId(guard, 'replay-used');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('replay-used');
        expect(result.reason).toContain('already been executed');
      }
    });
  });

  describe('exportConsumedReplayIds', () => {
    it('returns all IDs', () => {
      let guard = createReplayGuard(['replay-1']);
      guard = recordExecutedReplayId(guard, 'replay-2');
      guard = recordExecutedReplayId(guard, 'replay-3');

      const ids = exportConsumedReplayIds(guard);
      expect(ids).toHaveLength(3);
      expect(ids).toContain('replay-1');
      expect(ids).toContain('replay-2');
      expect(ids).toContain('replay-3');
    });
  });
});
