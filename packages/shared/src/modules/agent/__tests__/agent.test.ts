import { describe, expect, it } from 'vitest';
import type { AgentPlan, CapitalFormationBriefOutput } from '../../../contracts/schema';
import {
  approveAgentPlan,
  buildAgentObservationFingerprint,
  createAgentObservation,
  createAgentPlan,
  createCapitalFormationDraft,
  rejectAgentPlan,
  validateSkillOutput,
} from '../agent';

describe('agent helpers', () => {
  it('builds a stable observation fingerprint', () => {
    const first = buildAgentObservationFingerprint({
      trigger: 'high-confidence-draft',
      coopId: 'coop-1',
      draftId: 'draft-1',
      payload: { confidence: 0.8 },
    });
    const second = buildAgentObservationFingerprint({
      trigger: 'high-confidence-draft',
      coopId: 'coop-1',
      draftId: 'draft-1',
      payload: { confidence: 0.8 },
    });

    expect(first).toBe(second);
  });

  it('creates and approves an agent plan', () => {
    const observation = createAgentObservation({
      trigger: 'high-confidence-draft',
      title: 'High confidence draft',
      summary: 'Potential funding signal.',
      coopId: 'coop-1',
      draftId: 'draft-1',
    });
    const plan = createAgentPlan({
      observationId: observation.id,
      provider: 'transformers',
      confidence: 0.8,
      goal: 'Review funding signal',
      rationale: 'The draft is highly relevant.',
    });

    const approved = approveAgentPlan(plan);

    expect(approved.status).toBe('approved');
    expect(approved.approvedAt).toBeDefined();
  });

  it('rejects an agent plan with a reason', () => {
    const plan = createAgentPlan({
      observationId: 'agent-observation-1',
      provider: 'heuristic',
      confidence: 0.6,
      goal: 'Hold for later review',
      rationale: 'Needs human judgement first.',
    });

    const rejected = rejectAgentPlan(plan as AgentPlan, 'Not aligned with current ritual scope.');

    expect(rejected.status).toBe('rejected');
    expect(rejected.failureReason).toContain('ritual scope');
  });

  it('validates capital formation brief outputs', () => {
    const output = validateSkillOutput<CapitalFormationBriefOutput>(
      'capital-formation-brief-output',
      {
        title: 'Watershed capital brief',
        summary: 'A concise funding thesis.',
        whyItMatters: 'It aligns with the coop mission.',
        suggestedNextStep: 'Review with the funding circle.',
        tags: ['watershed', 'funding'],
        targetCoopIds: ['coop-1'],
        supportingCandidateIds: ['candidate-1'],
      },
    );

    expect(output.title).toContain('Watershed');
    expect(output.tags).toContain('funding');
  });

  it('creates agent-generated drafts with agent provenance', () => {
    const draft = createCapitalFormationDraft({
      observationId: 'agent-observation-1',
      planId: 'agent-plan-1',
      skillRunId: 'skill-run-1',
      skillId: 'capital-formation-brief',
      coopId: 'coop-1',
      output: {
        title: 'Capital readiness',
        summary: 'A concise funding summary.',
        whyItMatters: 'This is relevant to the coop.',
        suggestedNextStep: 'Review and route it.',
        tags: ['funding'],
        targetCoopIds: ['coop-1'],
        supportingCandidateIds: ['candidate-1'],
      },
    });

    expect(draft.provenance.type).toBe('agent');
    if (draft.provenance.type !== 'agent') {
      throw new Error('Expected agent provenance.');
    }
    expect(draft.provenance.skillId).toBe('capital-formation-brief');
    expect(draft.suggestedTargetCoopIds).toEqual(['coop-1']);
  });
});
