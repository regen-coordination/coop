---
feature: ui-quality-hardening
title: UI quality hardening polish lane
lane: ui
agent: claude
status: ready
source_branch: refactor/ui-quality-hardening
work_branch: claude/ui/ui-quality-hardening
depends_on:
  - ../spec.md
skills:
  - ui
  - react
  - accessibility
updated: 2026-03-26
---

# UI Lane

- Focus on the remaining UI quality gaps only:
  - stabilize or extend current popup and sidepanel visual snapshots where recent UI work has drifted
  - clean token drift in existing CSS and verify with `scripts/lint-tokens.ts`
  - make only small supporting component or layout edits needed to keep screenshots and tokens honest
- Do not reopen already-finished infra work such as:
  - the visual test harness
  - the token lint script
  - the extension catalog
  - the `SidepanelApp.tsx` split
