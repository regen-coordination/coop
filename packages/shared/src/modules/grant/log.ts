import type {
  DelegatedActionClass,
  GrantLogEntry,
  GrantLogEventType,
} from '../../contracts/schema';
import { grantLogEntrySchema } from '../../contracts/schema';
import { createId, nowIso } from '../../utils';

const GRANT_LOG_LIMIT = 100;

export function createGrantLogEntry(input: {
  grantId: string;
  eventType: GrantLogEventType;
  detail: string;
  actionClass?: DelegatedActionClass;
  coopId?: string;
  replayId?: string;
  createdAt?: string;
}): GrantLogEntry {
  return grantLogEntrySchema.parse({
    id: createId('glog'),
    grantId: input.grantId,
    eventType: input.eventType,
    actionClass: input.actionClass,
    detail: input.detail,
    createdAt: input.createdAt ?? nowIso(),
    coopId: input.coopId,
    replayId: input.replayId,
  });
}

export function appendGrantLog(
  entries: GrantLogEntry[],
  entry: GrantLogEntry,
  limit = GRANT_LOG_LIMIT,
): GrantLogEntry[] {
  return [entry, ...entries]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

export function formatGrantLogEventLabel(eventType: GrantLogEventType): string {
  switch (eventType) {
    case 'grant-issued':
      return 'Issued';
    case 'grant-revoked':
      return 'Revoked';
    case 'grant-expired':
      return 'Expired';
    case 'delegated-execution-attempted':
      return 'Attempted';
    case 'delegated-execution-succeeded':
      return 'Succeeded';
    case 'delegated-execution-failed':
      return 'Failed';
    case 'delegated-replay-rejected':
      return 'Replay rejected';
    case 'delegated-exhausted-rejected':
      return 'Exhausted';
  }
}
