# Audit Report -- 2026-04-02 (shared)

## Executive Summary
- **Package analyzed**: @coop/shared
- **Critical**: 0 | **High**: 0 | **Medium**: 3 | **Low**: 3
- **Dead code**: 0 unused files, 6 unused export groups (all false positives via Vite alias), 2 unused type groups (1 genuine), 0 unused deps
- **Lint errors**: 0
- **Type errors**: 0 (`tsc --noEmit` passes clean)
- **Architectural anti-patterns**: 5 circular dependency cycles, 8 god objects (>500 lines, non-test), 0 package .env files
- **TODO markers**: 0
- **Mode**: Single-agent (targeted package audit)

### Key Headlines

**All prior findings resolved or improved.** The 4 unused Safe SDK deps (M3 prior) were removed. The `@coop/api` dependency (M4 prior) is now declared in `package.json`. The `bytesToBase64` duplication (M1 prior) is consolidated. The `new Date().toISOString()` inconsistency (M2 prior) is fixed -- only `nowIso()` itself uses `new Date().toISOString()` now.

**Storacha private API coupling documented and pinned.** The prior H1 (`_agent` access) has been partially mitigated: version pinned at exactly `2.1.1`, `FRAGILE` comment documents the coupling, and unit tests validate the structure. Downgraded to MEDIUM.

**5 circular dependency cycles detected.** New finding via `madge`. The most concerning is `auth.ts -> coop/flows.ts` which creates a deep cross-module cycle. The `onchain.ts <-> provider.ts` cycle is a co-located pattern that is lower risk.

---

## Previous Findings Status

_Tracked from: 2026-03-19 (shared-specific audit)_

### High Findings
| ID | Finding | File | Status | Notes |
|----|---------|------|--------|-------|
| H1 | `archive/setup.ts` accesses Storacha client private `_agent` API | `setup.ts:63` | **PARTIALLY FIXED** (3 cycles) | Version pinned at `2.1.1` (exact), `FRAGILE` comment added, unit tests mock the structure. No live integration test. Downgraded to MEDIUM given mitigation. |

### Medium Findings
| ID | Finding | Status | Notes |
|----|---------|--------|-------|
| M1 | `bytesToBase64` duplicated in 3 files | **FIXED** | Consolidated in `utils/index.ts`. All archive modules now import from utils. |
| M2 | Inconsistent `new Date().toISOString()` vs `nowIso()` | **FIXED** | Only `nowIso()` definition uses `new Date().toISOString()`. All production timestamps use `nowIso()`. Test files still use `new Date().toISOString()` which is acceptable. |
| M3 | 4 unused Safe SDK dependencies | **FIXED** | All 4 packages removed from `package.json`. |
| M4 | `@coop/api` unlisted dependency | **FIXED** | Now declared as `"@coop/api": "workspace:*"` in `package.json`. |

### Low Findings
| ID | Finding | Status | Notes |
|----|---------|--------|-------|
| L2 | `membership-proof.ts` double type assertions | **STILL OPEN** (3 cycles) | Same pattern at lines 14-15 and 23. Acceptable interop boundary for Semaphore ZK library. ACCEPTED. |
| L3 | `session.ts:135` salt type assertion | **STILL OPEN** (3 cycles) | `salt as unknown as BufferSource`. Standard Web Crypto typing gap. ACCEPTED. |

---

## Medium Findings

### M1. Storacha private API coupling [PARTIALLY FIXED, 3 cycles, downgraded from HIGH]
- **File**: `packages/shared/src/modules/archive/setup.ts:59-64`
- **Issue**: `extractClientCredentials` accesses `client._agent.issuer` through double type assertion. This is a private `@storacha/client` implementation detail.
- **Mitigation already in place**: Version pinned at exact `2.1.1`, `FRAGILE` comment documents the coupling, unit tests at `setup.test.ts:45,156` validate the structure.
- **Remaining risk**: A version bump to `@storacha/client` could silently break archive credential extraction with no compile-time warning. The tests only mock the structure -- they don't validate against the real library.
- **Recommendation**: Add a single integration test (gated behind `VITE_COOP_ARCHIVE_MODE=live`) that constructs a real `@storacha/client` and asserts `_agent.issuer` exists. This validates the coupling against the pinned version.

