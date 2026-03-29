---
feature: docs-drift
title: Docs drift maintenance Claude lane
lane: docs
agent: claude
status: ready
source_branch: chore/docs-drift
work_branch: claude/docs/docs-drift
depends_on:
  - ../spec.md
skills:
  - docs
  - ui
updated: 2026-03-26
---

# Docs Lane

- Review user-facing docs for stale UI descriptions, drift, or hallucinated behavior.
- Correct only what the codebase or current plans justify.
