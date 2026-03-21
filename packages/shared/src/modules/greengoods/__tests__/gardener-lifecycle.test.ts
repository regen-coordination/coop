import type { Address } from 'viem';
import { describe, expect, it } from 'vitest';
import type { AuthSession, GreenGoodsDomain, OnchainState } from '../../../contracts/schema';
import {
  addGreenGoodsGardener,
  buildAddGardenerCalldata,
  buildRemoveGardenerCalldata,
  createGreenGoodsImpactReportOutput,
  createGreenGoodsWorkSubmissionOutput,
  removeGreenGoodsGardener,
  submitGreenGoodsImpactReport,
  submitGreenGoodsWorkSubmission,
} from '../greengoods';

const MOCK_GARDEN_ADDRESS = '0x1111111111111111111111111111111111111111' as Address;
const MOCK_GARDENER_ADDRESS = '0x2222222222222222222222222222222222222222' as Address;
const MOCK_SUBMITTER_ADDRESS = '0x3333333333333333333333333333333333333333' as Address;
const mockAuthSession: AuthSession = {
  authMode: 'passkey',
  displayName: 'Test',
  primaryAddress: '0x1234567890123456789012345678901234567890',
  createdAt: '2026-03-20T00:00:00.000Z',
  identityWarning: 'test',
  passkey: {
    id: 'test-id',
    publicKey: '0xabcd',
    rpId: 'localhost',
  },
};

const mockOnchainState: OnchainState = {
  chainId: 11155111,
  chainKey: 'sepolia',
  safeAddress: '0x4444444444444444444444444444444444444444',
  safeCapability: 'executed',
  statusNote: 'Mock Safe deployed.',
};

describe('Gardener lifecycle', () => {
  describe('buildAddGardenerCalldata', () => {
    it('returns valid hex calldata', () => {
      const calldata = buildAddGardenerCalldata({
        gardenAddress: MOCK_GARDEN_ADDRESS,
        gardenerAddress: MOCK_GARDENER_ADDRESS,
      });

      expect(calldata).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(calldata.length).toBeGreaterThan(10);
    });
  });

  describe('buildRemoveGardenerCalldata', () => {
    it('returns valid hex calldata', () => {
      const calldata = buildRemoveGardenerCalldata({
        gardenAddress: MOCK_GARDEN_ADDRESS,
        gardenerAddress: MOCK_GARDENER_ADDRESS,
      });

      expect(calldata).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(calldata.length).toBeGreaterThan(10);
    });

    it('produces different calldata than addGardener for the same address', () => {
      const addCalldata = buildAddGardenerCalldata({
        gardenAddress: MOCK_GARDEN_ADDRESS,
        gardenerAddress: MOCK_GARDENER_ADDRESS,
      });
      const removeCalldata = buildRemoveGardenerCalldata({
        gardenAddress: MOCK_GARDEN_ADDRESS,
        gardenerAddress: MOCK_GARDENER_ADDRESS,
      });

      expect(addCalldata).not.toBe(removeCalldata);
    });
  });

  describe('addGreenGoodsGardener', () => {
    it('returns a deterministic result in mock mode', async () => {
      const result = await addGreenGoodsGardener({
        mode: 'mock',
        authSession: mockAuthSession,
        pimlicoApiKey: 'test-key',
        onchainState: mockOnchainState,
        gardenAddress: MOCK_GARDEN_ADDRESS,
        gardenerAddress: MOCK_GARDENER_ADDRESS,
      });

      expect(result.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.detail).toContain('mock');
      expect(result.detail).toContain('gardener');
    });

    it('returns deterministic hashes for same input', async () => {
      const input = {
        mode: 'mock' as const,
        authSession: mockAuthSession,
        pimlicoApiKey: 'test-key',
        onchainState: mockOnchainState,
        gardenAddress: MOCK_GARDEN_ADDRESS,
        gardenerAddress: MOCK_GARDENER_ADDRESS,
      };

      const a = await addGreenGoodsGardener(input);
      const b = await addGreenGoodsGardener(input);
      expect(a.txHash).toBe(b.txHash);
    });
  });

  describe('removeGreenGoodsGardener', () => {
    it('returns a deterministic result in mock mode', async () => {
      const result = await removeGreenGoodsGardener({
        mode: 'mock',
        authSession: mockAuthSession,
        pimlicoApiKey: 'test-key',
        onchainState: mockOnchainState,
        gardenAddress: MOCK_GARDEN_ADDRESS,
        gardenerAddress: MOCK_GARDENER_ADDRESS,
      });

      expect(result.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.detail).toContain('mock');
      expect(result.detail).toContain('gardener');
    });

    it('produces a different hash than addGardener for the same input', async () => {
      const baseInput = {
        mode: 'mock' as const,
        authSession: mockAuthSession,
        pimlicoApiKey: 'test-key',
        onchainState: mockOnchainState,
        gardenAddress: MOCK_GARDEN_ADDRESS,
        gardenerAddress: MOCK_GARDENER_ADDRESS,
      };

      const addResult = await addGreenGoodsGardener(baseInput);
      const removeResult = await removeGreenGoodsGardener(baseInput);
      expect(addResult.txHash).not.toBe(removeResult.txHash);
    });
  });
});

