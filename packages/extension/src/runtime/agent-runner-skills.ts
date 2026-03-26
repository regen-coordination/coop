import type {
  ActionBundle,
  AgentMemory,
  AgentObservation,
  AgentPlan,
  AgentPlanStep,
  AgentProvider,
  ArchiveReceipt,
  CapitalFormationBriefOutput,
  CoopSharedState,
  EcosystemEntityExtractorOutput,
  GrantFitScore,
  GrantFitScorerOutput,
  MemoryInsightOutput,
  OpportunityCandidate,
  OpportunityExtractorOutput,
  PublishReadinessCheckOutput,
  ReadablePageExtract,
  ReceiverCapture,
  ReviewDigestOutput,
  ReviewDraft,
  SkillOutputSchemaRef,
  TabRouterOutput,
  TabRouting,
  ThemeClustererOutput,
} from '@coop/shared';
import {
  buildAgentManifest,
  completeAgentPlan,
  completeSkillRun,
  createActionProposal,
  createAgentMemory,
  createAgentObservation,
  createAgentPlan,
  createAgentPlanStep,
  createGreenGoodsAssessmentOutput,
  createGreenGoodsBootstrapOutput,
  createGreenGoodsGapAdminSyncOutput,
  createGreenGoodsSyncOutput,
  createGreenGoodsWorkApprovalOutput,
  createSkillRun,
  encodeAgentManifestURI,
  failAgentPlan,
  failSkillRun,
  findAgentObservationByFingerprint,
  getAuthSession,
  getPageExtract,
  getReceiverCapture,
  getReviewDraft,
  getTabRoutingByExtractAndCoop,
  greenGoodsAssessmentRequestSchema,
  greenGoodsWorkApprovalRequestSchema,
  listReviewDrafts,
  listTabRoutings,
  nowIso,
  pruneExpiredMemories,
  queryMemoriesForSkill,
  saveAgentObservation,
  saveAgentPlan,
  saveReviewDraft,
  saveSkillRun,
  saveTabRouting,
  shapeReviewDraft,
  truncateWords,
  updateAgentObservation,
  updateAgentPlan,
  updateAgentPlanStep,
} from '@coop/shared';
import { AGENT_HIGH_CONFIDENCE_THRESHOLD } from './agent-config';
import {
  getMissingRequiredCapabilities,
  selectSkillIdsForObservation,
  shouldSkipSkill,
} from './agent-harness';
import {
  logObservationDismissed,
  logObservationStart,
  logSkillComplete,
  logSkillFailed,
  logSkillStart,
} from './agent-logger';
import { completeSkillOutput } from './agent-models';
import {
  applySkillOutput,
  resolveGreenGoodsGapAdminAddresses,
  resolveGreenGoodsOperatorAddresses,
} from './agent-output-handlers';
import { computeOutputConfidence } from './agent-quality';
import { type RegisteredSkill, getRegisteredSkill, listRegisteredSkills } from './agent-registry';
import {
  computeGrantFitScores,
  inferEntitiesFromText,
  inferTabRoutingsHeuristically,
  inferThemes,
} from './agent-runner-inference';
import {
  getObservationDismissReason,
  resolveObservationExtractIds,
  resolveObservationRoutingIds,
} from './agent-runner-observations';
import {
  type AgentCycleResult,
  type SkillExecutionContext,
  compact,
  db,
  findAuthenticatedCoopMember,
  getAutoRunSkillIds,
  getCoops,
  inferPreferredProvider,
} from './agent-runner-state';
import type { RuntimeActionResponse } from './messages';

