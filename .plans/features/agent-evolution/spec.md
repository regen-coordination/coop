# Agent Evolution: Self-Extension, Inter-Agent Comms, Scoped Spending

**Feature**: `agent-evolution`
**Status**: Draft
**Source Branch**: `feature/agent-evolution`
**Created**: `2026-04-05`
**Last Updated**: `2026-04-05`

## Summary

Evolve the Coop browser agent from a static 16-skill pipeline into a self-extending,
inter-coop-communicating, autonomously-spending agent. Three workstreams unlock the
capabilities Marc Andreessen described as the agent architecture breakthrough:
the agent can extend itself with new skills at runtime, coordinate with other coops'
agents over existing sync infrastructure, and execute bounded onchain actions
autonomously within session-key guardrails.

## Why Now

- The 16 compiled skills are the proof-of-concept; runtime registration is the product.
  Members and operators need domain-specific skills without waiting for extension rebuilds.
- Coops are currently isolated islands. Inter-agent messaging over Yjs is the natural
  next step — the transport (WebRTC + WebSocket + signaling) already exists.
- Session keys and permits are built but only wired for Green Goods actions.
  Generalizing scoped spending completes the autonomy loop: observe → plan → act → transact.
- AI + crypto convergence is the thesis. This feature pack makes it concrete.

## Scope

### In Scope

**Workstream 1 — Runtime Skill Registration (self-extension)**
- Runtime skill manifest format (subset of compiled SkillManifest)
- Dexie persistence in `knowledgeSkills` table (already exists, needs manifest fields)
- Merge runtime skills into harness skill selection
- Skill creation UI in the Agent tab (Roost panel)
- Agent-initiated skill creation ("extend yourself")
- Evaluation pipeline accepts runtime skill outputs

**Workstream 2 — Agent Message Passing (inter-agent comms)**
- `AgentMessage` schema in schema-agent.ts
- `coop-agent-messages-v2` Y.Map in the Yjs doc
- Intra-coop messaging (same room, same Y.Doc)
- Cross-coop messaging via signaling server topic relay
- Message observation trigger: agent reacts to incoming messages
- ERC-8004 identity verification for cross-coop senders
- Agent message inbox UI in the Agent tab

**Workstream 3 — Session-Key Scoped Spending (autonomous transactions)**
- Generalize SessionCapabilityScope beyond Green Goods action classes
- Agent-proposable spending actions (transfer, approve, custom contract calls)
- Spending limit policies: per-action, per-day, per-session caps
- Approval UX: auto-execute below threshold, queue above
- Session key provisioning flow for agent identity
- Permit integration: agent can request permits for bounded actions

### Out Of Scope

- Cloud/server-side agent execution (stays browser-only)
- Cross-chain agent actions (single chain per coop)
- Agent marketplace or skill store (future)
- Voice/multimodal agent interface
- Agent-to-human negotiation protocols
- Autonomous Safe ownership changes

## User-Facing Outcome

**Members can:**
- Create custom skills from the Agent tab ("teach the agent something new")
- See agent messages from other coops in a shared inbox
- Set spending limits for the agent and watch it execute small transactions autonomously
- Review agent-proposed transactions above their threshold before execution

**Operators can:**
- Import skill packs from URLs (already partially built via knowledge skills)
- Configure per-coop spending policies and session key scopes
- Monitor cross-coop agent activity

