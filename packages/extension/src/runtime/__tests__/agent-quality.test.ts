import { describe, expect, it } from 'vitest';
import { computeOutputConfidence } from '../agent/quality';

describe('computeOutputConfidence', () => {
  it('returns low confidence for empty heuristic outputs', () => {
    const confidence = computeOutputConfidence(
      'opportunity-extractor-output',
      { candidates: [] },
      'heuristic',
    );
    expect(confidence).toBeLessThanOrEqual(0.2);
  });

  it('returns moderate confidence for heuristic outputs with content', () => {
    const confidence = computeOutputConfidence(
      'tab-router-output',
      {
        routings: [
          {
            sourceCandidateId: 'c1',
            extractId: 'e1',
            coopId: 'coop-1',
            relevanceScore: 0.7,
            rationale: 'test',
            suggestedNextStep: 'go',
            category: 'insight',
          },
        ],
      },
      'heuristic',
    );
    expect(confidence).toBeGreaterThan(0.2);
    expect(confidence).toBeLessThanOrEqual(0.5);
  });

  it('returns higher confidence for rich model outputs', () => {
    const confidence = computeOutputConfidence(
      'opportunity-extractor-output',
      {
        candidates: [
          {
            id: 'c1',
            title: 'River restoration grant',
            summary: 'A long summary about watershed restoration funding opportunities.',
            rationale:
              'The source contains explicit ecological funding language and a clear applicant motion for the coop.',
            regionTags: ['pacific-northwest'],
            ecologyTags: ['watershed', 'restoration'],
            fundingSignals: ['grant', 'resilience'],
            priority: 0.84,
            recommendedNextStep: 'Review fit with coop.',
          },
        ],
      },
      'transformers',
    );
    expect(confidence).toBeGreaterThan(0.7);
  });

  it('scores tab-router higher with more routings and better relevance', () => {
    const singleRouting = computeOutputConfidence(
      'tab-router-output',
      {
        routings: [
          {
            sourceCandidateId: 'c1',
            extractId: 'e1',
            coopId: 'coop-1',
            relevanceScore: 0.5,
            rationale: 'short',
            suggestedNextStep: 'go',
            category: 'insight',
          },
        ],
      },
      'transformers',
    );

    const multipleHighRelevance = computeOutputConfidence(
      'tab-router-output',
      {
        routings: [
          {
            sourceCandidateId: 'c1',
            extractId: 'e1',
            coopId: 'coop-1',
            relevanceScore: 0.9,
            rationale: 'Highly relevant to the coop purpose and active ritual lenses.',
            suggestedNextStep: 'Create draft',
            category: 'opportunity',
          },
          {
            sourceCandidateId: 'c2',
            extractId: 'e2',
            coopId: 'coop-2',
            relevanceScore: 0.85,
            rationale: 'Strong alignment with watershed stewardship goals and funding priorities.',
            suggestedNextStep: 'Review for funding',
            category: 'funding-lead',
          },
        ],
      },
      'transformers',
    );

    expect(multipleHighRelevance).toBeGreaterThan(singleRouting);
  });

  it('scores grant-fit-scorer based on reason count', () => {
    const noReasons = computeOutputConfidence(
      'grant-fit-scorer-output',
      {
        scores: [{ candidateId: 'c1', candidateTitle: 'Test', score: 0.8, reasons: [] }],
      },
      'webllm',
    );

    const withReasons = computeOutputConfidence(
      'grant-fit-scorer-output',
      {
        scores: [
          {
            candidateId: 'c1',
            candidateTitle: 'Test',
            score: 0.8,
            reasons: ['Matches purpose', 'Matches themes', 'Has funding signals'],
          },
        ],
      },
      'webllm',
    );

    expect(withReasons).toBeGreaterThan(noReasons);
  });

  it('returns default confidence for unrecognized schema refs', () => {
    const confidence = computeOutputConfidence(
      'green-goods-garden-bootstrap-output',
      { name: 'test', description: 'test', rationale: 'test', domains: ['agro'] },
      'heuristic',
    );
    expect(confidence).toBe(0.35);
  });

  it('scores heuristic capital-formation briefs with the synthesis rubric', () => {
    const confidence = computeOutputConfidence(
      'capital-formation-brief-output',
      {
        title: 'River restoration capital formation brief',
        summary:
          'A heuristic summary that still captures the watershed funding signal, the coop fit, and the core opportunity.',
        whyItMatters:
          'It aligns with the coop purpose, recent funding themes, and the strongest candidate rationale.',
        suggestedNextStep:
          'Review the signal, tighten the thesis, and prepare the funding brief for coop review.',
        tags: ['funding', 'watershed', 'restoration'],
        targetCoopIds: ['coop-river'],
        supportingCandidateIds: ['candidate-1'],
      },
      'heuristic',
    );
    expect(confidence).toBeGreaterThanOrEqual(0.72);
  });

  it('clamps all outputs between 0.2 and 0.95', () => {
    const empty = computeOutputConfidence('theme-clusterer-output', { themes: [] }, 'transformers');
    expect(empty).toBeGreaterThanOrEqual(0.2);
    expect(empty).toBeLessThanOrEqual(0.95);

    const rich = computeOutputConfidence(
      'capital-formation-brief-output',
      {
        title: 'Capital formation for watershed restoration',
        summary:
          'This is a comprehensive summary about a watershed restoration funding opportunity with significant potential impact.',
        whyItMatters:
          'It aligns with our core mission and recent archive themes around ecological restoration.',
        suggestedNextStep: 'Review the details and prepare a funding application draft.',
        tags: ['funding', 'watershed', 'restoration'],
        targetCoopIds: ['coop-river'],
        supportingCandidateIds: ['c1', 'c2'],
      },
      'webllm',
    );
    expect(rich).toBeGreaterThanOrEqual(0.2);
    expect(rich).toBeLessThanOrEqual(0.95);
  });
});
