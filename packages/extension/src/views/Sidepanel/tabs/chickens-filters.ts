/**
 * Pure filter and time-grouping logic for the Chickens tab.
 *
 * Operates on minimal slices of ReviewDraft so it can be tested without
 * constructing full schema objects.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChickensFilterState {
  category: string; // 'all' or an ArtifactCategory value
}

/** Minimal draft shape needed by filter logic. */
interface FilterableDraft {
  id: string;
  category: string;
  createdAt: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Time-grouping (Apple Finder style)
// ---------------------------------------------------------------------------

export interface TimeGroup<T> {
  label: string;
  items: T[];
}

/**
 * Groups a sorted-by-date array of items into Apple Finder-style time
 * sections: Today, Yesterday, Previous 7 Days, Previous 30 Days,
 * Previous 90 Days, This Year, Older.
 *
 * Empty groups are omitted.
 */
export function groupByTime<T>(
  items: T[],
  getDate: (item: T) => string,
  now: Date = new Date(),
): TimeGroup<T>[] {
  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 86_400_000);
  const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 86_400_000);
  const ninetyDaysAgo = new Date(todayStart.getTime() - 90 * 86_400_000);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const buckets: { label: string; items: T[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 Days', items: [] },
    { label: 'Previous 30 Days', items: [] },
    { label: 'Previous 90 Days', items: [] },
    { label: 'This Year', items: [] },
    { label: 'Older', items: [] },
  ];

  for (const item of items) {
    const ts = new Date(getDate(item)).getTime();
    if (ts >= todayStart.getTime()) {
      buckets[0].items.push(item);
    } else if (ts >= yesterdayStart.getTime()) {
      buckets[1].items.push(item);
    } else if (ts >= sevenDaysAgo.getTime()) {
      buckets[2].items.push(item);
    } else if (ts >= thirtyDaysAgo.getTime()) {
      buckets[3].items.push(item);
    } else if (ts >= ninetyDaysAgo.getTime()) {
      buckets[4].items.push(item);
    } else if (ts >= yearStart.getTime()) {
      buckets[5].items.push(item);
    } else {
      buckets[6].items.push(item);
    }
  }

  return buckets.filter((b) => b.items.length > 0);
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// Core filter (category only)
// ---------------------------------------------------------------------------

export function applyChickensFilters<D extends FilterableDraft>(opts: {
  drafts: D[];
  filters: ChickensFilterState;
}): D[] {
  let { drafts } = opts;
  const { filters } = opts;

  if (filters.category !== 'all') {
    drafts = drafts.filter((d) => d.category === filters.category);
  }

  return drafts;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract sorted unique categories from a list of drafts. */
export function buildCategoryOptions(drafts: FilterableDraft[]): string[] {
  const categories = new Set<string>();
  for (const d of drafts) {
    categories.add(d.category);
  }
  return [...categories].sort();
}

/** Returns true if any filter is set to a non-default value. */
export function isFilterActive(filters: ChickensFilterState): boolean {
  return filters.category !== 'all';
}
