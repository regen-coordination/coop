import type {
  ActionBundle,
  CoopSharedState,
  PolicyActionClass,
  getAuthSession,
} from '@coop/shared';
import {
  buildArchiveExecutors,
  buildErc8004Executors,
  buildGreenGoodsExecutors,
  buildOnchainExecutors,
  buildReviewExecutors,
} from './executors';

/** Context passed from handleExecuteAction into each executor. */
export interface ActionExecutorContext {
  bundle: ActionBundle;
  trustedNodeContext: {
    ok: true;
    coop: CoopSharedState;
    member: { id: string; displayName: string };
    authSession: NonNullable<Awaited<ReturnType<typeof getAuthSession>>>;
  };
}

export type ExecutorResult = Promise<{ ok: boolean; error?: string; data?: unknown }>;

/**
 * Build the action executor map used by `handleExecuteAction`.
 *
 * Each entry maps a `PolicyActionClass` string to an async function that
 * receives the bundle payload and returns a result compatible with the
 * shared `executeBundle` contract.
 */
export function buildActionExecutors(
  ctx: ActionExecutorContext,
): Partial<Record<PolicyActionClass, (payload: Record<string, unknown>) => ExecutorResult>> {
  return {
    ...buildArchiveExecutors(ctx),
    ...buildReviewExecutors(ctx),
    ...buildGreenGoodsExecutors(ctx),
    ...buildErc8004Executors(ctx),
    ...buildOnchainExecutors(ctx),
  };
}