export async function buildSkillPrompt(input: {
  skill: RegisteredSkill;
  observation: AgentObservation;
  coop?: CoopSharedState;
  draft?: ReviewDraft | null;
  capture?: ReceiverCapture | null;
  receipt?: ArchiveReceipt | null;
  candidates: OpportunityCandidate[];
  scores: GrantFitScore[];
  extracts: ReadablePageExtract[];
  relatedDrafts: ReviewDraft[];
  relatedArtifacts: CoopSharedState['artifacts'];
  relatedRoutings: TabRouting[];
  memories: AgentMemory[];
}) {
  const coopContext = input.coop
    ? compact([
        `Coop name: ${input.coop.profile.name}`,
        `Coop purpose: ${input.coop.profile.purpose}`,
        `Ritual cadence: ${input.coop.rituals.map((ritual) => ritual.weeklyReviewCadence).join('; ')}`,
        `Green Goods status: ${input.coop.greenGoods?.status ?? 'disabled'}`,
        `Top archive tags: ${
          input.coop.memoryProfile.topTags
            .map((tag) => tag.tag)
            .slice(0, 6)
            .join(', ') || 'none'
        }`,
        `Useful signal: ${input.coop.soul.usefulSignalDefinition}`,
        `Artifact focus: ${input.coop.soul.artifactFocus.join(', ')}`,
        `Why this coop exists: ${input.coop.soul.whyThisCoopExists}`,
        `Tone and working style: ${input.coop.soul.toneAndWorkingStyle}`,
        input.coop.soul.agentPersona ? `Agent persona: ${input.coop.soul.agentPersona}` : undefined,
        input.coop.soul.vocabularyTerms.length > 0
          ? `Vocabulary: ${input.coop.soul.vocabularyTerms.join(', ')}`
          : undefined,
        input.coop.soul.prohibitedTopics.length > 0
          ? `Prohibited topics: ${input.coop.soul.prohibitedTopics.join(', ')}`
          : undefined,
        `Confidence threshold: ${input.coop.soul.confidenceThreshold}`,
      ]).join('\n')
    : 'No coop context available.';

  const sourceContext = compact([
    input.observation.title ? `Observation title: ${input.observation.title}` : undefined,
    input.observation.summary ? `Observation summary: ${input.observation.summary}` : undefined,
    Object.keys(input.observation.payload ?? {}).length > 0
      ? `Observation payload: ${JSON.stringify(input.observation.payload)}`
      : undefined,
    input.draft?.title ? `Draft title: ${input.draft.title}` : undefined,
    input.draft?.summary ? `Draft summary: ${input.draft.summary}` : undefined,
    input.capture?.title ? `Capture title: ${input.capture.title}` : undefined,
    input.capture?.note ? `Capture note: ${input.capture.note}` : undefined,
    input.receipt?.rootCid ? `Archive root CID: ${input.receipt.rootCid}` : undefined,
  ]).join('\n');

  const extractContext =
    input.extracts.length > 0
      ? `Captured extracts:\n${input.extracts
          .map(
            (extract) =>
              `- ${extract.id}: ${extract.cleanedTitle} (${extract.domain})\n  ${truncateWords(
                [extract.metaDescription, ...extract.topHeadings, ...extract.leadParagraphs]
                  .filter(Boolean)
                  .join(' '),
                48,
              )}`,
          )
          .join('\n')}`
      : 'Captured extracts: none.';

  const candidateContext =
    input.candidates.length > 0
      ? `Opportunity candidates:\n${input.candidates
          .map(
            (candidate) =>
              `- ${candidate.id}: ${candidate.title} (priority ${candidate.priority.toFixed(2)})\n  ${candidate.summary}`,
          )
          .join('\n')}`
      : 'Opportunity candidates: none yet.';

  const scoreContext =
    input.scores.length > 0
      ? `Grant fit scores:\n${input.scores
          .map(
            (score) =>
              `- ${score.candidateId}: ${score.score.toFixed(2)} for ${score.candidateTitle}; reasons: ${score.reasons.join(', ') || 'none'}`,
          )
          .join('\n')}`
      : 'Grant fit scores: none yet.';

  const recentContext = [
    `Recent routed items: ${
      input.relatedRoutings
        .slice(0, 4)
        .map(
          (routing) => `${routing.coopId}:${routing.category}:${routing.relevanceScore.toFixed(2)}`,
        )
        .join(', ') || 'none'
    }`,
    `Recent related drafts: ${
      input.relatedDrafts
        .slice(0, 4)
        .map((draft) => draft.title)
        .join(', ') || 'none'
    }`,
    `Recent related artifacts: ${
      input.relatedArtifacts
        .slice(-4)
        .map((artifact) => artifact.title)
        .join(', ') || 'none'
    }`,
  ].join('\n');

  const system = [
    'You are an extension-local Coop agent.',
    'Return valid JSON only.',
    `Current skill: ${input.skill.instructionMeta.name}`,
    `Manifest summary: ${input.skill.manifest.description}`,
    `Skill guidance:\n${input.skill.instructions}`,
    input.skill.manifest.allowedTools.length > 0
      ? `Allowed runtime tools: ${input.skill.manifest.allowedTools.join(', ')}`
      : undefined,
    input.skill.manifest.allowedActionClasses.length > 0
      ? `Allowed action classes: ${input.skill.manifest.allowedActionClasses.join(', ')}`
      : undefined,
    `Expected output schema ref: ${input.skill.manifest.outputSchemaRef}`,
  ].join('\n\n');

  const memberMemoryContext =
    input.memories.filter((memory) => memory.scope === 'member').length > 0
      ? `Member memories:\n${input.memories
          .filter((memory) => memory.scope === 'member')
          .map(
            (m) =>
              `- [${m.type}] ${truncateWords(m.content, 40)} (confidence: ${m.confidence.toFixed(2)})`,
          )
          .join('\n')}`
      : '';

  const coopMemoryContext =
    input.memories.filter((memory) => memory.scope === 'coop').length > 0
      ? `Coop memories:\n${input.memories
          .filter((memory) => memory.scope === 'coop')
          .map(
            (m) =>
              `- [${m.type}] ${truncateWords(m.content, 40)} (confidence: ${m.confidence.toFixed(2)})`,
          )
          .join('\n')}`
      : '';

  const prompt = [
    coopContext,
    ...(memberMemoryContext ? [memberMemoryContext] : []),
    ...(coopMemoryContext ? [coopMemoryContext] : []),
    extractContext,
    sourceContext,
    candidateContext,
    scoreContext,
    recentContext,
    'Return JSON that matches the requested schema exactly.',
  ].join('\n\n');

  return {
    system,
    prompt,
    heuristicContext: [extractContext, sourceContext, candidateContext, scoreContext]
      .filter(Boolean)
      .join('\n'),
  };
}

