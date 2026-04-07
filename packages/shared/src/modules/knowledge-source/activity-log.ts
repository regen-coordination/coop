import type * as Y from 'yjs';
import type { KnowledgeLogEntry } from '../../contracts/schema-knowledge';

const LOG_ARRAY_KEY = 'knowledge-log-v1';

/**
 * Append a log entry to the Yjs-backed activity log.
 */
export function appendLogEntry(doc: Y.Doc, entry: KnowledgeLogEntry): void {
  const arr = doc.getArray<string>(LOG_ARRAY_KEY);
  arr.push([JSON.stringify(entry)]);
}

/**
 * Get recent log entries in reverse chronological order (newest first).
 */
export function getRecentLog(doc: Y.Doc, limit: number): KnowledgeLogEntry[] {
  const arr = doc.getArray<string>(LOG_ARRAY_KEY);
  const entries: KnowledgeLogEntry[] = [];

  for (let i = arr.length - 1; i >= 0 && entries.length < limit; i--) {
    try {
      entries.push(JSON.parse(arr.get(i)));
    } catch {
      // skip corrupted entries
    }
  }

  return entries;
}
