# Audit Report -- 2026-03-19 (shared)

## Executive Summary
- **Package analyzed**: @coop/shared
- **Critical**: 0 | **High**: 1 | **Medium**: 4 | **Low**: 3
- **Dead code**: 1 unused file (false positive), 0 unused exports, 0 unused types, 4 unused deps
- **Lint errors**: 0 (shared package clean)
- **Type errors**: 0 (`tsc --noEmit` passes clean)
- **Tests**: 66 files, 976 tests -- all passing
- **Architectural anti-patterns**: 5 god objects (>500 lines), 0 package .env files, 3 unlisted deps
- **TODO markers**: 0
- **Mode**: Single-agent (targeted package audit)

---

## Previous Findings Status

_Tracked from: 2026-03-19 (full codebase audit)_

### Critical Findings
| ID | Finding | File | Status | Notes |
|----|---------|------|--------|-------|
| C1 | `privilegedActionTypeSchema` missing ERC-8004 and FVM action types | `shared/contracts/schema.ts:89-99` | **FIXED** | All three action types (`erc8004-registration`, `erc8004-feedback`, `fvm-register-archive`) are now present in the enum |

### High Findings (shared-scoped only)
| ID | Finding | File | Status | Notes |
|----|---------|------|--------|-------|

No previous High findings were scoped to shared.

### Medium Findings (shared-scoped only)
| ID | Finding | Status | Notes |
|----|---------|--------|-------|

No previous Medium findings were scoped to shared.

### From Dead Code section
| ID | Finding | Status | Notes |
|----|---------|--------|-------|
| -- | `app-entry.ts` flagged as unused file | **FALSE POSITIVE** | Used as Vite alias in `packages/app/vite.config.ts:10` and `vitest.config.ts:6` |
| -- | 4 Safe SDK deps flagged as unused | **STILL OPEN** | `@safe-global/protocol-kit`, `relay-kit`, `sdk-starter-kit`, `types-kit` -- zero imports found anywhere in shared source |
| -- | `@coop/api` unlisted dependency | **STILL OPEN** | Imported in `sync.ts`, `pairing.ts`, `receiver/sync.ts` -- works via workspace hoisting but not declared in package.json |

---

## High Findings

### H1. `archive/setup.ts` accesses Storacha client private API (`_agent`) [NEW]
- **File**: `packages/shared/src/modules/archive/setup.ts:76-77`
- **Issue**: The function `extractClientCredentials` accesses `client._agent.issuer` through a double type assertion (`as unknown as { _agent: ... }`). The `_agent` property is a private implementation detail of the `@storacha/client` package. This coupling means any minor version bump to `@storacha/client` could silently break the archive credential extraction flow with no compile-time warning.
- **Impact**: If `@storacha/client` refactors its internal `_agent` structure, `provisionStorachaSpace` will throw at runtime, breaking the entire archive setup flow. The double type assertion bypasses all TypeScript safety.
- **Recommendation**: Check if `@storacha/client` exposes a public API for retrieving the agent's signing key. If not, pin the `@storacha/client` version and add an integration test that verifies the internal structure is still accessible. Document the coupling with a comment citing the specific version tested.

---

## Medium Findings

### M1. `bytesToBase64` duplicated in 3 files [NEW]
- **Files**: `packages/shared/src/utils/index.ts:154`, `packages/shared/src/modules/archive/setup.ts:16`, `packages/shared/src/modules/archive/storacha.ts:72`
- **Issue**: The same byte-to-base64 encoding function is defined three times. The `utils/index.ts` version is browser-only (uses `btoa`). The `setup.ts` and `storacha.ts` versions are identical and include a Node.js `Buffer` fallback.
- **Recommendation**: Consolidate into a single exported function in `utils/index.ts` with the Buffer fallback. Import it in both archive modules.

### M2. Inconsistent timestamp creation -- `new Date().toISOString()` vs `nowIso()` [NEW]
- **Files**:
  - `packages/shared/src/modules/storage/db.ts:416,1053`
  - `packages/shared/src/modules/coop/pipeline.ts:95,414,445`
  - `packages/shared/src/modules/archive/export.ts:74`