**What stays the same:**
- The 16 compiled skills continue working unchanged (they're the "stdlib")
- Local-first principle: all state stays in IndexedDB/Yjs until explicit publish
- Human-in-the-loop for high-stakes actions
- Passkey-first identity model

## Technical Notes

### Primary packages
- `@coop/shared` — schemas, agent module, session module, permit module, sync-core
- `packages/extension` — runtime agent (harness, registry, runners), skills UI, approval UX
- `packages/api` — signaling server cross-coop topic relay

### Shared module boundaries
- Agent module (`shared/modules/agent/`) owns skill schemas, message schemas, memory
- Session module (`shared/modules/session/`) owns capability scoping and validation
- Sync-core module (`shared/modules/sync-core/`) owns Y.Doc structure and shared keys
- Policy module (`shared/modules/policy/`) owns action approval workflows

### Key constraints
- Runtime skills must validate against `skillManifestSchema` (subset: no compiled-only fields)
- Cross-coop messages must be verifiable via ERC-8004 agent identity
- Spending actions require both session key (onchain) and permit (client-side) validation
- No new `.env` variables — use existing mode flags (onchain, session, archive)

## Decision Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Runtime skills stored in existing `knowledgeSkills` table | Table exists with URL, content, domain, triggerPatterns. Add manifest fields rather than new table |
| 2 | Runtime skills use `webllm` provider only | Heuristic requires compiled code; transformers.js needs specific model loading. WebLLM is the only provider that works with arbitrary prompts |
| 3 | Agent messages in Y.Map (not Y.Array) | Per-message field-level CRDT merge, same pattern as artifacts-v2 and members-v2 |
| 4 | Cross-coop relay via signaling topics | Signaling server already supports pub/sub topics. No new infrastructure needed |
| 5 | ERC-8004 agentId as sender identity | On-chain verifiable. Mock mode uses deterministic IDs for testing |
| 6 | Generalize SessionCapabilityScope with action class registry | Current scope is hardcoded to 4 Green Goods classes. Make it extensible |
| 7 | Dual-threshold approval: auto below, queue above | Matches existing approvalMode pattern (advisory / proposal / auto-run-eligible) |
| 8 | No new env vars | Use VITE_COOP_SESSION_MODE and VITE_COOP_ONCHAIN_MODE to gate live spending |
| 9 | Phased delivery: skills first, messages second, spending third | Skills are lowest risk (no onchain), spending is highest risk (real money) |

## Lane Split

| Lane | Agent | Expected Scope |
|------|-------|----------------|
| UI | Claude | Skill creation form, message inbox, spending approval UX, Agent tab integration |
| State | Codex | Runtime skill registry, message schemas, spending limit logic, harness integration |
| API | Codex | Cross-coop relay topics, message delivery, agent identity verification endpoints |
| Contracts | Codex | Generalized session scoping, spending limit policies, permit expansion |
| QA 1 | Claude | UX flows, agent tab behavior, approval interactions, E2E confidence |
| QA 2 | Codex | State/API/contracts regressions, session key validation, message delivery |

## Acceptance Criteria

### Workstream 1 — Runtime Skills
- [ ] Member can create a runtime skill with name, description, prompt template, and output schema
- [ ] Runtime skills appear in the harness alongside compiled skills
- [ ] Agent can propose and create new skills based on observation context
- [ ] Runtime skill outputs are validated by the eval pipeline
- [ ] Skills persist across extension restarts (Dexie)
- [ ] Per-coop skill overrides work (enable/disable per coop)

### Workstream 2 — Agent Messages
- [ ] Agent can send a message to another agent in the same coop
- [ ] Agent can send a message to an agent in a different coop (cross-coop relay)
- [ ] Incoming messages trigger agent observations
- [ ] Messages are displayed in the Agent tab inbox
- [ ] Cross-coop messages include verifiable ERC-8004 sender identity
- [ ] Messages sync via Yjs (offline-capable, CRDT merge)

### Workstream 3 — Scoped Spending
- [ ] Operator can configure spending limits (per-action, per-day caps)
- [ ] Agent can auto-execute actions below threshold without human approval
- [ ] Actions above threshold queue for member approval with clear UX
- [ ] Session keys are provisioned for agent identity (not just member accounts)
- [ ] Spending actions work in both mock and live onchain modes
- [ ] Replay protection prevents double-execution

## Validation Plan

- **Unit**: Runtime skill creation, manifest validation, message serialization, spending limit enforcement
- **Integration**: Harness runs with mixed compiled+runtime skills, Yjs message sync between two docs, session key scoping validation
- **E2E**: `core-loop` suite extended with runtime skill creation, message send/receive, spending approval flow
- **Manual**: Cross-coop messaging between two browser profiles, live spending on Sepolia testnet

## References

- **Podcast**: Marc Andreessen on Latent Space — agent = LLM + shell + filesystem + markdown + cron
- **Existing infrastructure**: `knowledgeSkills` table, `knowledge.ts` import system, Yjs sync-core, ERC-8004 registry, Safe7579 session keys, policy action bundles
- **Related plans**: `.plans/features/next-gen-model-readiness/` (model portability), `.plans/features/agent-autonomy-onchain/` (if exists)
- **Open questions**:
  - Should runtime skills have a "confidence floor" below which they're auto-disabled?
  - Should cross-coop messages be encrypted end-to-end (beyond transport encryption)?
  - What's the maximum session key duration before mandatory re-approval?
