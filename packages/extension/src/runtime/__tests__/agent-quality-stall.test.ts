import { describe, expect, it } from 'vitest';
import {
  AGENT_QUALITY_STALL_THRESHOLD,
  AGENT_QUALITY_WINDOW_SIZE,
  computeQualityTrend,
  pushQualityScore,
} from '../agent-config';

describe('computeQualityTrend', () => {
  it('returns stable for fewer than 3 scores', () => {
    expect(computeQualityTrend([])).toBe('stable');
    expect(computeQualityTrend([0.8])).toBe('stable');
    expect(computeQualityTrend([0.8, 0.7])).toBe('stable');
  });

  it('returns stable when scores are consistent', () => {
    expect(computeQualityTrend([0.8, 0.78, 0.82, 0.79, 0.81, 0.8])).toBe('stable');
  });

  it('returns degrading when recent scores drop significantly', () => {
    // Earlier: [0.8, 0.8, 0.8], Recent: [0.5, 0.5, 0.5] — drop of 0.3
    expect(computeQualityTrend([0.8, 0.8, 0.8, 0.5, 0.5, 0.5])).toBe('degrading');
  });

  it('returns recovering when recent scores rise significantly', () => {
    // Earlier: [0.3, 0.3, 0.3], Recent: [0.6, 0.6, 0.6] — rise of 0.3
    expect(computeQualityTrend([0.3, 0.3, 0.3, 0.6, 0.6, 0.6])).toBe('recovering');
  });

  it('returns stable when only 3 scores exist (no earlier window)', () => {
    expect(computeQualityTrend([0.8, 0.7, 0.6])).toBe('stable');
  });

  it('detects degradation at threshold boundary', () => {
    // Earlier avg: 0.5, Recent avg: 0.34 — drop of 0.16 > 0.15 threshold
    expect(computeQualityTrend([0.5, 0.5, 0.5, 0.34, 0.34, 0.34])).toBe('degrading');
  });

  it('returns stable for marginal drops below threshold', () => {
    // Earlier avg: 0.5, Recent avg: 0.36 — drop of 0.14 < 0.15 threshold
    expect(computeQualityTrend([0.5, 0.5, 0.5, 0.36, 0.36, 0.36])).toBe('stable');
  });
});

describe('pushQualityScore', () => {
  it('appends scores to the window', () => {
    expect(pushQualityScore([], 0.8)).toEqual([0.8]);
    expect(pushQualityScore([0.8], 0.7)).toEqual([0.8, 0.7]);
  });

  it('trims to window size', () => {
    const scores = Array.from({ length: AGENT_QUALITY_WINDOW_SIZE }, () => 0.8);
    const result = pushQualityScore(scores, 0.5);
    expect(result).toHaveLength(AGENT_QUALITY_WINDOW_SIZE);
    expect(result[result.length - 1]).toBe(0.5);
    expect(result[0]).toBe(0.8);
  });

  it('does not mutate the input array', () => {
    const original = [0.8, 0.7];
    pushQualityScore(original, 0.6);
    expect(original).toEqual([0.8, 0.7]);
  });
});

describe('quality stall threshold', () => {
  it('threshold is 0.3', () => {
    expect(AGENT_QUALITY_STALL_THRESHOLD).toBe(0.3);
  });

  it('window size is 10', () => {
    expect(AGENT_QUALITY_WINDOW_SIZE).toBe(10);
  });
});
