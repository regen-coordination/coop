# Context

- Migrated from `.plans/synchronous-soaring-pizza.md`
- Archived source snapshot: `.plans/archive/migrated/synchronous-soaring-pizza.md`
- Related stale backlog: `.plans/archive/stale/tier3-high-effort-improvements.md`
- Key current hotspots:
  - `packages/extension/src/views/Popup/hooks/usePopupOrchestration.ts`
  - `packages/extension/src/views/Sidepanel/tabs/NestTab.tsx`
  - `packages/shared/src/contracts/schema-agent.ts`
  - `packages/shared/src/modules/agent/agent.ts`

## Notes

- Much of the original cleanup plan is already obsolete as an execution checklist:
  - `packages/shared/src/contracts/schema.ts` is already split
  - `packages/shared/src/modules/storage/db.ts` is already split
  - `packages/shared/src/modules/policy/action-bundle.ts` is already split
  - `packages/extension/src/runtime/agent-runner.ts` is already split down substantially
  - `packages/extension/src/views/Sidepanel/SidepanelApp.tsx` is already slimmed down
- Keep this as backlog, and only pull it forward when one of the current hotspots is blocking nearby feature work.
