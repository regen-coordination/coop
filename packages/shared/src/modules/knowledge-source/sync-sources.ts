import * as Y from 'yjs';
import type { KnowledgeSource } from '../../contracts/schema-knowledge';

const MAP_KEY = 'knowledge-sources-v1';

/**
 * Write a KnowledgeSource into the Yjs doc's shared map.
 * Uses the source id as the map key; overwrites any existing entry.
 */
export function writeSourceToYDoc(doc: Y.Doc, source: KnowledgeSource): void {
  const map = doc.getMap<string>(MAP_KEY);
  map.set(source.id, JSON.stringify(source));
}

/**
 * Read all KnowledgeSources from the Yjs doc's shared map.
 */
export function readSourcesFromYDoc(doc: Y.Doc): KnowledgeSource[] {
  const map = doc.getMap<string>(MAP_KEY);
  const sources: KnowledgeSource[] = [];
  map.forEach((value) => {
    try {
      sources.push(JSON.parse(value) as KnowledgeSource);
    } catch {
      // Skip corrupt entries
    }
  });
  return sources;
}

/**
 * Observe the shared map and call `callback` with the current list of sources
 * whenever a change occurs.
 */
export function watchSourceChanges(
  doc: Y.Doc,
  callback: (sources: KnowledgeSource[]) => void,
): () => void {
  const map = doc.getMap<string>(MAP_KEY);
  const handler = () => {
    callback(readSourcesFromYDoc(doc));
  };
  map.observe(handler);
  return () => map.unobserve(handler);
}
