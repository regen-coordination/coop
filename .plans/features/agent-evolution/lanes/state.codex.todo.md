---
feature: agent-evolution
title: Agent evolution state lane
lane: state
agent: codex
status: ready
source_branch: feature/agent-evolution
work_branch: codex/state/agent-evolution
depends_on:
  - ../spec.md
owned_paths:
  - packages/shared/src/modules/agent
  - packages/shared/src/modules/sync-core
  - packages/shared/src/modules/session
  - packages/shared/src/modules/permit
  - packages/shared/src/modules/policy
  - packages/shared/src/contracts/schema-agent.ts
  - packages/shared/src/contracts/schema-session.ts
  - packages/shared/src/contracts/schema-coop.ts
  - packages/extension/src/runtime/agent
done_when:
  - runtimeSkillManifestSchema
  - mergeRuntimeSkills
  - agentMessageSchema
  - coop-agent-messages-v2
  - spendingLimitPolicy
  - autoExecuteThreshold
skills:
  - state-logic
  - shared
  - storage
updated: 2026-04-05
---

# State Lane — Agent Evolution

## Objective

Implement the core state, schemas, persistence, and runtime orchestration for all three
workstreams: runtime skill registration, agent message passing, and session-key scoped spending.

## Phase 1: Runtime Skill Registration

### 1.1 Extend knowledgeSkill schema with manifest fields
- [ ] Add `runtimeSkillManifestSchema` to `schema-agent.ts` — subset of `skillManifestSchema`:
  - Required: id, version, description, triggers, outputSchemaRef, approvalMode, timeoutMs
  - Fixed: runtime = 'extension-offscreen', model = 'webllm', inputSchemaRef = 'agent-observation'
  - Optional: depends, skipWhen, provides, maxTokens, qualityProfile, qualityThreshold
- [ ] Extend `knowledgeSkillSchema` with optional `manifest` field (type: RuntimeSkillManifest | null)
- [ ] Add `promptTemplate` field to `knowledgeSkillSchema` (the actual inference prompt)
- [ ] Add `outputSchema` field (JSON Schema string for output validation)
- [ ] DB migration: version bump in `db-schema.ts`, add new indexes
- **Verify**: `bun run test -- packages/shared` passes

### 1.2 Runtime skill registry integration
- [ ] Create `listRuntimeSkills()` in `knowledge.ts` — queries Dexie for skills with non-null manifest
- [ ] Create `getRuntimeSkill(skillId)` — returns `RegisteredSkill`-compatible object
- [ ] Extend `registry.ts`: `listAllSkills()` merges compiled + runtime skills
- [ ] Extend `getRegisteredSkill()` to fall back to `getRuntimeSkill()` on miss
- [ ] Add dedup: if runtime skill ID matches compiled skill ID, compiled wins
- **Verify**: `bun run test -- packages/extension/src/runtime/agent` passes

### 1.3 Harness integration for runtime skills
- [ ] Update `selectSkillIdsForObservation()` in `harness.ts` to use `listAllSkills()`
- [ ] Ensure topological sort handles mixed compiled+runtime skill graphs
- [ ] Add `isRuntime` flag to skill context for quality scoring differentiation
- [ ] Runtime skills always use `webllm` provider regardless of manifest.model
- [ ] Timeout enforcement for runtime skills (default 30s, max 60s)
- **Verify**: `bun run test -- packages/extension/src/runtime/agent/harness` passes

### 1.4 Agent-initiated skill creation
- [ ] Add `createRuntimeSkill` function to agent module
- [ ] Generates: name, description, promptTemplate, outputSchema, triggers from observation context
- [ ] Store via existing `db.knowledgeSkills.put()`
- [ ] Emit agent log entry on creation
- [ ] Add `extend-self` trigger type to `agentObservationTriggerSchema`
- **Verify**: unit test for agent-initiated skill creation flow

## Phase 2: Agent Message Passing

### 2.1 Agent message schema
- [ ] Define `agentMessageSchema` in `schema-agent.ts`:
  - id, conversationId, senderAgentId (number), senderCoopId
  - recipientAgentId (number), recipientCoopId
  - type: 'query' | 'response' | 'proposal' | 'ack' | 'broadcast'
  - payload: Record<string, unknown>, subject, body
  - timestamp, status: 'pending' | 'delivered' | 'read' | 'expired'
  - expiresAt?, replyToMessageId?, signature?
