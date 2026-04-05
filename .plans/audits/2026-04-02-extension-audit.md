# Extension Audit Report -- 2026-04-02

## Executive Summary
- **Packages analyzed**: extension (scoped audit)
- **Critical**: 0 | **High**: 0 | **Medium**: 3 | **Low**: 3
- **Dead code**: 11 unused files (all false positives -- entry points/workers), 36 unused export groups, 45 unused type groups, 0 genuine unused deps
- **Lint errors**: 0 (extension scope)
- **Type errors**: 0 (source + test)
- **Architectural anti-patterns**: 16 god objects (>500 lines, non-test source)
- **TODO markers**: 2
- **Mode**: Single-agent

### Key Headlines

**All prior HIGH findings resolved.** The 3 extension-specific HIGHs from the 2026-03-19 extension audit and all HIGHs from the 2026-04-01 full audit are confirmed FIXED.

**Zero type errors.** TypeScript emits 0 errors for the extension package (both source and test files included).

**Zero lint errors in extension scope.** All lint issues from the workspace are in the API package, none in extension.

**M2 (PopupDraftListItem drift) resolved.** `PopupDraftListItem extends ReviewDraft` now properly -- no more `as unknown as ReviewDraft` casts.

**God object count increased 11 to 16.** This reflects the decomposition of `tabs.tsx` (1728 lines) and `operator-sections.tsx` (1252 lines) into separate files. The prior monoliths are gone; the increase comes from previously-hidden files now being individually counted. Maximum file size dropped from 2039 to 1565 lines.

---

## Previous Findings Status

_Tracked from: 2026-04-01 (full audit) and 2026-03-19 (extension audit)_

### High Findings
| ID | Finding | File | Status | Notes |
|----|---------|------|--------|-------|
| H1 (ext) | `runtimeConfig` fallback missing `providerMode`/`privacyMode` | `useDashboard.ts` | **FIXED** | Both fields now present at lines 86-87. |
| H2 (ext) | `grants` prop instead of `permits` | `tabs.tsx:1095` | **FIXED** | File decomposed; NestAgentSection.tsx:148 uses `permits` correctly. |
| H3 (ext) | `context.draft` possibly null in agent-runner | `agent-runner.ts:1543` | **FIXED** | Null guard at `agent-runner-observations.ts:97`. TypeScript emits 0 errors. |

### Medium Findings
| ID | Finding | File | Status | Notes |
|----|---------|------|--------|-------|
| M1 (full) | ZK proof hardcoded to `null` | `review.ts:66` | **STILL OPEN** (5 cycles) | DEFERRED -- MV3 service worker limitation. |
| M2 (full) | `PopupDraftListItem` type drift from `ReviewDraft` | `PopupDraftListScreen.tsx` | **FIXED** | `PopupDraftListItem extends ReviewDraft` at popup-types.ts:48. No `as unknown as` casts remain. |
| M4 (full) | `agent-models.ts` `as any` usage | `agent-models.ts:215` | **ACCEPTED** | transformers.js pipeline types genuinely unrepresentable. biome-ignore comment in place. |
| M5 (ext) | `canBadgeApp` vs `canSetBadge` | `tabs.tsx:1580` | **FIXED** | NestSettingsSection.tsx:379 uses `canSetBadge`. |
| M6 (ext) | `sw-safety.test.ts` AST walker type narrowing | `sw-safety.test.ts` | **FIXED** | TypeScript emits 0 errors. |
| M7 (ext) | Test fixture drift (191 test type errors) | 14 test files | **FIXED** | 0 test type errors. All fixtures updated. |
| M8 (ext) | `useDraftEditor.ts` closure narrowing | `useDraftEditor.ts:83` | **FIXED** | Variable extracted before closure (`savedDraft` at line 84). |

---

## Medium Findings

### M1. ZK proof generation hardcoded to `null` [DEFERRED, 5 cycles]
- **File**: `packages/extension/src/background/handlers/review.ts:66`
- **Issue**: Anonymous publish sets `membershipProof = null` with TODO. Snarkjs WASM workers require `URL.createObjectURL` and `new Worker`, both unavailable in MV3 service workers.
- **Status**: DEFERRED. The fix requires either (a) offscreen document delegation for ZK operations, or (b) a different ZK library compatible with MV3 constraints. Anonymous publishing still works -- it just skips the proof.
- **Rationale**: Structural platform limitation, not a code quality issue. Stops escalation.

### M2. Phantom dependency on `@rhinestone/module-sdk` [NEW]
- **File**: `packages/extension/src/background/handlers/session.ts:47`
- **Issue**: Extension directly imports `@rhinestone/module-sdk/account` (line 47: `import { installModule, isModuleInstalled } from '@rhinestone/module-sdk/account'`), but `@rhinestone/module-sdk` is only listed in `packages/shared/package.json`, not in `packages/extension/package.json`. This works due to hoisting but is fragile -- a lockfile change or strict module resolution could break it.
- **Impact**: Build fragility. If the shared package removes or changes its rhinestone dependency, the extension build will break without any change to extension code.
- **Recommendation**: Either add `@rhinestone/module-sdk` to `packages/extension/package.json` or re-export the needed functions through `@coop/shared`.

