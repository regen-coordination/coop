# Context

- Migrated from `.plans/filecoin-cold-storage-memory.md`
- Archived source snapshot: `.plans/archive/migrated/filecoin-cold-storage-memory.md`
- Key codepaths:
  - `packages/shared/src/modules/archive/`
  - `packages/extension/src/background/handlers/archive.ts`
  - `packages/extension/src/views/Sidepanel/ArchiveSetupWizard.tsx`
  - `packages/extension/src/views/Sidepanel/cards.tsx`
  - `packages/app/src/`

## Notes

- Large parts of the original source plan already landed:
  - in-app archive setup wizard exists
  - receipt lifecycle and Filecoin deal status UI exists
  - archive refresh, retrieval, and FVM registration handlers exist
- The remaining gap is narrower than the old source plan suggests:
  - verified retrieval and proof visibility are stronger than public verification/share flows
  - there is no obvious public `/verify/:cid` route yet
- This remains relevant but is not the first queue target.
- Codex owns the remaining implementation backbone; Claude only becomes relevant if a public verification surface is added.
