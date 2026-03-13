/**
 * Replay protection for action bundles.
 * Tracks consumed replay IDs to prevent double-execution.
 */

export interface ReplayGuard {
  consumedIds: Set<string>;
}

export function createReplayGuard(existingIds?: string[]): ReplayGuard {
  return {
    consumedIds: new Set(existingIds),
  };
}

export function isReplayIdConsumed(guard: ReplayGuard, replayId: string): boolean {
  return guard.consumedIds.has(replayId);
}

export function recordExecutedReplayId(guard: ReplayGuard, replayId: string): ReplayGuard {
  const next = new Set(guard.consumedIds);
  next.add(replayId);
  return { consumedIds: next };
}

export function checkReplayId(
  guard: ReplayGuard,
  replayId: string,
): { ok: true } | { ok: false; reason: string } {
  if (isReplayIdConsumed(guard, replayId)) {
    return {
      ok: false,
      reason: `Replay ID "${replayId}" has already been executed. Duplicate action rejected.`,
    };
  }
  return { ok: true };
}

export function exportConsumedReplayIds(guard: ReplayGuard): string[] {
  return Array.from(guard.consumedIds);
}