export async function completeSkill<T>(input: {
  skill: RegisteredSkill;
  observation: AgentObservation;
  coop?: CoopSharedState;
  draft?: ReviewDraft | null;
  capture?: ReceiverCapture | null;
  receipt?: ArchiveReceipt | null;
  candidates: OpportunityCandidate[];
  scores: GrantFitScore[];
  extracts: ReadablePageExtract[];
  relatedDrafts: ReviewDraft[];
  relatedArtifacts: CoopSharedState['artifacts'];
  relatedRoutings: TabRouting[];
  memories: AgentMemory[];
}): Promise<{ provider: AgentProvider; model?: string; output: T; durationMs: number }> {
  const { manifest } = input.skill;
  const prepared = await buildSkillPrompt(input);
  const preferredProvider = inferPreferredProvider(manifest);
  const result = await completeSkillOutput<T>({
    preferredProvider,
    schemaRef: manifest.outputSchemaRef,
    system: prepared.system,
    prompt: prepared.prompt,
    heuristicContext: prepared.heuristicContext,
    maxTokens: manifest.maxTokens,
  });

  if (
    manifest.outputSchemaRef === 'tab-router-output' &&
    ((result.output as TabRouterOutput).routings?.length ?? 0) === 0
  ) {
    return {
      provider: 'heuristic',
      model: result.model,
      durationMs: result.durationMs,
      output: inferTabRoutingsHeuristically({
        observation: input.observation,
        extracts: input.extracts,
        coops: input.coop ? [input.coop] : await getCoops(),
      }) as T,
    };
  }

  if (
    manifest.outputSchemaRef === 'grant-fit-scorer-output' &&
    ((result.output as GrantFitScorerOutput).scores?.length ?? 0) === 0
  ) {
    return {
      provider: 'heuristic',
      model: result.model,
      durationMs: result.durationMs,
      output: {
        scores: computeGrantFitScores(input.candidates, input.coop),
      } as T,
    };
  }

  if (
    manifest.outputSchemaRef === 'ecosystem-entity-extractor-output' &&
    ((result.output as EcosystemEntityExtractorOutput).entities?.length ?? 0) === 0
  ) {
    return {
      provider: 'heuristic',
      model: result.model,
      durationMs: result.durationMs,
      output: inferEntitiesFromText(prepared.heuristicContext) as T,
    };
  }

  if (
    manifest.outputSchemaRef === 'theme-clusterer-output' &&
    ((result.output as ThemeClustererOutput).themes?.length ?? 0) === 0
  ) {
    return {
      provider: 'heuristic',
      model: result.model,
      durationMs: result.durationMs,
      output: inferThemes({
        relatedDrafts: input.relatedDrafts,
        relatedArtifacts: input.relatedArtifacts,
        observation: input.observation,
      }) as T,
    };
  }

  if (
    manifest.outputSchemaRef === 'green-goods-garden-bootstrap-output' &&
    input.coop?.greenGoods
  ) {
    return {
      provider: 'heuristic',
      model: result.model,
      durationMs: result.durationMs,
      output: createGreenGoodsBootstrapOutput({
        coopName: input.coop.profile.name,
        purpose: input.coop.profile.purpose,
        garden: input.coop.greenGoods,
      }) as T,
    };
  }

  if (manifest.outputSchemaRef === 'green-goods-garden-sync-output' && input.coop?.greenGoods) {
    return {
      provider: 'heuristic',
      model: result.model,
      durationMs: result.durationMs,
      output: createGreenGoodsSyncOutput({
        coopName: input.coop.profile.name,
        purpose: input.coop.profile.purpose,
        garden: input.coop.greenGoods,
      }) as T,
    };
  }

  if (
    manifest.outputSchemaRef === 'green-goods-work-approval-output' &&
    input.coop?.greenGoods?.gardenAddress
  ) {
    return {
      provider: 'heuristic',
      model: result.model,
      durationMs: result.durationMs,
      output: createGreenGoodsWorkApprovalOutput({
        request: greenGoodsWorkApprovalRequestSchema.parse(input.observation.payload),
      }) as T,
    };
  }

  if (
    manifest.outputSchemaRef === 'green-goods-assessment-output' &&
    input.coop?.greenGoods?.gardenAddress
  ) {
    return {
      provider: 'heuristic',
      model: result.model,
      durationMs: result.durationMs,
      output: createGreenGoodsAssessmentOutput({
        request: greenGoodsAssessmentRequestSchema.parse(input.observation.payload),
      }) as T,
    };
  }

  if (
    manifest.outputSchemaRef === 'green-goods-gap-admin-sync-output' &&
    input.coop?.greenGoods?.gardenAddress
  ) {
    return {
      provider: 'heuristic',
      model: result.model,
      durationMs: result.durationMs,
      output: createGreenGoodsGapAdminSyncOutput({
        desiredAdmins: resolveGreenGoodsOperatorAddresses(input.coop) as `0x${string}`[],
        currentAdmins: resolveGreenGoodsGapAdminAddresses(input.coop) as `0x${string}`[],
      }) as T,
    };
  }

  if (manifest.outputSchemaRef === 'erc8004-registration-output' && input.coop) {
    const agentManifest = buildAgentManifest({
      coop: input.coop,
      skills: listRegisteredSkills().map((entry) => entry.manifest.id),
      agentId: input.coop.agentIdentity?.agentId,
    });
    return {
      provider: 'heuristic',
      model: result.model,
      durationMs: result.durationMs,
      output: {
        agentURI: encodeAgentManifestURI(agentManifest),
        metadata: [
          { key: 'coopId', value: input.coop.profile.id },
          { key: 'coopName', value: input.coop.profile.name },
          { key: 'safeAddress', value: input.coop.onchainState.safeAddress },
        ],
        rationale:
          'Register the coop as an ERC-8004 agent so Coop can publish a deterministic onchain identity and receive reputation feedback.',
      } as T,
    };
  }

  if (manifest.outputSchemaRef === 'erc8004-feedback-output') {
    const payload = input.observation.payload as {
      reason?: string;
      rootCid?: string;
      targetAgentId?: number;
    };
    const targetAgentId =
      typeof payload.targetAgentId === 'number' && payload.targetAgentId > 0
        ? payload.targetAgentId
        : input.coop?.agentIdentity?.agentId;
    if (targetAgentId) {
      const reason = payload.reason ?? 'coop-feedback';
      const rootedReason =
        payload.rootCid && reason === 'archive-anchor'
          ? `Archive anchor for ${payload.rootCid} succeeded and warrants a positive self-attestation.`
          : 'A successful coop action warrants positive ERC-8004 feedback.';
      return {
        provider: 'heuristic',
        model: result.model,
        durationMs: result.durationMs,
        output: {
          targetAgentId,
          value: 1,
          tag1: reason === 'archive-anchor' ? 'archive' : 'coop',
          tag2: reason === 'archive-anchor' ? 'self-attestation' : 'feedback',
          rationale: rootedReason,
        } as T,
      };
    }
  }

  return result;
}