- **Issue**: The shared package rule states "Never use `Date.now()` directly for stored timestamps. Use `nowIso()`." While the rule specifically mentions `Date.now()`, the spirit of the rule is to centralize timestamp generation for testability. Six locations in production code use `new Date().toISOString()` instead of the `nowIso()` utility, making it harder to mock timestamps in tests or add future instrumentation.
- **Recommendation**: Replace all `new Date().toISOString()` in production code with `nowIso()`. The function already exists and is imported in many modules.

### M3. 4 unused Safe SDK dependencies inflate install/bundle size [STILL OPEN, cycle 2]
- **File**: `packages/shared/package.json:24-27`
- **Issue**: `@safe-global/protocol-kit`, `@safe-global/relay-kit`, `@safe-global/sdk-starter-kit`, and `@safe-global/types-kit` are listed as dependencies but have zero imports in any shared source file.
- **Impact**: Unnecessary dependency weight. These packages pull in significant transitive dependency trees (ethers.js via protocol-kit, etc.), increasing install time and potential supply chain attack surface.
- **Recommendation**: Remove all four packages from shared's `package.json`. If they are needed in the future for a planned Safe integration, re-add them when the implementation lands.

### M4. `@coop/api` is an unlisted dependency [STILL OPEN, cycle 2]
- **Files**: `packages/shared/src/modules/coop/sync.ts:1`, `packages/shared/src/modules/receiver/pairing.ts:1`, `packages/shared/src/modules/receiver/sync.ts:1`
- **Issue**: Three shared modules import from `@coop/api` (for `defaultIceServers`, `defaultSignalingUrls`, `filterUsableSignalingUrls`), but `@coop/api` is not listed in shared's `package.json` dependencies. This works due to Bun workspace hoisting but would break if shared were consumed standalone or if hoisting behavior changes.
- **Recommendation**: Either add `@coop/api` as a dependency in shared's `package.json` using workspace protocol (`"@coop/api": "workspace:*"`), or move the shared utilities (`defaultIceServers`, etc.) into `@coop/shared` and have `@coop/api` import from shared instead (inverting the dependency).

---

## Low Findings

### L1. 5 files exceed 500 lines (god objects)
- `contracts/schema.ts` (1959 lines) -- single source of truth by design, acceptable
- `modules/policy/action-bundle.ts` (1101 lines) -- typed bundle resolution for many action classes
- `modules/greengoods/greengoods.ts` (1071 lines) -- end-to-end Green Goods onchain integration
- `modules/storage/db.ts` (1056 lines) -- Dexie schema versions + CRUD operations
- `modules/session/session.ts` (771 lines) -- session key management

### L2. `membership-proof.ts` uses double type assertions for Semaphore interop [NEW]
- **File**: `packages/shared/src/modules/privacy/membership-proof.ts:14-15,23`
- **Issue**: Both `generateMembershipProof` and `verifyMembershipProof` use `as unknown as` to bridge between the Coop `MembershipProof` type and Semaphore's internal types. The function parameters are typed as `unknown` rather than the Semaphore types.
- **Impact**: Low -- this is a deliberate interop boundary. The Semaphore library will throw meaningful errors if shapes mismatch. Acceptable pattern for ZK proof library integration.

### L3. `session.ts:118` -- `salt as unknown as BufferSource` type assertion [NEW]
- **File**: `packages/shared/src/modules/session/session.ts:118`
- **Issue**: PBKDF2 salt parameter requires a type assertion to `BufferSource`. This is a known TypeScript Web Crypto API typing gap where `Uint8Array` satisfies `BufferSource` at runtime but the type definitions are strict.
- **Impact**: Low -- standard Web Crypto pattern; works correctly at runtime.

---

## Dead Code (knip results)

### Unused Files (1 -- false positive)
- `packages/shared/src/app-entry.ts` -- **NOT dead code**. Used as a Vite resolve alias in `packages/app/vite.config.ts:10` (`'@coop/shared': path.resolve(..., 'app-entry.ts')`) and `vitest.config.ts:6`. Knip cannot trace Vite alias resolution.

