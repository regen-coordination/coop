---
title: P2P Functionality
slug: /builder/p2p-functionality
---

# P2P Functionality

Coop's sync story is local-first replication with peer-to-peer transport, not "ship every state
change through a central app server."

## The Stack

The current sync layer combines:

- Yjs for CRDT state
- y-indexeddb for local persistence
- y-webrtc for direct browser-to-browser transport
- a lightweight signaling relay so peers can discover each other

## What Syncs And What Does Not

Shared coop state syncs across peers. Local draft and intake state does not become shared just
because it exists in the browser.

This distinction is essential to Coop's product model:

- shared artifacts, membership state, and archive receipts can replicate
- local review material can stay device-local until publish

## Room Model

Sync rooms are derived from coop identity and room secrets. The signaling server helps establish the
connection, but it is not the long-term owner of the shared data.

## Current Constraints

The long-form scaling review highlights the biggest current risk: not Yjs itself, but how some
shared arrays are written into the document. JSON-serializing full arrays into a Yjs map weakens the
merge story and creates avoidable concurrency risk.

That is why the roadmap prioritizes CRDT correctness work ahead of more ambitious agent features.

## Why Builders Should Care

P2P behavior touches:

- join and bootstrap flows
- feed consistency
- receiver-to-extension handoff expectations
- archive provenance and board views

If sync semantics get sloppy, the whole "local-first but shared" promise gets harder to trust.