### M2. 5 circular dependency cycles [NEW]
- **Files**: Multiple modules across coop, auth, storage, blob, onchain, greengoods
- **Issue**: `madge` detected 5 cycles:
  1. `coop/pipeline.ts <-> coop/flows.ts` -- `pipeline` imports `createCoop` from `flows`, `flows` imports `buildMemoryProfileSeed` from `pipeline`
  2. `db.ts -> db-crud-content.ts -> pipeline.ts -> flows.ts -> sync.ts -> blob/channel.ts -> blob/store.ts -> db.ts` (deep storage/coop/blob cycle)
  3. `db.ts -> db-crud-content.ts -> pipeline.ts -> flows.ts -> sync.ts -> blob/channel.ts -> db.ts` (variant of cycle 2)
  4. `flows.ts -> greengoods.ts -> greengoods-authorization.ts -> greengoods-deployments.ts -> auth.ts -> flows.ts` (cross-module auth/coop cycle)
  5. `onchain.ts <-> provider.ts` (co-located mutual dependency)
- **Impact**: Circular deps can cause initialization-order bugs (TDZ errors) and make the module graph harder to reason about. Cycles 1 and 4 cross module boundaries (coop/auth, coop/greengoods) which is the more concerning pattern.
- **Recommendation**: Break cycle 1 by extracting `buildMemoryProfileSeed` into a separate utility that both `pipeline.ts` and `flows.ts` can import. Break cycle 4 by extracting `createMember`/`createDeviceBoundWarning` from `flows.ts` into a module that `auth.ts` can import without pulling in all of `flows.ts`.

### M3. `app-entry.ts` re-exports 2 unused types [NEW]
- **File**: `packages/shared/src/app-entry.ts:13,19`
- **Issue**: `RitualLensPreset` (line 13) and `TranscriptionResult` (line 19) are re-exported in `app-entry.ts` but never imported by the app package or any other consumer.
- **Impact**: Dead type exports. Low practical risk but adds noise to the public API surface of the app entry.
- **Recommendation**: Remove the two unused type re-exports from `app-entry.ts`.

---

## Low Findings

### L1. 8 files exceed 500 lines (non-test source)
- `archive/archive.ts` (1117) -- archive receipt building and verification
- `coop/flows.ts` (1026) -- coop lifecycle (create, join, invite, publish)
- `policy/action-payload-parsers.ts` (982) -- typed parser for each action class
- `coop/pipeline.ts` (972) -- signal pipeline and scoring
- `session/session.ts` (881) -- session key management
- `coop/sync.ts` (765) -- CRDT sync providers
- `greengoods/greengoods-garden.ts` (756) -- garden lifecycle
- `onchain/onchain.ts` (741) -- Safe + ERC-4337 interactions

These are all structurally justified (they represent complete domain concerns). `flows.ts` and `pipeline.ts` are the best candidates for further decomposition (they participate in circular dependency cycle 1).

### L2. `membership-proof.ts` double type assertions [ACCEPTED, 3 cycles]
- **File**: `packages/shared/src/modules/privacy/membership-proof.ts:14-15,23`
- **Status**: ACCEPTED. Deliberate interop boundary between Coop's Zod-inferred types and Semaphore's library types. The Semaphore library throws meaningful errors if shapes mismatch at runtime.

### L3. `session.ts:135` salt type assertion [ACCEPTED, 3 cycles]
- **File**: `packages/shared/src/modules/session/session.ts:135`
- **Status**: ACCEPTED. Standard Web Crypto API typing gap where `Uint8Array` satisfies `BufferSource` at runtime but TypeScript definitions are strict.

---

## Dead Code (knip results)

### Unused Files
None.

### Unused Dependencies
None.

### Unused Exports (6 groups -- all false positives)
All 6 groups are in `app-entry.ts` and re-exported module barrels. Every export is consumed by `packages/app/src` through the Vite alias `'@coop/shared': path.resolve(..., 'app-entry.ts')`. Knip cannot trace Vite alias resolution.

Verified consumers:
| Export | Consumer |
|--------|----------|
| `compressImage`, `generateThumbnailDataUrl` | `app/src/hooks/useCapture.ts:6` |
| `saveCoopBlob` | `app/src/hooks/useCapture.ts:17` |
| `getRitualLenses` | `app/src/views/Landing/index.tsx:4` |
| `synthesizeTranscriptsToPurpose` | `app/src/views/Landing/index.tsx:6` |
| `buildCoopArchiveStory`, `describeArchiveReceipt` | `app/src/views/Board/index.tsx:4,6` |
| `buildIceServers` | `app/src/hooks/useReceiverSync.ts:8` |
| `isWhisperSupported`, `transcribeAudio` | `app/src/hooks/useCapture.ts:13,19` |
| `createId`, `nowIso` | `app/src/hooks/useCapture.ts` (via @coop/shared) |
| `createDefaultSetupSummary`, `emptySetupInsightsInput`, `toSetupInsights` | `app/src/views/Landing/index.tsx` (via @coop/shared) |

### Unused Exported Types (2 groups -- 1 false positive, 1 genuine)
| Type | File | Status |
|------|------|--------|
| `TranscriptionResult` | `app-entry.ts:19`, `transcribe/index.ts:1` | **Genuinely unused** -- not imported by any consumer outside shared |
| `RitualLensPreset` | `app-entry.ts:13` | **Genuinely unused** -- not imported by any consumer outside shared |

