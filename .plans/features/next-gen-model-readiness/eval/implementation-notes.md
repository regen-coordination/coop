# Implementation Notes

## Phase Dependencies

```
Phase 1 (docs lane — prompt surface) ──┐
                                       ├── Phase 3 (api lane — agent pipeline) ──┐
Phase 2 (state lane — eval pipeline) ──┘                                        ├── Phase 4 (contracts lane — dev dispatch)
                                       ──────────────────────────────────────────┘
```

- Phases 1 (docs lane) and 2 (state lane) are fully independent — can execute in parallel
- Phase 3 (api lane) depends on Phase 1 (context cleanup clarifies constraint surface for tool descriptions)
- Phase 4 (contracts lane) depends on Phases 2 (eval consolidation provides the `release` gate for dispatch monitoring) and 3 (tool definitions inform dispatch metadata)

**Lane mapping**: docs=prompt-surface, state=eval-pipeline, api=agent-pipeline, contracts=dev-dispatch (mapped to valid Planning OS lane names)

## Sizing Estimates

| Phase | Lane | Steps | Files Modified | New Files |
|-------|------|-------|---------------|-----------|
| 1 | prompt-surface | 7 | ~25 (mostly .claude/) | 0 |
| 2 | eval-pipeline | 6 | ~12 (validate.ts, package.json, 8 e2e specs) | 1 (e2e/helpers.cjs) |
| 3 | agent-pipeline | 8 | ~6 existing + new files | ~5 (tools.ts, tool defs, autonomous runner, registry, test) |
| 4 | dev-dispatch | 6 | 1 (scripts/plans.ts) | 0 |

## Risk Mitigations

### Phase 1: Prompt surface reduction
- **Risk**: Removing a constraint that matters
- **Mitigation**: Cross-reference every removal against rules/ files and hooks. Hooks provide mechanical enforcement that survives prompt changes.
- **Rollback**: Git history preserves every line. Individual files can be restored.

### Phase 2: Eval consolidation
- **Risk**: E2E specs interfere when run together
- **Mitigation**: Check Playwright config for project isolation. Run full suite before and after. Add `--workers=1` if needed.
- **Rollback**: Legacy suites (`production-readiness`, `full`) are preserved, not deleted.

### Phase 3: Agent pipeline
- **Risk**: Breaking the working 0.5B pipeline
- **Mitigation**: Feature flag (`VITE_COOP_AGENT_MODE=legacy` default). Legacy path is renamed, not modified. All existing tests must pass on legacy mode.
- **Rollback**: Remove the flag or set to `legacy`. Zero impact on production.

### Phase 4: Dev dispatch
- **Risk**: Dispatch loop runs unintended work
- **Mitigation**: `--dry-run` flag required for first iteration. Dispatch is advisory, not automatic.
- **Rollback**: All additions are new commands. Existing `bun run plans` commands unchanged.

## Measurement Plan

### Before starting (baseline)
```bash
wc -l .claude/context/*.md .claude/skills/*/SKILL.md .claude/rules/tests.md .claude/skills/index.md CLAUDE.md
bun run validate production-readiness --dry-run | wc -l
wc -l packages/extension/src/runtime/agent-runner-skills.ts packages/extension/src/runtime/agent-output-handlers.ts
```

### After each phase
- Phase 1: `wc -l` on all modified files. Target: total < 3,500
- Phase 2: `bun run validate release --dry-run` shows 7-8 steps. `grep -r "withTimeout" e2e/*.spec.cjs` returns 0.
- Phase 3: `bun run test` with both modes. Tool count = 11.
- Phase 4: `bun run plans queue --json | jq length` returns lane count.
