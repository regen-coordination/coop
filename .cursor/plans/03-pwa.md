# Plan 03 - PWA Companion

## Scope

Turn `packages/pwa` into a voice-first mobile companion synchronized with Coop anchor services.

## Current State

- Full PWA with manifest, service worker, and offline support.
- Voice-first UI with continuous recording and live transcript.
- Anchor connection via WebSocket with real-time sync.
- IndexedDB persistence for coop membership, drafts, and offline queue.
- Feed retrieval with automatic updates.
- Offline queue automatically syncs when connection restored.

## Todos

- [x] Add PWA manifest and service-worker setup via Vite PWA plugin.
- [x] Implement anchor connection for Coop room sync.
- [x] Redesign UI for voice-first primary flow.
- [x] Persist Coop membership and local drafts in IndexedDB.
- [x] Implement feed retrieval and live update rendering.
- [x] Add offline queue for deferred transcript sync.

## Dependencies

- `04-shared-package.md` for membrane client and shared types.
- `02-anchor-node.md` for WS/REST contracts.

## Key Files

- `packages/pwa/vite.config.ts`
- `packages/pwa/src/main.tsx`
- `packages/pwa/index.html`
- `packages/pwa/src/lib/*` (new helper modules)
- `packages/pwa/public/manifest.webmanifest` (new)

## Dependencies to Install

- `vite-plugin-pwa`
- `idb-keyval`

## Done Criteria

- PWA is installable and works offline.
- Voice notes queue when offline and sync when online.
- Coop feed is visible and updates from anchor events.
