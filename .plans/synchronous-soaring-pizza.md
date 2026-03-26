# Codex-Readiness Cleanup Plan

## Context

The Coop monorepo has strong foundational patterns (100% barrel compliance, zero module boundary violations, consistent naming, no swallowed errors) but has accumulated 9 god objects (>900 lines each, totaling ~15,000 lines), unwired shared modules, and minor type safety gaps. This plan decomposes those files into focused, pattern-consistent modules so that AI tools (Codex, Claude Code) can work with smaller context windows, learn cleaner patterns, and make fewer mistakes.

**Current state** (fresh audit, 2026-03-25):
- Lint: 3 errors on main (previously inflated by worktrees)
- Type errors: 0 from tsc on main
- God objects: 9 files totaling ~15,000 lines
- Unused modules: erc8004 (60% wired), policy builders (30% wired)
- .DS_Store: 14 tracked files to remove
- Stale worktrees: 2 to clean

**Scope**: Code quality, structure, architecture. No test writing.

---

## Phase 0: Housekeeping
**Commit 1 | ~5 files | Verify: `bun run validate quick`**

- [ ] Remove 2 stale worktrees (`git worktree remove .claude/worktrees/agent-a3474b80`, same for `agent-acb91dc4`)
- [ ] Remove 14 .DS_Store files from git tracking (`git rm --cached` all instances)
- [ ] Fix 3 lint errors:
  - `packages/extension/src/background/handlers/action-executors.ts:1` — use `import type`
  - `packages/app/src/views/Landing/index.tsx:1745` — array index key (manual fix)
  - `packages/app/src/styles.css:1573` — formatter auto-fix

---

## Phase 1: Schema Decomposition
**Commit 2 | ~15 files | Verify: `bun run validate smoke`**

Split `packages/shared/src/contracts/schema.ts` (2194 lines, 11 domain groups) into domain-scoped files. The barrel chain `schema-*.ts` -> `schema.ts` -> `contracts/index.ts` -> `src/index.ts` preserves all downstream imports.

| New file | Content | ~Lines |
|----------|---------|--------|
| `schema-enums.ts` | captureMode, integrationMode, extensionIconState, chains, providerMode, soundEvent | 80 |
| `schema-identity.ts` | authMode, authSession, passkeyCredential, localPasskeyIdentity | 120 |
| `schema-content.ts` | tabCandidate, readablePageExtract, coopInterpretation, reviewDraft, artifact, captureExclusion | 250 |
| `schema-archive.ts` | archiveReceipt, archiveBundle, archiveDelegationMaterial, filecoinStatus | 150 |
| `schema-policy.ts` | actionPolicy, actionBundle, privilegedActionType, policyActionClass, typedActionBundle | 200 |
| `schema-session.ts` | sessionCapability, encryptedSessionMaterial, sessionCapabilityLogEntry | 100 |
| `schema-agent.ts` | agentObservation, agentPlan, skillRun, skillManifest, agentLog, agentMemory | 200 |
| `schema-receiver.ts` | receiverCapture, receiverPairingRecord, receiverSyncEnvelope | 100 |
| `schema-greengoods.ts` | greenGoods* schemas | 150 |
| `schema-onchain.ts` | onchainState, memberOnchainAccount, localMemberSignerBinding | 100 |
| `schema-privacy.ts` | privacyIdentity, privacyGroup, stealth*, stealthKeyPairRecord | 100 |
| `schema-erc8004.ts` | erc8004 agent identity, reputation schemas | 40 |
| `schema-coop.ts` | coopSharedState (depends on many above), coopProfile, member, ritualDefinition | 350 |
| `schema.ts` (barrel) | `export * from './schema-enums'; export * from './schema-identity'; ...` | 30 |

**Import order constraint**: enums -> identity -> onchain -> greengoods -> policy -> agent -> content -> session -> receiver -> archive -> privacy -> erc8004 -> coop (coopSharedState references many).

**Critical files**:
- `packages/shared/src/contracts/schema.ts` — source
- `packages/shared/src/contracts/index.ts` — barrel (already does `export * from './schema'`)
- `packages/shared/src/contracts/__tests__/` — existing schema tests validate correctness

---

## Phase 2: Database Decomposition
**Commit 3 | ~10 files | Verify: `bun run validate smoke`**

Split `packages/shared/src/modules/storage/db.ts` (1988 lines) by layer.

| New file | Content | ~Lines |
|----------|---------|--------|
| `db-schema.ts` | CoopDexie class, 18 table declarations, v1-v18 migrations, utility interfaces | 550 |
| `db-encryption.ts` | Wrapping secret cache, derived-key LRU, encrypted payload builders, redaction/hydration | 350 |
| `db-crud-content.ts` | Tab candidate, page extract, review draft, artifact CRUD | 200 |
| `db-crud-coop.ts` | Coop state, settings, auth session CRUD | 150 |
| `db-crud-receiver.ts` | Receiver pairing, capture CRUD | 80 |
| `db-crud-policy.ts` | Action bundle, action log, replay ID, execution permit CRUD | 120 |
| `db-crud-agent.ts` | Observation, plan, skill run, tab routing, knowledge skill, agent memory CRUD | 200 |
| `db-crud-session.ts` | Session capability, signer binding CRUD | 80 |
| `db-crud-privacy.ts` | Privacy identity, stealth key pair CRUD | 50 |
| `db-maintenance.ts` | clearSensitiveLocalData, pruneSensitiveLocalData, legacy migrations | 200 |
| `db.ts` (barrel) | `createCoopDb` factory + re-exports | 30 |