export async function maybePatchDraft(
  draft: ReviewDraft | null | undefined,
  output: PublishReadinessCheckOutput,
) {
  if (!draft) {
    return null;
  }
  if (Object.keys(output.proposedPatch ?? {}).length === 0) {
    return draft;
  }
  const patched: ReviewDraft = {
    ...draft,
    ...output.proposedPatch,
  };
  await saveReviewDraft(db, patched);
  return patched;
}

async function resolveActionMemberId(coopId: string) {
  const [coops, authSession] = await Promise.all([getCoops(), getAuthSession(db)]);
  const coop = coops.find((candidate) => candidate.profile.id === coopId);
  return coop ? findAuthenticatedCoopMember(coop, authSession)?.id : undefined;
}

export async function dispatchActionProposal(input: {
  plan: AgentPlan;
  proposal: AgentPlan['actionProposals'][number];
  autoExecute: boolean;
}) {
  const memberId = input.proposal.memberId ?? (await resolveActionMemberId(input.proposal.coopId));
  if (!memberId) {
    return { ok: false, error: 'No authenticated coop member is available to execute this plan.' };
  }

  const proposalResponse = (await chrome.runtime.sendMessage({
    type: 'propose-action',
    payload: {
      actionClass: input.proposal.actionClass,
      coopId: input.proposal.coopId,
      memberId,
      payload: input.proposal.payload,
    },
  })) as RuntimeActionResponse<ActionBundle>;

  if (!proposalResponse.ok || !proposalResponse.data) {
    return { ok: false, error: proposalResponse.error ?? 'Could not create action bundle.' };
  }

  if (!input.autoExecute || proposalResponse.data.status !== 'approved') {
    return { ok: true, executed: false };
  }

  const executeResponse = (await chrome.runtime.sendMessage({
    type: 'execute-action',
    payload: { bundleId: proposalResponse.data.id },
  })) as RuntimeActionResponse<ActionBundle>;

  if (!executeResponse.ok) {
    return { ok: false, error: executeResponse.error ?? 'Could not execute action bundle.' };
  }

  return { ok: true, executed: true };
}

export function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

async function loadExtractsForObservation(observation: AgentObservation) {
  const extracts = await Promise.all(
    resolveObservationExtractIds(observation).map((extractId) => getPageExtract(db, extractId)),
  );
  return extracts.filter((extract): extract is ReadablePageExtract => Boolean(extract));
}

async function emitObservationIfMissing(observation: AgentObservation) {
  const existing = await findAgentObservationByFingerprint(db, observation.fingerprint);
  if (existing) {
    return existing;
  }
  await saveAgentObservation(db, observation);
  return observation;
}

async function findExistingDraftForRouting(extractId: string, coopId: string) {
  const drafts = (await listReviewDrafts(db)).filter((draft) => draft.extractId === extractId);
  return drafts.find((draft) => draft.suggestedTargetCoopIds.includes(coopId));
}

