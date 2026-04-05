import type { PolicyActionClass } from '@coop/shared';
import type { ActionExecutorContext, ExecutorResult } from '../action-executors';
import { buildGreenGoodsGardenExecutors } from './green-goods-garden';
import { buildGreenGoodsGovernanceExecutors } from './green-goods-governance';
import { buildGreenGoodsHypercertExecutors } from './green-goods-hypercert';
import { buildGreenGoodsMembershipExecutors } from './green-goods-membership';

export function buildGreenGoodsExecutors(
  ctx: ActionExecutorContext,
): Partial<Record<PolicyActionClass, (payload: Record<string, unknown>) => ExecutorResult>> {
  return {
    ...buildGreenGoodsGardenExecutors(ctx),
    ...buildGreenGoodsMembershipExecutors(ctx),
    ...buildGreenGoodsGovernanceExecutors(ctx),
    ...buildGreenGoodsHypercertExecutors(ctx),
  };
}
