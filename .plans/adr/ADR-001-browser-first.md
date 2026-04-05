# ADR-001: Browser-First Product Surface

**Status**: Accepted
**Date**: 2026-04-02
**Decision makers**: Coop team

## Context

Coop captures scattered knowledge (browser tabs, audio, photos, files, links), refines it via an in-browser AI agent, and gives groups a shared space to act on what matters. The team needed to decide where the primary product experience lives. Traditional approaches put the web application at the center with browser extensions acting as lightweight companions for clipping or notifications.

However, Coop's core value proposition -- capturing open tabs, running a 16-skill AI pipeline locally, and reviewing candidates before publishing -- is deeply tied to the browser itself. A standalone web app would require users to context-switch away from their browsing to manage captures, and would not have native access to tab state.

## Decision

The browser extension is the primary product surface. All capture, review, and publish workflows happen within the extension's popup and sidepanel. The `app` package serves only two purposes:

1. **Landing page** -- marketing and onboarding at coop.town
2. **Receiver PWA** -- companion for cross-device capture (audio, photos, files) that syncs into the extension

The extension is not a companion to a web app; the web app is a companion to the extension.

### Extension Surface Map

- **Popup**: Quick capture and quick review
- **Chickens** (sidepanel tab): Candidates, drafts, and publish prep
- **Coops** (sidepanel tab): Shared coop state, archive, and proof
- **Roost** (sidepanel tab): Green Goods member workspace
- **Nest** (sidepanel tab): Members, operator controls, and settings

## Consequences

**Positive:**
- Direct access to browser tab state without permissions workarounds or scraping
- Users stay in their browsing context; no app-switching to manage captures
- The AI agent runs in the browser's own runtime (WebGPU/WASM), keeping inference local
- Simpler deployment: the extension ships via Chrome Web Store; no hosted app infrastructure for the core product

**Negative:**
- Browser-specific constraints (popup auto-close, sidepanel lifecycle, MV3 service worker limits)
- Extension review process adds friction to release cycles
- Limited to Chromium browsers initially (Firefox MV3 support is partial)
- The receiver PWA must bridge the gap for mobile capture, adding a second surface to maintain

## Alternatives Considered

**Web app as primary surface with extension as companion**: Would provide a more traditional SPA experience and easier mobile support, but would lose native tab access and force context-switching. The core capture loop would feel bolted-on rather than native.

**Electron desktop app**: Would give full system access (clipboard, file system, notifications) but adds a heavy runtime dependency, a separate update channel, and removes the "already in the browser" advantage that makes capture frictionless.

**Mobile app first**: Would reach more users but Coop's primary capture source is browser tabs, which are not accessible from a mobile app. The receiver PWA covers the mobile capture use case (audio, photos) without requiring a native app.
