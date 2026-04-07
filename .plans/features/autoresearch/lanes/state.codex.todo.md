---
feature: autoresearch
title: State — Schemas, Tables & Variant Storage
lane: state
agent: codex
status: done
source_branch: feature/autoresearch
work_branch: codex/state/autoresearch
depends_on:
  - ../spec.md
owned_paths:
  - packages/shared/src/contracts/schema-agent.ts
  - packages/shared/src/modules/storage/
done_when:
  - experimentRecordSchema
  - skillVariantSchema
  - autoresearchConfigSchema
  - skillVariants
  - experimentRecords
skills:
  - testing
  - data-layer
updated: 2026-04-06
---

# State — Schemas, Tables & Variant Storage

Provides the persistence layer for experiments, variants, and configuration. All schemas in
`@coop/shared` contracts, all tables in existing Dexie database.

## Objective

Define Zod schemas for experiment records, skill variants, and autoresearch config. Add Dexie tables
with proper indexes. Implement CRUD operations for variant engine storage.

## Files

- `packages/shared/src/contracts/schema-agent.ts` — add schemas
- `packages/shared/src/modules/storage/` — add tables to existing db
- `packages/shared/src/modules/storage/__tests__/autoresearch-state.test.ts` — new test file

## Tasks

### 1.1 RED — Failing tests for schemas

- [x] Test: `experimentRecordSchema` validates valid record
- [x] Test: `experimentRecordSchema` rejects missing `skillId`
- [x] Test: `experimentRecordSchema` rejects `outcome` not in enum
- [x] Test: `skillVariantSchema` validates valid variant
- [x] Test: `skillVariantSchema` rejects empty `promptText`
- [x] Test: `autoresearchConfigSchema` validates config with defaults
- [x] Test: `autoresearchConfigSchema` enforces `qualityFloor` range 0.0-1.0

### 1.2 GREEN — Implement schemas

- [x] Add `experimentRecordSchema` to schema-agent.ts:
  - `id`, `skillId`, `variantId`, `baselineVariantId`
  - `promptDiff` (string), `compositeScore`, `baselineScore`, `delta`
  - `fixtureResults` (array of fixture result summaries)
  - `outcome` enum: `kept | reverted | pending`
  - `duration` (ms), `createdAt` (timestamp)
- [x] Add `skillVariantSchema`:
  - `id`, `skillId`, `promptText`, `promptHash` (content-addressable)
  - `isActive` (boolean), `isBaseline` (boolean)
  - `parentVariantId` (nullable — tracks lineage)
  - `compositeScore` (nullable — set after eval)
  - `createdAt`, `activatedAt` (nullable)
- [x] Add `autoresearchConfigSchema`:
  - `skillId`, `enabled` (boolean, default false)
  - `maxExperimentsPerCycle` (default 5)
  - `timeBudgetMs` (default 60000)
  - `qualityFloor` (default 0.3, range 0.0-1.0)
  - `updatedAt`
- [x] Export types: `ExperimentRecord`, `SkillVariant`, `AutoresearchConfig`

### 1.3 RED — Failing tests for Dexie tables

- [x] Test: `skillVariants` table stores and retrieves variant by id
- [x] Test: `skillVariants` table indexes by `[skillId+isActive]`
- [x] Test: `experimentRecords` table stores and retrieves by id
- [x] Test: `experimentRecords` table indexes by `[skillId+createdAt]`
- [x] Test: `experimentRecords` query returns descending by createdAt
- [x] Test: pruning deletes reverted records older than 30 days

### 1.4 GREEN — Implement tables

- [x] Add `skillVariants` table to Dexie schema with indexes: `id`, `[skillId+isActive]`, `promptHash`
- [x] Add `experimentRecords` table with indexes: `id`, `[skillId+createdAt]`, `outcome`
- [x] Add `autoresearchConfigs` table with index: `skillId`
- [x] Implement `pruneRevertedExperiments(olderThanDays)` utility
- [x] Bump Dexie schema version

### 1.5 REFACTOR

- [x] Verify schema exports are accessible from `@coop/shared`
- [x] Ensure no breaking changes to existing agent schemas
- [x] Run `bun run validate typecheck` across workspace

## Verification

```bash
bun run test -- autoresearch-state
bun run validate typecheck
```

## Handoff Notes

The runtime lane needs: `ExperimentRecord`, `SkillVariant`, `AutoresearchConfig` types and
the Dexie table CRUD. Ensure `promptHash` generation is deterministic (SHA-256 of prompt text).
