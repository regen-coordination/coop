# Context For Agent Evolution

## Existing Infrastructure

### Workstream 1 — Runtime Skills

**Already built:**
- `knowledgeSkills` Dexie table with fields: id, url, name, description, domain, content, contentHash, fetchedAt, enabled, triggerPatterns
- `coopKnowledgeSkillOverrides` table for per-coop enable/disable
- `importKnowledgeSkill(url)` fetches SKILL.md from HTTPS, stores in DB (`knowledge.ts:123-151`)
- `selectKnowledgeSkills(observation)` scores and selects top 3 by relevance (`knowledge.ts:216-255`)
- Skill manifest validation via `skillManifestSchema` Zod schema (`schema-agent.ts`)
- Eval pipeline (`eval.ts`) is schema-agnostic — works with any `SkillOutputSchemaRef`
- Quality scoring (`quality.ts`) has generic fallback (0.6 base confidence)

**Gap:**
- Knowledge skills are currently **context-only** (injected as prompt context, not dispatched as full skills)
- No runtime manifest — knowledge skills lack model, outputSchemaRef, triggers, timeoutMs
- `registry.ts` only loads via `import.meta.glob` (compile-time)
- `harness.ts:selectSkillIdsForObservation()` only queries registered (compiled) skills
- `runner-skills.ts:191-196` only looks up skills via `getRegisteredSkill(skillId)`

**Integration seams:**
- Add manifest fields to `knowledgeSkillSchema` (or create `runtimeSkillManifestSchema` subset)
- Extend `listRegisteredSkills()` to merge DB-loaded runtime skills
- Extend `getRegisteredSkill()` to fall back to DB lookup
- Runtime skills should use `webllm` provider (only provider that works with arbitrary prompts)

### Workstream 2 — Agent Messages

**Already built:**
- Yjs Y.Doc with root key `"coop"` — Y.Map structure (`sync-core/doc.ts:68-104`)
- V2 pattern for nested Y.Maps: `coop-artifacts-v2`, `coop-members-v2` (field-level CRDT)
- `writeCoopState()` / `readCoopState()` / `updateCoopState()` (`sync-core/doc.ts:219-348`)
- Signaling server with topic pub/sub (`ws/handler.ts`, `ws/topics.ts`)
- Rate limiting: 60 publishes per 10s per connection
- Yjs sync endpoint `/yws/:room` with binary protocol (`ws/yjs-sync.ts`)
- Room ID: `coop-room-{hash(coopId:roomSecret)}` (`sync-core/doc.ts:112-114`)
- ERC-8004 agent identity registration with agentId, manifest, reputation (`erc8004.ts`)
- Agent observation trigger system with fingerprint dedup (`agent-observation-emitters.ts`)

**Gap:**
- No inter-coop communication — each coop is an isolated sync room
- No agent message schema or storage
- Signaling server topics are coop-scoped, no cross-coop relay
- No message-triggered observation type

**Integration seams:**
- Add `coop-agent-messages-v2` Y.Map to doc structure (same pattern as artifacts-v2)
- Add `agent-message` trigger type to `agentObservationTriggerSchema`
- Add cross-coop topic pattern: `agent::{recipientAgentId}` on signaling server
- Use ERC-8004 agentId for sender verification

### Workstream 3 — Scoped Spending

**Already built:**
- Safe7579 session key lifecycle: create → enable → execute → revoke (`session-capability.ts`, `session-smart-modules.ts`)
- `SessionCapabilityScope` with allowedActions, targetAllowlist, maxUses, expiresAt (`schema-session.ts:34-41`)
- Session validation: `validateSessionCapabilityForBundle()` (`session-validation.ts:29`)
- Usage limit enforcement via Rhinestone `getUsageLimitPolicy()` (`session-smart-modules.ts:68-70`)
- Action bundle lifecycle: proposed → approved → executed (`approval.ts`, `executor.ts`)
- EIP-712 typed authorization for bundles (`action-bundle-core.ts:35-71`)
- Replay protection via `ReplayGuard` (`replay.ts`)
- Agent action proposal system: `createActionProposal()` → `executeAgentPlanProposals()` (`agent.ts:176`, `agent-plan-executor.ts`)
- Permit system for client-side delegation (`permit.ts`, `enforcement.ts`)
- Mock mode with deterministic addresses (`onchain.ts:554-557`)

**Gap:**
- `SESSION_CAPABLE_ACTION_CLASSES` hardcoded to 4 Green Goods actions (`session-constants.ts:7-12`)
- No spending limit policies (per-day caps, value thresholds)
- No agent-specific session key provisioning (sessions are member-to-member)
- Action bundle executor only handles existing action classes
- No auto-execute threshold logic (all proposals go through same approval gate)