**Dependency DAG**: db-schema.ts <- db-encryption.ts <- all db-crud-*.ts <- db-maintenance.ts <- db.ts (barrel)

**Critical files**:
- `packages/shared/src/modules/storage/db.ts` — source
- `packages/shared/src/modules/storage/index.ts` — barrel
- `packages/shared/src/modules/storage/__tests__/db.test.ts` — existing tests

---

## Phase 3: Shared + Extension Module Decompositions (4 parallel agents)
**Commits 4-7 | ~40 files | Verify: `bun run validate typecheck` per agent, `smoke` after merge**

All 4 can run simultaneously with `isolation: worktree`.

### 3A: greengoods.ts (1711 lines -> 9 files)
`packages/shared/src/modules/greengoods/greengoods.ts`

| New file | Content |
|----------|---------|
| `greengoods-abis.ts` | ABI constants (~8 contracts) |
| `greengoods-deployments.ts` | `getGreenGoodsDeployment()`, address maps |
| `greengoods-authorization.ts` | `inspectGreenGoodsGardenMintAuthorization()` |
| `greengoods-state.ts` | `createInitialGreenGoodsState`, binding resolution |
| `greengoods-garden.ts` | Garden lifecycle (create, sync, domains, pools) |
| `greengoods-work.ts` | Work approval, assessment, submission |
| `greengoods-gardener.ts` | Add/remove gardeners |
| `greengoods-impact.ts` | Impact report submission |
| `greengoods.ts` (barrel) | Re-exports |

### 3B: action-bundle.ts (1489 lines -> 7 files)
`packages/shared/src/modules/policy/action-bundle.ts`

| New file | Content |
|----------|---------|
| `action-payload-parsers.ts` | Read helpers + `resolveScopedActionPayload` |
| `action-bundle-core.ts` | Bundle creation, validation, digest |
| `action-builders-archive.ts` | Archive/publish payload builders |
| `action-builders-safe.ts` | Safe operation payload builders |
| `action-builders-greengoods.ts` | Green Goods payload builders (~12 functions) |
| `action-builders-erc8004.ts` | ERC-8004 payload builders |
| `action-bundle.ts` (barrel) | Re-exports |

### 3C: agent-runner.ts (2006 lines -> 5 files)
`packages/extension/src/runtime/agent-runner.ts`

| New file | Content |
|----------|---------|
| `agent-runner-state.ts` | Cycle state management, auth resolution |
| `agent-runner-observations.ts` | Observation priority, eligibility, routing |
| `agent-runner-skills.ts` | Skill execution harness, output extraction |
| `agent-runner-inference.ts` | Grant fit scoring, entity/theme inference |
| `agent-runner.ts` (kept) | `runAgentCycle` entry point (~200 lines) + re-exports |

### 3D: agent.ts handlers (1267 lines -> 7 files)
`packages/extension/src/background/handlers/agent.ts`

| New file | Content |
|----------|---------|
| `agent-cycle-helpers.ts` | Cycle state getters/setters, request/drain |
| `agent-observation-emitters.ts` | `emitAgentObservationIfMissing`, roundup, audio transcript |
| `agent-observation-conditions.ts` | `is*Due`/`is*Needed` checks |
| `agent-reconciliation.ts` | Observation reconciliation, sync |
| `agent-dashboard.ts` | Dashboard snapshot, proactive delta logic |
| `agent-plan-executor.ts` | Plan proposal execution |
| `agent.ts` (kept) | Message handlers (export names preserved for dynamic dispatch) |

---

## Phase 4: View Layer Decompositions (2 parallel agents)
**Commits 8-9 | ~18 files | Verify: `bun run validate typecheck` then `bun build`**

### 4A: useSidepanelOrchestration.ts (1163 lines -> 8 files)
`packages/extension/src/views/Sidepanel/hooks/useSidepanelOrchestration.ts`

Each extracted hook returns a partial object spread into the `SidepanelOrchestration` interface. Shared dependencies (dashboard, sendRuntimeMessage) passed as parameters.

| New file | Content |
|----------|---------|
| `useSidepanelCoopManagement.ts` | Create/join coop, profile updates |
| `useSidepanelInvites.ts` | Invite + receiver pairing handlers |
| `useSidepanelDrafts.ts` | Draft editing, ready state, publishing |
| `useSidepanelActions.ts` | Action bundle propose/approve/reject/execute |
| `useSidepanelPermissions.ts` | Permit + session capability handlers |
| `useSidepanelAgent.ts` | Agent cycle, plan approval, skill retry |
| `useSidepanelGreenGoods.ts` | Green Goods workflow handlers |
| `useSidepanelOrchestration.ts` (kept) | Composition shell (~200 lines) |

