# Implementation Notes

## 2026-03-27

- Created the production-readiness feature pack.
- Initial blocker set:
  - lint failures stop `validate:production-readiness`
  - popup screenshot-review save flow is flaky
  - coverage scope does not include enough release-critical UI
  - live-rails env contract is incomplete for promotion
- Stabilized the popup and receiver test surfaces that were failing or flaking under coverage:
  - cleared persisted browser storage between popup integration tests
  - replaced slow typing paths with direct input events in the screenshot review and operator flows
  - widened async waits where coverage instrumentation exposed legitimate latency
  - fixed `usePersistedPopupState` so mocked `chrome.storage.local.set` values are handled safely
- Cleared the lint gate:
  - removed the `useMemo` dependency trap in `usePopupOrchestration.ts`
  - fixed the `heartbeat.ts` template-literal lint issue
  - fixed workspace formatting drift
- Broadened release-critical coverage in `vitest.config.ts`:
  - include `packages/extension/src/views/**/*.{ts,tsx}`
  - stop excluding `packages/app/src/views/**`
  - disable file parallelism while coverage is enabled to avoid the `.tmp/coverage-0.json` race
- Updated release documentation so staged launch and live-rails promotion are separate gates:
  - `docs/reference/demo-and-deploy-runbook.md`
  - `docs/reference/chrome-web-store-checklist.md`
- Validation outcomes on this pass:
  - `bun run plans:validate` passed
  - `bun run lint` passed
  - targeted popup, sidepanel, app, runtime, and shared coverage regressions were repaired
  - `bun run test:coverage` completed all assertions: `195` files passed, `2484` tests passed
  - coverage thresholds failed after the broader UI scope was included:
    - statements: `77.29%` vs required `85%`
    - branches: `76.41%` vs required `85%`
    - functions: `77.57%` vs required `85%`
    - lines: `77.29%` vs required `85%`
- Outcome:
  - staged launch remains blocked on insufficient release-critical coverage
  - Claude UI handoff is not justified yet because the Codex stabilization gate is still red
