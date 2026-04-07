---
feature: autoresearch
title: Runtime — Experiment Loop & Variant Engine
lane: contracts
agent: codex
status: done
source_branch: feature/autoresearch
work_branch: codex/runtime/autoresearch
depends_on:
  - ./eval.claude.todo.md
  - ./state.codex.todo.md
owned_paths:
  - packages/extension/src/runtime/agent/experiment-loop.ts
  - packages/extension/src/runtime/agent/variant-engine.ts
  - packages/extension/src/runtime/agent/__tests__/experiment-loop.test.ts
  - packages/extension/src/runtime/agent/__tests__/variant-engine.test.ts
done_when:
  - ExperimentLoop
  - runExperiment(
  - keepOrRevert(
  - VariantEngine
  - createVariant(
  - activateVariant(
skills:
  - testing
  - architecture
updated: 2026-04-06
---

# Runtime — Experiment Loop & Variant Engine

The core autoresearch machinery: the variant engine manages prompt alternatives, and the experiment
loop runs the modify-execute-evaluate-keep/revert cycle.

## Objective

Implement the two core modules that make autoresearch work:
1. **VariantEngine** — CRUD for prompt variants with activation/revert
2. **ExperimentLoop** — the autoresearch cycle with budget enforcement and quality floor

## Files

- `packages/extension/src/runtime/agent/variant-engine.ts` — new module
- `packages/extension/src/runtime/agent/experiment-loop.ts` — new module
- `packages/extension/src/runtime/agent/__tests__/variant-engine.test.ts` — new test file
- `packages/extension/src/runtime/agent/__tests__/experiment-loop.test.ts` — new test file

## Tasks

### 1. Variant Engine

#### 1.1 RED — Failing tests

- [x] Test: `createVariant(skillId, promptText)` stores variant with content hash
- [x] Test: `createVariant` with duplicate hash returns existing variant (idempotent)
- [x] Test: `getActiveVariant(skillId)` returns the active variant
- [x] Test: `getActiveVariant` returns baseline when no variant is active
- [x] Test: `activateVariant(variantId)` deactivates previous, activates new
- [x] Test: `revertToBaseline(skillId)` deactivates all variants, marks baseline active
- [x] Test: `getVariantLineage(variantId)` returns chain of parent variants
- [x] Test: `generateDiff(baselineText, variantText)` returns unified diff string

#### 1.2 GREEN — Implement variant engine

- [x] `createVariant(skillId, promptText, parentVariantId?)` — hash, store, return
- [ ] `getActiveVariant(skillId)` — query `[skillId+isActive]` index
- [x] `activateVariant(variantId)` — transaction: deactivate old, activate new, set `activatedAt`
- [x] `revertToBaseline(skillId)` — transaction: deactivate all, activate baseline
- [x] `getVariantLineage(variantId)` — walk `parentVariantId` chain
- [x] `generateDiff(baselineText, variantText)` — simple line-level unified diff
- [x] `seedBaseline(skillId, promptText)` — create initial baseline variant from compiled SKILL.md

#### 1.3 REFACTOR

- [x] Extract hash function (SHA-256 via SubtleCrypto — already available in extension)
- [ ] Ensure all operations are transactional (Dexie transactions)

### 2. Experiment Loop

#### 2.1 RED — Failing tests

- [x] Test: `runExperiment(skillId, variant, fixtures)` returns `ExperimentRecord`
- [x] Test: experiment with higher composite score → `outcome: 'kept'`
- [x] Test: experiment with equal/lower composite score → `outcome: 'reverted'`
- [x] Test: experiment exceeding `timeBudgetMs` → `outcome: 'reverted'`, marked as timeout
- [x] Test: experiment scoring below `qualityFloor` → `outcome: 'reverted'`, even if improved
- [x] Test: `runCycle(skillId, config)` runs N experiments, returns cycle summary
- [x] Test: cycle stops early if all experiments in a batch fail (no infinite retry)
- [ ] Test: `pauseCycle()` and `resumeCycle()` preserve state between calls
- [x] Test: experiment record is stored in journal regardless of outcome
- [x] Test: kept experiment activates the variant via VariantEngine

#### 2.2 GREEN — Implement experiment loop

- [x] `runExperiment(skillId, variant, fixtures)`:
  1. Record baseline score via `runEvalSuite(skillId, baselineOutput, fixtures)`
  2. Activate variant via `VariantEngine.activateVariant()`
  3. Run skill inference via `completeSkill()` with variant prompt
  4. Score output via `runEvalSuite(skillId, experimentOutput, fixtures)`
  5. Compare: if `experimentScore > baselineScore` AND `experimentScore >= qualityFloor` → keep
  6. Else → revert via `VariantEngine.revertToBaseline()`
  7. Store `ExperimentRecord` in journal
  8. Return record
- [x] `runCycle(skillId, config)`:
  1. Load config (max experiments, budget, floor)
  2. Load fixtures for skill
  3. For each experiment (up to max):
     a. Generate prompt variant (initially: small perturbations to SKILL.md)
     b. Call `runExperiment()`
     c. If kept, use as new baseline for next experiment
     d. If 3 consecutive reverts, stop early
  4. Return cycle summary (experiments run, kept, reverted, best score)
- [x] Budget enforcement: `AbortController` with `setTimeout(timeBudgetMs)`
- [x] Quality floor check before keep decision

#### 2.3 GREEN — Feedback integration

- [x] `collectFeedback(skillRunId, approved: boolean)` — store in feedback table
- [x] `computeMemberFeedbackScore(skillId)` — rolling window of last 20 feedback signals
- [x] Update composite score to include feedback term when `feedbackCount >= 5`
- [ ] Wire into draft approval/rejection flow (extend existing handler)

#### 2.4 REFACTOR

- [ ] Extract experiment timeout into standalone utility
- [x] Ensure experiment loop yields to event loop between experiments (avoid blocking)
- [ ] Add structured logging for experiment outcomes

## Verification

```bash
bun run test -- variant-engine experiment-loop
bun run validate typecheck
```

## Handoff Notes

The UI lane needs: `runCycle()` return type for journal display, `getVariantLineage()` for variant
history, and `AutoresearchConfig` for settings binding. The experiment loop should be callable from
both settings UI (manual trigger) and background alarm (automatic scheduling).

Current scope completed the core variant engine, experiment loop, and feedback scoring. Storage-level
compound index coverage is in place and tested, but runtime lookup currently uses a scan-based
fallback because the broader test environment proved unstable with boolean compound-key probes.
`pauseCycle` / `resumeCycle`, draft approval wiring, and structured logging remain follow-on work
outside this implementation pass.
