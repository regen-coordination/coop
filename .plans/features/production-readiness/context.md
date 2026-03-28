# Context For Production Readiness

## Existing References

- `docs/reference/demo-and-deploy-runbook.md`
- `docs/reference/chrome-web-store-checklist.md`
- `scripts/validate.ts`
- `scripts/store-readiness.ts`

## Relevant Codepaths

- `packages/extension/src/views/Popup/`
- `packages/extension/src/views/Sidepanel/`
- `packages/extension/src/runtime/`
- `packages/app/src/__tests__/`
- `vitest.config.ts`

## Constraints

- staged launch comes first; live rails stay on a separate checklist
- popup `activeTab` verification still requires manual Chrome confirmation
- coverage must become more honest without dropping below the current threshold floor unless a
  deterministic instrumentation issue is isolated and documented
- the root `.env.local` remains the only env source of truth

## Current Blockers

- release-critical coverage now includes popup, sidepanel, and app UI surfaces, and the global
  coverage result misses the existing gate at `77.29/76.41/77.57/77.29`
- the largest measured gaps are app capture/receiver hooks and broad sidepanel codepaths, so the
  current suite is still not strong enough to justify staged launch
- live-rails env readiness is incomplete: `VITE_COOP_SESSION_MODE=live` and trusted-node archive
  credentials are not all present

## Notes For Agents

- Claude should focus on popup capture/review, Chickens clarity, Sidepanel polish, spacing, copy,
  and accessibility only after the Codex handoff gate is green
- Codex should clear lint, stabilize the popup slice, broaden coverage to shipped UI, and split
  staged launch docs from live-rails promotion
- Shared assumptions:
  - staged launch is the immediate release target
  - live rails require explicit human approval and separate validation
