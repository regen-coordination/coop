import { type Address, decodeAbiParameters, decodeFunctionData, parseAbiParameters } from 'viem';
import { describe, expect, it } from 'vitest';
import {
  GREEN_GOODS_IMPACT_REPORTING_UNSUPPORTED_MESSAGE,
  ZERO_BYTES32,
  createGreenGoodsAssessment,
  getGreenGoodsDeployment,
  greenGoodsEasAbi,
  submitGreenGoodsImpactReport,
  submitGreenGoodsWorkApproval,
  submitGreenGoodsWorkSubmission,
} from '../greengoods';

const SAFE_ADDRESS = '0x4444444444444444444444444444444444444444' as Address;
const GARDEN_ADDRESS = '0x1111111111111111111111111111111111111111' as Address;
const SUBMITTED_BY = '0x2222222222222222222222222222222222222222' as Address;
const WORK_UID = `0x${'ab'.repeat(32)}` as const;
const CUSTOM_SCHEMA_UID = `0x${'12'.repeat(32)}` as const;

const workSubmissionParamTypes = parseAbiParameters(
  'uint256 actionUID, string title, string feedback, string metadata, string[] media',
);
const workApprovalParamTypes = parseAbiParameters(
  'uint256 actionUID, bytes32 workUID, bool approved, string feedback, uint8 confidence, uint8 verificationMethod, string reviewNotesCID',
);
const assessmentParamTypes = parseAbiParameters(
  'string title, string description, string assessmentConfigCID, uint8 domain, uint256 startDate, uint256 endDate, string location',
);

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

type EasAttestRequest = {
  schema: `0x${string}`;
  data: {
    recipient: Address;
    expirationTime: bigint;
    revocable: boolean;
    refUID: `0x${string}`;
    data: `0x${string}`;
    value: bigint;
  };
};

function decodeAttestRequest(data: `0x${string}`): EasAttestRequest {
  const decoded = decodeFunctionData({
    abi: greenGoodsEasAbi,
    data,
  });

  expect(decoded.functionName).toBe('attest');
  return decoded.args[0] as EasAttestRequest;
}