export async function persistTabRouterOutput(input: {
  observation: AgentObservation;
  coops: CoopSharedState[];
  extracts: ReadablePageExtract[];
  output: TabRouterOutput;
  provider: AgentProvider;
}) {
  const extractsById = new Map(input.extracts.map((extract) => [extract.id, extract] as const));
  const coopsById = new Map(input.coops.map((coop) => [coop.profile.id, coop] as const));
  const createdDraftIds: string[] = [];
  const routedByCoop = new Map<string, TabRouting[]>();

  for (const rawRouting of input.output.routings) {
    const extract = extractsById.get(rawRouting.extractId);
    const coop = coopsById.get(rawRouting.coopId);
    if (!extract || !coop) {
      continue;
    }

    const existingRouting = await getTabRoutingByExtractAndCoop(db, extract.id, coop.profile.id);
    let draftId = existingRouting?.draftId;
    let status: TabRouting['status'] =
      existingRouting?.status === 'published' || existingRouting?.status === 'dismissed'
        ? existingRouting.status
        : 'routed';

    if (rawRouting.relevanceScore >= 0.18) {
      let draft =
        (draftId ? await getReviewDraft(db, draftId) : null) ??
        (await findExistingDraftForRouting(extract.id, coop.profile.id));
      if (!draft) {
        draft = shapeReviewDraft(
          extract,
          {
            id: `routing-interpretation-${extract.id}-${coop.profile.id}`,
            targetCoopId: coop.profile.id,
            relevanceScore: rawRouting.relevanceScore,
            matchedRitualLenses: rawRouting.matchedRitualLenses,
            categoryCandidates: [rawRouting.category],
            tagCandidates: rawRouting.tags,
            rationale: rawRouting.rationale,
            suggestedNextStep: rawRouting.suggestedNextStep,
            archiveWorthinessHint: rawRouting.archiveWorthinessHint,
          },
          coop.profile,
        );
        await saveReviewDraft(db, draft);
        createdDraftIds.push(draft.id);
      }
      draftId = draft.id;
      status = existingRouting?.status === 'published' ? 'published' : 'drafted';

      if (rawRouting.relevanceScore >= AGENT_HIGH_CONFIDENCE_THRESHOLD) {
        await emitObservationIfMissing(
          createAgentObservation({
            trigger: 'high-confidence-draft',
            title: `High-confidence draft: ${draft.title}`,
            summary: draft.summary,
            coopId: coop.profile.id,
            draftId: draft.id,
            extractId: draft.extractId,
            payload: {
              confidence: rawRouting.relevanceScore,
              category: rawRouting.category,
              workflowStage: draft.workflowStage,
            },
          }),
        );
      }
    }

    const now = nowIso();
    const nextRouting: TabRouting = {
      id: existingRouting?.id ?? `tab-routing:${extract.id}:${coop.profile.id}`,
      sourceCandidateId: rawRouting.sourceCandidateId,
      extractId: rawRouting.extractId,
      coopId: rawRouting.coopId,
      relevanceScore: rawRouting.relevanceScore,
      matchedRitualLenses: rawRouting.matchedRitualLenses,
      category: rawRouting.category,
      tags: rawRouting.tags,
      rationale: rawRouting.rationale,
      suggestedNextStep: rawRouting.suggestedNextStep,
      archiveWorthinessHint: rawRouting.archiveWorthinessHint,
      provider: input.provider,
      status,
      draftId,
      createdAt: existingRouting?.createdAt ?? now,
      updatedAt: now,
    };
    await saveTabRouting(db, nextRouting);

    if (rawRouting.relevanceScore >= 0.18) {
      const routed = routedByCoop.get(coop.profile.id) ?? [];
      routed.push(nextRouting);
      routedByCoop.set(coop.profile.id, routed);
    }
  }

  for (const [coopId, routings] of routedByCoop) {
    const newStrongMatches = routings.filter(
      (routing) => routing.relevanceScore >= AGENT_HIGH_CONFIDENCE_THRESHOLD,
    );
    if (routings.length < 3 && newStrongMatches.length === 0) {
      continue;
    }
    await emitObservationIfMissing(
      createAgentObservation({
        trigger: 'memory-insight-due',
        title: `Memory insight due for ${coopsById.get(coopId)?.profile.name ?? 'this coop'}`,
        summary: 'New routed tabs suggest a reusable local insight or digest.',
        coopId,
        payload: {
          routingIds: routings.map((routing) => routing.id),
          draftIds: compact(routings.map((routing) => routing.draftId)),
          matchCount: routings.length,
          strongMatchCount: newStrongMatches.length,
        },
      }),
    );
  }

  return { createdDraftIds };
}

