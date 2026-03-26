import { type Address, encodeAbiParameters, parseAbiParameters } from 'viem';
import type {
  AuthSession,
  GreenGoodsAssessmentOutput,
  GreenGoodsWorkApprovalOutput,
  GreenGoodsWorkSubmissionOutput,
  OnchainState,
} from '../../contracts/schema';
import { assertHexString, hashJson } from '../../utils';
import type { CoopOnchainMode } from '../onchain/onchain';
import {
  type GreenGoodsLiveExecutor,
  type GreenGoodsTransactionResult,
  buildGreenGoodsEasAttestCalldata,
  describeGreenGoodsMode,
  ensureLiveExecutionReady,
  getGreenGoodsDeployment,
  requireLiveExecutionCredentials,
  requireLiveSchemaUid,
  sendViaCoopSafe,
} from './greengoods-deployments';
import { toGreenGoodsDomainValue } from './greengoods-state';

export function createGreenGoodsWorkApprovalOutput(input: {
  request: GreenGoodsWorkApprovalOutput;
}) {
  return {
    actionUid: input.request.actionUid,
    workUid: input.request.workUid,
    approved: input.request.approved,
    feedback: input.request.feedback,
    confidence: input.request.confidence,
    verificationMethod: input.request.verificationMethod,
    reviewNotesCid: input.request.reviewNotesCid,
    rationale: input.request.rationale,
  } satisfies GreenGoodsWorkApprovalOutput;
}

export function createGreenGoodsAssessmentOutput(input: {
  request: GreenGoodsAssessmentOutput;
}) {
  return {
    title: input.request.title,
    description: input.request.description,
    assessmentConfigCid: input.request.assessmentConfigCid,
    domain: input.request.domain,
    startDate: input.request.startDate,
    endDate: input.request.endDate,
    location: input.request.location,
    rationale: input.request.rationale,
  } satisfies GreenGoodsAssessmentOutput;
}

export async function submitGreenGoodsWorkApproval(input: {
  mode: CoopOnchainMode;
  authSession?: AuthSession | null;
  pimlicoApiKey?: string;
  onchainState: OnchainState;
  gardenAddress: Address;
  output: GreenGoodsWorkApprovalOutput;
}): Promise<GreenGoodsTransactionResult> {
  ensureLiveExecutionReady(input);

  if (input.mode !== 'live') {
    return {
      txHash: hashJson({
        kind: 'green-goods-submit-work-approval',
        safeAddress: input.onchainState.safeAddress,
        gardenAddress: input.gardenAddress,
        output: input.output,
      }),
      detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} submitted a mock Green Goods work approval attestation.`,
    };
  }

  const deployment = getGreenGoodsDeployment(input.onchainState.chainKey);
  const encodedData = encodeAbiParameters(
    parseAbiParameters(
      'uint256 actionUID, bytes32 workUID, bool approved, string feedback, uint8 confidence, uint8 verificationMethod, string reviewNotesCID',
    ),
    [
      BigInt(input.output.actionUid),
      assertHexString(input.output.workUid, 'workUid'),
      input.output.approved,
      input.output.feedback,
      input.output.confidence,
      input.output.verificationMethod,
      input.output.reviewNotesCid,
    ],
  );

  const tx = buildGreenGoodsEasAttestCalldata({
    easAddress: deployment.eas,
    schemaUid: deployment.workApprovalSchemaUid,
    recipient: input.gardenAddress,
    encodedData,
  });
  const credentials = requireLiveExecutionCredentials(input);

  const result = await sendViaCoopSafe({
    authSession: credentials.authSession,
    pimlicoApiKey: credentials.pimlicoApiKey,
    onchainState: input.onchainState,
    to: tx.to,
    data: tx.data,
  });

  return {
    txHash: result.txHash,
    detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} submitted a Green Goods work approval attestation.`,
  };
}

