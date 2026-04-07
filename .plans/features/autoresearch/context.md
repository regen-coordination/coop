# Autoresearch — Context

## Existing References

- `.plans/features/agent-knowledge-sandbox/spec.md` — Phase 6 reasoning traces feed experiment outcomes
- `.plans/features/agent-evolution/spec.md` — WS1 runtime skill registration enables variant hot-swap
- `docs/reference/` — Agent architecture docs (if present)
- [karpathy/autoresearch README](https://github.com/karpathy/autoresearch) — Pattern reference

## Relevant Codepaths

| File | Lines | Purpose |
|------|-------|---------|
| `packages/extension/src/runtime/agent/eval.ts` | 1-296 | Fixture loading, assertion engine, quality scoring |
| `packages/extension/src/runtime/agent/quality.ts` | 1-251 | 9 specialized confidence scorers + `computeOutputConfidence()` |
| `packages/extension/src/runtime/agent/config.ts` | 1-69 | Quality trend tracking, stall detection, window constants |
| `packages/extension/src/runtime/agent/runner-skills.ts` | 280-334 | Quality threshold gating, skill failure on low confidence |
| `packages/extension/src/runtime/agent/runner-skills-completion.ts` | * | `completeSkill()` — prompt assembly → inference → output |
| `packages/extension/src/runtime/agent/runner-skills-prompt.ts` | 1-265 | Skill prompt composition with context layers |
| `packages/extension/src/runtime/agent/registry.ts` | 1-91 | Skill discovery, manifest validation, SKILL.md loading |
| `packages/extension/src/runtime/agent/models.ts` | 1-735 | Three-tier inference: transformers, webllm, heuristic |
| `packages/shared/src/contracts/schema-agent.ts` | 155-179, 334-335 | `qualityThreshold`, `maxEvaluatorRetries`, evaluation schemas |
| `packages/extension/src/skills/*/eval/*.json` | * | Existing eval fixtures (opportunity-extractor, capital-formation-brief, etc.) |
| `packages/extension/src/skills/*/skill.json` | * | Skill manifests with quality fields |
| `packages/extension/src/skills/*/SKILL.md` | * | Prompt templates (the editable asset) |

## Constraints

### Architectural
- All experiments run in-browser (IndexedDB + existing inference providers)
- Eval harness must be pure (no inference calls during scoring)
- Variant engine must not modify compiled skill files on disk
- Experiment loop must yield to live observation processing

### UX
- Autoresearch is invisible to members during normal use
- Experiment journal is an operator/power-user feature
- No notifications for individual experiments (only for significant improvements)

### Testing
- Eval fixtures must be frozen (deterministic baseline)
- Unit tests for scoring must assert exact values (no floating-point tolerance > 0.001)
- Integration tests must verify keep/revert correctness

### Performance
- Experiment inference uses the same provider as live skills (no additional model loading)
- Journal pruning prevents unbounded IndexedDB growth
- Eval scoring must complete in < 50ms per fixture (pure computation)

## Notes for Agents

### Claude (eval, runtime, ui lanes)
- Start with eval harness — this is the "prepare.py" and must be bulletproof before the loop works
- Eval fixtures should be derived from real member-approved outputs, not synthetic
- Experiment loop must be interruptible — background service worker can be killed at any time
- Settings UI should reuse existing panel patterns from Nest tab

### Codex (state lane)
- Schemas go in `@coop/shared` contracts alongside existing agent schemas
- Dexie tables extend `createCoopDb()` — follow existing table patterns
- Variant storage needs content-addressable keys (hash of prompt text)
- Experiment journal queries must be indexed by skillId + createdAt

## Missing Infrastructure

| What | Where | Notes |
|------|-------|-------|
| `ExperimentRecord` schema | `schema-agent.ts` | New Zod schema in existing contracts file |
| `SkillVariant` schema | `schema-agent.ts` | New Zod schema for prompt variants |
| `AutoresearchConfig` schema | `schema-agent.ts` | Per-skill enable/disable + budget + floor |
| `skillVariants` Dexie table | `storage` module | New table in existing database |
| `experimentRecords` Dexie table | `storage` module | New table in existing database |
| `runEvalSuite()` function | `eval.ts` | Extend existing eval with composite scoring |
| `ExperimentLoop` class | New file in `runtime/agent/` | Core autoresearch loop logic |
| `VariantEngine` module | New file in `runtime/agent/` | Variant CRUD + activation + revert |
| Experiment journal UI | `views/Sidepanel/` | New section in settings or dedicated tab |
| Member feedback collection | `runner-skills.ts` | Hook into existing draft approval/rejection flow |