**Integration seams:**
- Extend `SESSION_CAPABLE_ACTION_CLASSES` to include transfer, approve, custom calls
- Add `spendingLimit` to `SessionCapabilityScope` (value cap per execution + daily aggregate)
- Add `autoExecuteThreshold` to policy config
- Wire agent identity as session key holder (agent gets its own signer)
- Extend `buildActionExecutors()` to handle spending actions

## Relevant Codepaths

| Component | Path | Key Lines |
|-----------|------|-----------|
| Knowledge skills DB | `shared/src/modules/storage/db-schema.ts` | 102-103, 283, 340 |
| Knowledge skill CRUD | `shared/src/modules/storage/db-crud-agent.ts` | 137-166 |
| Knowledge skill import | `extension/src/runtime/agent/knowledge.ts` | 123-151, 216-255 |
| Skill registry | `extension/src/runtime/agent/registry.ts` | 14-88 |
| Skill harness | `extension/src/runtime/agent/harness.ts` | 162-209 |
| Skill runner dispatch | `extension/src/runtime/agent/runner-skills.ts` | 191-251 |
| Eval pipeline | `extension/src/runtime/agent/eval.ts` | 165-292 |
| Quality scoring | `extension/src/runtime/agent/quality.ts` | 23-52 |
| WebLLM bridge | `extension/src/runtime/agent/webllm-bridge.ts` | — |
| Yjs doc structure | `shared/src/modules/sync-core/doc.ts` | 68-104, 219-348 |
| Signaling handler | `api/src/ws/handler.ts` | 32-181 |
| Topic registry | `api/src/ws/topics.ts` | 4-47 |
| Yjs sync server | `api/src/ws/yjs-sync.ts` | 167-428 |
| ERC-8004 registry | `shared/src/modules/erc8004/erc8004.ts` | 14-48, 81-160 |
| Session capability | `shared/src/modules/session/session-capability.ts` | 40-75, 187-195 |
| Session smart modules | `shared/src/modules/session/session-smart-modules.ts` | 34-92, 116-134 |
| Session schema | `shared/src/contracts/schema-session.ts` | 34-41 |
| Session constants | `shared/src/modules/session/session-constants.ts` | 7-12 |
| Action bundles | `shared/src/modules/policy/action-bundle-core.ts` | 92-140 |
| Bundle execution | `shared/src/modules/policy/executor.ts` | 29-140 |
| Approval workflow | `shared/src/modules/policy/approval.ts` | 5-60 |
| Permits | `shared/src/modules/permit/permit.ts` | 5-30 |
| Permit enforcement | `shared/src/modules/permit/enforcement.ts` | 21-109 |
| Agent proposals | `shared/src/modules/agent/agent.ts` | 176-201 |
| Plan executor | `extension/src/background/handlers/agent-plan-executor.ts` | 5-52 |
| Action executors | `extension/src/background/handlers/action-executors.ts` | 35-45 |
| Agent schemas | `shared/src/contracts/schema-agent.ts` | — |
| Coop shared state | `shared/src/contracts/schema-coop.ts` | 137-145 |

## Constraints

**Architectural:**
- All domain logic in `@coop/shared`, runtime plumbing in extension
- No cloud inference — WebLLM is the ceiling for runtime skills
- Y.Doc shared keys must be backwards-compatible (can add, don't remove)
- Session keys are chain-specific (no cross-chain sessions)

**UX / Product:**
- Agent tab (Roost panel) is already dense — new UI must fit the 3-tab split (Focus / Agent / Garden)
- Spending approval must be unmissable — no silent auto-spending without prior consent
- Skill creation should feel like "teaching" not "programming"

**Testing:**
- Runtime skill tests need mock WebLLM (no GPU in CI)
- Cross-coop message tests need two separate Y.Docs with signaling relay
- Session key tests need mock Pimlico bundler (existing pattern in tests)

## Notes For Agents

**Claude should focus on:**
- Skill creation UI in Agent tab
- Message inbox UI
- Spending approval UX (threshold visualization, transaction preview)
- E2E tests for the three flows

**Codex should focus on:**
- Runtime skill manifest schema and DB migration
- Harness integration (merge compiled + runtime skills)
- Agent message schema, Yjs doc extension, signaling relay
- Session scope generalization, spending limit policies
- Action executor expansion

**Shared assumptions:**
- Workstream 1 ships first (lowest risk, no onchain)
- Workstream 2 ships second (network but no money)
- Workstream 3 ships last (real money, highest risk)
- All three use existing mode flags for mock/live gating
- All three respect the local-first principle
