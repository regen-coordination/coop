# Session Key Phase 2 — Scope Expansion & Lifecycle

**Feature**: `session-key-phase-2`
**Status**: Active
**Source Branch**: `feature/agent-autonomy-onchain`
**Created**: 2026-04-06
**Last Updated**: 2026-04-06
**Extends**: `agent-autonomy-onchain` (workstream 2: Green Goods Automation)

## Summary

Expand the session-key system from 4 Green Goods garden-creation actions to a broader
bounded-automation surface covering work approval, assessments, GAP admin sync, yield
harvesting, and Hats-bound scope constraints. Add lifecycle improvements (auto-rotation,
structured error codes) and surface agent session activity in the Green Goods cockpit.

Phase 1 of session keys proved the architecture: PermissionId as immutable scope commitment,
12-gate validation, AES-GCM encrypted material. Phase 2 widens the aperture without changing
the security model.

## Decision Log

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Separate feature pack from agent-autonomy-onchain | Session expansion crosses both repos (Coop + GG) and has its own acceptance criteria; agent-autonomy-onchain is broader (8 workstreams) |
| D2 | Five phases: expand → lifecycle → Hats → yield → cockpit | Each independently shippable; later phases depend on earlier |
| D3 | Member-account actions stay out of session scope | Per authority model: member actions need per-user Kernel signatures, not coop-level delegation |
| D4 | Cockpit visibility is a GG-side concern | Coop emits structured session logs; GG cockpit consumes them. Tracked here for coherence but implemented in GG repo |
| D5 | Auto-rotation triggers at 80% of maxUses, not after exhaustion | Graceful migration avoids failed executions at usage limit |
| D6 | TDD red-green-refactor per phase | Existing test infrastructure (makeCapability, make*Bundle factories) is extensible; write failing tests first |
| D7 | Pimlico server proxy is a prerequisite, not a phase | Security fix (API key exposure) must land before expanding session scope |
| D8 | Backwards compatibility required for all schema changes | Existing capabilities without new fields must continue working with sensible defaults |

## In Scope

- Promote 3 action classes to session-executor tier (work-approval, assessment, gap-admin-sync)
- Add GREEN_GOODS_ACTION_SELECTORS for new actions
- Auto-rotation on soft expiry threshold (80% maxUses)
- Structured SessionCapabilityErrorCode enum for machine-readable failures
- Hats-bound session capability validation (scope ⊆ hat permissions)
- Yield janitor: harvest() + splitYield() as session-capable actions
- Yield threshold observation trigger + heuristic skill
- Agent session log surfacing in GG cockpit CommandPalette (GG-side)

## Out of Scope

- Member-account tier actions (gardener add/remove, work submission)
- Semaphore/privacy identity integration
- Cookie Jar or treasury automation
- Conviction voting implementation
- Replacing the bounded-automation posture with open agent execution
- Pimlico server proxy migration (prerequisite, tracked separately)

## Phases

### Phase 0: Regression Guards (prerequisite)

Pin the 6 root causes fixed in commits 228ed37 and 3bab69c before expanding scope.
These tests MUST pass before AND after every subsequent phase.

**Root causes pinned**:
1. Account type `'safe'` not `'erc7579-implementation'` (228ed37)
2. Nonce key isolation via `getSmartSessionsValidatorNonceKey()` (228ed37)
3. Target allowlist address normalization to lowercase (3bab69c)
4. AA24 signature error detection with actionable detail message (228ed37)
5. PermissionId deterministic computation and pre-storage (228ed37)
6. Unusable → active recovery via `refreshSessionCapabilityStatus(preserveUnusable: false)` (3bab69c)

**Files**: `session.test.ts` (6 new regression tests), `session-execution.test.ts` (3 new tests)
**Gate**: All 16 existing + 9 regression tests pass. If any fail, STOP — fix before proceeding.

### Phase 1: Expand Session-Capable Action Classes

Promote 3 actions from `safe-owner` to `session-executor`:

| Action Class | Current Tier | Selectors |
|---|---|---|
| `green-goods-submit-work-approval` | safe-owner → session-executor | `approveWork(uint256)` |
| `green-goods-create-assessment` | safe-owner → session-executor | `createAssessment(address,bytes)` |
| `green-goods-sync-gap-admins` | safe-owner → session-executor | `syncAdmins(address[])` |

**Files**: `session-constants.ts`, `authority.ts`, `green-goods-garden.ts`, `session.test.ts`, `session-execution.test.ts`

