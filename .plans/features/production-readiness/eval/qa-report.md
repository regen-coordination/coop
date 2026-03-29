# QA Report

## Current State

- Status: Blocked
- Staged launch: blocked on coverage gate
- Live rails: deferred pending env completion and explicit approval

## Blocking Items

- Global coverage is below the existing release threshold after including shipped UI surfaces:
  - statements: `77.29%`
  - branches: `76.41%`
  - functions: `77.57%`
  - lines: `77.29%`
  - required floor: `85/85/85/70`
- The biggest newly-measured gaps are in release-critical app hooks and sidepanel codepaths, including:
  - `packages/app/src/hooks/useCapture.ts`
  - `packages/app/src/hooks/useReceiverSync.ts`
  - `packages/extension/src/views/Sidepanel/`
  - `packages/extension/src/views/Sidepanel/hooks/`
- Live-rails env readiness is still incomplete and remains intentionally out of scope for staged launch.

## Validated On This Pass

- `bun run plans:validate` passed
- `bun run lint` passed
- `bun run test:coverage` passed all `2484` assertions across `195` files, then failed only on global coverage thresholds
- The previous popup screenshot-review instability was repaired and no longer blocked the run

## Not Refreshed On Final Tree

- `bun run build`
- `bun run validate:store-readiness`
- `bun run validate:production-readiness`

Those commands were queued after coverage, but the staged launch decision was already binary once the broadened coverage run missed the gate.
