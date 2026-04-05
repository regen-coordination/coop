# ADR-001: Yjs over Automerge for CRDT Sync

## Status

Accepted

## Date

2026-03-06 (monorepo scaffold established Yjs as the sync primitive)

## Context

Coop is a local-first collaborative tool where data stays on each member's device until explicitly published. Multiple members need to converge on shared coop state (artifacts, members, settings) without a central server being the authority. The system must work offline, sync peer-to-peer when members are online together, and fall back to server-assisted relay when direct connections fail.

The CRDT layer needs to support:

- Structured map and array types for coop state (`CoopSharedState`)
- Binary encoding for efficient IndexedDB persistence (`y-indexeddb`)
- Browser-to-browser transport (`y-webrtc` over WebRTC data channels)
- Server-assisted document sync (`y-websocket` for relay and receiver sync)
- Blob relay framing over the same transport layer

## Decision

Use Yjs as the CRDT engine with its ecosystem providers:

- `y-indexeddb` for local persistence of Yjs docs
- `y-webrtc` for direct peer-to-peer sync via signaling servers
- `y-websocket` for server-assisted document sync and relay-backed blob transport
- Deterministic sync rooms derived from coop ID and room secret (`deriveSyncRoomId`)

Shared state is stored in a `Y.Map<string>` under key `"coop"`, with each field JSON-serialized. Access is mediated through `writeCoopState()` / `readCoopState()` / `updateCoopState()` — direct Y.Doc manipulation is prohibited.

## Alternatives Considered

- **Automerge**: Strong typing and immutable history, but smaller ecosystem at the time. No equivalent of y-webrtc for zero-config peer transport. Encoding format less mature for browser persistence.
- **Custom CRDT**: Full control over merge semantics, but significant implementation and maintenance burden for a small team.
- **Server-authoritative sync**: Simpler model but contradicts the local-first principle. Creates a single point of failure and requires always-on connectivity.

## Consequences

### Positive

- Mature ecosystem: y-webrtc, y-websocket, and y-indexeddb handle transport and persistence out of the box
- Efficient binary encoding for IndexedDB and wire transport
- Established community and battle-tested merge semantics
- Blob relay framing can be layered on top of the same WebSocket connection

### Negative

- Lower-level API compared to Automerge; requires wrapper functions to enforce safe access patterns
- Receiver sync cannot use y-webrtc (service workers lack `RTCPeerConnection`) and falls back to WebSocket relay with HMAC-SHA256 signed frames
- Yjs document shape is not strongly typed at the library level; schema validation is enforced via Zod at the application boundary

### Neutral

- Sync room IDs are deterministic from coop ID and room secret, tying the sync topology to the coop identity model
- STUN-only ICE is sufficient for open NATs but production requires TURN configuration for restrictive firewalls
