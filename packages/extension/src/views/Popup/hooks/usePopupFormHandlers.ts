import { useState } from 'react';
import type { useCoopActions } from '../../shared/useCoopActions';
import type { PopupFooterTab } from '../popup-types';
import type { usePopupNavigation } from './usePopupNavigation';

export interface PopupFormHandlersDeps {
  navigation: ReturnType<typeof usePopupNavigation>;
  coopActions: ReturnType<typeof useCoopActions>;
  subscreenReturnTab: PopupFooterTab;
}

export function usePopupFormHandlers(deps: PopupFormHandlersDeps) {
  const { navigation, coopActions, subscreenReturnTab } = deps;
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [joinSubmitting, setJoinSubmitting] = useState(false);

  async function handleCreateSubmit() {
    setCreateSubmitting(true);
    const created = await coopActions.createCoop(navigation.state.createForm);
    setCreateSubmitting(false);
    if (!created) {
      return;
    }
    navigation.resetCreateForm();
    navigation.navigate(subscreenReturnTab);
  }

  async function handleJoinSubmit() {
    setJoinSubmitting(true);
    const joined = await coopActions.joinCoop(navigation.state.joinForm);
    setJoinSubmitting(false);
    if (!joined) {
      return;
    }
    navigation.resetJoinForm();
    navigation.navigate(subscreenReturnTab);
  }

  return {
    createSubmitting,
    joinSubmitting,
    handleCreateSubmit,
    handleJoinSubmit,
  };
}
