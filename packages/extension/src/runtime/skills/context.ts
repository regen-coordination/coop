import type { AgentObservation, CoopSharedState, ReadablePageExtract } from '@coop/shared';
import {
  getAuthSession,
  getPageExtract,
  getReceiverCapture,
  getReviewDraft,
  listReviewDrafts,
  listTabRoutings,
  queryMemoriesForSkill,
} from '@coop/shared';
import {
  resolveObservationExtractIds,
  resolveObservationRoutingIds,
} from '../agent/runner-observations';
import {
  type SkillExecutionContext,
  db,
  findAuthenticatedCoopMember,
  getCoops,
} from '../agent/runner-state';

async function loadExtractsForObservation(observation: AgentObservation) {
  const extracts = await Promise.all(
    resolveObservationExtractIds(observation).map((extractId) => getPageExtract(db, extractId)),
  );
  return extracts.filter((extract): extract is ReadablePageExtract => Boolean(extract));
}

export async function buildSkillContext(
  observation: AgentObservation,
  options: {
    availableCoops?: CoopSharedState[];
  } = {},
): Promise<SkillExecutionContext> {
  const coops = options.availableCoops ?? (await getCoops());
  const [draft, capture, authSession, extracts] = await Promise.all([
    observation.draftId ? getReviewDraft(db, observation.draftId) : Promise.resolve(null),
    observation.captureId ? getReceiverCapture(db, observation.captureId) : Promise.resolve(null),
    getAuthSession(db),
    loadExtractsForObservation(observation),
  ]);
  const coop =
    (observation.coopId
      ? coops.find((item) => item.profile.id === observation.coopId)
      : undefined) ??
    (draft
      ? coops.find((item) => draft.suggestedTargetCoopIds.includes(item.profile.id))
      : undefined) ??
    undefined;
  const receipt = observation.receiptId
    ? (coop?.archiveReceipts.find((item) => item.id === observation.receiptId) ?? null)
    : null;
  const memberId = coop ? findAuthenticatedCoopMember(coop, authSession)?.id : undefined;
  const [memories, relatedDrafts, relatedRoutings] = await Promise.all([
    coop
      ? queryMemoriesForSkill(db, { coopId: coop.profile.id, memberId }, observation.trigger)
      : Promise.resolve([]),
    (await listReviewDrafts(db))
      .filter((candidate) => !coop || candidate.suggestedTargetCoopIds.includes(coop.profile.id))
      .slice(0, 12),
    coop
      ? listTabRoutings(db, {
          coopId: coop.profile.id,
          status: ['routed', 'drafted', 'published'],
          limit: 12,
        })
      : Promise.resolve([]),
  ]);

  return {
    observation,
    coop,
    draft,
    capture,
    receipt,
    authSession,
    candidates: [],
    scores: [],
    createdDraftIds: [],
    extracts,
    relatedDrafts,
    relatedArtifacts: coop?.artifacts ?? [],
    relatedRoutings:
      resolveObservationRoutingIds(observation).length > 0
        ? relatedRoutings.filter((routing) =>
            resolveObservationRoutingIds(observation).includes(routing.id),
          )
        : relatedRoutings,
    memories,
  };
}
