---
feature: agent-evolution
title: Agent evolution QA pass 1
lane: qa
agent: codex
status: backlog
source_branch: feature/agent-evolution
work_branch: qa/codex/agent-evolution
skills:
  - qa
  - state-logic
  - api
  - contracts
qa_order: 1
handoff_in: handoff/qa-codex/agent-evolution
handoff_out: handoff/qa-claude/agent-evolution
updated: 2026-04-05
---

# QA Pass 1 — State, API, Contracts

Codex runs first QA after implementation lanes finish and `handoff/qa-codex/agent-evolution` exists.

## Runtime Skills

- [ ] Runtime skill persists to Dexie and survives extension restart
- [ ] `listAllSkills()` returns merged compiled + runtime skills in correct order
- [ ] Runtime skill executes via WebLLM and output validates against schema
- [ ] Compiled skill ID takes priority over duplicate runtime skill ID
- [ ] Topological sort handles runtime skills with `depends` on compiled skills
- [ ] Agent-initiated skill creation produces valid manifest
- [ ] Per-coop skill override enables/disables correctly

## Agent Messages

- [ ] `agentMessageSchema` validates all message types
- [ ] Yjs doc write -> encode -> hydrate -> read roundtrip preserves messages
- [ ] `observeAgentMessages()` fires on new message insertion
- [ ] `agent-message-received` observation trigger creates correctly
- [ ] Message fingerprint dedup prevents duplicate observations
- [ ] Message status transitions: pending -> delivered -> read
- [ ] `pruneExpiredMessages()` removes messages past expiresAt

## Cross-Coop Relay

- [ ] Agent relay topic receives and buffers messages
- [ ] Buffered messages flush on recipient subscribe
- [ ] Rate limiting enforces 10/minute per connection
- [ ] Unregistered agentIds are rejected
- [ ] Messages expire after 24h TTL
- [ ] Stats endpoint returns correct counts

## Session Key Spending

- [ ] Generalized session scope validates new action classes
- [ ] `validateSpendingLimit()` enforces per-action and daily caps
- [ ] Daily spending resets on midnight boundary
- [ ] Auto-execute threshold routes correctly (below=auto, above=queue)
- [ ] Agent session key provisioning roundtrip works in mock mode
- [ ] Replay protection prevents double-execution of spending actions
- [ ] `executeTransferErc20` builds correct calldata
- [ ] `executeCustomCall` requires proposal approval mode

## Verification

- [ ] `bun run test` — all unit tests pass
- [ ] `bun run validate smoke` — cross-package build passes
- [ ] Findings captured in `../eval/qa-report.md`
- [ ] Create `handoff/qa-claude/agent-evolution` when done
