---
feature: agent-autonomy-onchain
title: Agent autonomy and onchain reactivity QA pass 1
lane: qa
agent: codex
status: backlog
source_branch: feature/agent-autonomy-onchain
work_branch: qa/codex/agent-autonomy-onchain
qa_order: 1
handoff_in: handoff/qa-codex/agent-autonomy-onchain
handoff_out: handoff/qa-claude/agent-autonomy-onchain
updated: 2026-03-30
---

# QA Pass 1

- Validate memory persistence, event handling, sessions, permits, and policy behavior.
- Explicitly verify the hackathon-critical claims:
  - real versus mock ERC-8004 receipts
  - Green Goods automation boundaries
  - Green Goods skill-family claims match the actual registered or planned skill surface
  - new bundled skills have valid `SKILL.md` frontmatter and their instructions are actually consumed at runtime
  - ritual-driven pool kickoff stays bounded and legible
  - governance reminders use existing Coop notification surfaces rather than hidden state
  - governance reminder audience gating matches the plan:
    - trusted members get admin follow-up in `Nest`
    - authenticated non-trusted members can receive participation reminders in `Roost`
    - advisory reminder eligibility does not accidentally widen execution-capable skills
  - member-account lifecycle versus actual executor routing
  - coop-member join can surface gardener-sync work without manual bookkeeping
  - Cookie Jar language does not overclaim execution support
  - portability claims distinguish reusable instruction packs from Coop-specific execution adapters
  - FVM live-gate completeness
  - any conviction-voting claims are implementation-backed
