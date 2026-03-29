# Extension Audit Report — 2026-03-19

## Executive Summary
- **Packages analyzed**: extension (scoped audit)
- **Critical**: 0 | **High**: 3 | **Medium**: 8 | **Low**: 3
- **Dead code**: 18 unused files, 18 unused export groups, 7 unused exported type groups, 1 unused dep
- **Lint errors**: 1 (extension only)
- **Type errors**: 271 total (38 source, 191 test, 42 node_modules)
- **Architectural anti-patterns**: 11 god objects (>500 lines, non-test)
- **TODO markers**: 1
- **Mode**: Single-agent

---

## Previous Findings Status

_Tracked from: 2026-03-19 full codebase audit_

### Critical Findings
| ID | Finding | File | Status | Notes |
|----|---------|------|--------|-------|
| C1 | `privilegedActionTypeSchema` missing ERC-8004 and FVM action types | `shared/contracts/schema.ts:89-98` | FIXED | All three action types added to the enum |

### High Findings
| ID | Finding | File | Status | Notes |
|----|---------|------|--------|-------|
| H1 | Missing `vite/client` types for `import.meta.env` | `tsconfig.base.json:20` | FIXED | `"vite/client"` added to `types` array |
| H2 | Missing `@types/react` causes JSX errors | `tsconfig.base.json` | PARTIALLY FIXED | Down from ~2500 to 2 errors; residual `JSX` namespace references in `PopupApp.tsx:341` and `TabStrip.tsx:7` |
| H3 | `setCoopArchiveSecrets` called with wrong argument shape | `extension/background/handlers/archive.ts:627` | FIXED | `coopId` now spread into secrets |
| H4 | `PrivilegedFeature` type missing `'Filecoin registry registration'` | `extension/runtime/operator.ts:15` | FIXED | Value added to union |
| H5 | `ReviewDraft` schema drift in test fixtures | `extension/background/handlers/__tests__/review-handlers.test.ts:126` | FIXED | Test fixtures now include required fields |
| H6 | `onchainState` initialized as `{}` | `extension/views/shared/useCoopActions.ts:96`, `hooks/useCoopForm.ts:100` | FIXED | Both now use `resolveOnchainState(coopSeed)` |
| H7 | `agent-runner.ts` accesses non-existent output properties | `extension/runtime/agent-runner.ts:1157-1172` | FIXED | Uses correct property names (`summary`, `title`, `whyItMatters`) |

### Medium Findings resolved since last audit
| ID | Finding | Status | Notes |
|----|---------|--------|-------|
| M7 | 24 lint errors (extension scope) | FIXED | Down to 1 lint error in extension |

---

## High Findings

### H1. `runtimeConfig` fallback missing `providerMode` and `privacyMode` [NEW]
- **File**: `packages/extension/src/views/Sidepanel/hooks/useDashboard.ts:68-75`
- **Issue**: The `runtimeConfig` fallback when `dashboard` is null omits `providerMode` and `privacyMode` from the object literal. The `DashboardResponse.runtimeConfig` type requires both fields. This creates a union type where TypeScript cannot narrow to the full shape, causing 7 cascading errors in `SidepanelApp.tsx` (lines 178, 188, 923, 932, 958, 1006, 1017) where `runtimeConfig` is passed to child components or accessed for `.privacyMode`.
- **Impact**: TS2322/TS2339 compile errors. At runtime, the fallback path (before first dashboard load) will have `undefined` for `privacyMode` and `providerMode`, potentially causing privacy features to silently not activate on first render.
- **Recommendation**: Add `providerMode: 'standard'` and `privacyMode: 'off'` to the fallback object.

### H2. `OperatorConsoleProps` shape drift — `grants` prop passed but `permits` expected [STILL OPEN]
- **File**: `packages/extension/src/views/Sidepanel/tabs.tsx:1095`
- **Issue**: The `CoopFeedTab` renders `<OperatorConsole>` with `grants={dashboard?.operator.permits ?? []}`, but the `OperatorConsoleProps` type defines the prop as `permits` (line 61 of `OperatorConsole.tsx`). The prop name `grants` does not exist on the type.
- **Impact**: TS2322 compile error. At runtime, the `permits` prop will be `undefined`, so the operator console will show no execution permits even when they exist.
- **Recommendation**: Rename `grants` to `permits` at the call site in `tabs.tsx:1095`.

### H3. `context.draft` possibly null in `agent-runner.ts` [NEW]
- **File**: `packages/extension/src/runtime/agent-runner.ts:1543-1544`
- **Issue**: `context.draft` is possibly `null`, but the code accesses `context.draft.id` and `context.draft.suggestedTargetCoopIds` without a null guard after the `readiness.ready` check.
- **Impact**: TS18047. If `readiness.ready` is true but `context.draft` is null (theoretically possible if the draft was deleted between the readiness check and this code), this will throw `TypeError: Cannot read properties of null`.
- **Recommendation**: Add a null guard: `if (readiness.ready && context.draft)`.

