import type { ActionBundle, ActionBundleStatus } from '../../contracts/schema';
import { actionBundleSchema } from '../../contracts/schema';
import { nowIso } from '../../utils';

const validTransitions: Record<ActionBundleStatus, ActionBundleStatus[]> = {
  proposed: ['approved', 'rejected', 'expired'],
  approved: ['executed', 'failed', 'expired'],
  rejected: [],
  executed: [],
  failed: [],
  expired: [],
};

export function canTransition(from: ActionBundleStatus, to: ActionBundleStatus): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}

export function transitionBundleStatus(
  bundle: ActionBundle,
  nextStatus: ActionBundleStatus,
  detail?: { failureReason?: string; timestamp?: string },
): ActionBundle | { error: string } {
  if (!canTransition(bundle.status, nextStatus)) {
    return {
      error: `Cannot transition action bundle from "${bundle.status}" to "${nextStatus}".`,
    };
  }

  const timestamp = detail?.timestamp ?? nowIso();
  const patch: Partial<ActionBundle> = { status: nextStatus };

  switch (nextStatus) {
    case 'approved':
      patch.approvedAt = timestamp;
      break;
    case 'rejected':
      patch.rejectedAt = timestamp;
      break;
    case 'executed':
      patch.executedAt = timestamp;
      break;
    case 'failed':
      patch.failedAt = timestamp;
      patch.failureReason = detail?.failureReason ?? 'Execution failed.';
      break;
    case 'expired':
      patch.failedAt = timestamp;
      patch.failureReason = 'Action bundle expired before execution.';
      break;
  }

  return actionBundleSchema.parse({ ...bundle, ...patch });
}

export function approveBundle(
  bundle: ActionBundle,
  timestamp?: string,
): ActionBundle | { error: string } {
  return transitionBundleStatus(bundle, 'approved', { timestamp });
}

export function rejectBundle(
  bundle: ActionBundle,
  timestamp?: string,
): ActionBundle | { error: string } {
  return transitionBundleStatus(bundle, 'rejected', { timestamp });
}

export function markBundleExecuted(
  bundle: ActionBundle,
  timestamp?: string,
): ActionBundle | { error: string } {
  return transitionBundleStatus(bundle, 'executed', { timestamp });
}

export function markBundleFailed(
  bundle: ActionBundle,
  failureReason: string,
  timestamp?: string,
): ActionBundle | { error: string } {
  return transitionBundleStatus(bundle, 'failed', { failureReason, timestamp });
}

export function expireBundle(
  bundle: ActionBundle,
  timestamp?: string,
): ActionBundle | { error: string } {
  return transitionBundleStatus(bundle, 'expired', { timestamp });
}

export function expireStaleBundles(bundles: ActionBundle[], now?: string): ActionBundle[] {
  const reference = now ?? nowIso();
  return bundles.map((bundle) => {
    if (
      (bundle.status === 'proposed' || bundle.status === 'approved') &&
      bundle.expiresAt <= reference
    ) {
      const result = expireBundle(bundle, reference);
      return 'error' in result ? bundle : result;
    }
    return bundle;
  });
}

export function filterBundlesByStatus(
  bundles: ActionBundle[],
  statuses: ActionBundleStatus[],
): ActionBundle[] {
  const set = new Set(statuses);
  return bundles.filter((bundle) => set.has(bundle.status));
}

export function pendingBundles(bundles: ActionBundle[]): ActionBundle[] {
  return filterBundlesByStatus(bundles, ['proposed', 'approved']);
}

export function completedBundles(bundles: ActionBundle[]): ActionBundle[] {
  return filterBundlesByStatus(bundles, ['executed', 'failed', 'rejected', 'expired']);
}