describe('Green Goods attestation execution', () => {
  it('builds live work submission attestations against EAS with the deployment schema and encoded payload', async () => {
    const deployment = getGreenGoodsDeployment('sepolia');
    let captured:
      | {
          to: Address;
          data: `0x${string}`;
          value?: bigint;
        }
      | undefined;

    const result = await submitGreenGoodsWorkSubmission({
      ...liveExecutionInput,
      gardenAddress: GARDEN_ADDRESS,
      output: {
        gardenAddress: GARDEN_ADDRESS,
        actionUid: 42,
        title: 'Watershed planting day',
        feedback: 'Seedlings established successfully.',
        metadataCid: 'ipfs://work-metadata',
        mediaCids: ['ipfs://photo-1', 'ipfs://photo-2'],
      },
      liveExecutor: async (input) => {
        captured = input;
        return {
          txHash: `0x${'a'.repeat(64)}`,
          safeAddress: SAFE_ADDRESS,
        };
      },
    });

    expect(result.txHash).toBe(`0x${'a'.repeat(64)}`);
    expect(captured?.to).toBe(deployment.eas);

    const request = decodeAttestRequest(captured?.data as `0x${string}`);
    expect(request.schema).toBe(deployment.workSchemaUid);
    expect(request.data.recipient).toBe(GARDEN_ADDRESS);
    expect(request.data.expirationTime).toBe(0n);
    expect(request.data.revocable).toBe(false);
    expect(request.data.refUID).toBe(ZERO_BYTES32);
    expect(request.data.value).toBe(0n);

    const [actionUid, title, feedback, metadataCid, mediaCids] = decodeAbiParameters(
      workSubmissionParamTypes,
      request.data.data,
    );
    expect(BigInt(actionUid)).toBe(42n);
    expect(title).toBe('Watershed planting day');
    expect(feedback).toBe('Seedlings established successfully.');
    expect(metadataCid).toBe('ipfs://work-metadata');
    expect(mediaCids).toEqual(['ipfs://photo-1', 'ipfs://photo-2']);
  });

  it('honors explicit schema overrides for live work submission attestations', async () => {
    let captured:
      | {
          to: Address;
          data: `0x${string}`;
          value?: bigint;
        }
      | undefined;

    await submitGreenGoodsWorkSubmission({
      ...liveExecutionInput,
      gardenAddress: GARDEN_ADDRESS,
      schemaUid: CUSTOM_SCHEMA_UID,
      output: {
        gardenAddress: GARDEN_ADDRESS,
        actionUid: 7,
        title: 'Override schema rehearsal',
        feedback: '',
        metadataCid: 'ipfs://override-metadata',
        mediaCids: [],
      },
      liveExecutor: async (input) => {
        captured = input;
        return {
          txHash: `0x${'b'.repeat(64)}`,
          safeAddress: SAFE_ADDRESS,
        };
      },
    });

    const request = decodeAttestRequest(captured?.data as `0x${string}`);
    expect(request.schema).toBe(CUSTOM_SCHEMA_UID);
  });

  it('builds live work approval attestations against EAS with the approval schema and bytes32 payload fields', async () => {
    const deployment = getGreenGoodsDeployment('sepolia');
    let captured:
      | {
          to: Address;
          data: `0x${string}`;
          value?: bigint;
        }
      | undefined;

    await submitGreenGoodsWorkApproval({
      ...liveExecutionInput,
      gardenAddress: GARDEN_ADDRESS,
      output: {
        actionUid: 9,
        workUid: WORK_UID,
        approved: true,
        feedback: 'Verification passed.',
        confidence: 87,
        verificationMethod: 2,
        reviewNotesCid: 'ipfs://review-notes',
        rationale: 'Approve the completed work item.',
      },
      liveExecutor: async (input) => {
        captured = input;
        return {
          txHash: `0x${'c'.repeat(64)}`,
          safeAddress: SAFE_ADDRESS,
        };
      },
    });

    expect(captured?.to).toBe(deployment.eas);

    const request = decodeAttestRequest(captured?.data as `0x${string}`);
    expect(request.schema).toBe(deployment.workApprovalSchemaUid);
    expect(request.data.recipient).toBe(GARDEN_ADDRESS);

    const [actionUid, workUid, approved, feedback, confidence, verificationMethod, reviewNotesCid] =
      decodeAbiParameters(workApprovalParamTypes, request.data.data);
    expect(BigInt(actionUid)).toBe(9n);
    expect(workUid).toBe(WORK_UID);
    expect(approved).toBe(true);
    expect(feedback).toBe('Verification passed.');
    expect(Number(confidence)).toBe(87);
    expect(Number(verificationMethod)).toBe(2);
    expect(reviewNotesCid).toBe('ipfs://review-notes');
  });

  it('builds live assessment attestations against EAS with the assessment schema, domain enum, and timestamps', async () => {
    const deployment = getGreenGoodsDeployment('sepolia');
    let captured:
      | {
          to: Address;
          data: `0x${string}`;
          value?: bigint;
        }
      | undefined;

    await createGreenGoodsAssessment({
      ...liveExecutionInput,
      gardenAddress: GARDEN_ADDRESS,
      output: {
        title: 'Q2 field assessment',
        description: 'Assessing restoration progress across the watershed.',
        assessmentConfigCid: 'ipfs://assessment-config',
        domain: 'waste',
        startDate: 1_711_929_600,
        endDate: 1_712_534_400,
        location: 'Watershed field lab',
        rationale: 'Open an assessment attestation for the next review window.',
      },
      liveExecutor: async (input) => {
        captured = input;
        return {
          txHash: `0x${'d'.repeat(64)}`,
          safeAddress: SAFE_ADDRESS,
        };
      },
    });

    expect(captured?.to).toBe(deployment.eas);

    const request = decodeAttestRequest(captured?.data as `0x${string}`);
    expect(request.schema).toBe(deployment.assessmentSchemaUid);
    expect(request.data.recipient).toBe(GARDEN_ADDRESS);

    const [title, description, assessmentConfigCid, domain, startDate, endDate, location] =
      decodeAbiParameters(assessmentParamTypes, request.data.data);
    expect(title).toBe('Q2 field assessment');
    expect(description).toBe('Assessing restoration progress across the watershed.');
    expect(assessmentConfigCid).toBe('ipfs://assessment-config');
    expect(Number(domain)).toBe(3);
    expect(BigInt(startDate)).toBe(1_711_929_600n);
    expect(BigInt(endDate)).toBe(1_712_534_400n);
    expect(location).toBe('Watershed field lab');
  });

  it('rejects live impact reporting because Green Goods only exposes three EAS schemas and packages impact via Hypercert/Karma GAP flows', async () => {
    let executorCalled = false;

    await expect(
      submitGreenGoodsImpactReport({
        ...liveExecutionInput,
        gardenAddress: GARDEN_ADDRESS,
        output: {
          gardenAddress: GARDEN_ADDRESS,
          title: 'Q2 impact report',
          description: 'Seasonal metrics and outcomes.',
          domain: 'agro',
          reportCid: 'ipfs://impact-report',
          metricsSummary: '{"soilHealth":0.82}',
          reportingPeriodStart: 1_711_929_600,
          reportingPeriodEnd: 1_712_534_400,
          submittedBy: SUBMITTED_BY,
        },
        liveExecutor: async () => {
          executorCalled = true;
          return {
            txHash: `0x${'e'.repeat(64)}`,
            safeAddress: SAFE_ADDRESS,
          };
        },
      }),
    ).rejects.toThrow(GREEN_GOODS_IMPACT_REPORTING_UNSUPPORTED_MESSAGE);

    expect(executorCalled).toBe(false);
  });
});