export async function createGreenGoodsAssessment(input: {
  mode: CoopOnchainMode;
  authSession?: AuthSession | null;
  pimlicoApiKey?: string;
  onchainState: OnchainState;
  gardenAddress: Address;
  output: GreenGoodsAssessmentOutput;
}): Promise<GreenGoodsTransactionResult> {
  ensureLiveExecutionReady(input);

  if (input.mode !== 'live') {
    return {
      txHash: hashJson({
        kind: 'green-goods-create-assessment',
        safeAddress: input.onchainState.safeAddress,
        gardenAddress: input.gardenAddress,
        output: input.output,
      }),
      detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} submitted a mock Green Goods assessment attestation.`,
    };
  }

  const deployment = getGreenGoodsDeployment(input.onchainState.chainKey);
  const encodedData = encodeAbiParameters(
    parseAbiParameters(
      'string title, string description, string assessmentConfigCID, uint8 domain, uint256 startDate, uint256 endDate, string location',
    ),
    [
      input.output.title,
      input.output.description,
      input.output.assessmentConfigCid,
      toGreenGoodsDomainValue(input.output.domain),
      BigInt(input.output.startDate),
      BigInt(input.output.endDate),
      input.output.location,
    ],
  );

  const tx = buildGreenGoodsEasAttestCalldata({
    easAddress: deployment.eas,
    schemaUid: deployment.assessmentSchemaUid,
    recipient: input.gardenAddress,
    encodedData,
  });
  const credentials = requireLiveExecutionCredentials(input);

  const result = await sendViaCoopSafe({
    authSession: credentials.authSession,
    pimlicoApiKey: credentials.pimlicoApiKey,
    onchainState: input.onchainState,
    to: tx.to,
    data: tx.data,
  });

  return {
    txHash: result.txHash,
    detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} submitted a Green Goods assessment attestation.`,
  };
}

export function createGreenGoodsWorkSubmissionOutput(request: {
  gardenAddress: Address;
  actionUid: number;
  title: string;
  feedback?: string;
  metadataCid: string;
  mediaCids?: string[];
}): GreenGoodsWorkSubmissionOutput {
  return {
    feedback: '',
    mediaCids: [],
    ...request,
  };
}

export async function submitGreenGoodsWorkSubmission(input: {
  mode: CoopOnchainMode;
  authSession?: AuthSession | null;
  pimlicoApiKey?: string;
  onchainState: OnchainState;
  gardenAddress: Address;
  output: GreenGoodsWorkSubmissionOutput;
  schemaUid?: `0x${string}`;
  liveExecutor?: GreenGoodsLiveExecutor;
}): Promise<GreenGoodsTransactionResult> {
  ensureLiveExecutionReady(input);

  if (input.mode !== 'live') {
    return {
      txHash: hashJson({
        kind: 'green-goods-submit-work-submission',
        safeAddress: input.onchainState.safeAddress,
        gardenAddress: input.gardenAddress,
        output: input.output,
      }),
      detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} submitted a mock Green Goods work submission attestation.`,
    };
  }

  const deployment = getGreenGoodsDeployment(input.onchainState.chainKey);
  const encodedData = encodeAbiParameters(
    parseAbiParameters(
      'uint256 actionUID, string title, string feedback, string metadata, string[] media',
    ),
    [
      BigInt(input.output.actionUid),
      input.output.title,
      input.output.feedback ?? '',
      input.output.metadataCid,
      input.output.mediaCids ?? [],
    ],
  );

  const tx = buildGreenGoodsEasAttestCalldata({
    easAddress: deployment.eas,
    schemaUid: requireLiveSchemaUid(input.schemaUid ?? deployment.workSchemaUid, 'work submission'),
    recipient: input.gardenAddress,
    encodedData,
  });
  const result = input.liveExecutor
    ? await input.liveExecutor({
        to: tx.to,
        data: tx.data,
      })
    : await (async () => {
        const credentials = requireLiveExecutionCredentials(input);
        return sendViaCoopSafe({
          authSession: credentials.authSession,
          pimlicoApiKey: credentials.pimlicoApiKey,
          onchainState: input.onchainState,
          to: tx.to,
          data: tx.data,
        });
      })();

  return {
    txHash: result.txHash,
    detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} submitted a Green Goods work submission attestation.`,
  };
}
