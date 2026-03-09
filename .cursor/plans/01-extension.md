# Plan 01 - Browser Extension

## Scope

Turn `packages/extension` into a loadable Chromium extension with full Coop capture and skill-processing UX.

## Current State

- Manifest V3 scaffold exists.
- Sidepanel, popup, service worker, content script, and local libs exist.
- Join flow, persistence model, and anchor skill loop are functional.
- Build pipeline outputs loadable dist/.
- Rich tab capture via Readability content script implemented.
- Drag-and-drop file drop area implemented.
- Continuous voice dictation with live transcript implemented.
- Skill processing UI with pillar selection implemented.
- Type-safe SpeechRecognition API declarations added.

## Todos

1. [x] Fix extension build pipeline to output a loadable `dist/`.
2. [x] Implement Join Coop flow and active Coop selector.
3. [x] Replace in-memory feed with IndexedDB-backed feed + anchor API fallback.
4. [x] Improve tab capture with Readability-based rich extraction.
5. [x] Implement drag-and-drop capture canvas behavior.
6. [x] Wire skill processing UI to anchor API with pillar selection.
7. [x] Upgrade voice dictation UX to continuous mode + live transcript.

## Dependencies

- `04-shared-package.md` for transport/types reuse.
- `02-anchor-node.md` for Coop and skills API compatibility.

## Key Files

- `packages/extension/vite.config.ts`
- `packages/extension/manifest.json`
- `packages/extension/src/sidepanel/main.tsx`
- `packages/extension/src/background/service-worker.js`
- `packages/extension/src/content/content-script.js`
- `packages/extension/src/lib/anchor-client.ts`
- `packages/extension/src/lib/indexeddb.ts`

## Dependencies to Install

- `@mozilla/readability` (or equivalent)
- CRXJS-compatible Vite plugin

## Done Criteria

- Extension loads unpacked in Chromium.
- Coop join/create works and persists.
- Captures are persisted and Coop-scoped.
- Skill run outputs appear in sidepanel feed.
