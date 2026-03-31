---
feature: agent-autonomy-onchain
title: Agent autonomy and onchain reactivity contracts lane
lane: contracts
agent: codex
status: ready
source_branch: feature/agent-autonomy-onchain
work_branch: codex/contracts/agent-autonomy-onchain
depends_on:
  - ../spec.md
owned_paths:
  - packages/shared/src/modules/greengoods
  - packages/shared/src/modules/policy
  - packages/shared/src/modules/session
  - packages/shared/src/modules/onchain
done_when:
  - agentActionAuthoritySchema
  - onchainReactionEventSchema
skills:
  - contracts
  - onchain
  - permissions
updated: 2026-03-30
---

# Contracts Lane

- Tighten the onchain implementation so the hackathon story matches runtime reality.
- Priorities:
  - live ERC-8004 receipt path and trust surfacing
  - authority-path cleanup for member-account versus Safe execution
  - member-join to gardener-reconcile execution path
  - session allowlist coverage for bounded Green Goods chores only
  - explicit policy boundaries for ritual-driven pool kickoff versus governance proposal drafting
  - explicit policy boundaries for reminder-only versus execution-capable governance actions
  - explicit runtime eligibility boundaries so advisory governance reminders can reach authenticated
    members without broadening action-capable Green Goods skills
  - FVM registry deployment follow-through and live gating
- Portability checklist for this lane:
  - keep new action classes narrow enough that another agent could map to them through an adapter
  - avoid merging reminder semantics and execution semantics into the same action class
  - document any Coop-only authority assumptions added for Green Goods or Cookie Jar flows
- Keep Cookie Jar or treasury automation out of the execution claim unless a real authority and
  execution path is implemented.
- Keep session, permit, and policy changes explicit and testable.