export async function buildSkillContext(
  observation: AgentObservation,
): Promise<SkillExecutionContext> {
  const [coops, draft, capture, authSession, extracts] = await Promise.all([
    getCoops(),
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

export function extractMemoriesFromOutput(
  schemaRef: SkillOutputSchemaRef,
  output: unknown,
  outputConfidence?: number,
): Array<{
  type: AgentMemory['type'];
  content: string;
  confidence: number;
  domain: string;
  expiresAt?: string;
}> {
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  switch (schemaRef) {
    case 'opportunity-extractor-output': {
      const typed = output as OpportunityExtractorOutput;
      if (!typed.candidates?.length) return [];
      const topTitles = typed.candidates
        .slice(0, 3)
        .map((c) => c.title)
        .join(', ');
      return [
        {
          type: 'observation-outcome',
          content: `Extracted ${typed.candidates.length} opportunity candidates: ${topTitles}`,
          confidence: outputConfidence ?? 0.7,
          domain: 'opportunities',
          expiresAt: thirtyDaysFromNow,
        },
        {
          type: 'decision-context' as const,
          content: `Decision: Surfaced ${typed.candidates.length} opportunity candidates\nRationale: Priority ordering based on ${typed.candidates[0]?.fundingSignals.length ? 'funding signals' : 'ecological relevance'}\nTop candidate: ${typed.candidates[0]?.title} (priority: ${typed.candidates[0]?.priority.toFixed(2)})`,
          confidence: typed.candidates[0]?.priority ?? 0.5,
          domain: 'opportunities',
          expiresAt: thirtyDaysFromNow,
        },
      ];
    }
    case 'theme-clusterer-output': {
      const typed = output as ThemeClustererOutput;
      if (!typed.themes?.length) return [];
      const labels = typed.themes.map((t) => t.label).join(', ');
      return [
        {
          type: 'domain-pattern',
          content: `Emerging themes: ${labels}`,
          confidence: outputConfidence ?? 0.65,
          domain: 'themes',
        },
      ];
    }
    case 'review-digest-output': {
      const typed = output as ReviewDigestOutput;
      if (!typed.summary) return [];
      return [
        {
          type: 'coop-context',
          content: `Review digest: ${truncateWords(typed.summary, 60)}`,
          confidence: outputConfidence ?? 0.8,
          domain: 'reviews',
        },
      ];
    }
    case 'capital-formation-brief-output': {
      const typed = output as CapitalFormationBriefOutput;
      return [
        {
          type: 'observation-outcome',
          content: `Capital formation brief: ${typed.title} — ${truncateWords(typed.whyItMatters, 40)}`,
          confidence: outputConfidence ?? 0.75,
          domain: 'funding',
          expiresAt: thirtyDaysFromNow,
        },
        {
          type: 'decision-context' as const,
          content: `Decision: Created capital formation brief "${typed.title}"\nRationale: ${truncateWords(typed.whyItMatters, 30)}`,
          confidence: outputConfidence ?? 0.75,
          domain: 'funding',
          expiresAt: thirtyDaysFromNow,
        },
      ];
    }
    case 'memory-insight-output': {
      const typed = output as MemoryInsightOutput;
      if (!typed.insights.length) return [];
      return typed.insights.slice(0, 2).map((insight) => ({
        type: 'coop-context' as const,
        content: `Memory insight: ${insight.title} — ${truncateWords(insight.summary, 32)}`,
        confidence: insight.confidence,
        domain: 'insights',
        expiresAt: thirtyDaysFromNow,
      }));
    }
    case 'publish-readiness-check-output': {
      const typed = output as PublishReadinessCheckOutput;
      const suggestions = typed.suggestions?.join('; ') ?? 'none';
      return [
        {
          type: 'skill-pattern',
          content: `Publish readiness: ${typed.ready ? 'ready' : 'not ready'}. Suggestions: ${suggestions}`,
          confidence: outputConfidence ?? 0.7,
          domain: 'publishing',
          expiresAt: thirtyDaysFromNow,
        },
        {
          type: 'decision-context' as const,
          content: `Decision: Draft ${typed.draftId} ${typed.ready ? 'ready' : 'not ready'} for publish\nRationale: ${typed.suggestions?.slice(0, 2).join('; ') ?? 'No suggestions'}`,
          confidence: typed.ready ? 0.85 : 0.6,
          domain: 'publishing',
          expiresAt: thirtyDaysFromNow,
        },
      ];
    }
    case 'tab-router-output': {
      const typed = output as TabRouterOutput;
      if (!typed.routings?.length) return [];
      const topRouting = typed.routings.reduce(
        (best, r) => (r.relevanceScore > best.relevanceScore ? r : best),
        typed.routings[0],
      );
      const alternatives = typed.routings
        .filter((r) => r.coopId !== topRouting.coopId)
        .slice(0, 3)
        .map((r) => `${r.coopId} (${r.relevanceScore.toFixed(2)})`)
        .join(', ');
      return [
        {
          type: 'decision-context' as const,
          content: `Decision: Routed extract ${topRouting.extractId} to ${topRouting.coopId}\nRationale: ${truncateWords(topRouting.rationale, 30)} (relevance: ${topRouting.relevanceScore.toFixed(2)})${alternatives ? `\nAlternatives: ${alternatives}` : ''}`,
          confidence: topRouting.relevanceScore,
          domain: 'routing',
          expiresAt: thirtyDaysFromNow,
        },
      ];
    }
    case 'grant-fit-scorer-output': {
      const typed = output as GrantFitScorerOutput;
      if (!typed.scores?.length) return [];
      const topScore = typed.scores.reduce(
        (best, s) => (s.score > best.score ? s : best),
        typed.scores[0],
      );
      return [
        {
          type: 'decision-context' as const,
          content: `Decision: Scored ${typed.scores.length} grant candidates\nRationale: ${topScore.reasons.slice(0, 2).join('; ')}\nTop fit: ${topScore.candidateTitle} (score: ${topScore.score.toFixed(2)})`,
          confidence: topScore.score,
          domain: 'funding',
          expiresAt: thirtyDaysFromNow,
        },
      ];
    }
    default:
      // Green Goods, ERC-8004, ecosystem-entity-extractor,
      // and other transactional/scoring skills — no memories
      return [];
  }
}

async function writeSkillMemories(
  schemaRef: SkillOutputSchemaRef,
  output: unknown,
  observation: AgentObservation,
  skillRunId: string,
  outputConfidence?: number,
): Promise<void> {
  try {
    const entries = extractMemoriesFromOutput(schemaRef, output, outputConfidence);
    if (entries.length === 0) return;
    const coopId = observation.coopId;
    if (!coopId) return;

    for (const entry of entries) {
      await createAgentMemory(db, {
        coopId,
        type: entry.type,
        content: entry.content,
        confidence: entry.confidence,
        domain: entry.domain,
        expiresAt: entry.expiresAt,
        sourceObservationId: observation.id,
        sourceSkillRunId: skillRunId,
      });
    }
  } catch (error) {
    // Fire-and-forget: never break the agent cycle
    console.warn('[agent-memory] Failed to write skill memories:', error);
  }
}

export async function runObservationPlan(observation: AgentObservation): Promise<AgentCycleResult> {
  const context = await buildSkillContext(observation);
  const dismissalReason = getObservationDismissReason({
    observation,
    context,
  });
  if (dismissalReason) {
    await saveAgentObservation(
      db,
      updateAgentObservation(observation, {
        status: 'dismissed',
        blockedReason: dismissalReason,
      }),
    );
    void logObservationDismissed({ observationId: observation.id, reason: dismissalReason });
    return {
      processedObservationIds: [observation.id],
      createdPlanIds: [],
      createdDraftIds: [],
      completedSkillRunIds: [],
      autoExecutedActionCount: 0,
      errors: [],
      skillRunMetrics: [],
    } satisfies AgentCycleResult;
  }

  const autoRunSkillIds = new Set(await getAutoRunSkillIds());
  const skillIds = selectSkillIdsForObservation(
    observation,
    listRegisteredSkills().map((entry) => entry.manifest),
  );
  const plan = createAgentPlan({
    observationId: observation.id,
    provider: skillIds.some((skillId) => {
      const manifest = getRegisteredSkill(skillId)?.manifest;
      return manifest ? inferPreferredProvider(manifest) === 'webllm' : false;
    })
      ? 'webllm'
      : skillIds.some((skillId) => {
            const manifest = getRegisteredSkill(skillId)?.manifest;
            return manifest ? inferPreferredProvider(manifest) === 'transformers' : false;
          })
        ? 'transformers'
        : 'heuristic',
    confidence: Math.max(0.55, context.draft?.confidence ?? 0.62),
    goal: observation.title,
    rationale: observation.summary,
  });
  await saveAgentPlan(db, plan);

  const result: AgentCycleResult = {
    processedObservationIds: [observation.id],
    createdPlanIds: [plan.id],
    createdDraftIds: [],
    completedSkillRunIds: [],
    autoExecutedActionCount: 0,
    errors: [],
    skillRunMetrics: [],
  };

  void logObservationStart({ observationId: observation.id, trigger: observation.trigger });

  let workingPlan = plan;
  let workingObservation = updateAgentObservation(observation, {
    status: 'processing',
    blockedReason: undefined,
    lastRunAt: nowIso(),
  });
  await saveAgentObservation(db, workingObservation);

  if (observation.trigger === 'stale-archive-receipt' && context.coop) {
    const proposal = createActionProposal({
      actionClass: 'refresh-archive-status',
      coopId: context.coop.profile.id,
      payload: {
        coopId: context.coop.profile.id,
        receiptId: observation.receiptId,
      },
      reason: 'Archive receipt follow-up is due.',
      approvalMode: 'auto-run-eligible',
      generatedBySkillId: 'stale-archive-receipt',
    });
    workingPlan = updateAgentPlan(workingPlan, {
      actionProposals: [...workingPlan.actionProposals, proposal],
      requiresApproval: true,
    });
    await saveAgentPlan(db, workingPlan);

    const dispatched = await dispatchActionProposal({
      plan: workingPlan,
      proposal,
      autoExecute: true,
    });
    if (dispatched.ok) {
      if (dispatched.executed) {
        result.autoExecutedActionCount += 1;
      }
      workingPlan = completeAgentPlan(workingPlan);
      workingObservation = updateAgentObservation(workingObservation, {
        status: 'completed',
      });
      await Promise.all([
        saveAgentPlan(db, workingPlan),
        saveAgentObservation(db, workingObservation),
      ]);
      return result;
    }

    workingPlan = updateAgentPlan(workingPlan, {
      failureReason: dispatched.error,
    });
    workingObservation = updateAgentObservation(workingObservation, {
      status: 'failed',
      blockedReason: dispatched.error,
    });
    await Promise.all([
      saveAgentPlan(db, workingPlan),
      saveAgentObservation(db, workingObservation),
    ]);
    result.errors.push(dispatched.error ?? 'Archive follow-up auto-run failed.');
    return result;
  }

  for (const skillId of skillIds) {
    const registered = getRegisteredSkill(skillId);
    if (!registered) {
      result.errors.push(`Unknown skill "${skillId}".`);
      continue;
    }

    const missingRequiredCapabilities = getMissingRequiredCapabilities(
      registered.manifest.requiredCapabilities,
      {
        candidates: context.candidates,
        scores: context.scores,
        draft: context.draft,
        coop: context.coop,
        capture: context.capture,
        receipt: context.receipt,
      },
    );

    // Evaluate skip condition before running skill
    if (
      missingRequiredCapabilities.length > 0 ||
      shouldSkipSkill(registered.manifest.skipWhen, {
        candidates: context.candidates,
        scores: context.scores,
        draft: context.draft,
        coop: context.coop,
        capture: context.capture,
        receipt: context.receipt,
      })
    ) {
      const skippedStep = createAgentPlanStep({
        skillId,
        provider: inferPreferredProvider(registered.manifest),
        summary: registered.manifest.description,
        startedAt: nowIso(),
      });
      workingPlan = updateAgentPlan(workingPlan, {
        steps: [
          ...workingPlan.steps,
          updateAgentPlanStep(skippedStep, { status: 'skipped', finishedAt: nowIso() }),
        ],
      });
      await saveAgentPlan(db, workingPlan);
      void logSkillComplete({
        skillId,
        observationId: observation.id,
        provider: inferPreferredProvider(registered.manifest),
        durationMs: 0,
        skipped: true,
      });
      result.skillRunMetrics.push({
        skillId,
        provider: inferPreferredProvider(registered.manifest),
        durationMs: 0,
        retryCount: 0,
        skipped: true,
      });
      continue;
    }

    const step = createAgentPlanStep({
      skillId,
      provider: inferPreferredProvider(registered.manifest),
      summary: registered.manifest.description,
      startedAt: nowIso(),
    });
    workingPlan = updateAgentPlan(workingPlan, {
      steps: [...workingPlan.steps, step],
      status: 'executing',
    });
    await saveAgentPlan(db, workingPlan);

    let currentStep: AgentPlanStep = step;
    let run = createSkillRun({
      observationId: observation.id,
      planId: workingPlan.id,
      skill: registered.manifest,
      provider: inferPreferredProvider(registered.manifest),
      promptHash: `${registered.manifest.id}:${observation.id}:${observation.updatedAt}`,
    });
    await saveSkillRun(db, run);
    void logSkillStart({
      skillId,
      observationId: observation.id,
      provider: inferPreferredProvider(registered.manifest),
    });

    try {
      const completed = await completeSkill({
        skill: registered,
        observation,
        coop: context.coop,
        draft: context.draft,
        capture: context.capture,
        receipt: context.receipt,
        candidates: context.candidates,
        scores: context.scores,
        extracts: context.extracts,
        relatedDrafts: context.relatedDrafts,
        relatedArtifacts: context.relatedArtifacts,
        relatedRoutings: context.relatedRoutings,
        memories: context.memories,
      });

      const handled = await applySkillOutput({
        output: completed.output,
        manifest: registered.manifest,
        skillId,
        provider: completed.provider,
        durationMs: completed.durationMs,
        observation,
        plan: workingPlan,
        run,
        context,
        extracts: context.extracts,
        autoRunEnabled: autoRunSkillIds.has(skillId),
        getCoops,
        saveReviewDraft: async (draft) => saveReviewDraft(db, draft),
        savePlan: async (plan) => saveAgentPlan(db, plan),
        persistTabRouterOutput,
        maybePatchDraft,
        dispatchActionProposal,
      });

      const output = handled.output;
      workingPlan = handled.plan;
      result.createdDraftIds.push(...handled.createdDraftIds);
      result.autoExecutedActionCount += handled.autoExecutedActionCount;
      result.errors.push(...handled.errors);

      run = completeSkillRun(run, output);
      await saveSkillRun(db, run);
      result.completedSkillRunIds.push(run.id);

      const confidenceBefore = workingPlan.confidence;
      const recalculatedConfidence = computeOutputConfidence(
        registered.manifest.outputSchemaRef,
        output,
        completed.provider,
      );
      if (recalculatedConfidence < workingPlan.confidence) {
        workingPlan = updateAgentPlan(workingPlan, {
          confidence: recalculatedConfidence,
        });
      }

      void writeSkillMemories(
        registered.manifest.outputSchemaRef,
        output,
        observation,
        run.id,
        recalculatedConfidence,
      );

      result.skillRunMetrics.push({
        skillId,
        provider: completed.provider,
        durationMs: completed.durationMs,
        retryCount: 0,
        skipped: false,
      });
      void logSkillComplete({
        skillId,
        observationId: observation.id,
        provider: completed.provider,
        model: completed.model,
        durationMs: completed.durationMs,
        confidenceBefore,
        confidenceAfter: recalculatedConfidence,
        confidenceDelta: recalculatedConfidence - confidenceBefore,
      });

      currentStep = updateAgentPlanStep(currentStep, {
        provider: completed.provider,
        status: 'completed',
        finishedAt: nowIso(),
        outputRef: run.id,
      });
      workingPlan = updateAgentPlan(workingPlan, {
        steps: workingPlan.steps.map((candidate) =>
          candidate.id === currentStep.id ? currentStep : candidate,
        ),
      });
      await saveAgentPlan(db, workingPlan);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Skill ${skillId} failed.`;
      run = failSkillRun(run, message);
      await saveSkillRun(db, run);
      void logSkillFailed({ skillId, observationId: observation.id, error: message });

      currentStep = updateAgentPlanStep(currentStep, {
        status: 'failed',
        finishedAt: nowIso(),
        error: message,
      });
      workingPlan = updateAgentPlan(workingPlan, {
        steps: workingPlan.steps.map((candidate) =>
          candidate.id === currentStep.id ? currentStep : candidate,
        ),
        failureReason: message,
      });
      await saveAgentPlan(db, workingPlan);
      result.errors.push(message);
    }
  }

  if (result.errors.length > 0 && workingPlan.steps.every((step) => step.status !== 'completed')) {
    workingPlan = failAgentPlan(workingPlan, result.errors.join(' '));
    workingObservation = updateAgentObservation(workingObservation, {
      status: 'failed',
      blockedReason: result.errors.join(' '),
    });
  } else if (workingPlan.actionProposals.length > 0) {
    workingPlan = updateAgentPlan(workingPlan, {
      status: workingPlan.actionProposals.every(
        (proposal) =>
          proposal.approvalMode === 'auto-run-eligible' &&
          autoRunSkillIds.has(proposal.generatedBySkillId ?? ''),
      )
        ? 'completed'
        : 'pending',
      completedAt: workingPlan.actionProposals.every(
        (proposal) =>
          proposal.approvalMode === 'auto-run-eligible' &&
          autoRunSkillIds.has(proposal.generatedBySkillId ?? ''),
      )
        ? nowIso()
        : undefined,
    });
    workingObservation = updateAgentObservation(workingObservation, {
      status: 'completed',
    });
  } else {
    workingPlan = completeAgentPlan(workingPlan);
    workingObservation = updateAgentObservation(workingObservation, {
      status: 'completed',
    });
  }

  await Promise.all([saveAgentPlan(db, workingPlan), saveAgentObservation(db, workingObservation)]);
  return result;
}
