import type { Artifact, ReviewDraft } from '@coop/shared';
import { useMemo, useState } from 'react';
import type { YardItem } from '../PopupHomeScreen';
import type { PopupSubheaderTag } from '../PopupSubheader';
import {
  buildFilterTags,
  matchesCoopFilter,
  toDraftItems,
  toFeedItems,
} from '../helpers';
import type { PopupDraftListItem, PopupFeedArtifactItem } from '../popup-types';

export interface PopupYardCompositionDeps {
  coopOptions: Array<{ id: string; name: string }>;
  visibleDrafts: ReviewDraft[];
  recentArtifacts: Artifact[];
  dismissedFeedIds: string[];
  yardClearedAt: string;
  myAddress?: string;
  snapshot: {
    coopOptions?: Array<{ id: string; name: string }>;
  } | null;
}

export function usePopupYardComposition(deps: PopupYardCompositionDeps) {
  const {
    coopOptions,
    visibleDrafts,
    recentArtifacts,
    dismissedFeedIds,
    yardClearedAt,
    myAddress,
    snapshot,
  } = deps;

  const [draftFilterId, setDraftFilterId] = useState('all');
  const [feedFilterId, setFeedFilterId] = useState('all');

  const resolvedCoopOptions = useMemo(
    () =>
      coopOptions.length > 0
        ? coopOptions
        : (snapshot?.coopOptions ?? []),
    [coopOptions, snapshot?.coopOptions],
  );

  const coopLabels = useMemo(
    () => new Map(resolvedCoopOptions.map((coop) => [coop.id, coop.name])),
    [resolvedCoopOptions],
  );

  const draftItems = useMemo(
    () =>
      toDraftItems({
        drafts: visibleDrafts,
        coops: resolvedCoopOptions,
      }),
    [resolvedCoopOptions, visibleDrafts],
  );

  const filteredDraftItems = useMemo(
    () => draftItems.filter((draft) => matchesCoopFilter(draft.coopIds, draftFilterId)),
    [draftFilterId, draftItems],
  );

  const feedArtifacts = useMemo(
    () =>
      toFeedItems({
        artifacts: recentArtifacts,
        coops: resolvedCoopOptions,
      }),
    [resolvedCoopOptions, recentArtifacts],
  );

  const filteredFeedArtifacts = useMemo(
    () => feedArtifacts.filter((artifact) => matchesCoopFilter(artifact.coopIds, feedFilterId)),
    [feedArtifacts, feedFilterId],
  );

  const visibleFeedArtifacts = useMemo(() => {
    const dismissed = new Set(dismissedFeedIds);
    return filteredFeedArtifacts.filter((a) => !dismissed.has(a.id));
  }, [filteredFeedArtifacts, dismissedFeedIds]);

  const draftFilterTags = useMemo(
    () => buildFilterTags(resolvedCoopOptions, draftFilterId, setDraftFilterId),
    [resolvedCoopOptions, draftFilterId],
  );

  const feedFilterTags = useMemo(
    () => buildFilterTags(resolvedCoopOptions, feedFilterId, setFeedFilterId),
    [resolvedCoopOptions, feedFilterId],
  );

  const yardItems = useMemo(() => {
    const clearedAt = yardClearedAt || '';
    const drafts = visibleDrafts
      .filter((d) => !clearedAt || d.createdAt > clearedAt)
      .map((d) => ({ id: d.id, type: 'draft' as const, category: d.category }));
    const artifacts = recentArtifacts
      .filter((a) => !clearedAt || a.createdAt > clearedAt)
      .map((a) => ({
        id: a.id,
        type: 'artifact' as const,
        category: a.category,
        isExternal: myAddress ? a.createdBy !== myAddress : false,
      }));
    return [...drafts, ...artifacts];
  }, [visibleDrafts, recentArtifacts, yardClearedAt, myAddress]);

  return {
    resolvedCoopOptions,
    coopLabels,
    draftItems,
    filteredDraftItems,
    feedArtifacts,
    filteredFeedArtifacts,
    visibleFeedArtifacts,
    draftFilterTags,
    feedFilterTags,
    draftFilterId,
    feedFilterId,
    yardItems,
  };
}
