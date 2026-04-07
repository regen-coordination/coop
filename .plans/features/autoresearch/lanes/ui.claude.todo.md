---
feature: autoresearch
title: UI — Settings Panel & Experiment Journal
lane: ui
agent: claude
status: backlog
source_branch: feature/autoresearch
work_branch: claude/ui/autoresearch
depends_on:
  - ./runtime.codex.todo.md
owned_paths:
  - packages/extension/src/views/Sidepanel/
done_when:
  - AutoresearchSettings
  - ExperimentJournal
skills:
  - design
  - react
  - ui-compliance
updated: 2026-04-06
---

# UI — Settings Panel & Experiment Journal

Operator-facing controls for autoresearch: per-skill toggles, budget configuration, and a browsable
experiment journal.

## Objective

Add autoresearch controls to the Nest tab (settings area) and an experiment journal viewer. Follows
existing Sidepanel patterns — compact cards, progressive disclosure, Coop design language.

## Files

- `packages/extension/src/views/Sidepanel/tabs/NestTab.tsx` — add autoresearch section
- `packages/extension/src/views/Sidepanel/components/AutoresearchSettings.tsx` — new component
- `packages/extension/src/views/Sidepanel/components/ExperimentJournal.tsx` — new component
- `packages/extension/src/views/Sidepanel/components/__tests__/autoresearch-ui.test.tsx` — new test

## Tasks

### 1.1 RED — Failing tests for settings component

- [ ] Test: renders toggle for each WebLLM skill
- [ ] Test: toggle calls `updateConfig(skillId, { enabled })` on change
- [ ] Test: budget slider updates `maxExperimentsPerCycle`
- [ ] Test: quality floor input validates range 0.0-1.0
- [ ] Test: "Run Now" button calls `runCycle()` for selected skill
- [ ] Test: disabled state shown when no WebLLM skills available

### 1.2 RED — Failing tests for journal component

- [ ] Test: renders experiment cards sorted by createdAt descending
- [ ] Test: kept experiments show green indicator, reverted show neutral
- [ ] Test: card shows skill name, composite score, delta, and duration
- [ ] Test: expanding card reveals prompt diff and fixture results
- [ ] Test: empty state shows "No experiments yet" message
- [ ] Test: pagination loads more records on scroll

### 1.3 GREEN — Implement settings component

- [ ] `AutoresearchSettings` component with per-skill config
- [ ] Toggle switch for enable/disable (reuse existing toggle pattern)
- [ ] Budget controls: experiments per cycle (1-20 range), time budget (10s-5min)
- [ ] Quality floor: numeric input with 0.0-1.0 validation
- [ ] "Run Now" button with loading state during cycle execution
- [ ] Current quality trend indicator per skill (from existing trend tracking)

### 1.4 GREEN — Implement journal component

- [ ] `ExperimentJournal` component with card list
- [ ] Card layout: skill badge, score bar, delta chip, timestamp
- [ ] Expandable detail: unified diff view, per-fixture scores, duration
- [ ] Filter by skill and outcome (kept/reverted/all)
- [ ] Scroll-based pagination (load 20 at a time)
- [ ] Empty state with explanation of what autoresearch does

### 1.5 GREEN — Wire into Nest tab

- [ ] Add "Autoresearch" section to NestTab (collapsed by default)
- [ ] Settings and journal as sub-sections within
- [ ] Respect existing Nest tab layout patterns

### 1.6 REFACTOR

- [ ] Extract shared card styles to global.css if reusable
- [ ] Ensure WCAG 2.1 AA compliance (contrast, focus indicators, screen reader labels)
- [ ] Verify responsive layout at sidepanel widths

## Verification

```bash
bun run test -- autoresearch-ui
bun run validate typecheck
```

## Handoff Notes

QA pass 2 should verify: settings persist across sidepanel close/reopen, journal loads correctly
after running experiments, and "Run Now" provides clear feedback during execution.
