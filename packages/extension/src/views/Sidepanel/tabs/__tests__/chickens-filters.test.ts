import { describe, expect, it } from 'vitest';
import {
  type ChickensFilterState,
  applyChickensFilters,
  buildCategoryOptions,
  groupByTime,
  isFilterActive,
} from '../chickens-filters';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: 'draft-1',
    title: 'Draft one',
    category: 'insight' as const,
    workflowStage: 'ready' as const,
    createdAt: '2026-03-20T12:00:00.000Z',
    tags: [],
    ...overrides,
  };
}

const NOW = new Date('2026-03-22T10:00:00.000Z');

// ---------------------------------------------------------------------------
// applyChickensFilters (category only)
// ---------------------------------------------------------------------------

describe('applyChickensFilters', () => {
  it('returns everything when category is "all"', () => {
    const drafts = [makeDraft(), makeDraft({ id: 'draft-2' })];
    const filters: ChickensFilterState = { category: 'all' };

    const result = applyChickensFilters({ drafts, filters });

    expect(result).toHaveLength(2);
  });

  it('filters drafts by category', () => {
    const insightDraft = makeDraft({ id: 'd-insight', category: 'insight' });
    const opportunityDraft = makeDraft({ id: 'd-opp', category: 'opportunity' });
    const filters: ChickensFilterState = { category: 'opportunity' };

    const result = applyChickensFilters({ drafts: [insightDraft, opportunityDraft], filters });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('d-opp');
  });
});

// ---------------------------------------------------------------------------
// groupByTime (Apple Finder style)
// ---------------------------------------------------------------------------

describe('groupByTime', () => {
  it('groups items into Today, Yesterday, and older buckets', () => {
    const items = [
      { id: 'today', date: '2026-03-22T08:00:00.000Z' },
      { id: 'yesterday', date: '2026-03-21T15:00:00.000Z' },
      { id: 'last-week', date: '2026-03-17T12:00:00.000Z' },
      { id: 'last-month', date: '2026-02-25T12:00:00.000Z' },
      { id: 'old', date: '2025-06-15T12:00:00.000Z' },
    ];

    const groups = groupByTime(items, (item) => item.date, NOW);

    expect(groups.map((g) => g.label)).toEqual([
      'Today',
      'Yesterday',
      'Previous 7 Days',
      'Previous 30 Days',
      'Older',
    ]);
    expect(groups[0].items).toHaveLength(1);
    expect(groups[0].items[0].id).toBe('today');
    expect(groups[1].items[0].id).toBe('yesterday');
  });

  it('omits empty time groups', () => {
    const items = [{ id: 'today', date: '2026-03-22T09:00:00.000Z' }];

    const groups = groupByTime(items, (item) => item.date, NOW);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Today');
  });

  it('returns empty array when no items', () => {
    const groups = groupByTime([], () => '', NOW);
    expect(groups).toEqual([]);
  });

  it('puts very old items in the Older bucket', () => {
    const items = [{ id: 'ancient', date: '2024-01-01T12:00:00.000Z' }];

    const groups = groupByTime(items, (item) => item.date, NOW);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Older');
  });
});

// ---------------------------------------------------------------------------
// buildCategoryOptions
// ---------------------------------------------------------------------------

describe('buildCategoryOptions', () => {
  it('returns unique categories from drafts sorted alphabetically', () => {
    const drafts = [
      makeDraft({ category: 'opportunity' }),
      makeDraft({ category: 'insight' }),
      makeDraft({ category: 'opportunity' }),
      makeDraft({ category: 'resource' }),
    ];

    const options = buildCategoryOptions(drafts);

    expect(options).toEqual(['insight', 'opportunity', 'resource']);
  });

  it('returns empty array when no drafts', () => {
    expect(buildCategoryOptions([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// isFilterActive
// ---------------------------------------------------------------------------

describe('isFilterActive', () => {
  it('returns false when category is "all"', () => {
    expect(isFilterActive({ category: 'all' })).toBe(false);
  });

  it('returns true when category is not "all"', () => {
    expect(isFilterActive({ category: 'insight' })).toBe(true);
  });
});
