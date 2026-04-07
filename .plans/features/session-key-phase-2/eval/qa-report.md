# QA Report — Session Key Phase 2

## Evaluation Gates

### Phase 0: Regression Guards (228ed37 / 3bab69c)

| Gate | Evidence | Pass | Notes |
|------|----------|------|-------|
| Safe account type = 'safe' | Existing test "keeps 7579-enabled Safes..." passes | | |
| Nonce key isolation | `getSmartSessionsValidatorNonceKey()` returns non-zero BigInt | | |
| Address normalization | Mixed-case allowlist target validates against lowercase bundle target | | |
| AA24 detection | Executor test: AA24 error → "re-issued" detail message | | |
| PermissionId deterministic | Same scope → same hash, valid hex64 format | | |
| Unusable recovery | `refreshSessionCapabilityStatus(preserveUnusable: false)` resets to active | | |
| All 16 original tests | `bun run test -- session.test.ts` baseline passes | | |

### Phase 1: Expand Actions

| Gate | Evidence | Pass | Notes |
|------|----------|------|-------|
| New action classes validate | `bun run test -- session.test.ts` — 5 new tests pass | | |
| Existing tests unbroken | All 16 original `it()` blocks pass | | |
| Authority mapping consistent | No action in both safe-owner AND session-executor | | |
| Selectors match ABI | bytes4 compared against GG contract ABI | | |
| Executor routes new actions | `bun run test -- session-execution.test.ts` — 3 new tests pass | | |

### Phase 2: Lifecycle

| Gate | Evidence | Pass | Notes |
|------|----------|------|-------|
| Soft expiry triggers at 80% | `checkSoftExpiry` test with usedCount=8/maxUses=10 passes | | |
| No false trigger below 80% | `checkSoftExpiry` test with usedCount=7/maxUses=10 passes | | |
| Auto-rotation works | Handler test: old revoked, new issued after threshold | | |
| Backwards compatible | Capability without `autoRotateEnabled` → no rotation | | |
| Error codes exported | `SessionCapabilityErrorCode` enum importable from session module | | |
| Auto-rotation handler | `handleAutoRotateOnThreshold` test passes | | |

### Phase 3: Hats Binding

| Gate | Evidence | Pass | Notes |
|------|----------|------|-------|
| Scope exceeds hat → rejected | `validateScopeAgainstHat` returns exceeded actions | | |
| Scope subset → accepted | `validateScopeAgainstHat` returns ok: true | | |
| Hat → actions mapping | `getSessionActionsForHatRole('operator')` returns 7 actions | | |
| Cross-repo type compiles | GG `HatPermissionMapping` imported by Coop, TypeScript clean | | |

### Phase 4: Yield Janitor

| Gate | Evidence | Pass | Notes |
|------|----------|------|-------|
| Harvest validates | Session validation accepts harvest-yield action class | | |
| Two-step ordering | Executor test: harvest before split | | |
| Allowlist enforcement | Unknown vault address → allowlist-mismatch rejection | | |
| Skill manifest valid | `skill.json` has required fields, `SKILL.md` has frontmatter | | |
| Observation trigger | Yield threshold → `green-goods-yield-threshold-reached` emitted | | |

### Phase 5: Cockpit Visibility

| Gate | Evidence | Pass | Notes |
|------|----------|------|-------|
| Agent Actions renders | CommandPalette shows 7th category for operators | | |
| Role-gated | Non-operators do not see Agent Actions | | |
| Notification dot | FloatingToolbar shows dot when agent actions pending | | |

## QA Pass 1: Codex

- Status:
- Commands:
  ```bash
  bun run test -- packages/shared/src/modules/session
  bun run test -- packages/extension/src/background/handlers/__tests__/session
  bun lint
  bun build
  ```
- Findings:

## QA Pass 2: Claude

- Status:
- Commands:
  ```bash
  bun run test -- packages/shared/src/modules/session
  bun run test -- packages/extension/src/background/handlers/__tests__/session
  bun format && bun lint && bun run test && bun build
  ```
- Manual checks:
  - [ ] Issue capability with new action classes via operator console
  - [ ] Verify PermissionId changes for new scope
  - [ ] Verify old capabilities still validate
  - [ ] Verify structured error codes in rejection responses
  - [ ] Verify auto-rotation logs in capability log entries
- Findings:

## Residual Risk

| Risk | Severity | Mitigation |
|------|----------|-----------|
| ABI selector mismatch | High | Gate: compare bytes4 against live GG contract ABI |
| Account type regression to erc7579-implementation | Critical | Phase 0 regression test pins `type: 'safe'` |
| Nonce collision after scope expansion | Critical | Phase 0 regression test pins nonce key isolation |
| AA24 errors silent in new executors | High | Phase 0 + S0.1 test pins AA24 detection pattern |
| PermissionId drift on scope change | High | Phase 0 test pins deterministic hash |
| Auto-rotation race (rotation during execution) | Medium | Test concurrent usage + rotation |
| Hat permission mapping drift | Medium | Cross-repo type import, not duplication |
| Yield harvest on insufficient liquidity | Medium | Executor checks Aave liquidity pre-harvest |
| Pimlico API key still exposed | High | Prerequisite: server proxy migration blocks production |
| Target allowlist case sensitivity regression | Medium | Phase 0 test pins case-normalized comparison |
