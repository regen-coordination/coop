---
feature: agent-knowledge-sandbox
title: Knowledge sandbox polish — close remaining gaps
lane: polish
agent: claude
status: done
source_branch: feature/agent-knowledge-sandbox
depends_on:
  - ../spec.md
  - state.codex.todo.md
  - ui.claude.todo.md
owned_paths:
  - packages/extension/src/background/handler-registry.ts
  - packages/extension/src/background/handlers/knowledge-source.ts
  - packages/extension/src/runtime/agent/runner-skills-prompt.ts
  - packages/extension/src/runtime/agent/runner-skills-completion.ts
  - packages/extension/src/runtime/agent/graph-store-singleton.ts
  - packages/extension/src/views/Sidepanel/tabs/NestTab.tsx
  - packages/extension/src/views/Sidepanel/tabs/RoostTab.tsx
  - packages/extension/src/views/Popup/PopupProfilePanel.tsx
done_when:
  - handler-registry has add/remove/toggle/list-knowledge-source handlers
  - buildSkillPrompt includes graphContext section
  - NestSourcesSection renders live data
  - bun run validate quick passes
completed: 2026-04-06
updated: 2026-04-06
---

# Polish Lane — Close All Integration Gaps

## Batch 1: Handler Registration + Data Pipeline (Critical)

### 1.1 Create knowledge-source background handlers

- [x] Create `packages/extension/src/background/handlers/knowledge-source.ts`
  - `handleAddKnowledgeSource(message)` → calls `createKnowledgeSource(db, ...)` + `writeSourceToYDoc(doc, source)` + returns source
  - `handleRemoveKnowledgeSource(message)` → calls `removeKnowledgeSource(db, id)` + `removeSourceFromYDoc(doc, id)`
  - `handleToggleKnowledgeSource(message)` → updates active status via `db.knowledgeSources.update()`
  - `handleListKnowledgeSources(message)` → calls `listKnowledgeSources(db, { coopId })`
  - Import `db` from `../context`, get Yjs doc from active coop state

### 1.2 Register handlers in handler-registry.ts

- [x] Add to `handlerRegistry` object (after the Archive section):
  ```
  // ---- Knowledge Sources ----
  'add-knowledge-source': async (message) => handleAddKnowledgeSource(message),
  'remove-knowledge-source': async (message) => handleRemoveKnowledgeSource(message),
  'toggle-knowledge-source': async (message) => handleToggleKnowledgeSource(message),
  'list-knowledge-sources': async (message) => handleListKnowledgeSources(message),
  ```

### 1.3 Bind NestTab to live data

- [x] Modify `NestTab.tsx`:
  - Add state: `const [sources, setSources] = useState<NestSourcesSectionProps['sources']>([])`
  - On mount (when `nestSubTab === 'sources'`): call `sendRuntimeMessage({ type: 'list-knowledge-sources', payload: { coopId: activeCoop.profile.id } })` and set state
  - Wire `onAddSource` → `sendRuntimeMessage({ type: 'add-knowledge-source', payload: { coopId, sourceType, identifier, label } })`
  - Wire `onRemoveSource` → `sendRuntimeMessage({ type: 'remove-knowledge-source', payload: { sourceId } })`
  - Wire `onToggleSource` → `sendRuntimeMessage({ type: 'toggle-knowledge-source', payload: { sourceId, active } })`
  - After each mutation: re-fetch the list

## Batch 2: Skill Prompt Injection (Critical)

### 2.1 Inject graphContext into buildSkillPrompt

- [x] Modify `runner-skills-prompt.ts`:
  - Add `graphContext?: string` to `buildSkillPrompt` input type
  - After `memoryContext` and before the final `prompt` assembly:
    ```typescript
    const knowledgeGraphContext = input.graphContext
      ? `Knowledge graph context:\n${input.graphContext}`
      : '';
    ```
  - Add `knowledgeGraphContext` to the prompt array (between memoryContext and extractContext)
  - Add `knowledgeGraphContext` to `heuristicContext` filter

### 2.2 Pass graphContext through completeSkill

- [x] Modify `runner-skills-completion.ts`:
  - In the `completeSkill()` function where `buildSkillPrompt()` is called, add `graphContext: context.graphContext` to the input

## Batch 3: Graph Persistence (Medium)

### 3.1 Serialize graph store to Dexie

- [x] Add `graphSnapshot` table to Dexie v20 in `db-schema.ts`:
  ```
  graphSnapshots: 'id, coopId, updatedAt'
  ```
  - Schema: `{ id: string, coopId: string, entities: string, relationships: string, traces: string, insights: string, updatedAt: string }`

- [x] Modify `graph-store-singleton.ts`:
  - `saveGraphSnapshot(db, coopId, store)` — serializes entities/relationships/traces/insights as JSON
  - `loadGraphSnapshot(db, coopId)` — hydrates graph store from snapshot on first access
  - Auto-save after `upsertEntity`, `createRelationship`, `recordReasoningTrace`, `strengthenSourceEdges`, `weakenSourceEdges` (debounced, 5s)

## Batch 4: Source Fetch Trigger (Medium)

### 4.1 Background source refresh handler

- [x] Create `packages/extension/src/background/handlers/knowledge-source-fetch.ts`:
  - `handleRefreshKnowledgeSource(message)` — for each registered source:
    1. Match source type to adapter (youtube → fetchYouTubeTranscript, etc.)
    2. Call `fetch()` to get raw API response
    3. Run adapter to produce StructuredContent
    4. Run sanitizeIngested() on body
    5. Update source meta (lastFetchedAt, entityCount)
    6. Emit `source-content-ready` observation via `emitSourceContentObservation()`
  - Add handler to registry: `'refresh-knowledge-source': async (message) => handleRefreshKnowledgeSource(message)`

## Batch 5: Roost + Popup Data Binding (Low)

### 5.1 Add graph stats RuntimeRequest

- [x] Add `'get-knowledge-stats'` to RuntimeRequest type in `messages.ts`
- [x] Add handler that returns `{ topics: [...], stats: { entities, relationships, sources }, decisions: [...] }`
- [x] Wire `RoostAgentSection` to call on mount and pass to `RoostKnowledgeSection` + `RoostDecisionHistory`
- [x] Wire `SourceHealthIndicator` in Popup to query source health stats

### 5.2 Knowledge lint alarm

- [x] In `packages/extension/src/background/lifecycle.ts` or equivalent:
  - `chrome.alarms.create('knowledge-lint', { periodInMinutes: 10080 })` (weekly)
  - On alarm fire: call `emitKnowledgeLintObservation()` for each active coop

## Gate

- `bun run validate quick` passes
- NestSourcesSection renders sources from Dexie
- Agent skills receive graphContext in prompts
- Graph survives service worker restart (Dexie persistence)