- [ ] Add `AgentMessage` type export from agent module
- [ ] Add `agentMessages` to `CoopSharedState` schema (array, default [])
- **Verify**: schema validation tests pass

### 2.2 Yjs doc integration
- [ ] Add `AGENT_MESSAGES_V2_MAP_KEY = 'coop-agent-messages-v2'` to `sync-core/doc.ts`
- [ ] Extend `writeCoopState()` to write agent messages as nested Y.Maps
- [ ] Extend `readCoopState()` to read and validate agent messages
- [ ] Add `writeAgentMessage(doc, message)` helper
- [ ] Add `readAgentMessages(doc, filters?)` with optional sender/type/status filters
- [ ] Add `observeAgentMessages(doc, callback)` for real-time Y.Map updates
- **Verify**: Yjs roundtrip test (write -> encode -> hydrate -> read)

### 2.3 Message observation trigger
- [ ] Add `agent-message-received` to `agentObservationTriggerSchema`
- [ ] Create `emitAgentMessageObservation()` in `agent-observation-emitters.ts`
- [ ] Fingerprint: `agent-msg::{messageId}` for dedup
- [ ] Wire Y.Map observer to emit observations on new messages
- **Verify**: observation created when message written to Y.Doc

### 2.4 Agent message CRUD
- [ ] `sendAgentMessage()` — writes to local Y.Doc (intra-coop) or queues for relay (cross-coop)
- [ ] `markMessageDelivered()`, `markMessageRead()` — status updates
- [ ] `listAgentMessages()` — query by conversation, sender, status
- [ ] `pruneExpiredMessages()` — cleanup for messages past expiresAt
- [ ] Add agent memory entries for message outcomes
- **Verify**: CRUD unit tests

## Phase 3: Session-Key Scoped Spending

### 3.1 Generalize session capability scope
- [ ] Make `SESSION_CAPABLE_ACTION_CLASSES` extensible in `session-constants.ts`
- [ ] Add new action classes: `transfer-erc20`, `approve-erc20`, `transfer-native`, `custom-call`
- [ ] Add `spendingLimit` to `SessionCapabilityScope`:
  - maxValuePerAction: bigint
  - maxDailyAggregate: bigint
  - tokenAddress: string
- [ ] Add `dailySpent` tracking field to session capability state
- [ ] Add `resetDailySpentAt` timestamp for daily cap reset
- **Verify**: schema validation for new scope fields

### 3.2 Spending limit enforcement
- [ ] Create `validateSpendingLimit()` in session module
  - Per-action value check against maxValuePerAction
  - Daily aggregate check against maxDailyAggregate
  - Track and increment dailySpent on success
  - Reset dailySpent on midnight boundary crossing
- [ ] Wire into `validateSessionCapabilityForBundle()` pipeline
- [ ] Add onchain policy via Rhinestone if available, else client-side only
- **Verify**: unit tests for limit enforcement edge cases

### 3.3 Auto-execute threshold logic
- [ ] Add `autoExecuteThreshold` to policy config (per-coop)
  - Below threshold: auto-approve and execute
  - At/above threshold: queue for member approval
- [ ] Modify `createActionBundle()` to check value against threshold
- [ ] Modify `executeAgentPlanProposals()` to route by threshold
- [ ] Add spending actions to `buildActionExecutors()` registry
- **Verify**: unit tests for threshold routing

### 3.4 Agent session key provisioning
- [ ] `provisionAgentSessionKey()` — generates session signer for agent identity
- [ ] Store agent session key in Dexie encrypted store
- [ ] Wire agent identity (ERC-8004 agentId) as session key holder
- [ ] Add `agent-session-key` capability to agent manifest
- [ ] Session lifecycle: provision -> enable on Safe -> execute -> revoke
- **Verify**: mock-mode session key provisioning roundtrip

## Verification

- [ ] `bun run test -- packages/shared` (all schema + module tests)
- [ ] `bun run test -- packages/extension/src/runtime/agent` (harness + registry)
- [ ] `bun run validate smoke` before handoff

## Handoff Notes

- Runtime skills use webllm only — CI needs mock webllm (no GPU)
- Agent messages in Y.Doc: backwards-compatible (new key, existing keys untouched)
- Spending limit enforcement: document whether client-side or onchain
- Session key storage: verify encryption at rest via db-encryption
