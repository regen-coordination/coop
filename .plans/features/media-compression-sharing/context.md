# Context

- Migrated from `.plans/media-compression-and-sharing.todo.md`
- Archived source snapshot: `.plans/archive/migrated/media-compression-and-sharing.todo.md`
- Key codepaths:
  - `packages/shared/src/modules/blob/`
  - `packages/shared/src/modules/transcribe/`
  - `packages/shared/src/modules/receiver/`
  - `packages/shared/src/modules/coop/`
  - `packages/extension/src/runtime/`

## Notes

- This is primarily a Codex implementation slice.
- QA should focus on sync integrity, attachment persistence, and degraded transport cases.
