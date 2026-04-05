---
feature: next-gen-model-readiness
title: Consolidate the eval pipeline
lane: state
agent: claude
status: ready
source_branch: main
work_branch: feature/consolidate-eval-pipeline
depends_on:
  - ../spec.md
owned_paths:
  - scripts/validate.ts
  - e2e/
  - package.json
done_when:
  - release.*lint.*typecheck.*unit.*build.*store-readiness.*extension-dist.*e2e
  - e2e/helpers
skills:
  - testing
updated: 2026-04-02
---

# Phase 2: Consolidate the Eval Pipeline

Target: 67 suites → clear hierarchy. One comprehensive release gate (8 steps). Shared E2E helpers.

## Step 1: Extract E2E helpers into shared module

Create `e2e/helpers.cjs` with the 5 duplicated utilities:

```javascript
// e2e/helpers.cjs
function withTimeout(promise, ms, label) { ... }
function isBenignCloseError(error) { ... }
function isTransientNavigationError(error) { ... }
function gotoWithRetry(page, url, options) { ... }
function closeContextSafely(context, timeout) { ... }
function escapeRegExp(string) { ... }

module.exports = { withTimeout, isBenignCloseError, isTransientNavigationError, gotoWithRetry, closeContextSafely, escapeRegExp };
```

Take the most complete implementation of each from the existing spec files (check all 7-8 files for the best version).

**Then** update each spec file to import from `./helpers.cjs`:
- [ ] `e2e/extension.spec.cjs` — remove inline helpers, add `require('./helpers.cjs')`
- [ ] `e2e/popup-actions.spec.cjs` — same
- [ ] `e2e/receiver-sync.spec.cjs` — same
- [ ] `e2e/sync-resilience.spec.cjs` — same
- [ ] `e2e/visual-popup.spec.cjs` — same
- [ ] `e2e/visual-sidepanel.spec.cjs` — same
- [ ] `e2e/member-account-live.spec.cjs` — same
- [ ] `e2e/app.spec.cjs` — same (if it uses any of these)

**Verify**: `bun run test:e2e` passes (all specs still work with shared helpers). No inline `withTimeout` or `isBenignCloseError` definitions remain in spec files.

## Step 2: Create the `release` validation suite

Add a `release` composite suite to `scripts/validate.ts`:

```typescript
release: {
  description: 'Comprehensive release gate — one command, binary pass/fail',
  includes: [
    'lint',
    'typecheck',
    'unit',          // ALL vitest tests, one process
    'build',
    'audit:store-readiness',
    'unit:extension-dist',  // post-build SW safety check
    'e2e:all',       // ALL Playwright specs, one pass
  ],
},
```

This replaces `production-readiness` (19 steps) as the canonical release gate.

**Key difference from `production-readiness`**: Uses `unit` (all vitest, one process) instead of 9 targeted `unit:*` slices. More comprehensive AND faster (one process startup instead of 9).

**Verify**: `bun run validate release --dry-run` shows 7-8 steps (no duplicates). Compare coverage against `production-readiness` to ensure nothing is lost.

## Step 3: Create `e2e:all` leaf suite

Add an `e2e:all` suite that runs ALL Playwright specs in one pass:

```typescript
'e2e:all': {
  description: 'All E2E tests in one Playwright pass',
  steps: [{ cmd: 'bunx playwright test', name: 'e2e:all' }],
},
```

This replaces running `e2e:popup`, `e2e:extension`, `e2e:receiver-sync`, `e2e:sync`, `e2e:agent-loop`, `e2e:app:desktop`, `e2e:app:mobile` separately.

**Important**: Verify that Playwright specs don't interfere with each other when run together. Check `playwright.config.cjs` for project isolation. If specs share browser state, may need `--workers=1` or project-level isolation.

**Verify**: `bun run validate e2e:all` runs all specs and passes.

## Step 4: Add env-gated probe step to release suite

Add an optional probes step that runs only when env vars are present:

```typescript
'release-live': {
  description: 'Release gate + live infrastructure probes',
  includes: ['release', 'probes:all'],
},
'probes:all': {
  description: 'All live-rail probes (env-gated, skip silently if vars absent)',
  includes: [
    'probe:onchain-live',
    'probe:session-key-live',
    'probe:archive-live',
    'probe:greengoods-sim',
    'probe:greengoods-admin-sim',
    'probe:fvm-registry-live',
  ],
},
```

**Verify**: `bun run validate release-live --dry-run` shows release steps + probe steps. Probes skip gracefully without env vars.

## Step 5: Update CLAUDE.md validation references

Update CLAUDE.md to reference the new `release` suite:

- Default pre-commit: `bun run validate smoke` (unchanged)
- Release gate: `bun run validate release`
- With live rails: `bun run validate release-live`

Remove the detailed verification tier table (handled in Phase 1 prompt-surface lane).

**Verify**: CLAUDE.md references are accurate. `bun run validate list` shows the new suites.

## Step 6: Document the hierarchy

Add a brief comment block at the top of `scripts/validate.ts` documenting the suite hierarchy:

```
// Suite hierarchy:
//   Developer iteration: typecheck (10s) → quick (15s) → smoke (1m)
//   Release gate:        release (all tests + build + audit + all e2e)
//   Live rails:          release-live (release + infrastructure probes)
//   Legacy:              production-readiness, full (kept for backward compat)
```

Do NOT delete the legacy suites — they may be referenced in CI or by other developers. Just document that `release` is the canonical replacement.

**Verify**: `bun run validate quick` still works. All existing suites still function.

## Final Verification

- [ ] `bun run validate release --dry-run` shows 7-8 clean steps
- [ ] `bun run validate release` passes (full run)
- [ ] No inline E2E helpers remain in spec files (all imported from `e2e/helpers.cjs`)
- [ ] `e2e:all` runs all specs in one Playwright pass without interference
- [ ] Legacy suites (`production-readiness`, `full`) still work
