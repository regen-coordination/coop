# Implementation Notes

## Current Intent

Use this feature pack as the single orchestration board for the hackathon release push. The pack is
organized by category and by agent ownership so Claude can conduct work without overlapping Codex
lanes.

## Lane Board

| Lane File | Agent | Category | Status | Phase |
|-----------|-------|----------|--------|-------|
| `lanes/state.codex.todo.md` | Codex | bugs | in_progress | 1 |
| `lanes/api.codex.todo.md` | Codex | bugs | in_progress | 1 |
| `lanes/contracts.codex.todo.md` | Codex | bugs | in_progress | 1 |
| `lanes/docs.claude.todo.md` | Claude | documentation | in_progress | 1 and 4 |
| `lanes/ui.claude.todo.md` | Claude | polish | blocked | 2 |
| `qa/qa-codex.todo.md` | Codex | testing | blocked | 3 |
| `qa/qa-claude.todo.md` | Claude | testing | blocked | 3 |

## Claude -> Codex Execution Pattern

1. Discover runnable lanes:

```bash
bun run plans queue --agent codex --json
bun run plans queue --agent claude --json
bun run plans queue --agent claude --lane docs --json
```

Filter those results to the `hackathon-release-readiness` feature only. Do not start unrelated
ready items from other feature packs.

2. Run Codex with `gpt-5.4` and lane-specific effort:

```bash
cat .plans/features/hackathon-release-readiness/lanes/state.codex.todo.md | codex exec -C /Users/afo/Code/greenpill/coop -m gpt-5.4 -c model_reasoning_effort="high" -
cat .plans/features/hackathon-release-readiness/lanes/api.codex.todo.md | codex exec -C /Users/afo/Code/greenpill/coop -m gpt-5.4 -c model_reasoning_effort="high" -
cat .plans/features/hackathon-release-readiness/lanes/contracts.codex.todo.md | codex exec -C /Users/afo/Code/greenpill/coop -m gpt-5.4 -c model_reasoning_effort="xhigh" -
cat .plans/features/hackathon-release-readiness/qa/qa-codex.todo.md | codex exec -C /Users/afo/Code/greenpill/coop -m gpt-5.4 -c model_reasoning_effort="xhigh" -
```

3. Treat `medium` as out of scope for this sprint. Use `high` for standard implementation work and
   `xhigh` only for live-rails, privacy/security, and final release gating.

## Mandatory Orchestration Rules

1. Use lane files as the source of truth, not memory or ad hoc task splitting.
2. Keep one active implementation agent per lane.
3. Run each active lane on its own `work_branch` in an isolated worktree or workspace.
4. Do not start blocked lanes early.
5. Update lane statuses as the sprint progresses.
6. Write validation findings and residual risks into `qa-report.md`.
7. If time pressure forces cuts, cut strategy and non-blocking polish before bug, testing, or
   install-path work.
8. If Codex fails due to quota, billing, auth, or rate-limit issues, stop Codex orchestration
   immediately, report the blocked lane, and wait for explicit user direction before resuming.
9. Assume the human operator is running the dev environment in a separate terminal.
10. Use that running dev environment for inspection and validation, but do not start or take over a
    long-lived dev process unless explicitly asked.
11. Pause for explicit human validation before crossing major phase boundaries.

## Strategy And UX Decisions Locked For This Pack

- Public narrative stays Coop-native and product-first.
- Standards backing should cite the Durgadas Coordination Structural Integrity Suite:
  https://github.com/durgadasji/standards
- The four strategic bets to describe after release are fixed:
  1. React Flow knowledge exploration
  2. Coop OS
  3. PWA upgrades
  4. Community coop calls with coop knowledge sharing
- Chickens review cards should stay fast-scan:
  - left preview rail
  - source row with favicon/domain cue
  - deeper rationale in expansion
  - push controls for drafts only
  - 0 targets: `Select coops`
  - 1 target: `Push to <Coop>`
  - 2-4 targets: equal target pills
  - 5+ targets: selector/dropdown
- Popup home yard should remain ambient delight:
  - slow deterministic motion
  - tooltip labels tied to real items
  - sound only on explicit interaction
  - no autonomous chirps or game-like loops

## Phase Notes

### Phase 1

- Start `state.codex`, `api.codex`, `contracts.codex`, and `docs.claude` in parallel.
- Do not start `ui.claude` implementation until the state and sync lanes stop moving shared
  contracts.
- At the end of Phase 1, stop and ask the human operator to validate the core flows in the running
  dev environment before starting Phase 2.

### Phase 2

- Run `ui.claude` after Phase 1 logic lanes are merged or otherwise stable.
- Keep the UI lane on extension surfaces only.
- At the end of Phase 2, stop and ask the human operator to validate the polished surfaces in the
  running dev environment before starting Phase 3.

### Phase 3

- Create `handoff/qa-codex/hackathon-release-readiness` when implementation is ready for technical
  QA.
- Create `handoff/qa-claude/hackathon-release-readiness` only after Codex QA is honest enough for
  final product review.
- Before presenting the release recommendation as complete, stop and ask the human operator for a
  final validation pass and release decision.

### Phase 4

- Finish strategy/roadmap docs only if the release candidate is already credible.
