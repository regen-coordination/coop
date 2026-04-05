import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeArtifact, makeDashboard, makeDraft } from '../../../__test-utils__/popup-harness';

const { usePopupYardComposition } = await import('../usePopupYardComposition');

function makeDeps(overrides: Partial<Parameters<typeof usePopupYardComposition>[0]> = {}) {
  const dashboard = makeDashboard();
  const coopOptions = dashboard.coops.map((c) => ({ id: c.profile.id, name: c.profile.name }));
  return {
    coopOptions,
    visibleDrafts: dashboard.drafts as Array<ReturnType<typeof makeDraft>>,
    recentArtifacts: dashboard.coops.flatMap((c) => c.artifacts) as Array<
      ReturnType<typeof makeArtifact>
    >,
    dismissedFeedIds: [] as string[],
    yardClearedAt: '',
    myAddress: dashboard.authSession?.primaryAddress,
    snapshot: null as {
      coopOptions?: Array<{ id: string; name: string }>;
    } | null,
    ...overrides,
  };
}

describe('usePopupYardComposition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes coopLabels as a Map from coopOptions', () => {
    const { result } = renderHook(() => usePopupYardComposition(makeDeps()));
    expect(result.current.coopLabels).toBeInstanceOf(Map);
    expect(result.current.coopLabels.get('coop-1')).toBe('Starter Coop');
  });

  it('produces draftItems from visibleDrafts mapped through toDraftItems', () => {
    const draft = makeDraft({ id: 'draft-A', title: 'Draft A' });
    const deps = makeDeps({ visibleDrafts: [draft] });
    const { result } = renderHook(() => usePopupYardComposition(deps));

    expect(result.current.draftItems).toHaveLength(1);
    expect(result.current.draftItems[0].id).toBe('draft-A');
    expect(result.current.draftItems[0].title).toBe('Draft A');
    expect(result.current.draftItems[0].coopLabel).toBeDefined();
  });

  it('filters draftItems by the active draft filter', () => {
    const draft1 = makeDraft({ id: 'd1', suggestedTargetCoopIds: ['coop-1'] });
    const draft2 = makeDraft({ id: 'd2', suggestedTargetCoopIds: ['coop-other'] });
    const deps = makeDeps({ visibleDrafts: [draft1, draft2] });
    const { result } = renderHook(() => usePopupYardComposition(deps));

    expect(result.current.filteredDraftItems).toHaveLength(2);
    expect(result.current.draftFilterTags[0].id).toBe('all');
  });

  it('produces feedArtifacts from recentArtifacts', () => {
    const artifact = makeArtifact({ id: 'art-1', title: 'Feed Artifact' });
    const deps = makeDeps({ recentArtifacts: [artifact] });
    const { result } = renderHook(() => usePopupYardComposition(deps));

    expect(result.current.feedArtifacts).toHaveLength(1);
    expect(result.current.feedArtifacts[0].id).toBe('art-1');
  });

  it('excludes dismissed feed artifacts from visibleFeedArtifacts', () => {
    const artifact = makeArtifact({ id: 'art-dismissed' });
    const deps = makeDeps({
      recentArtifacts: [artifact],
      dismissedFeedIds: ['art-dismissed'],
    });
    const { result } = renderHook(() => usePopupYardComposition(deps));

    expect(result.current.visibleFeedArtifacts).toHaveLength(0);
    expect(result.current.feedArtifacts).toHaveLength(1);
  });

  it('builds yardItems from drafts and artifacts after yardClearedAt', () => {
    const draft = makeDraft({
      id: 'yd-1',
      createdAt: '2026-03-18T12:00:00.000Z',
      category: 'opportunity',
    });
    const artifact = makeArtifact({
      id: 'ya-1',
      createdAt: '2026-03-18T11:00:00.000Z',
      category: 'thought',
      createdBy: 'someone-else',
    });
    const deps = makeDeps({
      visibleDrafts: [draft],
      recentArtifacts: [artifact],
      yardClearedAt: '2026-03-17T00:00:00.000Z',
      myAddress: '0x1234567890abcdef1234567890abcdef12345678',
    });
    const { result } = renderHook(() => usePopupYardComposition(deps));

    expect(result.current.yardItems).toHaveLength(2);
    const draftItem = result.current.yardItems.find((i) => i.id === 'yd-1');
    expect(draftItem?.type).toBe('draft');
    const artifactItem = result.current.yardItems.find((i) => i.id === 'ya-1');
    expect(artifactItem?.type).toBe('artifact');
    expect(artifactItem && 'isExternal' in artifactItem ? artifactItem.isExternal : undefined).toBe(
      true,
    );
  });

  it('filters yard items by yardClearedAt timestamp', () => {
    const oldDraft = makeDraft({
      id: 'old-draft',
      createdAt: '2026-03-10T00:00:00.000Z',
    });
    const newDraft = makeDraft({
      id: 'new-draft',
      createdAt: '2026-03-18T12:00:00.000Z',
    });
    const deps = makeDeps({
      visibleDrafts: [oldDraft, newDraft],
      recentArtifacts: [],
      yardClearedAt: '2026-03-15T00:00:00.000Z',
    });
    const { result } = renderHook(() => usePopupYardComposition(deps));

    expect(result.current.yardItems).toHaveLength(1);
    expect(result.current.yardItems[0].id).toBe('new-draft');
  });

  it('falls back to snapshot coopOptions when coopOptions is empty', () => {
    const deps = makeDeps({
      coopOptions: [],
      snapshot: {
        coopOptions: [{ id: 'snap-coop', name: 'Snapshot Coop' }],
      },
    });
    const { result } = renderHook(() => usePopupYardComposition(deps));

    expect(result.current.resolvedCoopOptions).toEqual([
      { id: 'snap-coop', name: 'Snapshot Coop' },
    ]);
  });

  it('builds filter tags from coopOptions with an "All coops" entry', () => {
    const { result } = renderHook(() => usePopupYardComposition(makeDeps()));

    expect(result.current.draftFilterTags.length).toBeGreaterThanOrEqual(2);
    expect(result.current.draftFilterTags[0].id).toBe('all');
    expect(result.current.draftFilterTags[0].label).toBe('All coops');
  });
});
