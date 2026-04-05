# ADR-004: Browser Extension as Primary Surface

## Status

Accepted

## Date

2026-03-06 (extension package established as primary surface in initial monorepo scaffold)

## Context

Coop's core capture loop starts with browser tabs — noticing what a user already has open and helping organize scattered knowledge into shared opportunities. The product also processes audio, photos, files, and links through a companion PWA, and runs a 16-skill AI agent pipeline locally. The primary product surface needs to:

- Access open browser tabs and browsing context
- Run a persistent background worker for observation and agent skills
- Provide quick-access UI (popup) alongside a richer workspace (sidepanel)
- Operate offline with local-first data
- Integrate WebGPU/WASM inference without cloud dependency

## Decision

Build a Chrome MV3 extension as the primary product surface with:

- **Popup**: Quick capture and quick review
- **Sidepanel**: Five-tab workspace — Chickens (candidates/drafts/publish), Coops (shared state/archive/proof), Roost (Green Goods member workspace), Nest (members/operator/settings)
- **Background service worker**: Observation triggers, agent harness, sync providers, message routing
- **Offscreen document**: Audio transcription and other DOM-dependent operations
- **WXT framework**: Build tooling for MV3 extension with Vite integration

The companion PWA (`@coop/app`) serves as the landing page and receiver shell for cross-device capture (pairing via QR code), but the extension is where review, refinement, and publishing happen.

## Alternatives Considered

- **Standalone web app**: Cannot access browser tabs or run a persistent background worker. Would require users to manually bring content to the app. Loses the "observant" interaction model.
- **Desktop app (Electron)**: Deep system access but loses browser context. Heavier install footprint. Cannot observe tab state without reimplementing browser integration.
- **Mobile-first**: Good for audio/photo capture but weak for tab-based knowledge work. The PWA receiver already covers mobile capture as a companion surface.
- **Sidebar-only (no popup)**: Simpler surface but loses the quick-capture interaction. Popup provides a lightweight entry point without opening the full sidepanel.

## Consequences

### Positive

- Direct access to `chrome.tabs`, `chrome.scripting`, and browser context for capture
- Persistent background service worker for agent observation and sync
- Popup provides sub-second capture; sidepanel provides full workspace
- WXT framework simplifies MV3 build pipeline with hot reload during development
- WebGPU/WASM inference runs locally in the extension context

### Negative

- Limited to Chromium-based browsers (Chrome, Edge, Brave, Arc)
- Subject to Chrome Web Store review policies and manifest restrictions
- MV3 service worker has no persistent state — must reconstruct from IndexedDB on wake
- Offscreen document required for DOM-dependent operations (audio transcription)
- Extension popup closes when focus leaves, limiting complex interactions to sidepanel

### Neutral

- PWA receiver complements the extension for mobile and cross-device capture
- Extension + PWA split means maintaining two UI surfaces with shared domain logic via `@coop/shared`
- MV3's `service_worker` constraint drove the decision to keep all domain state in Dexie/Yjs rather than in-memory
