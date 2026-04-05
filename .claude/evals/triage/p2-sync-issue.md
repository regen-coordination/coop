# Triage Eval: P2 Sync Persistence Issue

**Status**: ready
**Last run**: —
**Last score**: —

## Scenario

> User reports: "Yjs sync works between two browsers but published artifacts don't appear in the coop feed for the third member who joins later"

## Expected Output

- **Severity**: P2 (degraded functionality, not total failure)
- **Type**: bug
- **Affected package**: shared (storage/sync modules)
- **Root cause hint**: Likely a persistence gap — Yjs state not persisted to Dexie or y-websocket fallback not loading historical state for late joiners
- **Route to**: oracle first (investigate sync/persistence boundary), then cracked-coder
- **Not**: P1 (sync works for active peers), not extension-only (this is a shared module issue)

## Eval Criteria

| Criterion | Weight | Pass | Fail |
|-----------|--------|------|------|
| Severity = P2 | 25% | Correctly identifies as P2 | Classifies as P1 or P3 |
| Identifies sync/persistence boundary | 25% | Points to storage/sync modules | Treats as pure UI issue |
| Routes oracle → cracked-coder | 25% | Two-step: investigate then fix | Goes straight to cracked-coder |
| Package = shared | 15% | Identifies shared as affected | Points only to extension |
| Concise | 10% | Brief is < 5 lines | Over-explains |
