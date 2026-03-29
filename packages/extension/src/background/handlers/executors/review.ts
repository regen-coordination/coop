import {
  type PolicyActionClass,
  getAuthSession,
  getReviewDraft,
  resolveScopedActionPayload,
} from '@coop/shared';
import { resolveReceiverPairingMember } from '../../../runtime/receiver';
import { validateReviewDraftPublish } from '../../../runtime/review';
import { db, getCoops } from '../../context';
import type { ActionExecutorContext, ExecutorResult } from '../action-executors';
import { publishDraftWithContext } from '../review';

export function buildReviewExecutors(
  ctx: ActionExecutorContext,
): Partial<Record<PolicyActionClass, (payload: Record<string, unknown>) => ExecutorResult>> {
  const { bundle } = ctx;

  return {
    'publish-ready-draft': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'publish-ready-draft',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) {
        return { ok: false, error: scopedPayload.reason };
      }
      const draftId = scopedPayload.normalizedPayload.draftId as string;
      const targetCoopIds = scopedPayload.normalizedPayload.targetCoopIds as string[];
      const persistedDraft = await getReviewDraft(db, draftId);
      if (!persistedDraft) {
        return { ok: false, error: 'Draft not found.' };
      }

      const coops = await getCoops();
      const authSession = await getAuthSession(db);
      const scopedCoop = coops.find((item) => item.profile.id === bundle.coopId);
      const scopedMember = scopedCoop
        ? resolveReceiverPairingMember(scopedCoop, authSession, bundle.memberId)
        : undefined;
      const validation = validateReviewDraftPublish({
        persistedDraft,
        incomingDraft: persistedDraft,
        targetCoopIds,
        states: coops,
        authSession,
        activeCoopId: scopedCoop?.profile.id,
        activeMemberId: scopedMember?.id,
      });
      if (!validation.ok) {
        return { ok: false, error: validation.error };
      }

      const publishResult = await publishDraftWithContext({
        draft: persistedDraft,
        targetCoopIds,
        authSession,
        activeCoopId: scopedCoop?.profile.id,
        activeMemberId: scopedMember?.id,
      });
      return { ok: publishResult.ok, error: publishResult.error, data: publishResult.data };
    },
    'safe-deployment': async () => {
      return {
        ok: false,
        error: 'Safe deployment requires direct human confirmation in this phase.',
      };
    },
  };
}
