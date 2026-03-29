# Production Readiness

**Feature**: `production-readiness`
**Status**: Active
**Source Branch**: `main`
**Created**: `2026-03-27`
**Last Updated**: `2026-03-27`

## Summary

Get Coop to a staged production launch bar that is real and repeatable: clean lint, deterministic
release-critical tests, broader UI coverage for the shipped surfaces, build and store readiness,
and a clear handoff from Codex stabilization to Claude UI polish and back to Codex final sign-off.

## Why Now

- `bun run validate:production-readiness` is currently blocked by repo-visible failures rather than
  unknown risk.
- The popup screenshot-review flow is flaky, which makes the release slice unreliable even when the
  build succeeds.
- The current coverage config does not cover the shipped popup and sidepanel surfaces tightly
  enough to support a production-confidence claim.

## Scope

### In Scope

- staged launch readiness for the extension, PWA shell, and release checklists
- Codex-owned stabilization of lint, flaky popup tests, and coverage scope
- Claude-owned UI review and polish of popup and sidepanel release surfaces
- final Codex QA pass with a binary go or blocked decision
- a parallel live-rails checklist for later promotion

### Out Of Scope

- enabling live onchain, archive, or session rails during the staged launch pass
- broad redesign outside the shipped popup, sidepanel, and receiver flows
- unrelated refactors that do not improve release confidence

## User-Facing Outcome

- staged release candidates have a clean automated bar and a manual verification path that matches
  the real shipped surfaces
- popup screenshot capture and review behave deterministically enough to trust as a release gate
- live-rails promotion remains explicitly deferred until the env contract and live probes are ready

## Technical Notes

- Primary packages: `packages/extension`, `packages/app`, repo-level validation and docs
- Coverage scope should include release-critical popup and sidepanel UI, not runtime-only slices
- Release docs must distinguish staged launch assertions from live-rails activation requirements
- Codex-to-Claude handoff does not happen until lint, targeted tests, build, and store readiness
  are green

## Lane Split

| Lane | Agent | Expected Scope |
|------|-------|----------------|
| UI | Claude | Popup and sidepanel review, screenshot dialog polish, spacing, copy, accessibility |
| State | Codex | Popup orchestration, test stability, coverage config, release gating |
| API | Codex | API release verification only if a staged-launch blocker is traced to signaling or receiver wiring |
| Contracts | Codex | Live-rails env matrix, staged-vs-live release contract, readiness docs |
| QA 1 | Claude | UI acceptance, manual walkthrough, polish triage |
| QA 2 | Codex | Final validation matrix, release decision, blocker register |

## Acceptance Criteria

- [ ] `bun format && bun lint` pass cleanly
- [ ] popup screenshot review tests are deterministic enough for repeated runs
- [ ] `bun run test:coverage` measures release-critical UI surfaces and passes without known flaky
      instrumentation failures
- [ ] `bun build`, `bun run validate:store-readiness`, and `bun run validate:production-readiness`
      are green for the staged launch bar
- [ ] live-rails requirements are documented separately and remain gated on env completion plus
      explicit approval

## Validation Plan

- Unit: `bun run test`, targeted popup/app/sidepanel slices, repeated screenshot-review runs
- Integration: `bun run test:coverage`, targeted runtime and orchestration suites
- E2E: existing store-readiness and manual Chrome walkthrough for popup and sidepanel flows
- Manual: popup capture/save, screenshot review, Chickens triage, Sidepanel navigation, receiver
  handoff

## References

- Related docs:
  - `docs/reference/demo-and-deploy-runbook.md`
  - `docs/reference/chrome-web-store-checklist.md`
- Relevant files:
  - `packages/extension/src/views/Popup/__tests__/PopupApp.test.tsx`
  - `packages/extension/src/views/Popup/hooks/usePopupOrchestration.ts`
  - `vitest.config.ts`
- Open questions:
  - none for staged launch; live rails stay on the deferred checklist
