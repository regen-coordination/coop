# ADR-002: Local-First Data Ownership

**Status**: Accepted
**Date**: 2026-04-02
**Decision makers**: Coop team

## Context

Coop members capture sensitive knowledge -- open browser tabs, audio recordings, photos, draft analyses -- that they may not want to share immediately or at all. The system needed a data architecture that respects member agency: nothing should leave the device or enter shared state without explicit intent.

Cloud-first architectures assume the server is the source of truth and the client is a cache. This inverts the trust model Coop requires, where members must review and approve before anything becomes visible to the group.

## Decision

All data stays local until the member explicitly publishes or syncs. The persistence stack is:

- **Dexie** (IndexedDB wrapper): Structured data storage for coops, members, tabs, drafts, and artifacts. Provides reactive live queries for UI binding.
- **Yjs** (CRDT library): Conflict-free replicated data types for document sync. Handles merge conflicts automatically without a central authority.
- **y-webrtc**: Direct peer-to-peer transport for Yjs documents between connected members.
- **y-websocket**: Server-assisted document sync via `wss://api.coop.town/yws` as a fallback when direct peer connections are unavailable.

Nothing enters shared state until the member explicitly pushes. The publish flow requires human review in the Chickens tab before any content reaches the coop.

### Data Lifecycle

1. **Capture** -- Data is written to local Dexie tables only
2. **Refine** -- The in-browser agent processes locally; results stay in Dexie
3. **Review** -- Member reviews candidates and drafts in Chickens
4. **Publish** -- Explicit action syncs approved content via Yjs to peers and optionally archives to Filecoin via Storacha

## Consequences

**Positive:**
- Members retain full control over what they share and when
- The extension works offline; captures and agent processing continue without connectivity
- No server-side data storage required for the core product loop
- CRDT merge via Yjs eliminates the need for conflict resolution UI or server arbitration
- Privacy by default: unpublished captures never leave the device

**Negative:**
- Data loss risk if a member's browser storage is cleared before syncing
- Debugging sync issues is harder without a central server log
- Initial sync after long offline periods can transfer large Yjs state vectors
- Two persistence layers (Dexie + Yjs) add complexity to the data module
- No server-side search or aggregation across members' unpublished data (by design, but limits some product features)

## Alternatives Considered

**Cloud-first with local cache**: Traditional SaaS approach where the server holds the canonical state. Rejected because it inverts the trust model -- data would leave the device before the member approves, and the server becomes a liability for sensitive captures.

**Gun.js / OrbitDB**: Decentralized databases with peer sync. Evaluated but Yjs CRDTs offered more mature merge semantics, a larger ecosystem (y-webrtc, y-websocket, y-indexeddb), and better integration with the existing Dexie layer.

**Plain IndexedDB without CRDT sync**: Simpler persistence, but multi-device sync would require building a custom conflict resolution layer. Yjs provides this out of the box with well-understood CRDT guarantees.

**IPFS/libp2p for all sync**: Would align with the decentralized ethos but adds significant complexity for real-time document sync. Filecoin archival via Storacha is used for long-term storage, while Yjs handles the real-time layer.