---

## Medium Findings

### M1. ZK proof generation hardcoded to `null` in review publish [STILL OPEN, 2 cycles]
- **File**: `packages/extension/src/background/handlers/review.ts:58-61`
- **Issue**: Anonymous publish sets `membershipProof = null` with a TODO comment. No offscreen document delegation has been implemented.
- **Impact**: Anonymous publishing artifacts have no verifiable membership proof.

### M2. `BigInt` (constructor) vs `bigint` (primitive) type mismatch [STILL OPEN, 2 cycles]
- **File**: `packages/extension/src/background/handlers/session.ts:224,238,277`
- **Issue**: TS2322 — `BigInt(...)` returns a `BigInt` wrapper object per TypeScript's types, but the expected type is `bigint` (primitive).
- **Impact**: Works at runtime but defeats strict type checking.

### M3. `inference-worker.ts` nullable pipeline and wrong type shapes [STILL OPEN, 2 cycles]
- **File**: `packages/extension/src/runtime/inference-worker.ts:63,65,83,111`
- **Issue**: 5 type errors — ONNX wasm config possibly undefined, pipeline type incompatible, `.push()` on wrong shape, pipeline invoked without null check.
- **Impact**: If pipeline init fails, the worker crashes without a descriptive error.

### M4. `agent-models.ts` ONNX wasm config possibly undefined [STILL OPEN, 2 cycles]
- **File**: `packages/extension/src/runtime/agent-models.ts:163,165`
- **Issue**: TS18048 (possibly undefined) and TS2590 (union too complex).
- **Impact**: If ONNX backend shape changes, runtime crash during model init.

### M5. `tabs.tsx` god object with `canBadgeApp` accessing non-existent property [STILL OPEN, 2 cycles]
- **File**: `packages/extension/src/views/Sidepanel/tabs.tsx:1580`
- **Issue**: Accesses `browserUxCapabilities.canBadgeApp` but the `BrowserUxCapabilities` interface defines `canSetBadge`. Also, at 1728 lines, this file remains the largest view component.
- **Impact**: TS2339. The badge capability display always shows "unavailable" even when the browser supports app badging.
- **Recommendation**: Change `canBadgeApp` to `canSetBadge`.

### M6. `sw-safety.test.ts` AST walker type narrowing [STILL OPEN, 2 cycles]
- **File**: `packages/extension/src/__tests__/sw-safety.test.ts:165-209`
- **Issue**: 9 TS2367 errors where `node.type` is narrowed too aggressively to `"Program"`.
- **Impact**: Test compiles with errors but works at runtime.

### M7. Widespread test fixture drift across 9 test files [NEW]
- **Files**:
  - `operator-console.test.tsx` — 84 errors: `OperatorConsoleProps` shape mismatch + missing `@testing-library/jest-dom` type declarations
  - `privacy-ui.test.tsx` — 17 errors: missing `privacyMode` config, missing DOM matcher types
  - `onboarding-overlay.test.tsx` — 17 errors: missing DOM matcher types
  - `skeleton-loading.test.tsx` — 14 errors: missing DOM matcher types
  - `PopupApp.test.tsx` — 13 errors: missing DOM matcher types
  - `tab-keyboard-nav.test.tsx` — 12 errors: missing DOM matcher types
  - `use-draft-editor-privacy.test.ts` — 4 errors: `SoundPreferences` fixture has `volume`, `roosterCallEnabled`, `softCluckEnabled` but type only has `enabled`, `reducedMotion`, `reducedSound`
  - `policy-messages.test.ts` — 1 error: missing `sessionCapabilities`/`sessionCapabilityLog` in operator fixture
  - `privacy-messages.test.ts` — 1 error: missing `privacyMode` in runtimeConfig fixture
  - `permit-runtime.test.ts` — 1 error: credential fixture missing `rpId`
  - `receiver.test.ts` — 12 errors: `createMockOnchainState({})` missing required `seed`, coop mock missing `spaceType`, receiver capture fixtures outdated
  - `agent-knowledge.test.ts` — 1 error: `'tab-capture'` is not a valid `AgentObservationTrigger`
  - `agent-models.test.ts` — 4 errors: `result.output` is `unknown`
  - `setup-insights.test.ts` — 1 error: `seedContribution` not in `SetupInsightsInput`