**TDD sequence**:
1. RED: Write 5 failing tests (validation accepts new actions, Smart Session selectors built, allowlist rejection still works)
2. GREEN: Add actions to SESSION_CAPABLE_ACTION_CLASSES + selectors + authority mapping + executor wiring
3. REFACTOR: Add make*Bundle() factories for new action types, verify no duplication

### Phase 2: Session Capability Lifecycle Improvements

Add auto-rotation on threshold + structured error codes.

**Files**: `session-capability.ts`, `schema-session.ts`, `session-validation.ts`, `session.ts` (handler), `session.test.ts`

**TDD sequence**:
1. RED: Write 4 failing tests (soft expiry detection, auto-rotation trigger, no-trigger below threshold, structured error codes)
2. GREEN: Add `checkSoftExpiry()`, `autoRotateEnabled` schema field, `SessionCapabilityErrorCode` enum
3. REFACTOR: Ensure backwards compatibility (missing fields default to safe values)

### Phase 3: Hats-Bound Session Capabilities

Session scope constrained by issuer's Hat permissions: `scope.allowedActions ⊆ hatPermissions`.

**Files**: GG `types/roles.ts` (export mapping), Coop `session-capability.ts`, `greengoods.ts`, `session.ts` (handler), `session.test.ts`

**TDD sequence**:
1. RED: Write 3 failing tests (scope exceeds hat → rejected, scope subset → accepted, hat → actions mapping)
2. GREEN: Implement `validateScopeAgainstHat()`, `resolveHatPermissions()`, wire into issuance
3. REFACTOR: Ensure hat data is cached (don't read contract on every validation)

### Phase 4: Yield Janitor

Session keys for autonomous `harvest()` + `splitYield()`.

**Files**: `session-constants.ts`, `authority.ts`, new `executors/green-goods-yield.ts`, new skill `green-goods-yield-janitor/`, `session.test.ts`

**TDD sequence**:
1. RED: Write 3 failing tests (harvest validation, two-step execution order, observation trigger)
2. GREEN: Add action classes, executor, skill manifest, observation trigger
3. REFACTOR: Ensure vault-specific targetAllowlist prevents cross-garden harvesting

### Phase 5: Cockpit Visibility (GG repo)

Surface agent session activity in GG admin cockpit.

**Files** (GG repo): `CommandPalette.tsx`, new `useAgentSessionLog()` hook, `FloatingToolbar.tsx`, `TopContextBar.tsx`

**TDD sequence**:
1. RED: Write component tests (AgentActions category renders, notification dot appears)
2. GREEN: Add data source hook, CommandPalette category, toolbar indicators
3. REFACTOR: Role-gate to operators only

## Impact Analysis

### Coop — Files to Modify

| File | Phase | Change |
|------|-------|--------|
| `packages/shared/src/modules/session/session-constants.ts` | 1, 4 | Add action classes + selectors |
| `packages/shared/src/modules/onchain/authority.ts` | 1, 4 | Update tier mappings |
| `packages/shared/src/modules/session/session-capability.ts` | 2, 3 | Auto-rotation + hat validation |
| `packages/shared/src/modules/session/session-validation.ts` | 2 | Structured error codes |
| `packages/shared/src/contracts/schema-session.ts` | 2 | Schema additions (autoRotateEnabled, softExpiryAt) |
| `packages/extension/src/background/handlers/session.ts` | 1, 2, 3 | Handler wiring |
| `packages/extension/src/background/handlers/executors/green-goods-garden.ts` | 1 | New action executor paths |
| `packages/shared/src/modules/session/__tests__/session.test.ts` | 1, 2, 3, 4 | TDD test additions |
| `packages/extension/src/background/handlers/__tests__/session-execution.test.ts` | 1, 4 | Executor tests |

### Coop — Files to Create

| File | Phase | Purpose |
|------|-------|---------|
| `packages/extension/src/background/handlers/executors/green-goods-yield.ts` | 4 | Yield harvest + split executor |
| `packages/extension/src/skills/green-goods-yield-janitor/skill.json` | 4 | Skill manifest |
| `packages/extension/src/skills/green-goods-yield-janitor/SKILL.md` | 4 | Skill instructions |

### GG — Files to Modify (Phase 5)

| File | Change |
|------|--------|
| `packages/admin/src/components/Layout/CommandPalette.tsx` | Add "Agent Actions" 7th category |
| `packages/shared/src/components/Cockpit/FloatingToolbar.tsx` | Notification dot for pending actions |
| `packages/shared/src/components/Cockpit/TopContextBar.tsx` | Agent status indicator |

### GG — Files to Create (Phase 3, 5)

| File | Purpose |
|------|---------|
| `packages/shared/src/types/roles.ts` (or extend existing) | HatPermissionMapping export |
| `packages/shared/src/hooks/agent/useAgentSessionLog.ts` | Session log data hook |

## Test Strategy

### Approach: TDD Red-Green-Refactor

Every phase writes failing tests BEFORE touching production code. The existing test
infrastructure (`makeCapability(overrides)`, `make*Bundle()` factories) extends naturally.

### Phase 1 Tests (5 new test cases)

```
it('validates work-approval bundle against session capability')
it('validates assessment bundle against session capability')
it('validates gap-admin-sync bundle against session capability')
it('builds Smart Session selectors for new actions')
it('rejects new actions when target escapes allowlist')
```

### Phase 2 Tests (4 new test cases)

```
it('detects soft expiry at 80% usage threshold')
it('does not trigger soft expiry below threshold')
it('auto-rotates when threshold reached and autoRotateEnabled is true')
it('returns structured error code alongside statusDetail')
```

### Phase 3 Tests (3 new test cases)

```
it('rejects session issuance when scope exceeds hat permissions')
it('allows session issuance when scope is subset of hat permissions')
it('maps operator hat to full session-executor action set')
```

### Phase 4 Tests (3 new test cases)

```
it('validates harvest-yield bundle against session capability')
it('executes harvest then split as two-step bundle')
it('emits yield-threshold-reached observation when yield exceeds minimum')
```

### Phase 5 Tests (2 new test cases)

```
it('renders Agent Actions category in CommandPalette for operators')
it('shows notification dot on FloatingToolbar when agent actions pending')
```

### Coverage Delta

- Phase 1: +5 test cases in session.test.ts, +2 in session-execution.test.ts
- Phase 2: +4 test cases in session.test.ts
- Phase 3: +3 test cases in session.test.ts
- Phase 4: +3 test cases across session.test.ts and new yield executor tests
- Phase 5: +2 component tests in GG admin

**Total**: 9 regression + 21 new + 2 component = 32 test cases

## CLAUDE.md Compliance (Coop)

- [x] Session module lives in shared package
- [x] Action classes follow existing `green-goods-*` naming convention
- [x] Authority tiers use existing model (safe-owner, session-executor, member-account)
- [x] Tests use existing vitest + factory fixtures pattern
- [x] New skills include `skill.json` + `SKILL.md` frontmatter
- [x] Observation triggers follow existing naming pattern
- [ ] Pimlico server proxy prerequisite (tracked separately)

## Acceptance Criteria

- [ ] 7 Green Goods action classes are session-capable (up from 4)
- [ ] All 16 existing session tests still pass
- [ ] 9 Phase 0 regression tests pass (pin 228ed37/3bab69c hardening)
- [ ] 21 Phase 1-5 test cases pass (TDD: written before production code)
- [ ] Auto-rotation triggers at 80% maxUses threshold
- [ ] Existing capabilities without `autoRotateEnabled` continue working (default: false)
- [ ] Structured `SessionCapabilityErrorCode` enum is exported and tested
- [ ] Session issuance validates scope ⊆ hat permissions
- [ ] Yield janitor skill can observe threshold and propose harvest
- [ ] Harvest + split execute as ordered two-step bundle
- [ ] GG cockpit CommandPalette shows "Agent Actions" category for operators
- [ ] No action class appears in both `safe-owner` AND `session-executor` tiers

## Prerequisites

| Prerequisite | Status | Blocking |
|---|---|---|
| Pimlico server proxy (security) | Not started | Phases 1-4 |
| agent-autonomy-onchain Phase 1 (receipts) | In progress | Phase 3 (Hats read needs live mode) |
| GG HatPermissionMapping export | Not started | Phase 3 |
| GG operator hat grantable to Coop Safe | Not started | Phase 4 |

## Recommended Priority Order

1. Phase 1 — Expand actions (Coop-only, no cross-repo dependency)
2. Phase 2 — Lifecycle improvements (Coop-only, no cross-repo dependency)
3. Phase 3 — Hats binding (requires GG type export)
4. Phase 4 — Yield janitor (requires GG operator hat + Phase 1)
5. Phase 5 — Cockpit visibility (GG-only, can start after Phase 1)
