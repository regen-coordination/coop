# ADR-008: MV3 Extension Architecture

**Status**: Accepted
**Date**: 2026-04-02
**Decision makers**: Coop team

## Context

With the browser extension as the primary product surface (ADR-001), the team needed to choose the extension platform, development framework, and runtime architecture. Chrome's Manifest V3 (MV3) is the current extension platform, replacing MV2 which is being deprecated. MV3 introduces significant architectural constraints, notably replacing persistent background pages with ephemeral service workers.

The extension needs to support multiple UI surfaces (popup for quick actions, sidepanel for deep workflows), a background runtime for tab monitoring and sync, and integration with the `@coop/shared` domain modules.

## Decision

Build an MV3 browser extension using the WXT framework, with three runtime contexts:

### Runtime Contexts

1. **Background service worker** (`background.ts`): Handles tab monitoring, sync coordination, and message passing. Runs as an MV3 service worker -- no persistent state, no DOM access, wakes on events and alarms. Must not hold long-lived state; all persistent data goes through Dexie (ADR-002).

2. **Popup** (`views/Popup/`): Quick capture and quick review. Opens as a standard extension popup. Auto-closes when the user clicks outside, so workflows must be completable in a single interaction.

3. **Sidepanel** (`views/Sidepanel/`): The primary workspace, organized into tabs:
   - **Chickens**: Candidates, drafts, and publish prep
   - **Coops**: Shared coop state, archive, and proof
   - **Roost**: Green Goods member workspace
   - **Nest**: Members, operator controls, and settings

### Framework: WXT

The extension uses [WXT](https://wxt.dev/) (`@wxt-dev/module-react`) for development:
- Hot module replacement during development
- Automatic manifest generation from file conventions
- Built-in Chromium profile management (`.wxt/chrome-data`)
- React integration via the WXT React module

### Build Order

The extension is the last package in the build chain:

```
shared (schemas, flows, domain modules)
  -> app (landing page + receiver PWA)
  -> extension (popup, sidepanel, background worker)
```

The extension depends on `@coop/shared` via `workspace:*` and imports all domain logic through the barrel surface (ADR-005).

### Package Boundary

The extension package (`packages/extension/`) contains only:
- **Views**: React components for popup and sidepanel UI
- **Background**: Service worker entry point and event handlers
- **Runtime**: Extension-specific runtime utilities (message passing, storage API wrappers)
- **Skills**: Extension-specific agent skill implementations
- **Global CSS**: Extension-scoped styles (`global.css`)

All domain logic, hooks, stores, and shared types live in `@coop/shared`. The extension is a thin UI and runtime layer.

## Consequences

**Positive:**
- MV3 is the current Chrome standard; MV2 extensions face deprecation and removal
- WXT provides excellent DX (HMR, auto-manifest, profile management) that reduces extension development friction
- Service worker architecture forces clean separation of concerns: no persistent background state, explicit persistence via Dexie
- Sidepanel provides persistent workspace that survives popup auto-close
- Thin extension package with domain logic in shared enables faster iteration on business logic

**Negative:**
- MV3 service worker limitations: no persistent connections (WebSocket connections must be re-established on wake), no DOM access in background, 30-second idle timeout (extended by active alarms)
- Popup auto-close constrains quick workflows to single-interaction completion
- Sidepanel API is relatively new and has browser-specific quirks (Chrome 114+)
- WXT adds a framework dependency on top of the Chrome Extension APIs
- Firefox MV3 support is partial, limiting cross-browser deployment initially
- Two UI surfaces (popup + sidepanel) require consistent state synchronization

## Alternatives Considered

**MV2 extension**: Persistent background page, simpler API surface. Rejected because Chrome is actively deprecating MV2. Building on MV2 would require a forced migration later.

**Plasmo framework**: Another MV3 extension framework with React support. Evaluated but WXT offered more transparent manifest generation, better documentation, and a simpler mental model for the team. Plasmo's CSUI (content script UI) features were not needed since Coop does not inject UI into web pages.

**Vanilla MV3 (no framework)**: Direct use of Chrome Extension APIs with a custom Vite build. Maximum control but requires building manifest generation, HMR, and profile management from scratch. WXT handles this boilerplate without significant abstraction cost.

**Progressive Web App only (no extension)**: Would avoid extension-specific constraints entirely. Rejected per ADR-001: a PWA cannot access browser tab state, which is the core capture mechanism.

**Content script injection instead of sidepanel**: Inject a panel into every web page via content scripts. Rejected because content scripts run in the page's context with CSS conflicts, CSP restrictions, and performance overhead on every page load. The sidepanel is a dedicated, isolated surface.