### 4B: usePopupOrchestration.ts (921 lines -> 5 files)
`packages/extension/src/views/Popup/hooks/usePopupOrchestration.ts`

| New file | Content |
|----------|---------|
| `usePopupFormHandlers.ts` | Create/join submit handlers |
| `usePopupDraftHandlers.ts` | Draft save, ready, share |
| `usePopupNoteHandlers.ts` | Note save, paste |
| `usePopupProfile.ts` | Preferences, workspace, account |
| `usePopupOrchestration.ts` (kept) | Composition shell (~200 lines) |

---

## Phase 5: Landing Page Decomposition
**Commit 10 | ~10 files | Verify: `bun run validate typecheck` then `bun build`**

Split `packages/app/src/views/Landing/index.tsx` (1827 lines) into components + hooks.

| New file | Content |
|----------|---------|
| `landing-types.ts` | All type definitions |
| `landing-data.ts` | Constants: chickens, audiences, ritual mappings, story cards |
| `landing-animations.tsx` | ChickenSprite, CoopIllustration, flight paths |
| `useSpeechRecognition.ts` | Speech recognition hook |
| `useSetupSubmission.ts` | Form persistence, setup packet builder |
| `RitualCard.tsx` | Ritual card component |
| `AudienceSelector.tsx` | Audience selection component |
| `index.tsx` (kept) | Composition shell (~300 lines) |

---

## Phase 6: Type Safety Fixes
**Commit 11 | ~8 files | Verify: `bun run validate quick`**

| Issue | File | Fix |
|-------|------|-----|
| H1 | `views/shared/useCoopActions.ts:96`, `hooks/useCoopForm.ts:100` | Type `resolveOnchainState` return as `OnchainState` |
| H3 | `background/handlers/member-account.ts` | Add 12 null guards for optional passkey/greenGoods |
| H4 | `views/Sidepanel/tabs/NestInviteSection.tsx:37` | `useRef<...>(undefined)` initial value |
| H5 | `hooks/useSidepanelOrchestration.ts` | Ensure `captureMode` typed as `CaptureMode` |
| M2 | `background/handlers/session.ts:224,238,277` | `BigInt(x)` -> `bigint` primitive pattern |

---

## Phase 7: Unused Module Wiring
**Commit 12 | ~6 files | Verify: `bun run validate smoke`**

### 7A: erc8004 read handlers
Add to `packages/extension/src/background/handlers/`:
- `handleGetAgentReputation()` — calls `readAgentReputation()` from `@coop/shared`
- `handleGetAgentFeedbackHistory()` — calls `readAgentFeedbackHistory()`
- `handleGetAgentManifest()` — calls `buildAgentManifest()`
- `handleExportAgentLog()` — calls `buildAgentLogExport()`
- Add message types to `runtime/messages.ts`
- Wire into background message dispatch

### 7B: Policy builder wiring
Refactor `persistProposedBundle()` in `extension/src/background/handlers/actions.ts` to use `buildXxxPayload()` helpers from `@coop/shared` instead of raw payload objects.

---

## Execution Strategy

```
Phase 0  (housekeeping)           sequential
   |
Phase 1  (schema.ts)              sequential — foundational
   |
Phase 2  (db.ts)                  sequential — depends on schema
   |
Phase 3A (greengoods.ts)    -|
Phase 3B (action-bundle.ts) -|--- 4 parallel agents, worktree-isolated
Phase 3C (agent-runner.ts)  -|
Phase 3D (agent.ts)         -|
   |
Phase 4A (sidepanel orch)   -|--- 2 parallel agents, worktree-isolated
Phase 4B (popup orch)       -|
   |
Phase 5  (Landing page)          sequential
   |
Phase 6  (type fixes)       -|--- can run in parallel
Phase 7  (module wiring)    -|
```

**Total**: ~110 files touched, ~65 new files, ~13,000 lines relocated, 12 commits

## Verification Tiers Per Phase

| Phase | Tier | Command | Why |
|-------|------|---------|-----|
| 0 | quick | `bun run validate quick` | Lint-only changes |
| 1-2 | smoke | `bun run validate smoke` | Shared layer changes affect all packages |
| 3A-3D | typecheck per agent, smoke after merge | `bun run validate typecheck` / `smoke` | Cross-package impact |
| 4A-4B | typecheck + build | `bun run validate typecheck && bun build` | Extension build must succeed |
| 5 | typecheck + build | `bun run validate typecheck && bun build` | App build must succeed |
| 6 | quick | `bun run validate quick` | Localized type fixes |
| 7 | smoke | `bun run validate smoke` | New handler wiring |

## Key Invariants
1. **Barrel imports never change**: All consumers keep `import { x } from '@coop/shared'`
2. **Export names preserved**: Extension message handlers keep their names for dynamic dispatch
3. **No behavioral changes**: Pure structural refactoring (move code between files, add imports/exports)
4. **Each commit is green**: Verify before committing, never accumulate broken state
5. **Build order respected**: shared -> app -> extension
