# ADR-007: Yjs CRDT Sync Architecture

**Status**: Accepted
**Date**: 2026-04-02
**Decision makers**: Coop team

## Context

Coop is local-first (ADR-002): all data stays on the device until explicitly shared. When members do choose to sync -- publishing artifacts to the coop, collaborating on drafts, or receiving cross-device captures from the receiver PWA -- the system needs a sync protocol that:

1. Works without a central authority deciding merge order
2. Handles concurrent edits from multiple members without conflict resolution UI
3. Supports both direct peer connections and server-assisted fallback
4. Persists sync state locally so reconnection does not require full retransmission

## Decision

Use Yjs as the CRDT sync layer with a dual transport strategy:

- **y-webrtc**: Primary transport. Direct peer-to-peer WebRTC connections between members for low-latency sync. Uses the signaling server at `wss://api.coop.town` for peer discovery only; data flows directly between peers.
- **y-websocket**: Fallback transport. Server-assisted document sync via `wss://api.coop.town/yws` when direct peer connections fail (symmetric NAT, corporate firewalls, mobile networks). The server relays Yjs updates but does not store document state long-term.

### Persistence

- **Dexie (IndexedDB)**: Yjs document state vectors are persisted to IndexedDB via the `storage` module. On reconnection, only the delta since the last sync is transmitted.
- **Storacha (Filecoin)**: For long-term archival, published coop state can be archived to Filecoin via the `archive` module. This is an explicit action, not automatic.

### Sync Topology

```
Member A <--y-webrtc--> Member B     (direct, preferred)
    \                      /
     \-- y-websocket ---> /           (server relay, fallback)
           |
    api.coop.town/yws
```

The signaling server (`api.coop.town`) serves two roles:
1. **WebRTC signaling**: Helps peers discover each other and exchange SDP offers/answers
2. **WebSocket relay**: Forwards Yjs sync messages between peers that cannot establish direct connections

### Document Rooms

Yjs documents are organized into rooms scoped by coop ID and document type. The `ws/topics.ts` module in the API server manages room subscriptions and message routing.

## Consequences

**Positive:**
- Conflict-free merges: Yjs CRDTs guarantee convergence without manual conflict resolution
- Offline-resilient: members can work offline and sync automatically when reconnected
- Peer-to-peer by default: most sync traffic never touches the server
- Incremental sync: state vectors enable delta-only updates, reducing bandwidth
- Mature ecosystem: Yjs has well-tested providers for WebRTC, WebSocket, and IndexedDB

**Negative:**
- Yjs document size grows over time as edit history accumulates in the CRDT structure (garbage collection helps but does not eliminate this)
- WebRTC connection establishment can be slow or fail behind restrictive NATs, requiring fallback to the WebSocket relay
- Debugging sync issues across peers is harder than debugging client-server sync (no single server log to inspect)
- Two transport layers (y-webrtc + y-websocket) increase the surface area for connection management bugs
- The signaling server becomes a soft dependency: if it goes down, new peer connections cannot be established (existing connections continue)

## Alternatives Considered

**Custom WebSocket sync without CRDTs**: Build a simple last-write-wins sync over WebSocket. Simpler to implement but loses concurrent edit support. Members editing the same document would overwrite each other, requiring either locks or manual conflict resolution.

**Automerge**: Another CRDT library with similar guarantees to Yjs. Evaluated but Yjs had a more mature provider ecosystem (y-webrtc, y-websocket, y-indexeddb), better performance benchmarks for large documents, and a larger community.

**Firebase / Supabase Realtime**: Managed real-time sync services. Fast to implement but introduces a cloud dependency that contradicts the local-first principle (ADR-002). Data would transit through and potentially be stored by a third-party service.

**libp2p / IPFS pubsub**: Fully decentralized peer discovery and messaging. Aligns with decentralization principles but adds significant complexity for real-time sync. The connection establishment time and reliability are not yet competitive with WebRTC for this use case.

**Server-authoritative sync only**: All sync goes through the API server, which acts as the source of truth. Simpler architecture but contradicts the local-first principle and makes the server a single point of failure for sync availability.