describe('Work submission', () => {
  describe('createGreenGoodsWorkSubmissionOutput', () => {
    it('creates a valid work submission output object', () => {
      const output = createGreenGoodsWorkSubmissionOutput({
        gardenAddress: MOCK_GARDEN_ADDRESS,
        actionUid: 6,
        title: 'Planting Event - 2026-03-20',
        feedback: 'Planted the first set of seedlings.',
        metadataCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        mediaCids: ['bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku'],
      });

      expect(output.gardenAddress).toBe(MOCK_GARDEN_ADDRESS);
      expect(output.actionUid).toBe(6);
      expect(output.title).toContain('Planting Event');
      expect(output.metadataCid).toContain('bafybeig');
      expect(output.mediaCids).toHaveLength(1);
    });
  });

  describe('submitGreenGoodsWorkSubmission', () => {
    it('returns a deterministic result in mock mode', async () => {
      const output = createGreenGoodsWorkSubmissionOutput({
        gardenAddress: MOCK_GARDEN_ADDRESS,
        actionUid: 6,
        title: 'Planting Event - 2026-03-20',
        feedback: 'Planted seedlings and watered the new bed.',
        metadataCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        mediaCids: ['bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku'],
      });

      const result = await submitGreenGoodsWorkSubmission({
        mode: 'mock',
        authSession: mockAuthSession,
        pimlicoApiKey: 'test-key',
        onchainState: mockOnchainState,
        gardenAddress: MOCK_GARDEN_ADDRESS,
        output,
      });

      expect(result.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.detail).toContain('mock');
      expect(result.detail).toContain('work submission');
    });
  });
});

describe('Impact report', () => {
  describe('createGreenGoodsImpactReportOutput', () => {
    it('creates a valid impact report output object', () => {
      const output = createGreenGoodsImpactReportOutput({
        gardenAddress: MOCK_GARDEN_ADDRESS,
        title: 'Q1 2026 Watershed Impact',
        description: 'Quarterly impact assessment for the watershed restoration project.',
        domain: 'agro' as GreenGoodsDomain,
        reportCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        metricsSummary: JSON.stringify({ soilHealth: 0.85, waterQuality: 0.72 }),
        reportingPeriodStart: 1704067200,
        reportingPeriodEnd: 1711929600,
        submittedBy: MOCK_SUBMITTER_ADDRESS,
      });

      expect(output.gardenAddress).toBe(MOCK_GARDEN_ADDRESS);
      expect(output.title).toBe('Q1 2026 Watershed Impact');
      expect(output.domain).toBe('agro');
      expect(output.reportCid).toContain('bafybeig');
      expect(output.reportingPeriodStart).toBeLessThan(output.reportingPeriodEnd);
      expect(output.submittedBy).toBe(MOCK_SUBMITTER_ADDRESS);
    });
  });

  describe('submitGreenGoodsImpactReport', () => {
    it('returns a deterministic result in mock mode', async () => {
      const output = createGreenGoodsImpactReportOutput({
        gardenAddress: MOCK_GARDEN_ADDRESS,
        title: 'Q1 2026 Watershed Impact',
        description: 'Quarterly impact assessment.',
        domain: 'agro' as GreenGoodsDomain,
        reportCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
        metricsSummary: JSON.stringify({ soilHealth: 0.85 }),
        reportingPeriodStart: 1704067200,
        reportingPeriodEnd: 1711929600,
        submittedBy: MOCK_SUBMITTER_ADDRESS,
      });

      const result = await submitGreenGoodsImpactReport({
        mode: 'mock',
        authSession: mockAuthSession,
        pimlicoApiKey: 'test-key',
        onchainState: mockOnchainState,
        gardenAddress: MOCK_GARDEN_ADDRESS,
        output,
      });

      expect(result.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.detail).toContain('mock');
      expect(result.detail).toContain('impact report');
    });
  });
});