### M3. Catalog stubs are unreachable dead code [NEW]
- **Files**: `packages/extension/src/catalog/CatalogApp.tsx`, `packages/extension/src/catalog/main.tsx`, `packages/extension/src/catalog/catalog.css`, `packages/extension/vite.catalog.config.ts`
- **Issue**: The catalog UI (363 lines of CatalogApp.tsx + 11 lines of main.tsx + CSS + a separate Vite config on port 3099) is a dev-only design token reference that is not wired into the extension build, not referenced by any test, and not documented. It exists as a standalone `dev:catalog` script.
- **Impact**: Low -- it doesn't ship in the extension bundle. However, it adds maintenance surface: if design tokens change, the hardcoded values in CatalogApp.tsx (COLORS, SPACING, RADII arrays) will drift from `tokens.css`.
- **Recommendation**: Either (a) delete it if no longer needed, (b) move it to a docs workspace, or (c) add a note in CLAUDE.md about its purpose so it doesn't get accidentally deleted.

---

## Low Findings

### L1. 16 non-test source files exceed 500 lines
- **Top offenders**: `agent-runner-skills.ts` (1565), `archive.ts handlers` (1483), `NestTab.tsx` (1372), `usePopupOrchestration.ts` (1173), `green-goods.ts executors` (970), `agent-output-handlers.ts` (905), `ChickensTab.tsx` (894)
- **Positive trend**: The two worst god objects from the prior extension audit (`tabs.tsx` 1728 and `operator-sections.tsx` 1252) have been fully decomposed into focused files.
- **Note**: Maximum file size dropped from 2039 to 1565. The count (16) is higher because previously barrel-hidden files are now individually counted.

### L2. 2 TODO markers
- `background/handlers/review.ts:66` -- ZK proof delegation (same as M1, DEFERRED)
- `background/dashboard.ts:119` -- Missing blue icon assets for "working" state

### L3. Duplicate named + default exports in 11 operator section files
- **Files**: All files in `views/Sidepanel/operator-sections/` export both a named export and a `default` export (e.g., `AgentMemorySection` + `export default AgentMemorySection`).
- **Impact**: Cosmetic -- both work, but the barrel `index.ts` only re-exports the named exports. The default exports are unused.
- **Recommendation**: Remove the default exports for consistency with the rest of the codebase which uses named exports.

---

## Dead Code (knip results -- extension workspace only)

