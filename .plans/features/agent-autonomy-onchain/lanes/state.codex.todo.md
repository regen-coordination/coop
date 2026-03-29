---
feature: agent-autonomy-onchain
title: Agent autonomy and onchain reactivity state lane
lane: state
agent: codex
status: ready
source_branch: feature/agent-autonomy-onchain
work_branch: codex/state/agent-autonomy-onchain
depends_on:
  - ../spec.md
skills:
  - shared
  - state-logic
  - storage
updated: 2026-03-26
---

# State Lane

- Wire human review feedback into agent memory.
- Add observation triggers that make automation stateful rather than purely heuristic.
- Prefer bounded slices that can be verified with targeted shared/runtime tests.
