import { type PolicyActionClass, resolveScopedActionPayload } from '@coop/shared';
import type { ActionExecutorContext, ExecutorResult } from '../action-executors';
import {
  handleArchiveArtifact,
  handleArchiveSnapshot,
  handleRefreshArchiveStatus,
} from '../archive';

export function buildArchiveExecutors(
  ctx: ActionExecutorContext,
): Partial<Record<PolicyActionClass, (payload: Record<string, unknown>) => ExecutorResult>> {
  const { bundle } = ctx;

  return {
    'archive-artifact': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'archive-artifact',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) {
        return { ok: false, error: scopedPayload.reason };
      }
      const coopId = scopedPayload.normalizedPayload.coopId as string;
      const artifactId = scopedPayload.normalizedPayload.artifactId as string;
      const result = await handleArchiveArtifact({
        type: 'archive-artifact',
        payload: { coopId, artifactId },
      });
      return { ok: result.ok, error: result.error, data: result.data };
    },
    'archive-snapshot': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'archive-snapshot',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) {
        return { ok: false, error: scopedPayload.reason };
      }
      const coopId = scopedPayload.normalizedPayload.coopId as string;
      const result = await handleArchiveSnapshot({
        type: 'archive-snapshot',
        payload: { coopId },
      });
      return { ok: result.ok, error: result.error, data: result.data };
    },
    'refresh-archive-status': async (payload) => {
      const scopedPayload = resolveScopedActionPayload({
        actionClass: 'refresh-archive-status',
        payload,
        expectedCoopId: bundle.coopId,
      });
      if (!scopedPayload.ok) {
        return { ok: false, error: scopedPayload.reason };
      }
      const coopId = scopedPayload.normalizedPayload.coopId as string;
      const receiptId = scopedPayload.normalizedPayload.receiptId as string | undefined;
      const result = await handleRefreshArchiveStatus({
        type: 'refresh-archive-status',
        payload: { coopId, receiptId },
      });
      return { ok: result.ok, error: result.error, data: result.data };
    },
  };
}
