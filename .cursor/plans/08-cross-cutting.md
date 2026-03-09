# Plan 08 - Cross-Cutting Delivery

## Scope

Cover environment setup, dependency graph, testing, and release-readiness across all Coop packages.

## Current State

- `.env.example` created with comprehensive environment variables
- `turbo.json` updated with proper task dependencies and test task
- Test scaffolding added:
  - Anchor: pillar handler tests in `src/__tests__/pillars.test.ts`
  - Shared: message types and storage tests in `src/__tests__/`
- Documentation created:
  - Demo flows guide (`docs/pitch/demo-flows.md`)
  - Hackathon submission checklist (`docs/pitch/hackathon-submission-checklist.md`)
  - Extension QA checklist (`docs/pitch/extension-qa-checklist.md`)
- Package.json files updated with test scripts

## Todos

- [x] Add `.env.example` with required variables for anchor, storage, and chain.
- [x] Ensure `turbo.json` encodes package dependency order.
- [x] Add test scaffolding:
  - [x] Anchor integration tests
  - [x] Shared package unit tests
  - [ ] Contracts Foundry tests (TODO - requires Forge setup)
- [x] Define extension and PWA manual QA checklist.
- [x] Finalize submission checklist and demo runbook in docs.

## Key Files

- `.env.example`
- `turbo.json`
- `packages/anchor/src/__tests__/pillars.test.ts`
- `packages/shared/src/__tests__/messages.test.ts`
- `packages/shared/src/__tests__/storage.test.ts`
- `docs/pitch/hackathon-submission-checklist.md`
- `docs/pitch/demo-flows.md`
- `docs/pitch/extension-qa-checklist.md`

## Suggested Validation Commands

```bash
pnpm check
pnpm build
pnpm lint
pnpm test
cd packages/contracts && forge test
```

## Done Criteria

- [x] Workspace has reproducible setup and test baseline.
- [x] Cross-package dependencies are explicit.
- [x] Demo and submission paths are documented and executable.

## Known Issues

- Shared package has pre-existing TypeScript issues with `idb-keyval` type declarations
- These are unrelated to Plan 08 work and existed before our changes
- Tests will still run with `node --test` after building

