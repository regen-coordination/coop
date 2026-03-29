# Audit Report -- 2026-03-19 (contracts)

## Executive Summary
- **Package analyzed**: `packages/shared/src/contracts/` (schema.ts + index.ts + 1 test file)
- **Critical**: 0 | **High**: 0 | **Medium**: 3 | **Low**: 3
- **Dead code**: 0 unused files, 0 unused exports, 0 unused types
- **Lint errors**: 0
- **Type errors**: 0 (`tsc --noEmit` clean for shared)
- **Tests**: 1 test file, 4 tests -- all passing
- **Architectural anti-patterns**: 1 god object (1959 lines), 1 domain logic placement concern
- **TODO markers**: 0
- **Mode**: Single-agent (targeted sub-package audit)

---

## Previous Findings Status

_Tracked from: 2026-03-19 (full codebase audit) + 2026-03-19 (shared audit)_

### Critical Findings
| ID | Finding | File | Status | Notes |
|----|---------|------|--------|-------|
| C1 | `privilegedActionTypeSchema` missing ERC-8004 and FVM action types | `shared/contracts/schema.ts:89-99` | **FIXED** | All three action types now present (confirmed at lines 96-98) |

### High Findings
No previous High findings were scoped to contracts.

### Medium Findings
No previous Medium findings were scoped to contracts.

### From Dead Code / Architectural sections
| ID | Finding | Status | Notes |
|----|---------|--------|-------|
| -- | God Object: `schema.ts` (1958 lines) | **STILL OPEN, cycle 3** | Now 1959 lines. Accepted as single source of truth by design. See L1. |

---

## Medium Findings

### M1. 6 `z.record(z.any())` usages bypass type safety on payload fields [NEW]
- **Files**: `packages/shared/src/contracts/schema.ts:176,462,548,785,828,1366`
- **Issue**: Six schema fields use `z.record(z.any())`, which accepts any key-value pairs without validation. The affected schemas are:
  - `actionBundleSchema.payload` (line 176) -- action bundle payloads
  - `actionProposalSchema.payload` (line 462) -- agent action proposals
  - `agentObservationSchema.payload` (line 548) -- observation context data
  - `skillRunSchema.output` (line 785) -- skill execution output
  - `agentLogSchema.data` (line 828) -- structured log data
  - `archiveBundleSchema.payload` (line 1366) -- archive bundle content
- **Impact**: These bypass Zod validation entirely for the payload/output/data fields. The `actionBundleSchema.payload` is the most concerning because `action-bundle.ts` then manually parses fields with `readRequiredString(input.payload, ...)` -- a runtime mini-parser that reimplements what Zod should do. If a payload shape changes, there is no compile-time signal; only the manual reader functions catch it at runtime.
- **Recommendation**: For `actionBundleSchema` and `actionProposalSchema`, consider using a discriminated union on `actionClass` with per-class payload schemas. For `skillRunSchema.output`, a discriminated union on `outputSchemaRef` could provide type-safe output parsing. The `agentLogSchema.data` field is acceptably generic (structured logging).

### M2. Near-duplicate bootstrap snapshot schemas diverge only on `syncRoom` type [NEW]
- **File**: `packages/shared/src/contracts/schema.ts:1590-1618`
- **Issue**: `inviteCoopBootstrapSnapshotSchema` (lines 1590-1603) and `coopBootstrapSnapshotSchema` (lines 1605-1618) are identical except for the `syncRoom` field: the invite variant uses `syncRoomBootstrapSchema` while the full variant uses `syncRoomConfigSchema`. All 11 other fields are duplicated verbatim.
- **Impact**: Any field added to one must be manually added to the other, creating drift risk. The `coopSharedStateSchema` (lines 1651-1669) also shares the same core shape but adds `invites`, `agentIdentity`, `archiveConfig`, `memberCommitments`, and `fvmState`, tripling the maintenance surface for what is conceptually one evolving shape.
- **Recommendation**: Define a base schema and use `.extend()` or `.merge()` for variants:
  ```typescript
  const baseBootstrapFields = { profile, setupInsights, soul, ... };
  export const inviteCoopBootstrapSnapshotSchema = z.object({ ...baseBootstrapFields, syncRoom: syncRoomBootstrapSchema });
  export const coopBootstrapSnapshotSchema = z.object({ ...baseBootstrapFields, syncRoom: syncRoomConfigSchema });
  ```

