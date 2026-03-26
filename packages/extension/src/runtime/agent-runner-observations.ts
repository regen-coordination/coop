import type { AgentObservation, CoopSharedState } from '@coop/shared';
import {
  isArchiveReceiptRefreshable,
  isReceiverCaptureVisibleForMemberContext,
  isReviewDraftVisibleForMemberContext,
} from '@coop/shared';
import { AGENT_HIGH_CONFIDENCE_THRESHOLD } from './agent-config';
import { compact, findAuthenticatedCoopMember } from './agent-runner-state';
import type { SkillExecutionContext } from './agent-runner-state';

export function isObservationRunnableForAuthorizedCoops(input: {
  observation: AgentObservation;
  authorizedCoopIds: Set<string>;
  coops: CoopSharedState[];
}) {
  if (input.observation.coopId) {
    return input.authorizedCoopIds.has(input.observation.coopId);
  }

  return resolveObservationEligibleCoopIds(input.observation, input.coops).some((coopId) =>
    input.authorizedCoopIds.has(coopId),
  );
}

export function observationPriority(trigger: AgentObservation['trigger']) {
  switch (trigger) {
    case 'roundup-batch-ready':
      return 0;
    case 'high-confidence-draft':
    case 'receiver-backlog':
      return 1;
    case 'memory-insight-due':
      return 2;
    case 'stale-draft':
    case 'stale-archive-receipt':
      return 3;
    case 'green-goods-garden-requested':
    case 'green-goods-sync-needed':
    case 'green-goods-work-approval-requested':
    case 'green-goods-assessment-requested':
    case 'green-goods-gap-admin-sync-needed':
    case 'erc8004-registration-due':
    case 'erc8004-feedback-due':
      return 4;
    case 'ritual-review-due':
      return 5;
  }
}

export function prioritizeObservations(observations: AgentObservation[]) {
  return [...observations].sort((left, right) => {
    const priorityDelta =
      (observationPriority(left.trigger) ?? 99) - (observationPriority(right.trigger) ?? 99);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function getObservationDismissReason(input: {
  observation: AgentObservation;
  context: SkillExecutionContext;
}) {
  const coopId = input.context.coop?.profile.id;
  const memberId = input.context.coop
    ? findAuthenticatedCoopMember(input.context.coop, input.context.authSession)?.id
    : undefined;

  switch (input.observation.trigger) {
    case 'roundup-batch-ready':
      return input.context.extracts.length > 0
        ? null
        : 'Roundup batch no longer has captured extracts to route.';
    case 'high-confidence-draft':
      if (!input.context.draft) {
        return 'Source draft no longer exists.';
      }
      if (input.context.draft.confidence < AGENT_HIGH_CONFIDENCE_THRESHOLD) {
        return 'Source draft no longer meets the high-confidence threshold.';
      }
      if (!isReviewDraftVisibleForMemberContext(input.context.draft, coopId, memberId)) {
        return 'Source draft is not visible in the current member context.';
      }
      return null;
    case 'receiver-backlog':
      if (!input.context.capture) {
        return 'Receiver capture no longer exists.';
      }
      if (
        input.context.capture.intakeStatus === 'archived' ||
        input.context.capture.intakeStatus === 'published'
      ) {
        return 'Receiver capture no longer needs backlog handling.';
      }
      if (!isReceiverCaptureVisibleForMemberContext(input.context.capture, coopId, memberId)) {
        return 'Receiver capture is private to another member.';
      }
      return null;
    case 'stale-archive-receipt':
      if (!input.context.receipt || !isArchiveReceiptRefreshable(input.context.receipt)) {
        return 'Archive receipt no longer needs follow-up.';
      }
      return null;
    case 'ritual-review-due':
      return input.context.coop
        ? null
        : 'Coop context is unavailable for review digest generation.';
    case 'memory-insight-due':
      return input.context.coop
        ? null
        : 'Coop context is unavailable for memory insight synthesis.';
    case 'green-goods-garden-requested':
      if (!input.context.coop?.greenGoods?.enabled) {
        return 'Green Goods is not enabled for this coop.';
      }
      if (input.context.coop.greenGoods.gardenAddress) {
        return 'Green Goods garden has already been linked.';
      }
      return null;
    case 'green-goods-sync-needed':
      if (!input.context.coop?.greenGoods?.enabled) {
        return 'Green Goods is not enabled for this coop.';
      }
      if (!input.context.coop.greenGoods.gardenAddress) {
        return 'Green Goods garden has not been linked yet.';
      }
      if (
        input.context.coop.greenGoods.lastProfileSyncAt &&
        input.context.coop.greenGoods.lastDomainSyncAt &&
        input.context.coop.greenGoods.lastPoolSyncAt
      ) {
        return 'Green Goods garden sync is already complete.';
      }
      return null;
    case 'green-goods-work-approval-requested':
      if (!input.context.coop?.greenGoods?.enabled) {
        return 'Green Goods is not enabled for this coop.';
      }
      if (!input.context.coop.greenGoods.gardenAddress) {
        return 'Green Goods garden has not been linked yet.';
      }
      return null;
    case 'green-goods-assessment-requested':
      if (!input.context.coop?.greenGoods?.enabled) {
        return 'Green Goods is not enabled for this coop.';
      }
      if (!input.context.coop.greenGoods.gardenAddress) {
        return 'Green Goods garden has not been linked yet.';
      }
      return null;
    case 'green-goods-gap-admin-sync-needed':
      if (!input.context.coop?.greenGoods?.enabled) {
        return 'Green Goods is not enabled for this coop.';
      }
      if (!input.context.coop.greenGoods.gardenAddress) {
        return 'Green Goods garden has not been linked yet.';
      }
      return null;
  }
}

export function resolveObservationExtractIds(observation: AgentObservation) {
  const payloadExtractIds = Array.isArray(observation.payload?.extractIds)
    ? observation.payload.extractIds.filter((value): value is string => typeof value === 'string')
    : [];
  return [...new Set(compact([observation.extractId, ...payloadExtractIds]))];
}

export function resolveObservationRoutingIds(observation: AgentObservation) {
  return Array.isArray(observation.payload?.routingIds)
    ? observation.payload.routingIds.filter((value): value is string => typeof value === 'string')
    : [];
}

export function resolveObservationEligibleCoopIds(
  observation: AgentObservation,
  coops: CoopSharedState[],
): string[] {
  const payloadCoopIds = Array.isArray(observation.payload?.eligibleCoopIds)
    ? observation.payload.eligibleCoopIds.filter(
        (value): value is string => typeof value === 'string',
      )
    : [];
  if (payloadCoopIds.length > 0) {
    return payloadCoopIds;
  }
  return coops.map((coop) => coop.profile.id);
}