---

## Architectural Anti-Patterns

| Anti-Pattern | Location | Lines | Cycles Open | Severity |
|--------------|----------|-------|-------------|----------|
| Circular dependency | `pipeline.ts <-> flows.ts` | -- | NEW | MEDIUM |
| Circular dependency | `db.ts -> ... -> store.ts -> db.ts` (deep) | -- | NEW | MEDIUM |
| Circular dependency | `flows.ts -> ... -> auth.ts -> flows.ts` | -- | NEW | MEDIUM |
| Circular dependency | `onchain.ts <-> provider.ts` | -- | NEW | LOW |
| Private API coupling | `archive/setup.ts:63` (Storacha `_agent`) | -- | 3 | MEDIUM |
| God Object | `archive/archive.ts` | 1117 | 2 | LOW |
| God Object | `coop/flows.ts` | 1026 | 2 | LOW |
| God Object | `policy/action-payload-parsers.ts` | 982 | 2 | LOW |

---

## Trend (last 3 audits)

| Metric | 2026-03-19 (full) | 2026-03-19 (shared) | **2026-04-02 (shared)** |
|--------|-------------------|---------------------|-------------------------|
| Critical | 1 | 0 | **0** |
| High | 7 (3 shared) | 1 | **0** |
| Medium | 8 (2 shared) | 4 | **3** |
| Low | 3 | 3 | **3** |
| Unused files (knip) | 31 (1 shared) | 0 | **0** |
| Unused exports (knip) | 20 groups | 0 | **6 (all false positives)** |
| Unused types (knip) | 13 groups | 0 | **2 (1 genuine)** |
| Unused deps (knip) | 7 (4 shared) | 4 | **0** |
| Type errors | 0 | 0 | **0** |
| Lint errors | 0 | 0 | **0** |
| Circular dep cycles | -- | -- | **5** |
| God objects (>500L) | 15 (5 shared) | 5 | **8** |
| Findings fixed | -- | 1 | **4** |
| Findings opened | -- | 5 | **2** |
| Resolution velocity | -- | 0.2 | **2.0** |

**Observations**:
- **Resolution velocity 2.0**: Strong improvement. 4 of 5 prior findings fixed, 2 new findings opened.
- **Zero type errors, zero lint errors, zero TODOs**: The shared package is in excellent health for its static analysis metrics.
- **Circular deps newly detected**: This is the first audit that ran `madge` on the shared package. The 5 cycles are likely long-standing and were not previously measured.
- **God object count increased 5 to 8**: The prior audit used a 700+ threshold for some files. Using a consistent 500-line threshold reveals 3 additional files. The actual complexity has not increased -- this is measurement refinement.
- **All `as any` usage is test-only**: Zero production `as any` in the shared package. The `as unknown as` casts in production code are all documented and justified (Storacha interop, Semaphore interop, Web Crypto typing gap, Dexie dynamic table access).
- **`Date.now()` usage is compliant**: All `Date.now()` calls are for ephemeral runtime comparisons (pruning, compaction, deduplication lookback), not stored timestamps. The `nowIso()` rule is followed for all stored timestamps.
- **No React hooks in shared**: Rule compliance verified.
- **No hardcoded chain IDs in production code**: Only test fixtures use literal chain IDs.

---

## Recommendations (Priority Order)

1. **Break circular dependency cycles 1 and 4** -- Extract `buildMemoryProfileSeed` into a shared utility to break `pipeline <-> flows`. Extract `createMember`/`createDeviceBoundWarning` into a separate module to break `auth -> flows`. (Medium, M2)

2. **Remove unused type re-exports from `app-entry.ts`** -- Delete lines 13 (`RitualLensPreset`) and 19 (`TranscriptionResult`). Trivial cleanup. (Medium, M3)

3. **Add live integration test for Storacha `_agent` access** -- A single test gated behind `VITE_COOP_ARCHIVE_MODE=live` that constructs a real client and asserts `_agent.issuer` exists. Validates the coupling against the pinned version. (Medium, M1)

4. **Consider decomposing `coop/flows.ts`** (1026 lines) -- This file participates in 2 of the 5 circular dependency cycles. Splitting it (e.g., separating coop creation from invite management from publish flows) would both reduce file size and make cycle-breaking easier. (Low, L1)

---

## Next Steps

> **This audit is read-only.** To apply fixes, reply with:
> - `fix M3` -- remove unused type re-exports (fastest win)
> - `fix M2` -- break circular dependency cycles
> - `fix all` -- address all findings by priority
> - `fix M1, M3` -- address specific findings by ID
