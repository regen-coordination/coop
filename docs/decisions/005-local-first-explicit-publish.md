# ADR-005: Local-First Data with Explicit Publish

## Status

Accepted

## Date

2026-03-06 (established alongside initial Yjs integration)

## Context

Coop captures sensitive, in-progress knowledge — browser tabs, audio recordings, photos, and AI-refined drafts. Users need confidence that their data stays private until they choose to share it. The system must work offline (no connectivity required for capture or review), support peer-to-peer sync when members are online together, and never push data to a server without explicit user action.

The data lifecycle has distinct stages:

- **Capture**: Raw inputs land in IndexedDB via Dexie (`tabCandidates`, `pageExtracts`, `audioCandidates`)
- **Refine**: The in-browser agent processes candidates locally (WebGPU/WASM, no cloud calls)
- **Review**: Members review drafts in the popup and Chickens tab before anything becomes shared
- **Publish**: An explicit user action triggers sync to the coop's Yjs document and optional archival

## Decision

All captured data is stored locally in IndexedDB (via Dexie) and remains there until the user explicitly publishes. There is no automatic background sync to any server or peer. The publish action is a deliberate user gesture that writes to the shared Yjs document (`writeCoopState()` in `packages/shared/src/modules/coop/sync.ts`), making the data available to coop peers.

Peer sync via y-webrtc and y-websocket operates only on the shared Yjs document — it never reaches into local-only Dexie tables.

## Alternatives Considered

- **Cloud-first with local cache**: Simpler sync model, but contradicts user data sovereignty. Creates dependency on server availability and raises privacy concerns for in-progress work.
- **Auto-sync (Notion-style)**: Every edit propagates immediately. Reduces friction for sharing but removes the user's ability to review before data leaves their device.
- **Hybrid with background sync**: Local storage with periodic background pushes. Blurs the boundary between private and shared, making it hard for users to reason about what others can see.

## Consequences

### Positive

- Full offline capability — capture, refine, and review work without any network connection
- Users have complete control over what becomes shared; nothing leaks without explicit action
- Reduced server infrastructure — the API layer handles signaling and relay, not primary storage
- Clear mental model: local tables are private, Yjs document is shared

### Negative

- Users must remember to publish — work can be "stuck" locally if they forget
- Sync conflict resolution relies on Yjs CRDTs, which handle concurrent edits but can produce surprising merges on complex nested structures
- No server-side backup of local data; if the user loses their device before publishing, unpublished work is lost

### Neutral

- Sensitive records (passkey metadata, session keys) are encrypted at rest in IndexedDB via `db-encryption.ts`, adding a second layer of protection for local data
- The publish boundary naturally segments the codebase: local CRUD in `storage/` module, shared state in `coop/sync.ts`
