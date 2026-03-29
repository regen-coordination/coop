---
feature: <feature-slug>
title: <Feature Title> state lane
lane: state
agent: codex
status: backlog
source_branch: <source-branch>
work_branch: codex/state/<feature-slug>
depends_on:
  - ../spec.md
skills:
  - state-logic
  - shared
  - storage
updated: <YYYY-MM-DD>
---

# State Lane

## Objective

Describe the shared state, runtime, storage, and orchestration changes Codex should own.

## Files

- `packages/shared/...`
- `packages/extension/src/runtime/...`
- `packages/extension/src/background/...`

## Tasks

- [ ] Update schemas/types first
- [ ] Implement state transitions and persistence behavior
- [ ] Add or update unit/integration coverage
- [ ] Note any message-contract changes

## Verification

- [ ] Appropriate validation tier was run
- [ ] Changed state paths are covered by tests

## Handoff Notes

Risks or edge cases QA should target.
