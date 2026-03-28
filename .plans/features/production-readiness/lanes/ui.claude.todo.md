---
feature: production-readiness
title: Production readiness UI polish lane
lane: ui
agent: claude
status: backlog
source_branch: main
work_branch: claude/ui/production-readiness
depends_on:
  - ../spec.md
  - state.codex.todo.md
skills:
  - ui
  - react
  - accessibility
updated: 2026-03-27
---

# UI Lane

- Scope is limited to shipped release surfaces:
  - popup capture and review flows
  - screenshot review dialog clarity
  - Chickens and Sidepanel information hierarchy
  - spacing, typography, tokens, and accessibility polish
- Claude should not reopen infra, coverage policy, or live-rails contract work unless a UI issue
  reveals a real launch blocker.
- Exit with:
  - a concise UI acceptance checklist in `../qa/qa-claude.todo.md`
  - any safe-to-defer polish items called out explicitly
