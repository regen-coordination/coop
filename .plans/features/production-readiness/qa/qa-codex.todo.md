---
feature: production-readiness
title: Production readiness QA pass 1
lane: qa
agent: codex
status: blocked
source_branch: main
work_branch: qa/codex/production-readiness
qa_order: 1
handoff_in: handoff/qa-codex/production-readiness
handoff_out: handoff/qa-claude/production-readiness
updated: 2026-03-27
---

# QA Pass 1

- Validate that the staged launch bar is technically honest:
  - lint
  - deterministic targeted tests
  - coverage integrity
  - build and store readiness
- Record whether the feature is ready for Claude UI review or still blocked by engineering issues.

## Result

- `bun run lint` is green.
- Targeted popup, sidepanel, app, runtime, and shared test regressions found during stabilization were repaired.
- `bun run test:coverage` completed all assertions but failed the global threshold after widening the measured scope to release-critical UI.
- No Claude handoff:
  - the staged launch gate is still red
  - UI polish should not mask a coverage shortfall on shipped surfaces
- Next required closure work:
  - add release-critical tests for app hooks and sidepanel surfaces until the broadened coverage scope meets the current threshold
  - rerun build, store-readiness, and production-readiness after the coverage gate is green
