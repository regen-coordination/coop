export {
  type GraphStore,
  initGraphStore,
  upsertEntity,
  getEntity,
  getEntityNeighbors,
  createRelationship,
  invalidateRelationship,
  destroyGraphStore,
} from './store';
export { currentFacts, factsAt, factHistory } from './temporal';
export {
  type RetrievalResult,
  type HybridSearchOptions,
  searchByText,
  searchByTraversal,
  hybridSearch,
} from './retrieval';
export { assembleGraphContext } from './context';
export {
  recordReasoningTrace,
  queryPrecedents,
  computePrecedentAdjustment,
} from './reasoning';
export {
  strengthenSourceEdges,
  weakenSourceEdges,
  createValidatedInsight,
} from './compound';
export { runKnowledgeLint } from './lint';