### M3. Near-duplicate Request vs Output schemas for Green Goods work approval and assessment [NEW]
- **File**: `packages/shared/src/contracts/schema.ts:683-745`
- **Issue**: `greenGoodsWorkApprovalRequestSchema` (lines 683-692) and `greenGoodsWorkApprovalOutputSchema` (lines 715-724) are nearly identical -- the only difference is the `rationale` field: the request has `.default('Queue a Green Goods work approval attestation.')` while the output has `.min(1)` only. Similarly, `greenGoodsAssessmentRequestSchema` and `greenGoodsAssessmentOutputSchema` both duplicate the same `superRefine` date validation logic and differ only in the `rationale` default.
- **Impact**: If a field is added to the request but not the output (or vice versa), agent skill code and action-bundle resolution could silently drop or inject unexpected data. The duplicated `superRefine` blocks also must be kept in sync manually.
- **Recommendation**: Define a base schema and derive variants using `.extend()` or `.omit()`.

---

## Low Findings

### L1. `schema.ts` is a 1959-line single-file schema registry [STILL OPEN, cycle 3 -- ACCEPTED by design]
- **File**: `packages/shared/src/contracts/schema.ts`
- **Issue**: 177 exported const schemas + 167 exported types + 1 exported function in a single file. This is the single source of truth for all domain schemas.
- **Impact**: Navigation is difficult. However, splitting by domain (e.g., `agent-schemas.ts`, `archive-schemas.ts`, `greengoods-schemas.ts`) would introduce import complexity and risk circular references due to cross-domain schema composition (e.g., `coopSharedStateSchema` composes schemas from agent, archive, green goods, privacy, and onchain domains).
- **Note**: This finding was marked LOW in the 2026-03-19 full audit and shared audit. It is a deliberate design choice -- single source of truth. Escalation not applied (structurally accepted).

### L2. `supportedOnchainChainIds` is not exported but duplicated in consumers [NEW]
- **File**: `packages/shared/src/contracts/schema.ts:887-890`
- **Issue**: The `supportedOnchainChainIds` map (`{ arbitrum: 42161, sepolia: 11155111 }`) is declared as a private `const` (not exported). Other modules (e.g., `action-bundle.ts:721`, test files) hardcode `11155111` or `42161` literals directly.
- **Impact**: Low -- the chain IDs are well-known constants unlikely to change. But if a new chain is added to `coopChainKeySchema`, consumers will not be forced to update.
- **Recommendation**: Export `supportedOnchainChainIds` and import it where chain ID mapping is needed.

### L3. Runtime migration logic (`normalizeLegacyOnchainState`) lives in the schema file [NEW]
- **File**: `packages/shared/src/contracts/schema.ts:882-919`
- **Issue**: The `normalizeLegacyOnchainState` function and `legacyOnchainChainKeyMap` constant (37 lines) are runtime data migration logic, not schema definitions. This function transforms legacy Celo chain keys to Arbitrum/Sepolia and is called from `db.ts` during coop state loading.
- **Impact**: Low -- the function is small, well-tested (dedicated tests in `migration.test.ts` and `onchain.test.ts`), and logically related to `onchainStateSchema`. However, it sets a precedent for placing migration logic in the schema file.
- **Recommendation**: Consider moving to `modules/storage/migration.ts` or `modules/onchain/legacy.ts` to keep `schema.ts` purely declarative. Not urgent.

---

## Dead Code

