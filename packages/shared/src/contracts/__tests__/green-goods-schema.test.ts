import { describe, expect, it } from 'vitest';
import {
  greenGoodsWorkApprovalRequestSchema,
  greenGoodsWorkApprovalOutputSchema,
  greenGoodsAssessmentRequestSchema,
  greenGoodsAssessmentOutputSchema,
} from '../schema';

describe('greenGoodsWorkApprovalRequestSchema', () => {
  const validRequest = {
    actionUid: 1,
    workUid: '0x' + 'ab'.repeat(32),
    approved: true,
  };

  it('parses a minimal valid request with defaults', () => {
    const result = greenGoodsWorkApprovalRequestSchema.parse(validRequest);
    expect(result.actionUid).toBe(1);
    expect(result.approved).toBe(true);
    expect(result.feedback).toBe('');
    expect(result.confidence).toBe(100);
    expect(result.verificationMethod).toBe(0);
    expect(result.reviewNotesCid).toBe('');
    expect(result.rationale).toBe('Queue a Green Goods work approval attestation.');
  });

  it('rejects invalid workUid', () => {
    expect(() =>
      greenGoodsWorkApprovalRequestSchema.parse({ ...validRequest, workUid: 'not-hex' }),
    ).toThrow();
  });

  it('rejects negative actionUid', () => {
    expect(() =>
      greenGoodsWorkApprovalRequestSchema.parse({ ...validRequest, actionUid: -1 }),
    ).toThrow();
  });
});

describe('greenGoodsWorkApprovalOutputSchema', () => {
  const validOutput = {
    actionUid: 1,
    workUid: '0x' + 'ab'.repeat(32),
    approved: true,
    rationale: 'Approved based on evidence.',
  };

  it('parses a valid output', () => {
    const result = greenGoodsWorkApprovalOutputSchema.parse(validOutput);
    expect(result.actionUid).toBe(1);
    expect(result.rationale).toBe('Approved based on evidence.');
  });

  it('rejects output with empty rationale', () => {
    expect(() =>
      greenGoodsWorkApprovalOutputSchema.parse({ ...validOutput, rationale: '' }),
    ).toThrow();
  });

  it('rejects output with missing rationale', () => {
    const { rationale: _, ...noRationale } = validOutput;
    expect(() => greenGoodsWorkApprovalOutputSchema.parse(noRationale)).toThrow();
  });

  it('shares all non-rationale fields with the request schema', () => {
    // Both schemas should accept the same base fields
    const base = {
      actionUid: 5,
      workUid: '0x' + 'cd'.repeat(32),
      approved: false,
      feedback: 'Needs more evidence',
      confidence: 80,
      verificationMethod: 1,
      reviewNotesCid: 'bafyabc',
    };
    const requestResult = greenGoodsWorkApprovalRequestSchema.parse(base);
    const outputResult = greenGoodsWorkApprovalOutputSchema.parse({
      ...base,
      rationale: 'Some rationale',
    });

    // All base fields should match
    for (const key of Object.keys(base)) {
      expect(requestResult[key as keyof typeof requestResult]).toEqual(
        outputResult[key as keyof typeof outputResult],
      );
    }
  });
});

describe('greenGoodsAssessmentRequestSchema', () => {
  const validRequest = {
    title: 'Assessment Title',
    description: 'Assessment Description',
    assessmentConfigCid: 'bafyconfig',
    startDate: 1000,
    endDate: 2000,
  };

  it('parses a minimal valid request with defaults', () => {
    const result = greenGoodsAssessmentRequestSchema.parse(validRequest);
    expect(result.title).toBe('Assessment Title');
    expect(result.domain).toBe('agro');
    expect(result.location).toBe('');
    expect(result.rationale).toBe('Queue a Green Goods assessment attestation.');
  });

  it('rejects endDate before startDate', () => {
    expect(() =>
      greenGoodsAssessmentRequestSchema.parse({
        ...validRequest,
        startDate: 2000,
        endDate: 1000,
      }),
    ).toThrow(/endDate must be greater than or equal to startDate/);
  });

  it('accepts endDate equal to startDate', () => {
    const result = greenGoodsAssessmentRequestSchema.parse({
      ...validRequest,
      startDate: 1000,
      endDate: 1000,
    });
    expect(result.startDate).toBe(1000);
    expect(result.endDate).toBe(1000);
  });
});

describe('greenGoodsAssessmentOutputSchema', () => {
  const validOutput = {
    title: 'Assessment Title',
    description: 'Assessment Description',
    assessmentConfigCid: 'bafyconfig',
    startDate: 1000,
    endDate: 2000,
    rationale: 'Assessment rationale.',
  };

  it('parses a valid output', () => {
    const result = greenGoodsAssessmentOutputSchema.parse(validOutput);
    expect(result.rationale).toBe('Assessment rationale.');
  });

  it('rejects output with empty rationale', () => {
    expect(() =>
      greenGoodsAssessmentOutputSchema.parse({ ...validOutput, rationale: '' }),
    ).toThrow();
  });

  it('rejects endDate before startDate', () => {
    expect(() =>
      greenGoodsAssessmentOutputSchema.parse({
        ...validOutput,
        startDate: 2000,
        endDate: 1000,
      }),
    ).toThrow(/endDate must be greater than or equal to startDate/);
  });

  it('shares all non-rationale fields with the request schema', () => {
    const base = {
      title: 'Title',
      description: 'Desc',
      assessmentConfigCid: 'cid',
      domain: 'agro' as const,
      startDate: 100,
      endDate: 200,
      location: 'somewhere',
    };
    const requestResult = greenGoodsAssessmentRequestSchema.parse(base);
    const outputResult = greenGoodsAssessmentOutputSchema.parse({
      ...base,
      rationale: 'Rationale',
    });

    for (const key of Object.keys(base)) {
      expect(requestResult[key as keyof typeof requestResult]).toEqual(
        outputResult[key as keyof typeof outputResult],
      );
    }
  });
});
