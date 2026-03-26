import { type Address, encodeAbiParameters, parseAbiParameters } from 'viem';
import type {
  AuthSession,
  GreenGoodsDomain,
  GreenGoodsImpactReportOutput,
  OnchainState,
} from '../../contracts/schema';
import { assertHexString, hashJson } from '../../utils';
import type { CoopOnchainMode } from '../onchain/onchain';
import {
  type GreenGoodsLiveExecutor,
  type GreenGoodsTransactionResult,
  IMPACT_REPORT_SCHEMA_UID,
  buildGreenGoodsEasAttestCalldata,
  describeGreenGoodsMode,
  ensureLiveExecutionReady,
  getGreenGoodsDeployment,
  requireLiveExecutionCredentials,
  requireLiveSchemaUid,
  sendViaCoopSafe,
} from './greengoods-deployments';
import { toGreenGoodsDomainValue } from './greengoods-state';

export function createGreenGoodsImpactReportOutput(request: {
  gardenAddress: Address;
  title: string;
  description: string;
  domain: GreenGoodsDomain;
  reportCid: string;
  metricsSummary: string;
  reportingPeriodStart: number;
  reportingPeriodEnd: number;
  submittedBy: Address;
}): GreenGoodsImpactReportOutput {
  return { ...request };
}

export async function submitGreenGoodsImpactReport(input: {
  mode: CoopOnchainMode;
  authSession?: AuthSession | null;
  pimlicoApiKey?: string;
  onchainState: OnchainState;
  gardenAddress: Address;
  output: GreenGoodsImpactReportOutput;
  schemaUid?: `0x${string}`;
  liveExecutor?: GreenGoodsLiveExecutor;
}): Promise<GreenGoodsTransactionResult> {
  ensureLiveExecutionReady(input);

  if (input.mode !== 'live') {
    return {
      txHash: hashJson({
        kind: 'green-goods-submit-impact-report',
        safeAddress: input.onchainState.safeAddress,
        gardenAddress: input.gardenAddress,
        output: input.output,
      }),
      detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} submitted a mock Green Goods impact report attestation.`,
    };
  }

  const deployment = getGreenGoodsDeployment(input.onchainState.chainKey);
  const encodedData = encodeAbiParameters(
    parseAbiParameters(
      'string title, string description, uint8 domain, string reportCID, string metricsSummary, uint256 reportingPeriodStart, uint256 reportingPeriodEnd, address submittedBy',
    ),
    [
      input.output.title,
      input.output.description,
      toGreenGoodsDomainValue(input.output.domain),
      input.output.reportCid,
      input.output.metricsSummary,
      BigInt(input.output.reportingPeriodStart),
      BigInt(input.output.reportingPeriodEnd),
      assertHexString(input.output.submittedBy, 'submittedBy') as Address,
    ],
  );

  const tx = buildGreenGoodsEasAttestCalldata({
    easAddress: deployment.eas,
    schemaUid: requireLiveSchemaUid(input.schemaUid ?? IMPACT_REPORT_SCHEMA_UID, 'impact report'),
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
    detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} submitted a Green Goods impact report attestation.`,
  };
}
