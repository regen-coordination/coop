# Autoresearch: Self-Optimizing Agent Skills

- **Slug**: `autoresearch`
- **Branch**: `feature/autoresearch`
- **Created**: 2026-04-06
- **Updated**: 2026-04-06

## Summary

Coop's 16-skill agent pipeline uses hand-tuned prompts and fixed confidence thresholds. Autoresearch
introduces an autonomous optimization loop — modeled on Karpathy's autoresearch pattern — that
self-improves skill prompts and quality thresholds by running experiments against frozen eval
fixtures, keeping only improvements and reverting regressions. The human's role shifts from prompt
engineering to evaluation design: defining what "better" means for each skill.

## Why Now

- Existing eval fixture system (`eval.ts`) and quality scoring (`quality.ts`) provide the
  `prepare.py` equivalent — the immutable yardstick
- Runtime skill registration (agent-evolution WS1) gives us the editable asset — SKILL.md variants
  that can be swapped without rebuilding
- Quality trend tracking (`config.ts`) already detects degradation — we just need to close the loop
  and auto-revert degrading changes
- `qualityThreshold` and `maxEvaluatorRetries` are defined in schemas but not fully utilized —
  autoresearch gives them purpose
- Member approval/rejection signals exist but don't feed back into skill improvement

## Scope

### In Scope

- Eval harness: frozen observation fixtures per skill with deterministic scoring
- Variant engine: prompt variant generation, tracking, and diff management
- Experiment loop: modify-run-evaluate-keep/revert cycle with experiment journal
- Metric pipeline: composite scoring (structural + semantic + member feedback)
- Quality threshold learning: auto-tune `qualityThreshold` per skill from experiment data
- Integration with existing quality trend tracking
- Validation suite: `unit:autoresearch` and `e2e:autoresearch`
- Works entirely in-browser (no server dependency)

### Out of Scope