None. All exports from `contracts/schema.ts` are consumed via `contracts/index.ts` -> `app-entry.ts` -> `@coop/shared` barrel. Knip reports 0 unused exports for the shared workspace.

---

## Architectural Anti-Patterns

| Anti-Pattern | Location | Lines | Cycles Open | Severity |
|--------------|----------|-------|-------------|----------|
| God Object | `contracts/schema.ts` | 1959 | 3 | LOW (accepted by design) |
| Weak Typing | `z.record(z.any())` in 6 payload fields | -- | 1 | MEDIUM |
| Schema Duplication | Bootstrap snapshot x2 + shared state | -- | 1 | MEDIUM |
| Schema Duplication | GreenGoods Request vs Output x2 | -- | 1 | MEDIUM |
| Mixed Concerns | Migration logic in schema file | -- | 1 | LOW |

---

## Test Coverage

The contracts directory has **1 test file** covering only `coopSoulSchema` (4 tests). The following schemas have no dedicated contract-level tests:

- `onchainStateSchema` `superRefine` (chain ID cross-validation) -- tested indirectly via `migration.test.ts` and `onchain.test.ts`
- `agentMemorySchema` `superRefine` (scope-based required fields) -- tested indirectly via `memory.test.ts`
- `greenGoodsAssessmentRequestSchema` `superRefine` (date validation) -- no test found
- `greenGoodsAssessmentOutputSchema` `superRefine` (date validation) -- no test found
- `stealthMetaAddressSchema` `.refine()` (min length 134) -- no test found

The `superRefine` and `refine` validators contain business logic that should have dedicated unit tests.

---

## Trend (last 3 audits)

| Metric | 2026-03-19 (full) | 2026-03-19 (shared) | 2026-03-19 (contracts) |
|--------|-------------------|---------------------|------------------------|
| Critical | 1 | 0 | **0** |
| High | 7 | 1 | **0** |
| Medium | 8 | 4 | **3** |
| Low | 3 | 3 | **3** |
| Type errors | 0 (shared) | 0 | **0** |
| Tests | -- | 976/976 | **4/4** |
| Schema exports | -- | -- | **177 schemas, 167 types** |
| `z.any()` usages | -- | -- | **6** |
| Findings fixed | -- | 1 (C1) | **1** (C1 confirmed) |
| Findings opened | -- | 5 | **6** (M1-M3, L1-L3) |

**Observations**: The contracts package is type-safe, lint-clean, and has zero unused code. The previous Critical finding (schema drift with extension consumers) is confirmed fixed. The main quality concerns are: (1) `z.record(z.any())` payload typing that pushes validation to runtime, (2) schema duplication across bootstrap/shared-state variants, and (3) thin test coverage for `superRefine` business logic. The file size (1959 lines) is acceptable as the single source of truth for all Zod domain schemas.

---

## Recommendations (Priority Order)

1. **Add tests for `superRefine` validators** -- The `greenGoodsAssessmentRequestSchema` date validation and `agentMemorySchema` scope validation contain business logic with no dedicated unit tests. A single test file covering these refinements would improve confidence in schema changes. (Test coverage gap)

2. **Consider typed payload discriminated unions for `actionBundleSchema`** -- The 6 `z.record(z.any())` usages in payload fields push validation to runtime manual parsing in `action-bundle.ts`. A discriminated union on `actionClass` would provide compile-time safety. This is a significant refactoring effort. (M1)

3. **DRY the bootstrap snapshot schemas** -- Extract shared fields into a base object and use `.extend()` for `inviteCoopBootstrapSnapshotSchema`, `coopBootstrapSnapshotSchema`, and `coopSharedStateSchema`. (M2)

4. **DRY the Green Goods Request/Output pairs** -- Derive output schemas from request schemas (or define a shared base) to eliminate duplicated `superRefine` blocks. (M3)

5. **Export `supportedOnchainChainIds`** -- Replace hardcoded chain ID literals in consumer code with this map. (L2)
