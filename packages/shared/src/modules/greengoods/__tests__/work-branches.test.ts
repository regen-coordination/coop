import type { Address } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createCoopPublicClientMock,
  createCoopSmartAccountClientMock,
  restorePasskeyAccountMock,
  sendSmartAccountTransactionWithCoopGasFallbackMock,
  toSafeSmartAccountMock,
} = vi.hoisted(() => ({
  createCoopPublicClientMock: vi.fn(),
  createCoopSmartAccountClientMock: vi.fn(),
  restorePasskeyAccountMock: vi.fn(),
  sendSmartAccountTransactionWithCoopGasFallbackMock: vi.fn(),
  toSafeSmartAccountMock: vi.fn(),
}));

vi.mock('permissionless/accounts', () => ({
  toSafeSmartAccount: toSafeSmartAccountMock,
}));

vi.mock('../../auth/auth', () => ({
  restorePasskeyAccount: restorePasskeyAccountMock,
}));

vi.mock('../../onchain/provider', () => ({
  createCoopPublicClient: createCoopPublicClientMock,
}));

vi.mock('../../onchain/onchain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../onchain/onchain')>();
  return {
    ...actual,
    createCoopSmartAccountClient: createCoopSmartAccountClientMock,
    sendSmartAccountTransactionWithCoopGasFallback:
      sendSmartAccountTransactionWithCoopGasFallbackMock,
  };
});

import { ZERO_BYTES32, getGreenGoodsDeployment } from '../greengoods-deployments';
import {
  createGreenGoodsAssessment,
  submitGreenGoodsWorkApproval,
  submitGreenGoodsWorkSubmission,
} from '../greengoods-work';

const SAFE_ADDRESS = '0x4444444444444444444444444444444444444444' as Address;
const GARDEN_ADDRESS = '0x1111111111111111111111111111111111111111' as Address;

const liveExecutionInput = {
  mode: 'live' as const,
  authSession: { passkey: { id: 'test-passkey' } } as never,
  pimlicoApiKey: 'test-pimlico-key',
  onchainState: {
    chainId: 11155111,
    chainKey: 'sepolia' as const,
    safeAddress: SAFE_ADDRESS,
    safeCapability: 'executed' as const,
    statusNote: 'Safe executed.',
  },
};

describe('Green Goods work and assessment branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restorePasskeyAccountMock.mockReturnValue({
      address: '0x9999999999999999999999999999999999999999',
    });
    createCoopPublicClientMock.mockResolvedValue({
      chain: 'sepolia',
    });
    toSafeSmartAccountMock.mockResolvedValue({
      address: SAFE_ADDRESS,
    });
    createCoopSmartAccountClientMock.mockReturnValue({
      smartClient: {
        kind: 'safe-smart-client',
      },
    });
    sendSmartAccountTransactionWithCoopGasFallbackMock.mockResolvedValue({
      txHash: `0x${'ef'.repeat(32)}`,
      receipt: undefined,
    });
  });

  it('returns mock details for non-live work and assessment attestations', async () => {
    const submission = await submitGreenGoodsWorkSubmission({
      mode: 'mock',
      onchainState: liveExecutionInput.onchainState,
      gardenAddress: GARDEN_ADDRESS,
      output: {
        gardenAddress: GARDEN_ADDRESS,
        actionUid: 7,
        title: 'Mock work submission',
        feedback: 'Keep this local.',
        metadataCid: 'ipfs://mock-work',
        mediaCids: ['ipfs://mock-photo'],
      },
    });
    const approval = await submitGreenGoodsWorkApproval({
      mode: 'mock',
      onchainState: liveExecutionInput.onchainState,
      gardenAddress: GARDEN_ADDRESS,
      output: {
        actionUid: 9,
        workUid: `0x${'ab'.repeat(32)}`,
        approved: true,
        feedback: 'Looks good.',
        confidence: 88,
        verificationMethod: 2,
        reviewNotesCid: 'ipfs://mock-review',
        rationale: 'Keep the approval local in mock mode.',
      },
    });
    const assessment = await createGreenGoodsAssessment({
      mode: 'mock',
      onchainState: liveExecutionInput.onchainState,
      gardenAddress: GARDEN_ADDRESS,
      output: {
        title: 'Mock assessment',
        description: 'No live attestation should be sent.',
        assessmentConfigCid: 'ipfs://mock-assessment',
        domain: 'agro',
        startDate: 1_711_929_600,
        endDate: 1_712_534_400,
        location: 'Mock field lab',
        rationale: 'Keep the assessment local in mock mode.',
      },
    });

    expect(sendSmartAccountTransactionWithCoopGasFallbackMock).not.toHaveBeenCalled();
    expect(submission.detail).toBe(
      'mock Green Goods on Sepolia submitted a mock Green Goods work submission attestation.',
    );
    expect(approval.detail).toBe(
      'mock Green Goods on Sepolia submitted a mock Green Goods work approval attestation.',
    );
    expect(assessment.detail).toBe(
      'mock Green Goods on Sepolia submitted a mock Green Goods assessment attestation.',
    );
  });

  it('routes live work approvals through the coop Safe when no live executor is provided', async () => {
    const deployment = getGreenGoodsDeployment('sepolia');

    const result = await submitGreenGoodsWorkApproval({
      ...liveExecutionInput,
      gardenAddress: GARDEN_ADDRESS,
      output: {
        actionUid: 11,
        workUid: `0x${'ab'.repeat(32)}`,
        approved: true,
        feedback: 'Safe-send branch coverage.',
        confidence: 91,
        verificationMethod: 1,
        reviewNotesCid: 'ipfs://safe-review',
        rationale: 'Exercise the coop Safe send path.',
      },
    });

    expect(restorePasskeyAccountMock).toHaveBeenCalledWith(liveExecutionInput.authSession);
    expect(toSafeSmartAccountMock).toHaveBeenCalledWith({
      client: { chain: 'sepolia' },
      owners: [{ address: '0x9999999999999999999999999999999999999999' }],
      address: SAFE_ADDRESS,
      version: '1.4.1',
    });
    expect(createCoopSmartAccountClientMock).toHaveBeenCalledWith({
      account: { address: SAFE_ADDRESS },
      chainKey: 'sepolia',
      pimlicoApiKey: 'test-pimlico-key',
      accountTypeHint: 'safe',
    });
    expect(sendSmartAccountTransactionWithCoopGasFallbackMock).toHaveBeenCalledWith({
      smartClient: { kind: 'safe-smart-client' },
      accountTypeHint: 'safe',
      to: deployment.eas,
      data: expect.stringMatching(/^0x/),
      value: 0n,
    });
    expect(result).toEqual({
      txHash: `0x${'ef'.repeat(32)}`,
      detail: 'live Green Goods on Sepolia submitted a Green Goods work approval attestation.',
    });
  });

  it('rejects live work submissions when the schema UID is missing or zeroed', async () => {
    await expect(
      submitGreenGoodsWorkSubmission({
        ...liveExecutionInput,
        gardenAddress: GARDEN_ADDRESS,
        schemaUid: ZERO_BYTES32,
        output: {
          gardenAddress: GARDEN_ADDRESS,
          actionUid: 5,
          title: 'Schema check',
          feedback: '',
          metadataCid: 'ipfs://schema-check',
          mediaCids: [],
        },
      }),
    ).rejects.toThrow(
      'A configured Green Goods work submission schema UID is required before live member attestations can execute.',
    );
    expect(sendSmartAccountTransactionWithCoopGasFallbackMock).not.toHaveBeenCalled();
  });
});
