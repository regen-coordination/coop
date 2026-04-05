import type {
  AgentObservation,
  AgentPlan,
  AgentPlanStep,
  CoopSharedState,
} from '@coop/shared';
import {
  completeAgentPlan,
  completeSkillRun,
  createActionProposal,
  createAgentPlan,
  createAgentPlanStep,
  createSkillRun,
  failAgentPlan,
  failSkillRun,
  listAgentObservations,
  nowIso,
  saveAgentObservation,
  saveAgentPlan,
  saveReviewDraft,
  saveSkillRun,
  updateAgentObservation,
  updateAgentPlan,
  updateAgentPlanStep,
} from '@coop/shared';
import {
  getMissingRequiredCapabilities,
  selectSkillIdsForObservation,
  shouldSkipSkill,
} from './harness';
import {
  logObservationDismissed,
  logObservationStart,
  logSkillComplete,
  logSkillFailed,
  logSkillStart,
} from './logger';
import { applySkillOutput } from './output-handlers';
import { computeOutputConfidence } from './quality';
import { getRegisteredSkill, listRegisteredSkills } from './registry';
import { getObservationDismissReason } from './runner-observations';
import { completeSkill, dispatchActionProposal, maybePatchDraft } from './runner-skills-completion';
import { buildSkillContext, persistTabRouterOutput } from './runner-skills-context';
import { writeSkillMemories } from './runner-skills-memory';
import {
  type AgentCycleResult,
  db,
  getAutoRunSkillIds,
  getCoops,
  inferPreferredProvider,
} from './runner-state';

// Re-export all split module surfaces so existing imports from this file continue to work
export * from './runner-skills-prompt';
export * from './runner-skills-completion';
export * from './runner-skills-context';
export * from './runner-skills-memory';

export async function runObservationPlan(
  observation: AgentObservation,
  options: {
    availableCoops?: CoopSharedState[];
  } = {},
): Promise<AgentCycleResult> {
  const [context, observations] = await Promise.all([
    buildSkillContext(observation, { availableCoops: options.availableCoops }),
    listAgentObservations(db, 200),
  ]);
  const dismissalReason = getObservationDismissReason({
    observation,
    context,
    observations,
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
        availableCoops: options.availableCoops,
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

      const confidenceBefore = workingPlan.confidence;
      const recalculatedConfidence = computeOutputConfidence(
        registered.manifest.outputSchemaRef,
        completed.output,
        completed.provider,
      );
      const qualityThreshold = registered.manifest.qualityThreshold;

      if (typeof qualityThreshold === 'number' && recalculatedConfidence < qualityThreshold) {
        const message = `Skill "${skillId}" output confidence ${recalculatedConfidence.toFixed(
          2,
        )} fell below the configured quality threshold ${qualityThreshold.toFixed(2)}.`;

        run = failSkillRun(run, message);
        await saveSkillRun(db, run);
        void logSkillFailed({ skillId, observationId: observation.id, error: message });

        currentStep = updateAgentPlanStep(currentStep, {
          provider: completed.provider,
          status: 'failed',
          finishedAt: nowIso(),
          error: message,
        });
        workingPlan = updateAgentPlan(workingPlan, {
          steps: workingPlan.steps.map((candidate) =>
            candidate.id === currentStep.id ? currentStep : candidate,
          ),
          confidence: Math.min(workingPlan.confidence, recalculatedConfidence),
          failureReason: message,
        });
        await saveAgentPlan(db, workingPlan);

        result.errors.push(message);
        result.skillRunMetrics.push({
          skillId,
          provider: completed.provider,
          durationMs: completed.durationMs,
          retryCount: 0,
          skipped: false,
        });
        continue;
      }

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
        getCoops: async () => options.availableCoops ?? (await getCoops()),
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
