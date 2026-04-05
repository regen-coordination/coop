# ADR-006: Three-Format Artifact Sync with Read Fallback Chain

## Status

Accepted

## Date

2026-03-20 (v2 per-field Y.Map migration introduced)

## Context

Coop artifacts are synced between peers via a shared Yjs document. The original implementation stored each artifact as a JSON-serialized string in a `Y.Map`. This meant any field change (e.g., updating just the title) replaced the entire serialized blob, causing last-writer-wins conflicts on unrelated fields during concurrent edits.

To enable per-field concurrent merging, the sync layer was migrated to nested `Y.Map<Y.Map<string>>` structures where each artifact field is an independent Yjs entry. However, existing peers and persisted documents still contain data in older formats, requiring backward-compatible reads.

## Decision

Support three artifact sync formats with a read fallback chain, implemented in `packages/shared/src/modules/coop/sync.ts`:

1. **v2 (per-field Y.Map)**: Each artifact is a `Y.Map<string>` keyed by field name, nested inside a parent `Y.Map`. Writes always target this format via the `syncV2Map()` helper.
2. **v1 (per-artifact JSON)**: Each artifact is a JSON string stored under its ID in a `Y.Map`. Read-only fallback.
3. **Legacy (root array)**: All artifacts stored as a single JSON array string under a root key. Read-only fallback.

The read path checks v2 first, falls back to v1, then legacy. Writes always go to v2. The same pattern applies to member sync (v2 per-member `Y.Map` with legacy JSON fallback).

## Alternatives Considered

- **Breaking migration**: Force all peers to upgrade simultaneously, discard old format data. Simpler code but impractical — peers go offline for days and would lose unsynced data.
- **Single format with migration script**: Run a one-time migration on each peer. Risk of data loss if migration fails mid-way; doesn't handle peers that haven't upgraded yet writing old-format data.
- **Operational transform instead of CRDTs**: Would allow field-level merging without format changes, but contradicts the existing Yjs architecture (ADR-001).

## Consequences

### Positive

- Per-field concurrent merges — two members editing different fields of the same artifact no longer conflict
- Zero-downtime migration: old peers can still read v2 data (Yjs handles unknown keys gracefully) and their v1/legacy writes are picked up by the fallback chain
- The `syncV2Map()` helper centralizes the write logic, reducing duplication across artifact and member sync

### Negative

- Read path complexity: every read must check three formats, adding branching and potential for subtle bugs
- Old format data remains in the Yjs document indefinitely (no garbage collection of legacy keys)
- Testing surface increases — sync tests must cover all format combinations and migration edge cases

### Neutral

- The fallback chain is read-only; writes always target v2, so the old formats will naturally phase out as all peers upgrade
- Member sync follows the same v2/legacy pattern, keeping the approach consistent across entity types
