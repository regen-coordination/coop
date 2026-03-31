---
feature: hackathon-release-readiness
title: Hackathon release extension polish lane
lane: ui
agent: claude
status: blocked
source_branch: main
work_branch: claude/ui/hackathon-release-readiness
depends_on:
  - ../spec.md
  - state.codex.todo.md
  - api.codex.todo.md
tags:
  - Polish
skills:
  - ui
  - react
  - accessibility
handoff_out: handoff/qa-codex/hackathon-release-readiness
updated: 2026-03-30
---

# UI Lane

## Category

Polish.

## Objective

Only after the setup and sync lanes are stable, make the extension experience feel crisp, legible,
and demo-ready without reopening shared logic or network behavior.

## Files

- `packages/extension/src/views/Sidepanel/tabs/ChickensTab.tsx`
- `packages/extension/src/views/Sidepanel/cards.tsx`
- `packages/extension/src/views/Sidepanel/tabs/RoostTab.tsx`
- `packages/extension/src/views/Popup/PopupHomeScreen.tsx`
- directly-related CSS only

## Tasks

- [ ] Finalize Chickens so the synthesis/review path feels obvious and user-friendly.
- [ ] Use preview images and favicons where the state lane makes them safely available.
- [ ] Optimize Roost for action and exploration without letting it become a second settings panel.
- [ ] Make the home chicken more playful with restrained motion, tooltips, and light sound cues if
      they remain tasteful and low-risk.
- [ ] Leave a short defer list for any non-blocking visual ideas that should not delay release.

## Verification

- [ ] smallest relevant extension build
- [ ] browser check of changed UI surfaces
- [ ] `bun run validate:core-loop` if the primary extension workflow changes materially

## Handoff Notes

- Keep file ownership tight. Do not reopen state/api/contracts files without an explicit handoff.
- Hand off to Codex QA only after the UI is visually checked and any safe defers are documented.
