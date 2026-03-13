import type { ActionBundle, ActionPolicy, PolicyActionClass } from '../../contracts/schema';
import { isBundleExpired, validateActionBundle } from './action-bundle';
import { markBundleExecuted, markBundleFailed } from './approval';
import { type ReplayGuard, checkReplayId, recordExecutedReplayId } from './replay';

/**
 * Result of a bounded execution attempt.
 * The executor validates policy, replay, and expiry before dispatching.
 * Actual business logic execution is delegated to action handlers.
 */
export interface ExecutionResult {
  ok: boolean;
  bundle: ActionBundle;
  replayGuard: ReplayGuard;
  detail: string;
}

export type ActionHandler = (
  payload: Record<string, unknown>,
) => Promise<{ ok: boolean; error?: string; data?: unknown }>;

export type ActionHandlerRegistry = Partial<Record<PolicyActionClass, ActionHandler>>;

const allowedExecutionStatuses = new Set(['approved']);

/**
 * Pre-execution validation: checks status, expiry, replay, policy, and digest.
 */
export function validateExecution(
  bundle: ActionBundle,
  policy: ActionPolicy,
  replayGuard: ReplayGuard,
  now?: string,
):
  | { ok: true }
  | {
      ok: false;
      reason: string;
      rejectType: 'replay-rejected' | 'expiry-rejected' | 'execution-failed';
    } {
  if (!allowedExecutionStatuses.has(bundle.status)) {
    return {
      ok: false,
      reason: `Bundle status "${bundle.status}" is not eligible for execution. Only approved bundles can be executed.`,
      rejectType: 'execution-failed',
    };
  }

  if (isBundleExpired(bundle, now)) {
    return {
      ok: false,
      reason: 'Action bundle has expired.',
      rejectType: 'expiry-rejected',
    };
  }

  if (policy.replayProtection) {
    const replayCheck = checkReplayId(replayGuard, bundle.replayId);
    if (!replayCheck.ok) {
      return {
        ok: false,
        reason: replayCheck.reason,
        rejectType: 'replay-rejected',
      };
    }
  }

  const bundleValidation = validateActionBundle(bundle, policy, now);
  if (!bundleValidation.ok) {
    return {
      ok: false,
      reason: bundleValidation.reason,
      rejectType: 'execution-failed',
    };
  }

  return { ok: true };
}

/**
 * Execute an approved action bundle through the bounded executor.
 * Routes to the appropriate handler and records replay IDs on success.
 */
export async function executeBundle(input: {
  bundle: ActionBundle;
  policy: ActionPolicy;
  replayGuard: ReplayGuard;
  handlers: ActionHandlerRegistry;
  now?: string;
}): Promise<ExecutionResult> {
  const validation = validateExecution(input.bundle, input.policy, input.replayGuard, input.now);
  if (!validation.ok) {
    const failedBundle = markBundleFailed(input.bundle, validation.reason, input.now);
    return {
      ok: false,
      bundle: 'error' in failedBundle ? input.bundle : failedBundle,
      replayGuard: input.replayGuard,
      detail: validation.reason,
    };
  }

  const handler = input.handlers[input.bundle.actionClass];
  if (!handler) {
    const reason = `No handler registered for action class "${input.bundle.actionClass}".`;
    const failedBundle = markBundleFailed(input.bundle, reason, input.now);
    return {
      ok: false,
      bundle: 'error' in failedBundle ? input.bundle : failedBundle,
      replayGuard: input.replayGuard,
      detail: reason,
    };
  }

  try {
    const result = await handler(input.bundle.payload);
    if (!result.ok) {
      const reason = result.error ?? 'Action handler returned failure.';
      const failedBundle = markBundleFailed(input.bundle, reason, input.now);
      return {
        ok: false,
        bundle: 'error' in failedBundle ? input.bundle : failedBundle,
        replayGuard: input.replayGuard,
        detail: reason,
      };
    }

    const executedBundle = markBundleExecuted(input.bundle, input.now);
    const nextReplayGuard = input.policy.replayProtection
      ? recordExecutedReplayId(input.replayGuard, input.bundle.replayId)
      : input.replayGuard;

    return {
      ok: true,
      bundle: 'error' in executedBundle ? input.bundle : executedBundle,
      replayGuard: nextReplayGuard,
      detail: 'Action executed successfully.',
    };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : 'Action handler threw an unexpected error.';
    const failedBundle = markBundleFailed(input.bundle, reason, input.now);
    return {
      ok: false,
      bundle: 'error' in failedBundle ? input.bundle : failedBundle,
      replayGuard: input.replayGuard,
      detail: reason,
    };
  }
}
