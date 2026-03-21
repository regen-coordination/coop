import { describe, expect, it } from 'vitest';
import { loadSkillEvalCases, runAllSkillEvals, runSkillEvalCase } from '../agent-eval';
import type { SkillEvalCase } from '../agent-eval';

const ALL_SKILL_IDS = [
  'capital-formation-brief',
  'ecosystem-entity-extractor',
  'erc8004-feedback',
  'erc8004-register',
  'grant-fit-scorer',
  'green-goods-assessment',
  'green-goods-gap-admin-sync',
  'green-goods-garden-bootstrap',
  'green-goods-garden-sync',
  'green-goods-work-approval',
  'memory-insight-synthesizer',
  'opportunity-extractor',
  'publish-readiness-check',
  'review-digest',
  'tab-router',
  'theme-clusterer',
];

describe('skill eval harness', () => {
  it('loads eval fixtures for all registered skills', () => {
    const testCases = loadSkillEvalCases();

    expect(testCases.length).toBeGreaterThanOrEqual(16);

    const coveredSkillIds = [...new Set(testCases.map((testCase) => testCase.skillId))].sort();
    expect(coveredSkillIds).toEqual(ALL_SKILL_IDS);
  });

  it('passes all structural and semantic skill evals', () => {
    const results = runAllSkillEvals();
    const failures = results.filter((result) => !result.passed);

    expect(failures).toEqual([]);
  });

  it('computes quality scores for all evals', () => {
    const results = runAllSkillEvals();

    for (const result of results) {
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(1);
      expect(result.qualityBreakdown).toBeDefined();
      expect(result.qualityBreakdown.schemaCompliance).toBe(1);
    }
  });

  it('catches string-min-length violations', () => {
    const testCase: SkillEvalCase = {
      id: 'test-string-min',
      description: 'Test string-min-length assertion',
      skillId: 'opportunity-extractor',
      outputSchemaRef: 'opportunity-extractor-output',
      output: {
        candidates: [
          {
            id: 'x',
            title: 'ab',
            summary: 'ab',
            rationale: 'ab',
            regionTags: [],
            ecologyTags: [],
            fundingSignals: [],
            priority: 0.5,
            recommendedNextStep: 'go',
          },
        ],
      },
      assertions: [{ type: 'string-min-length', path: 'candidates.0.title', threshold: 10 }],
    };

    const result = runSkillEvalCase(testCase);
    expect(result.passed).toBe(false);
    expect(result.failures).toContainEqual(expect.stringContaining('at least 10 characters'));
  });

  it('catches number-range violations', () => {
    const testCase: SkillEvalCase = {
      id: 'test-number-range',
      description: 'Test number-range assertion',
      skillId: 'opportunity-extractor',
      outputSchemaRef: 'opportunity-extractor-output',
      output: {
        candidates: [
          {
            id: 'x',
            title: 'test',
            summary: 'test',
            rationale: 'test',
            regionTags: [],
            ecologyTags: [],
            fundingSignals: [],
            priority: 0.9,
            recommendedNextStep: 'go',
          },
        ],
      },
      assertions: [{ type: 'number-range', path: 'candidates.0.priority', min: 0, max: 0.5 }],
    };

    const result = runSkillEvalCase(testCase);
    expect(result.passed).toBe(false);
    expect(result.failures).toContainEqual(expect.stringContaining('[0, 0.5]'));
  });

  it('catches semantic-word-count violations', () => {
    const testCase: SkillEvalCase = {
      id: 'test-word-count',
      description: 'Test semantic-word-count assertion',
      skillId: 'opportunity-extractor',
      outputSchemaRef: 'opportunity-extractor-output',
      output: {
        candidates: [
          {
            id: 'x',
            title: 'test',
            summary: 'test',
            rationale: 'a the an',
            regionTags: [],
            ecologyTags: [],
            fundingSignals: [],
            priority: 0.5,
            recommendedNextStep: 'go',
          },
        ],
      },
      assertions: [{ type: 'semantic-word-count', path: 'candidates.0.rationale', threshold: 5 }],
    };

    const result = runSkillEvalCase(testCase);
    expect(result.passed).toBe(false);
    expect(result.failures).toContainEqual(expect.stringContaining('5 meaningful words'));
  });

  it('catches regex-match violations', () => {
    const testCase: SkillEvalCase = {
      id: 'test-regex',
      description: 'Test regex-match assertion',
      skillId: 'review-digest',
      outputSchemaRef: 'review-digest-output',
      output: {
        title: 'test',
        summary: 'test',
        whyItMatters: 'test',
        suggestedNextStep: 'test',
        highlights: ['highlight-1'],
        tags: ['tag'],
      },
      assertions: [{ type: 'regex-match', path: 'title', pattern: '^[A-Z]' }],
    };

    const result = runSkillEvalCase(testCase);
    expect(result.passed).toBe(false);
    expect(result.failures).toContainEqual(expect.stringContaining('match pattern'));
  });
});
