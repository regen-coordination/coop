---
title: "Receiver Pairing & Intake"
slug: /reference/receiver-pairing-and-intake
---

# Receiver Pairing And Intake

Date: March 28, 2026

This is the canonical reference for the receiver PWA role, pairing flow, local storage, and
private-intake sync into the extension.

## What The Receiver Is

The receiver is the companion PWA surface for capture on a phone or secondary device. It is not a
second full coop client.

Current job:

- accept a pairing from the extension
- capture audio, photos, files, and links
- keep those captures local on the device
- sync paired captures into the member-private intake path that the extension surfaces in **Nest**

## Route Ownership

The current app owns these receiver-related routes:

- `/pair` for accepting or reviewing a pairing payload
- `/receiver` for capture
- `/inbox` for local receiver history and queued items
- `/board/:coopId` for board viewing

The root route `/` is only a bootstrap route:

- desktop browser sessions go to `/landing`
- mobile or installed PWA sessions go to `/pair` or `/receiver` depending on whether an active
  pairing already exists locally

## Pairing Payload

The extension creates the pairing in **Nest** for one coop and one member context at a time.

The payload includes:

- `pairingId`
- `coopId`
- `coopDisplayName`
- `memberId`
- `memberDisplayName`
- `pairSecret`
- `signalingUrls`
- `issuedAt`
- `expiresAt`

The runtime derives `roomId` from `coopId`, `memberId`, and `pairSecret`. The receiver treats that
derived room as the only valid sync room for the pairing.

Accepted pairing forms today:

- a pasted Nest code with the `coop-receiver:` prefix
- a QR code carrying that payload
- a `web+coop-receiver://pair?payload=...` protocol handoff
- a `/pair#payload=...` app deep link

## Pairing Acceptance Rules

The receiver does not silently accept a pasted or scanned code.

Current flow:

1. parse the pairing input
2. show the pairing details for review
3. require explicit confirmation
4. persist a `ReceiverPairingRecord`
5. mark that pairing active locally
6. navigate into `/receiver`

Current pairing statuses:

- `ready`
- `missing-signaling`
- `inactive`
- `expired`
- `invalid`

The receiver refuses sync when the pairing is not `ready`.

## Local Storage Model

The receiver PWA uses its own IndexedDB database (`coop-receiver`) through Dexie.

Current local data buckets:

- `receiverPairings`
- `receiverCaptures`
- `receiverBlobs`
- `settings`
- `receiver-device-identity` stored under settings

Important consequence:

- captures remain on the phone or receiver device until they are paired and successfully handed to
  the extension
- unpaired captures stay `local-only`
- paired captures enter the queued private-intake path

## Sync Envelope Model

Once a device is paired, each synced capture is wrapped into a typed receiver envelope:

- capture metadata
- binary asset payload
- authentication block

Current auth block:

- `version: 1`
- `algorithm: hmac-sha256`
- `pairingId`
- `signedAt`
- `signature`

The signature is computed from the capture metadata and binary asset using the pairing's
`pairSecret`.

The extension validates:

- pairing status
- room and pairing identity
- coop and member scope
- HMAC integrity of the envelope

If those checks fail, the capture is rejected.

## Sync Transport Path

The receiver uses multiple sync layers at once because they solve different parts of the problem.

### 1. Local Receiver Persistence

The app stores captures locally in Dexie and mirrors queued envelopes into a Yjs document with
`IndexeddbPersistence`.

### 2. Direct Extension Bridge

When the receiver is running on the configured receiver origin, it first tries a direct handoff to
the extension via `window.postMessage`.

Current bridge message types:

- app -> extension `ping`
- app -> extension `ingest`
- extension -> app typed success or error response

This is an optimization, not the only sync path.

### 3. Signaling And WebRTC

The receiver also opens a relay/webRTC path using the pairing's `signalingUrls`.

That path:

- normalizes configured signaling URLs to `ws:` or `wss:`
- publishes capture and ack frames on room topics
- signs relay acks with the same pairing secret

### 4. Yjs Room Sync

The receiver also creates a `WebsocketProvider` for the same room using the
`wss://api.coop.town/yws` base URL unless a different WebSocket sync base is passed explicitly in
code.

That means current receiver sync can travel through:

- direct extension bridge
- y-webrtc peers discovered from `VITE_COOP_SIGNALING_URLS`
- the Yjs WebSocket room path at `/yws/:room`

## Intake Semantics Inside The Extension

Receiver captures do not become shared state immediately.

Current intake path:

1. capture arrives in the extension under the paired coop and member context
2. it lands in private intake with `intakeStatus: private-intake`
3. **Nest** shows the item under Pocket Coop Finds
4. a human converts it into a candidate or draft
5. later review and publish paths move it into shared coop state

That separation is deliberate. Receiver ingest is capture, not publish.

## Receiver Origin And Chrome Web Store Constraints

`VITE_COOP_RECEIVER_APP_URL` controls more than a link:

- receiver deep links
- receiver bridge content-script matches
- packaged `host_permissions`

Current release rule:

- local builds may use `http://127.0.0.1:3001` and `http://localhost`
- Chrome Web Store release validation requires the exact production HTTPS receiver origin

`store-readiness` checks that the packaged extension matches that exact origin and rejects broad or
drifted host-permission patterns.

## Failure Modes That Matter

These states are intentional and should remain legible in docs and UI:

- `missing-signaling`: pairing exists, but it cannot discover peers
- `inactive`: the extension kept the record but disabled it
- `expired`: the Nest code aged out
- `invalid`: room or pairing data no longer matches the derived context
- bridge unavailable: the receiver falls back to background sync instead of failing silently

## Related Docs

- [Coop App](/builder/app)
- [P2P Functionality](/builder/p2p-functionality)
- [Environment Reference](/builder/environment)
- [Demo & Deploy Runbook](/reference/demo-and-deploy-runbook)
- [Testing & Validation](/reference/testing-and-validation)
- [Extension Install & Distribution](/reference/extension-install-and-distribution)