- LLM-as-judge evaluation (adds cloud dependency; future phase)
- Cross-skill optimization (optimizing skill ordering or dependency graph)
- Modifying `prepare.py`-equivalent files (eval.ts, quality.ts) during experiments
- Production skill replacement without member approval
- Multi-agent collaborative autoresearch (Karpathy's SETI@home vision)
- Optimizing heuristic skills (rule-based; no prompt to optimize)

## User-Facing Outcome

### For Members

- Agent skill outputs gradually improve in quality over time
- No change to existing review flow — autoresearch runs silently in background
- Members can view experiment history (which prompts were tried, which stuck)
- Approval/rejection feedback now contributes to skill improvement

### For Operators

- New settings panel: enable/disable autoresearch per skill
- Experiment budget controls (max experiments per cycle, time budget per experiment)
- Quality floor: minimum threshold below which experiments are auto-reverted
- Experiment journal: browsable log of all experiments with metrics

## Technical Notes

### Three Primitives Mapping

| Autoresearch Primitive | Coop Equivalent | Location |
|------------------------|-----------------|----------|
| **Editable Asset** (`train.py`) | SKILL.md prompt template | `skills/*/SKILL.md` |
| **Scalar Metric** (`val_bpb`) | Composite eval score (0.0-1.0) | `eval.ts` + `quality.ts` |
| **Time-Boxed Cycle** (5 min) | Fixed inference budget per experiment | Configurable per skill |

### TDD Red-Green-Eval Flow

The autoresearch loop follows strict TDD discipline at the experiment level:

```
RED:   Define eval fixtures with assertions that set the quality bar
       (frozen observations + expected output shape + quality thresholds)

GREEN: Run experiment loop — generate prompt variants, execute against
       fixtures, score outputs. Keep variants that pass all assertions
       and improve composite score. Revert variants that regress.

EVAL:  Validate improvements transfer to live observations (not just
       fixtures). Member approval rate is the ultimate ground truth.
       If live performance degrades, revert to last known-good variant.
```

At the implementation level, each phase uses RED-GREEN-REFACTOR:

```
RED:    Write failing tests for the new capability
GREEN:  Minimal implementation to pass tests
REFACTOR: Clean up without changing behavior
```

### Eval Score Composition

```
compositeScore = 0.2 * schemaCompliance    (existing: Zod validation)
               + 0.3 * structuralScore     (existing: eval.ts assertions)
               + 0.3 * semanticScore       (existing: word count, regex)
               + 0.2 * memberFeedbackScore (new: approval/rejection rate)
```

For skills without member feedback history, the last term is replaced by
`confidenceDelta` (improvement over baseline).

### Experiment Journal

Each experiment is a record, not a git commit (we're in-browser, no git):

```typescript
ExperimentRecord {
  id: string
  skillId: string
  variantId: string
  baselineVariantId: string
  promptDiff: string           // unified diff of SKILL.md changes
  fixtureResults: FixtureResult[]
  compositeScore: number
  baselineScore: number
  delta: number
  outcome: 'kept' | 'reverted' | 'pending'
  duration: number
  createdAt: number
}
```

### Packages & Boundaries

| Package | Changes |
|---------|---------|
| `@coop/shared` | `ExperimentRecord` schema, `AutoresearchConfig` schema |
| `extension` | Experiment loop runtime, variant engine, eval harness, settings UI |
| No new packages | Everything fits in existing structure |

### Constraints

- **Browser-only**: All experiments run in-browser via existing inference providers
- **No eval modification**: Eval fixtures and scoring functions are immutable during experiments
- **No skill manifest modification**: Experiments change prompt text only, never manifest fields
- **Budget-bounded**: Each experiment has a wall-clock budget; exceeding it counts as failure
- **Quality floor**: Composite score can never drop below a configured minimum
- **Offline-capable**: Experiments run locally, no network dependency

## Decision Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Prompt text is the editable asset, not skill manifests | Manifests control execution gating; prompts control output quality. Autoresearch optimizes quality. |
| 2 | Composite score (not single metric) as scalar | Single metrics get gamed (Goodhart's Law). Composite balances structure, semantics, and member signal. |
| 3 | Experiment records in IndexedDB, not git | Browser-first constraint. Git not available in extension runtime. |
| 4 | Fixed eval fixtures, not live observations | Live observations change over time; fixed fixtures ensure fair A/B comparison across experiments. |
| 5 | Member feedback weighted at 0.2, not higher | Feedback is sparse and delayed; over-weighting would make the loop too slow to converge. |
| 6 | WebLLM skills only (initially) | Transformers.js skills have deterministic outputs; heuristic skills have no prompt. Only WebLLM skills have optimizable prompts. |
| 7 | Runtime skill variants, not compiled | Runtime registration (agent-evolution WS1) enables hot-swapping without rebuild. |
| 8 | Quality floor prevents catastrophic regression | Without a floor, the loop could explore aggressively and deploy a broken variant. |
| 9 | No LLM-as-judge in v1 | Adds cloud dependency and latency. Structural + semantic assertions cover most quality signals. Future phase. |
| 10 | Experiment budget is configurable per skill | Some skills are fast (tab-router), some slow (capital-formation-brief). One-size budget wastes time or cuts short. |

## Lane Split

| Lane | Agent | Expected Scope |
|------|-------|---------------|
| `state` | codex | Schemas, Dexie tables, experiment record CRUD, variant storage |
| `eval` | claude | Eval harness extensions, fixture authoring, composite scoring |
| `runtime` | codex | Experiment loop, variant engine, keep/revert logic, budget enforcement |
| `ui` | claude | Settings panel, experiment journal viewer |
| `qa-pass-1` | codex | State + schema validation, unit test coverage |
| `qa-pass-2` | claude | E2E experiment loop, UX review |

## Acceptance Criteria

### Phase 1 — Eval Harness (RED)
- [ ] Frozen observation fixtures exist for all WebLLM skills (3 minimum per skill)
- [ ] `runEvalSuite(skillId, output)` returns composite score
- [ ] Composite score matches expected range for known-good outputs (golden tests)
- [ ] Composite score drops measurably for degraded outputs (regression tests)
- [ ] Eval harness is fully deterministic (same input = same score)
- [ ] No eval code calls any inference provider (pure scoring)

### Phase 2 — Variant Engine (GREEN infrastructure)
- [ ] `SkillVariant` Dexie table stores prompt text + metadata
- [ ] `createVariant(skillId, promptDiff)` creates a new variant
- [ ] `activateVariant(variantId)` swaps the active prompt for a skill
- [ ] `revertToBaseline(skillId)` restores original SKILL.md
- [ ] Variants are per-coop (different coops can have different active variants)
- [ ] Variant diffs are human-readable

### Phase 3 — Experiment Loop (GREEN core)
- [ ] `runExperiment(skillId, variant, fixtures)` executes and scores
- [ ] Keep/revert decision based on composite score delta
- [ ] Experiment journal records all attempts (kept and reverted)
- [ ] Budget enforcement: experiments exceeding wall-clock limit are killed and marked failed
- [ ] Quality floor enforcement: variants scoring below floor are auto-reverted
- [ ] Loop runs N experiments per cycle (configurable, default 5)
- [ ] Loop is interruptible (can pause/resume between experiments)

### Phase 4 — Feedback Integration
- [ ] Member approval/rejection stored as feedback signal per skill run
- [ ] `memberFeedbackScore` computed from rolling window of feedback
- [ ] Composite score includes feedback term when data is available
- [ ] Feedback-weighted experiments converge toward member-preferred outputs

### Phase 5 — Integration & Settings
- [ ] Autoresearch toggle in agent settings (per-skill enable/disable)
- [ ] Experiment budget controls (max experiments, time budget)
- [ ] Quality floor configuration
- [ ] Experiment journal viewable in settings panel
- [ ] Autoresearch respects observation priority (doesn't starve live processing)

## Validation Plan

### Unit Tests
- [ ] `eval-harness.test.ts`: Composite scoring correctness, fixture loading, determinism
- [ ] `variant-engine.test.ts`: CRUD, activation, revert, diff generation
- [ ] `experiment-loop.test.ts`: Keep/revert logic, budget enforcement, quality floor
- [ ] `feedback-integration.test.ts`: Rolling feedback score, composite weight blending
- [ ] `experiment-journal.test.ts`: Record creation, querying, pruning

### Integration Tests
- [ ] Full experiment cycle: create variant → run fixtures → score → keep/revert
- [ ] Multi-experiment sequence: verify monotonic improvement in journal
- [ ] Quality floor trigger: verify auto-revert when score drops below floor
- [ ] Concurrent safety: autoresearch doesn't interfere with live skill execution

### E2E Tests
- [ ] Settings toggle enables/disables autoresearch for a skill
- [ ] Experiment journal displays entries after running experiments
- [ ] Quality floor prevents deployment of degraded variant

### Validation Suites
- `unit:autoresearch` — All unit + integration tests
- `e2e:autoresearch` — Settings UI + journal E2E tests

## Parallelization Map

| Week | Claude | Codex |
|------|--------|-------|
| 1 | Eval harness: fixture authoring + composite scoring | State: schemas + Dexie tables + variant CRUD |
| 2 | UI: settings panel + journal viewer (mock data) | Runtime: variant engine + experiment loop |
| 3 | UI: wire to runtime APIs + feedback integration | Runtime: budget enforcement + quality floor + feedback |
| 4 | QA pass 2: E2E + UX review | QA pass 1: state + runtime + schema validation |

## Integration Risks

| Risk | Phase | Severity | Mitigation |
|------|-------|----------|------------|
| Eval fixtures don't capture real quality signals | 1 | High | Validate fixtures against member-approved outputs before freezing |
| Prompt variants cause inference failures | 3 | Medium | JSON repair pipeline already handles malformed output; budget kill prevents hangs |
| Autoresearch starves live observation processing | 5 | Medium | Priority queue: live observations always preempt experiments |
| Quality floor set too high prevents any exploration | 3 | Low | Default floor at 0.3 (below current worst-case); configurable |
| Member feedback too sparse for meaningful signal | 4 | Medium | Fall back to confidence delta when feedback count < 5 |
| Experiment journal grows unbounded | 3 | Low | Prune reverted experiments older than 30 days |

## Dependencies

- **Agent Evolution WS1** (runtime skill registration): Required for hot-swapping prompt variants
  without rebuild. If not yet available, Phase 2 can use a simpler in-memory variant store as
  interim solution.
- **Agent Knowledge Sandbox Phase 6** (reasoning traces): Optional. When available, experiment
  outcomes feed into precedent system for cross-skill learning.

## References

- [karpathy/autoresearch](https://github.com/karpathy/autoresearch) — Canonical implementation
- [Karpathy: program.md](https://github.com/karpathy/autoresearch/blob/master/program.md) — Agent
  directive format
- Existing eval infrastructure: `packages/extension/src/runtime/agent/eval.ts`
- Existing quality scoring: `packages/extension/src/runtime/agent/quality.ts`
- Quality trend tracking: `packages/extension/src/runtime/agent/config.ts`
- Skill manifests: `packages/extension/src/skills/*/skill.json`
- Agent evolution spec: `.plans/features/agent-evolution/spec.md`
- Knowledge sandbox spec: `.plans/features/agent-knowledge-sandbox/spec.md`
