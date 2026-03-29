---
feature: <feature-slug>
title: <Feature Title> UI lane
lane: ui
agent: claude
status: backlog
source_branch: <source-branch>
work_branch: claude/ui/<feature-slug>
depends_on:
  - ../spec.md
skills:
  - ui
  - react
  - accessibility
handoff_out: handoff/qa-codex/<feature-slug>
updated: <YYYY-MM-DD>
---

# UI Lane

## Objective

Describe the user-interface slice Claude should own.

## Files

- `packages/extension/...`
- `packages/app/...`

## Tasks

- [ ] Audit existing UI patterns/components before adding new ones
- [ ] Implement the UI changes
- [ ] Add or update UI tests where appropriate
- [ ] Document any UX tradeoffs

## Verification

- [ ] Appropriate validation tier was run
- [ ] Any visual changes were checked in browser

## Handoff Notes

What the first QA lane should pay attention to after UI work is done.