### Unused Dependencies (4)
| Package | Dependency | Status |
|---------|-----------|--------|
| shared | `@safe-global/protocol-kit` | Unused -- 0 imports |
| shared | `@safe-global/relay-kit` | Unused -- 0 imports |
| shared | `@safe-global/sdk-starter-kit` | Unused -- 0 imports |
| shared | `@safe-global/types-kit` | Unused -- 0 imports |

### Unlisted Dependencies (3)
| Consumer File | Unlisted Dep |
|--------------|-------------|
| `coop/sync.ts` | `@coop/api` |
| `receiver/pairing.ts` | `@coop/api` |
| `receiver/sync.ts` | `@coop/api` |

### Unused Exports
None detected by knip for this workspace.

### Unused Exported Types
None detected by knip for this workspace.

---

## Architectural Anti-Patterns

| Anti-Pattern | Location | Lines | Cycles Open | Severity |
|--------------|----------|-------|-------------|----------|
| God Object | `contracts/schema.ts` | 1959 | 2 | LOW (by design) |
| God Object | `modules/policy/action-bundle.ts` | 1101 | 2 | LOW |
| God Object | `modules/greengoods/greengoods.ts` | 1071 | 2 | MEDIUM |
| God Object | `modules/storage/db.ts` | 1056 | 2 | MEDIUM |
| God Object | `modules/session/session.ts` | 771 | 2 | LOW |
| Private API coupling | `archive/setup.ts:76` (Storacha `_agent`) | -- | 1 | HIGH |
| Code duplication | `bytesToBase64` in 3 files | -- | 1 | MEDIUM |
| Unlisted dependency | `@coop/api` in 3 modules | -- | 2 | MEDIUM |

---

## Trend (last 2 audits)

| Metric | 2026-03-19 (full) | 2026-03-19 (shared) |
|--------|-------------------|---------------------|
| Critical | 1 | **0** |
| High | 7 (3 shared-scoped) | **1** |
| Medium | 8 (2 shared-scoped) | **4** |
| Low | 3 | **3** |
| Unused files (knip) | 31 (1 shared) | **0** (1 false positive) |
| Unused exports (knip) | 20 groups | **0** |
| Unused types (knip) | 13 groups | **0** |
| Unused deps (knip) | 7 (4 shared) | **4** |
| Type errors | 0 (shared) | **0** |
| Tests passing | -- | **976/976** |
| God objects (>500 lines, non-test) | 15 (5 shared) | **5** |
| Findings fixed | -- | **1** (C1) |
| Findings opened | -- | **5** (H1, M1, M2, M3-carry, M4-carry) |
| Resolution velocity | -- | **0.2** (1 fixed / 5 open) |

**Observations**: The shared package is in solid health. Type checking passes clean, all 976 tests pass, zero lint issues, and zero unused exports or types. The previous Critical finding (C1 -- schema drift) has been fixed. The main concerns are: (1) private API coupling in the Storacha integration that could break silently on version bumps, (2) code duplication in base64 encoding, and (3) 4 unused Safe SDK dependencies adding unnecessary weight. The unlisted `@coop/api` dependency is a structural issue that should be addressed to ensure the shared package works correctly outside of workspace hoisting.

---

## Recommendations (Priority Order)

1. **Pin `@storacha/client` version and add integration test** -- The private `_agent` API access at `setup.ts:76` is a fragile coupling. Document the tested version and add a smoke test that verifies the internal structure. (H1)

2. **Remove 4 unused Safe SDK dependencies** -- `@safe-global/protocol-kit`, `relay-kit`, `sdk-starter-kit`, `types-kit` have zero imports. Removing them reduces install size and supply chain surface. (M3)

3. **Consolidate `bytesToBase64` into `utils/index.ts`** -- Add the Buffer fallback to the canonical version and remove the two private copies in archive modules. (M1)

4. **Replace `new Date().toISOString()` with `nowIso()`** -- 6 occurrences in production code. Consistency with existing utility and future testability. (M2)

5. **Declare `@coop/api` as a workspace dependency** -- Add `"@coop/api": "workspace:*"` to shared's `package.json` to make the dependency explicit. (M4)
