import type * as Y from 'yjs';
import type { KnowledgeSource } from '../../contracts/schema-knowledge';

const SOURCES_MAP_KEY = 'knowledge-sources-v1';

/**
 * Write a knowledge source into the Yjs document's shared map.
 */
export function writeSourceToYDoc(doc: Y.Doc, source: KnowledgeSource): void {
  const map = doc.getMap<string>(SOURCES_MAP_KEY);
  map.set(source.id, JSON.stringify(source));
}

/**
 * Remove a knowledge source from the Yjs document's shared map.
 */
export function removeSourceFromYDoc(doc: Y.Doc, sourceId: string): void {
  const map = doc.getMap<string>(SOURCES_MAP_KEY);
  map.delete(sourceId);
}

/**
 * Read all knowledge sources from the Yjs document's shared map.
 */
export function readSourcesFromYDoc(doc: Y.Doc): KnowledgeSource[] {
  const map = doc.getMap<string>(SOURCES_MAP_KEY);
  const sources: KnowledgeSource[] = [];
  for (const value of map.values()) {
    try {
      sources.push(JSON.parse(value));
    } catch {
      // skip corrupted entries
    }
  }
  return sources;
}

/**
 * Watch for changes to the knowledge sources in the Yjs document.
 * Returns an unsubscribe function.
 */
export function watchSourceChanges(
  doc: Y.Doc,
  callback: (sources: KnowledgeSource[]) => void,
): () => void {
  const map = doc.getMap<string>(SOURCES_MAP_KEY);
  const handler = () => {
    callback(readSourcesFromYDoc(doc));
  };
  map.observe(handler);
  return () => map.unobserve(handler);
}
