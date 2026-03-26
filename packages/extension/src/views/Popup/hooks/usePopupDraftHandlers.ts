import type { ReviewDraft } from '@coop/shared';
import { useState } from 'react';
import type { useQuickDraftActions } from '../../shared/useQuickDraftActions';
import type { usePopupNavigation } from './usePopupNavigation';

export interface PopupDraftHandlersDeps {
  navigation: ReturnType<typeof usePopupNavigation>;
  quickDraftActions: ReturnType<typeof useQuickDraftActions>;
  visibleDrafts: ReviewDraft[];
}

export function usePopupDraftHandlers(deps: PopupDraftHandlersDeps) {
  const { navigation, quickDraftActions, visibleDrafts } = deps;
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftEdits, setDraftEdits] = useState<Record<string, ReviewDraft>>({});

  const selectedDraftBase =
    visibleDrafts.find((draft) => draft.id === navigation.state.selectedDraftId) ?? null;
  const selectedDraft = selectedDraftBase
    ? (draftEdits[selectedDraftBase.id] ?? selectedDraftBase)
    : null;

  function resolveDraftValue(draft: ReviewDraft) {
    return draftEdits[draft.id] ?? draft;
  }

  function updateSelectedDraft(patch: Partial<ReviewDraft>) {
    if (!selectedDraft) {
      return;
    }

    setDraftEdits((current) => ({
      ...current,
      [selectedDraft.id]: {
        ...selectedDraft,
        ...patch,
      },
    }));
  }

  async function handleSaveSelectedDraft() {
    if (!selectedDraft) {
      return;
    }

    setDraftSaving(true);
    const saved = await quickDraftActions.saveDraft(selectedDraft);
    setDraftSaving(false);
    if (!saved) {
      return;
    }
    setDraftEdits((current) => ({
      ...current,
      [saved.id]: saved,
    }));
  }

  async function handleToggleSelectedDraftReady() {
    if (!selectedDraft) {
      return;
    }

    setDraftSaving(true);
    const updated = await quickDraftActions.changeWorkflowStage(
      selectedDraft,
      selectedDraft.workflowStage === 'ready' ? 'candidate' : 'ready',
    );
    setDraftSaving(false);
    if (!updated) {
      return;
    }
    setDraftEdits((current) => ({
      ...current,
      [updated.id]: updated,
    }));
  }

  async function handleShareSelectedDraft() {
    if (!selectedDraft) {
      return;
    }

    setDraftSaving(true);
    const shared = await quickDraftActions.publishDraft(selectedDraft);
    setDraftSaving(false);
    if (!shared) {
      return;
    }

    setDraftEdits((current) => {
      const next = { ...current };
      delete next[selectedDraft.id];
      return next;
    });
    navigation.navigate('drafts');
  }

  async function handleMarkDraftReady(draft: ReviewDraft) {
    const updated = await quickDraftActions.changeWorkflowStage(resolveDraftValue(draft), 'ready');
    if (!updated) {
      return;
    }

    setDraftEdits((current) => ({
      ...current,
      [updated.id]: updated,
    }));
  }

  async function handleShareDraft(draft: ReviewDraft) {
    const shared = await quickDraftActions.publishDraft(resolveDraftValue(draft));
    if (!shared) {
      return;
    }

    setDraftEdits((current) => {
      const next = { ...current };
      delete next[draft.id];
      return next;
    });
  }

  return {
    draftSaving,
    draftEdits,
    selectedDraft,
    resolveDraftValue,
    updateSelectedDraft,
    handleSaveSelectedDraft,
    handleToggleSelectedDraftReady,
    handleShareSelectedDraft,
    handleMarkDraftReady,
    handleShareDraft,
  };
}
