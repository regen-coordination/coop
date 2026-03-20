import { describe, expect, it } from 'vitest';
import {
  agentMemorySchema,
  greenGoodsAssessmentOutputSchema,
  greenGoodsAssessmentRequestSchema,
  onchainStateSchema,
  stealthMetaAddressSchema,
} from '../schema';

// ── greenGoodsAssessmentRequestSchema superRefine ──────────────────────

describe('greenGoodsAssessmentRequestSchema date validation', () => {
  const baseRequest = {
    title: 'Assessment',
    description: 'Test assessment',
    assessmentConfigCid: 'bafyabc123',
    domain: 'agro' as const,
    startDate: 1000,
    rationale: 'Queue a Green Goods assessment attestation.',
  };

  it('passes when endDate > startDate', () => {
    const result = greenGoodsAssessmentRequestSchema.parse({
      ...baseRequest,
      endDate: 2000,
    });
    expect(result.endDate).toBe(2000);
    expect(result.startDate).toBe(1000);
  });

  it('passes when endDate === startDate', () => {
    const result = greenGoodsAssessmentRequestSchema.parse({
      ...baseRequest,
      endDate: 1000,
    });
    expect(result.endDate).toBe(1000);
  });

  it('fails when endDate < startDate with error on endDate path', () => {
    const result = greenGoodsAssessmentRequestSchema.safeParse({
      ...baseRequest,
      endDate: 500,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const endDateIssue = result.error.issues.find(
        (i) => i.path.includes('endDate') && i.message.includes('endDate must be greater'),
      );
      expect(endDateIssue).toBeDefined();
    }
  });
});

// ── greenGoodsAssessmentOutputSchema superRefine ───────────────────────

describe('greenGoodsAssessmentOutputSchema date validation', () => {
  const baseOutput = {
    title: 'Assessment',
    description: 'Test assessment output',
    assessmentConfigCid: 'bafyabc123',
    domain: 'agro' as const,
    startDate: 1000,
    rationale: 'Assessment rationale.',
  };

  it('passes when endDate > startDate', () => {
    const result = greenGoodsAssessmentOutputSchema.parse({
      ...baseOutput,
      endDate: 2000,
    });
    expect(result.endDate).toBe(2000);
  });

  it('fails when endDate < startDate with error on endDate path', () => {
    const result = greenGoodsAssessmentOutputSchema.safeParse({
      ...baseOutput,
      endDate: 500,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const endDateIssue = result.error.issues.find(
        (i) => i.path.includes('endDate') && i.message.includes('endDate must be greater'),
      );
      expect(endDateIssue).toBeDefined();
    }
  });
});

// ── stealthMetaAddressSchema refine ────────────────────────────────────

describe('stealthMetaAddressSchema length and hex validation', () => {
  it('passes with a 134-char hex string', () => {
    const valid = `0x${'ab'.repeat(66)}`;
    expect(valid.length).toBe(134);
    const result = stealthMetaAddressSchema.parse(valid);
    expect(result).toBe(valid);
  });

  it('fails with a too-short hex string', () => {
    const short = `0x${'ab'.repeat(10)}`;
    expect(short.length).toBe(22);
    const result = stealthMetaAddressSchema.safeParse(short);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.message.includes('stealth meta-address must encode'),
      );
      expect(issue).toBeDefined();
    }
  });

  it('fails with a non-hex string', () => {
    const nonHex = 'not-a-hex-string-at-all';
    const result = stealthMetaAddressSchema.safeParse(nonHex);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.message.includes('stealth meta-address must be a hex string'),
      );
      expect(issue).toBeDefined();
    }
  });
});

// ── onchainStateSchema superRefine ─────────────────────────────────────

describe('onchainStateSchema chainId/chainKey validation', () => {
  const baseState = {
    safeAddress: `0x${'a'.repeat(40)}`,
    safeCapability: 'ready' as const,
    statusNote: 'Safe deployed',
  };

  it('passes with chainKey sepolia + chainId 11155111', () => {
    const result = onchainStateSchema.parse({
      ...baseState,
      chainKey: 'sepolia',
      chainId: 11155111,
    });
    expect(result.chainId).toBe(11155111);
    expect(result.chainKey).toBe('sepolia');
  });

  it('passes with chainKey arbitrum + chainId 42161', () => {
    const result = onchainStateSchema.parse({
      ...baseState,
      chainKey: 'arbitrum',
      chainId: 42161,
    });
    expect(result.chainId).toBe(42161);
    expect(result.chainKey).toBe('arbitrum');
  });

  it('fails with chainKey sepolia + mismatched chainId 42161', () => {
    const result = onchainStateSchema.safeParse({
      ...baseState,
      chainKey: 'sepolia',
      chainId: 42161,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.includes('chainId') && i.message.includes('chainId must match'),
      );
      expect(issue).toBeDefined();
    }
  });

  it('fails with chainKey arbitrum + mismatched chainId 11155111', () => {
    const result = onchainStateSchema.safeParse({
      ...baseState,
      chainKey: 'arbitrum',
      chainId: 11155111,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.includes('chainId') && i.message.includes('chainId must match'),
      );
      expect(issue).toBeDefined();
    }
  });
});

// ── agentMemorySchema superRefine ──────────────────────────────────────

describe('agentMemorySchema scope validation', () => {
  const baseMemory = {
    id: 'mem-1',
    type: 'observation-outcome' as const,
    content: 'Some pattern observed',
    contentHash: 'abc123hash',
    confidence: 0.8,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('passes with scope coop + coopId', () => {
    const result = agentMemorySchema.parse({
      ...baseMemory,
      scope: 'coop',
      coopId: 'coop-1',
    });
    expect(result.scope).toBe('coop');
    expect(result.coopId).toBe('coop-1');
  });

  it('fails with scope coop without coopId', () => {
    const result = agentMemorySchema.safeParse({
      ...baseMemory,
      scope: 'coop',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.includes('coopId') && i.message.includes('coop-scoped memories require'),
      );
      expect(issue).toBeDefined();
    }
  });

  it('passes with scope member + memberId', () => {
    const result = agentMemorySchema.parse({
      ...baseMemory,
      scope: 'member',
      memberId: 'member-1',
    });
    expect(result.scope).toBe('member');
    expect(result.memberId).toBe('member-1');
  });

  it('fails with scope member without memberId', () => {
    const result = agentMemorySchema.safeParse({
      ...baseMemory,
      scope: 'member',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.includes('memberId') && i.message.includes('member-scoped memories require'),
      );
      expect(issue).toBeDefined();
    }
  });
});
