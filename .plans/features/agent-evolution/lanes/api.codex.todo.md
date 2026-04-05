---
feature: agent-evolution
title: Agent evolution API lane
lane: api
agent: codex
status: ready
source_branch: feature/agent-evolution
work_branch: codex/api/agent-evolution
depends_on:
  - ../spec.md
  - state.codex.todo.md
owned_paths:
  - packages/api/src/ws
  - packages/api/src
done_when:
  - agent-relay topic
  - handleAgentRelay
  - AgentRelayBuffer
skills:
  - api
  - hono
  - contracts
updated: 2026-04-05
---

# API Lane — Agent Evolution

## Objective

Extend the signaling server to support cross-coop agent message relay, including
store-and-forward delivery, sender identity verification, and monitoring.

## Phase 1: Cross-Coop Agent Message Relay

### 1.1 Agent relay topic pattern
- [ ] Add topic pattern `agent::{agentId}` to signaling server
- [ ] Messages published to this topic are store-and-forward (not just broadcast)
- [ ] Add `agent-relay` message type to `ws/types.ts`:
  - type: 'agent-relay'
  - senderAgentId: number
  - recipientAgentId: number
  - senderCoopId: string
  - payload: AgentMessage
  - signature: string
- [ ] Rate limit agent relay messages: 10 per minute per connection
- **Verify**: `bun run test -- packages/api` passes

### 1.2 Message delivery and buffering
- [ ] Create `AgentRelayBuffer` — in-memory store for undelivered messages
  - Key: recipientAgentId
  - Value: queue of pending messages (max 100 per recipient)
  - TTL: 24 hours, then expire
- [ ] On recipient subscribe to `agent::{agentId}`, flush buffered messages
- [ ] On sender publish: if recipient connected -> deliver immediately, else buffer
- [ ] Add `/api/agent/messages/:agentId` REST endpoint for polling (fallback)
- **Verify**: delivery test with connect/disconnect timing

### 1.3 Sender identity verification
- [ ] Validate `signature` field against ERC-8004 registered agent identity
- [ ] Mock mode: accept any signature from known agentIds
- [ ] Live mode: verify EIP-712 signature against agent's Safe address
- [ ] Reject messages from unregistered agentIds
- [ ] Log relay events for monitoring
- **Verify**: signature verification unit tests (mock + live)

### 1.4 Relay monitoring
- [ ] Add `/api/agent/relay/stats` endpoint:
  - Active agent subscriptions count
  - Buffered message count
  - Messages relayed / expired in last hour
- [ ] Add relay metrics to existing health check
- **Verify**: stats endpoint returns expected shape

## Phase 2: Skill Import Proxy

### 2.1 Skill manifest fetch proxy
- [ ] Add `/api/agent/skills/fetch` POST endpoint
  - Input: `{ url: string }`
  - Output: parsed SKILL.md + validated manifest
  - SSRF protection: reuse allowlist from `knowledge.ts:55-86`
- [ ] Validate manifest against `runtimeSkillManifestSchema`
- [ ] This gives the extension a CORS-safe fetch path for external skills
- **Verify**: proxy returns valid manifest for known skill URLs

## Verification

- [ ] `bun run test -- packages/api` passes
- [ ] `bun run validate smoke` before handoff

## Handoff Notes

- AgentRelayBuffer is in-memory only — messages lost on server restart
  (acceptable for v1; persistent buffer is future work)
- Rate limiting is per-connection, not per-agent — an agent with multiple
  connections gets proportionally more capacity
- Signature verification requires chain RPC access in live mode