### Unused Files (11 -- all false positives)
| File | Reason |
|------|--------|
| `entrypoints/agent-webllm-worker.ts` | WXT entrypoint (knip can't trace) |
| `entrypoints/background.ts` | WXT entrypoint (knip can't trace) |
| `entrypoints/inference-worker.ts` | WXT entrypoint (knip can't trace) |
| `entrypoints/receiver-bridge.content.ts` | WXT content script (knip can't trace) |
| `src/background.ts` | Service worker entry (manifest reference) |
| `src/catalog/CatalogApp.tsx` | Catalog UI -- dev-only (M3) |
| `src/catalog/main.tsx` | Catalog UI -- dev-only (M3) |
| `src/runtime/agent-webllm-worker.ts` | Worker loaded via `new Worker()` |
| `src/views/Popup/main.tsx` | HTML entrypoint (knip can't trace) |
| `src/views/Sidepanel/main.tsx` | HTML entrypoint (knip can't trace) |
| `wxt.config.ts` | WXT config (not TS import) |

**Genuinely dead**: 0 files (catalog stubs are dev-only, noted in M3). All others are entry points or workers that knip cannot trace through the WXT/Vite build.

### Unused Dependencies (0 genuine)
| Dependency | knip Status | Actual Status |
|-----------|-------------|---------------|
| `permissionless` | Unused | Used through `@coop/shared` + wxt build plugin |
| `@wxt-dev/module-react` (dev) | Unused devDep | Used in `wxt.config.ts` modules array |

### Unused Exports (36 groups)
Most are background handler functions consumed through dynamic `chrome.runtime.onMessage` dispatch, test fixture factories, and barrel re-exports. The extension's message-based architecture makes these invisible to static analysis.

### Unused Exported Types (45 groups)
Primarily component prop types (`*Props`, `*Deps`) and hook return types. Many are consumed by co-located files or tests.

### Duplicate Exports (11 groups)
Named + default export pairs in all operator section files. See L3.

---

## Architectural Anti-Patterns

| Anti-Pattern | Location | Lines | Status | Severity |
|--------------|----------|-------|--------|----------|
| God Object | `runtime/agent-runner-skills.ts` | 1565 | Stable (split from 2039-line agent-runner) | MEDIUM |
| God Object | `background/handlers/archive.ts` | 1483 | Growing (+457 since 03-19) | MEDIUM |
| God Object | `views/Sidepanel/tabs/NestTab.tsx` | 1372 | Stable (was part of 1728-line tabs.tsx) | MEDIUM |
| God Object | `views/Popup/hooks/usePopupOrchestration.ts` | 1173 | Stable | MEDIUM |
| God Object | `background/handlers/executors/green-goods.ts` | 970 | Stable | LOW |
| God Object | `runtime/agent-output-handlers.ts` | 905 | Stable | LOW |
| God Object | `views/Sidepanel/tabs/ChickensTab.tsx` | 894 | Stable | LOW |
| God Object | `background/handlers/session.ts` | 841 | Stable | LOW |
| God Object | `background.ts` | 825 | Growing (+164 since 03-19) | LOW |
| God Object | `background/dashboard.ts` | 819 | Stable | LOW |
| God Object | `runtime/messages.ts` | 789 | Stable | LOW |
| God Object | `background/context.ts` | 777 | Growing (+208 since 03-19) | LOW |
| God Object | `background/handlers/capture.ts` | 774 | Stable | LOW |
| God Object | `runtime/agent-models.ts` | 735 | Stable | LOW |
| God Object | `views/Sidepanel/tabs/RoostTab.tsx` | 720 | Stable | LOW |
| God Object | `views/Sidepanel/operator-sections/GardenRequestsSection.tsx` | 718 | Stable | LOW |
| Phantom Dep | `session.ts` imports `@rhinestone/module-sdk` not in package.json | -- | NEW | MEDIUM |

---

## Trend (last 3 extension-relevant audits)

| Metric | 2026-03-19 (ext) | 2026-04-01 (full) | **2026-04-02 (ext)** |
|--------|------------------|-------------------|----------------------|
| Critical | 0 | 0 | **0** |
| High | 3 | 0 | **0** |
| Medium | 8 | 6 (2 ext-specific) | **3** |
| Low | 3 | 3 | **3** |
| Source type errors | 38 | 0 | **0** |
| Test type errors | 191 | 0 | **0** |
| Lint errors (ext) | 1 | 0 | **0** |
| Unused files (knip) | 18 | 14 (all) | **11** (0 genuine) |
| Unused exports (knip) | 18 groups | 43 groups (all) | **36 groups** |
| Unused types (knip) | 7 groups | 50 groups (all) | **45 groups** |
| God objects (>500 lines, non-test) | 11 | 35 (all) | **16** |
| Max file size (non-test) | 2039 | 1565 | **1565** |
| Findings fixed (from prev) | 7 | 14 | **9** |
| Findings opened | 3 | 3 | **2** |
| Resolution velocity | 2.3 | 4.67 | **4.5** |

**Observations**:
- **Resolution velocity 4.5**: Excellent. 9 findings fixed vs 2 new. All HIGHs from previous audits resolved.
- **Zero type errors across source and tests**: Major improvement from 191 test type errors in the 03-19 audit.
- **Zero lint errors**: Clean.
- **God object decomposition working**: `tabs.tsx` (1728) and `operator-sections.tsx` (1252) are gone. The remaining large files are structurally justified (handler collections, skill implementations).
- **`archive.ts` and `context.ts` are growing**: Both have increased significantly since the 03-19 audit. Monitor for decomposition opportunities.
- **Only 1 production `as any`**: `agent-models.ts:215` (ACCEPTED). All other `as any` usage is in test files.

---

## Recommendations (Priority Order)

1. **Add `@rhinestone/module-sdk` to `packages/extension/package.json`** -- or re-export through `@coop/shared`. Phantom dependency is fragile. (Medium, M2)

2. **Decide on catalog stubs** -- delete, move to docs workspace, or document. 374+ lines of unmaintained dev tooling. (Medium, M3)

3. **Remove duplicate default exports from operator sections** -- 11 files export both named and default. Only named exports are consumed. (Low, L3)

4. **Create blue icon assets for "working" state** -- `dashboard.ts:119` TODO. Currently reuses green "watching" icons. (Low, L2)

5. **Monitor `archive.ts` growth** -- At 1483 lines and growing. Consider splitting into archive-setup, archive-upload, archive-recovery, and archive-fvm sub-handlers before it crosses 2000. (Observational)

---

## Next Steps

> **This audit is read-only.** To apply fixes, reply with:
> - `fix M2` -- add rhinestone dependency to extension package.json
> - `fix M3` -- remove catalog stubs
> - `fix L3` -- remove duplicate default exports
> - `fix all` -- address all findings by priority
> - `fix M2, L3` -- address specific findings by ID
