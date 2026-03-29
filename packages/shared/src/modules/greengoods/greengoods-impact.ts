import type { Address } from 'viem';
import type {
  AuthSession,
  GreenGoodsDomain,
  GreenGoodsImpactReportOutput,
  OnchainState,
} from '../../contracts/schema';
import { hashJson } from '../../utils';
import type { CoopOnchainMode } from '../onchain/onchain';
import {
  type GreenGoodsLiveExecutor,
  type GreenGoodsTransactionResult,
  describeGreenGoodsMode,
} from './greengoods-deployments';

export const GREEN_GOODS_IMPACT_REPORTING_UNSUPPORTED_MESSAGE =
  'Green Goods only deploys EAS schemas for work submission, work approval, and assessment. Impact reporting is handled through Hypercert/Karma GAP workflows and is not yet executable from Coop.';

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
  liveExecutor?: GreenGoodsLiveExecutor;
}): Promise<GreenGoodsTransactionResult> {
  if (input.mode !== 'live') {
    return {
      txHash: hashJson({
        kind: 'green-goods-submit-impact-report',
        safeAddress: input.onchainState.safeAddress,
        gardenAddress: input.gardenAddress,
        output: input.output,
      }),
      detail: `${describeGreenGoodsMode(input.mode, input.onchainState.chainKey)} prepared a mock Green Goods impact reporting request.`,
    };
  }

  throw new Error(GREEN_GOODS_IMPACT_REPORTING_UNSUPPORTED_MESSAGE);
}