- **Issue**: Schema and type evolution has outpaced test fixture updates. Tests are using property names and shapes from earlier versions of the types.
- **Impact**: 191 test-file type errors. Tests pass at runtime (vitest doesn't type-check), but these silently use wrong test data shapes, potentially masking regressions.
- **Recommendation**: Batch-update all test fixtures to match current types. The DOM matcher issue (`toBeInTheDocument`, `toBeVisible`, etc.) can be fixed by adding `@testing-library/jest-dom/vitest` to `tsconfig.base.json` `types` or creating a `vitest-env.d.ts`.

### M8. `useDraftEditor.ts` state updater produces `undefined` values in Record [STILL OPEN, 2 cycles]
- **File**: `packages/extension/src/views/Sidepanel/hooks/useDraftEditor.ts:83,196,287`
- **Issue**: 3 TS2345 errors. The `setDraftEdits` callback uses destructured `response.data` which could be `undefined` (even after the guard) because TypeScript doesn't narrow captured references in closures.
- **Impact**: Type safety gap in draft state management. At runtime, the guard at line 78/191/283 prevents the callback from executing with undefined data.

---

## Low Findings

### L1. 11 files exceed 500 lines (god objects, non-test)
- `agent-runner.ts` (2039), `tabs.tsx` (1728), `operator-sections.tsx` (1252), `agent.ts handlers` (1160), `SidepanelApp.tsx` (1041), `archive.ts handlers` (1026), `action-executors.ts` (954), `session.ts handlers` (819), `cards.tsx` (701), `background.ts` (661), `context.ts` (569)

### L2. 2 residual `JSX` namespace errors
- `PopupApp.tsx:341` — `let content: JSX.Element` should use `import type { JSX } from 'react'`
- `TabStrip.tsx:7` — `icons?: Partial<Record<T, JSX.Element>>` same fix needed

### L3. `background.ts:255` uses `sender.documentUrl` not in standard Chrome types
- `packages/extension/src/background.ts:255`
- `documentUrl` exists in Chrome 130+ but is not in `@types/chrome`. Works at runtime but produces TS2339. Consider adding a type augmentation or using optional chaining.

---

## Dead Code (knip results — extension workspace only)

### Unused Files (18)
| File | Likely Entry Point? |
|------|-------------------|
| `public/receiver-bridge.js` | Yes — script tag in HTML |
| `src/background.ts` | Yes — MV3 service worker entry |
| `src/runtime/agent-logger.ts` | Possibly — dynamic import |
| `src/runtime/agent-output-handlers.ts` | Possibly — dynamic import |
| `src/runtime/agent-runner.ts` | Possibly — dynamic import |
| `src/runtime/agent-webllm-worker.ts` | Yes — web worker |
| `src/runtime/receiver-sync-offscreen.ts` | Yes — offscreen document |
| `src/views/ErrorBoundary.tsx` | Yes — used in JSX |
| `src/views/Popup/main.tsx` | Yes — popup HTML entry |
| `src/views/Sidepanel/ArchiveSetupWizard.tsx` | Needs verification |
| `src/views/Sidepanel/CoopSwitcher.tsx` | Needs verification |
| `src/views/Sidepanel/SidepanelApp.tsx` | Yes — sidepanel HTML entry |
| `src/views/Sidepanel/cards.tsx` | Yes — imported by tabs.tsx |
| `src/views/Sidepanel/hooks/useCoopForm.ts` | Yes — imported by SidepanelApp |
| `src/views/Sidepanel/hooks/useSyncBindings.ts` | Needs verification |
| `src/views/Sidepanel/hooks/useTabCapture.ts` | Needs verification |
| `src/views/Sidepanel/main.tsx` | Yes — sidepanel HTML entry |
| `src/views/Sidepanel/tabs.tsx` | Yes — imported by SidepanelApp |

**Note**: Most files are entry points or dynamically imported modules that knip cannot trace through Vite/extension manifest build. Only `ArchiveSetupWizard.tsx`, `useSyncBindings.ts`, and `useTabCapture.ts` need manual verification.

### Unused Dependencies (1)
| Dependency | Status |
|-----------|--------|
| `react-dom` | Likely false positive — used via entry point HTML script |

### Unlisted Dependencies (3)
| Package | Import Location |
|---------|----------------|
| `viem` | `handlers/actions.ts`, `handlers/archive.ts` |
| `@rhinestone/module-sdk` | `handlers/session.ts` |
| `permissionless` | `handlers/session.ts` |

### Unused Exports (18 groups, ~120+ individual exports)
Most are message handler functions consumed through dynamic `chrome.runtime.onMessage` dispatch rather than static imports. Cross-package verification needed.

### Unused Exported Types (7 groups)
| Location | Types |
|----------|-------|
| `context.ts` | `RuntimeHealth`, `NotificationRegistry`, `AgentOnboardingStatus`, `AgentOnboardingState` |
| `action-executors.ts` | `ActionExecutorContext` |
| `agent-registry.ts` | `RegisteredSkill` |
| `messages.ts` | `ReceiverSyncConfigResponse` |
| `operator.ts` | `PrivilegedFeature` |
| `receiver.ts` | `ActiveReviewContext` |
| `operator-sections.tsx` | `SkillManifestSectionProps`, `GardenRequestsSectionProps`, `AgentObservationsSectionProps`, `TrustedNestControlsSectionProps`, `PolicyAndQueueSectionProps`, `SessionCapabilitySectionProps`, `PermitSectionProps` |

---

## Architectural Anti-Patterns

| Anti-Pattern | Location | Lines | Cycles Open | Severity |
|--------------|----------|-------|-------------|----------|
| God Object | `runtime/agent-runner.ts` | 2039 | 2 | MEDIUM |
| God Object | `views/Sidepanel/tabs.tsx` | 1728 | 2 | MEDIUM |
| God Object | `views/Sidepanel/operator-sections.tsx` | 1252 | 2 | LOW |
| God Object | `background/handlers/agent.ts` | 1160 | 2 | MEDIUM |
| God Object | `views/Sidepanel/SidepanelApp.tsx` | 1041 | 2 | MEDIUM |
| God Object | `background/handlers/archive.ts` | 1026 | 2 | MEDIUM |
| God Object | `background/handlers/action-executors.ts` | 954 | 2 | LOW |
| God Object | `background/handlers/session.ts` | 819 | 2 | LOW |
| God Object | `views/Sidepanel/cards.tsx` | 701 | 2 | LOW |
| God Object | `background.ts` | 661 | 2 | LOW |
| God Object | `background/context.ts` | 569 | 2 | LOW |
| Config Shape Drift | `useDashboard.ts` fallback missing `providerMode`/`privacyMode` | — | 1 | HIGH |
| Prop Name Mismatch | `tabs.tsx:1095` passes `grants` instead of `permits` | — | 2 | HIGH |
| Test Fixture Rot | 191 test-file type errors across 14 test files | — | 1 | MEDIUM |
| Unlisted Deps | `viem`, `@rhinestone/module-sdk`, `permissionless` not in package.json | — | 2 | MEDIUM |

---

## Trend

| Metric | 2026-03-19 (full) | 2026-03-19 (ext) |
|--------|-------------------|------------------|
| Critical | 1 | **0** |
| High | 7 | **3** |
| Medium | 8 | **8** |
| Low | 3 | **3** |
| Source type errors | ~30 | **38** |
| Test type errors | — | **191** |
| Node_modules type errors | — | **42** |
| Unused files (knip) | 31 (all) | **18** |
| Unused exports (knip) | 20 groups (all) | **18 groups** |
| Unused types (knip) | 13 groups (all) | **7 groups** |
| Unused deps (knip) | 7 (all) | **1** |
| Lint errors | 24 (all) | **1** |
| God objects (>500 lines, non-test) | 15 (all) | **11** |
| Findings fixed (from prev) | — | **7** (C1, H1, H3, H4, H5, H6, H7) |
| Findings opened | — | **3** (H1-new, H3-new, M7-new) |
| Resolution velocity | — | **7/3 = 2.3** |

**Observations**: Strong resolution velocity (2.3) — 7 of 8 previous critical/high findings were fixed. The codebase quality has improved significantly since the last audit. Main concern is now test fixture rot: 191 test-file type errors indicate the schemas evolved faster than test fixtures. The `runtimeConfig` fallback gap (H1-new) is the highest-priority fix as it affects the initial render of privacy features.

---

## Recommendations (Priority Order)

1. **Add `providerMode` and `privacyMode` to `useDashboard.ts` fallback** — `providerMode: 'standard'` and `privacyMode: 'off'`. Eliminates 7 cascading type errors and ensures correct initial render behavior. (H1, HIGH)

2. **Rename `grants` to `permits` in `tabs.tsx:1095`** — Single line fix. Restores execution permit display in the operator console. (H2, HIGH)

3. **Add null guard for `context.draft` in `agent-runner.ts:1543`** — Prevents potential null deref during publish-readiness action proposal. (H3, HIGH)

4. **Batch-update test fixtures** — Fix 191 test type errors across 14 test files. Consider adding `@testing-library/jest-dom/vitest` to `tsconfig.base.json` `types` array to fix DOM matcher type errors (~140 of 191 errors). (M7, MEDIUM)

5. **Fix `canBadgeApp` to `canSetBadge` in `tabs.tsx:1580`** — Single property name fix. Restores correct badge capability display. (M5, MEDIUM)

6. **Add `viem`, `permissionless`, `@rhinestone/module-sdk` to extension `package.json`** — Or re-export through `@coop/shared`. (Unlisted deps, MEDIUM)

7. **Add `import type { JSX } from 'react'` in `PopupApp.tsx` and `TabStrip.tsx`** — Fixes the 2 remaining JSX namespace errors. (L2, LOW)

8. **Split `tabs.tsx` (1728 lines) into per-tab component files** — Long-standing recommendation, now at 2 cycles. (L1, LOW)
