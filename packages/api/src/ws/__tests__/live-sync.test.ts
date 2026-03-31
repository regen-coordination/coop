/**
 * Live sync test — connects to wss://api.coop.town/yws through the prod API
 * and verifies bidirectional Yjs document sync between two peers.
 *
 * Gated behind COOP_LIVE_TESTS=true to avoid hitting production in CI.
 *
 * Run with: COOP_LIVE_TESTS=true bun run test -- packages/api/src/ws/__tests__/live-sync.test.ts
 */
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import * as syncProtocol from 'y-protocols/sync';
import * as Y from 'yjs';

const LIVE = process.env.COOP_LIVE_TESTS === 'true';
const MSG_SYNC = 0;
const WS_URL = 'wss://api.coop.town/yws';
const ROOM = `live-sync-test-${Date.now()}`;

interface Peer {
  name: string;
  doc: Y.Doc;
  ws: WebSocket;
  synced: boolean;
}

function destroyPeer(peer: Peer | undefined): void {
  if (!peer) return;
  peer.doc.destroy();
  peer.ws.close();
}

function createPeer(name: string): Promise<Peer> {
  return new Promise((resolve, reject) => {
    const doc = new Y.Doc();
    const ws = new WebSocket(`${WS_URL}/${ROOM}`);
    ws.binaryType = 'arraybuffer';
    const peer: Peer = { name, doc, ws, synced: false };

    ws.on('open', () => {
      console.log(`  ✓ ${name}: connected`);
    });

    ws.on('message', (rawData: ArrayBuffer) => {
      const data = new Uint8Array(rawData);
      const decoder = decoding.createDecoder(data);
      const messageType = decoding.readVarUint(decoder);

      if (messageType === MSG_SYNC) {
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, MSG_SYNC);
        syncProtocol.readSyncMessage(decoder, enc, doc, 'remote');

        if (encoding.length(enc) > 1) {
          ws.send(encoding.toUint8Array(enc));
        }

        if (!peer.synced) {
          const step1 = encoding.createEncoder();
          encoding.writeVarUint(step1, MSG_SYNC);
          syncProtocol.writeSyncStep1(step1, doc);
          ws.send(encoding.toUint8Array(step1));
          peer.synced = true;
          console.log(`  ✓ ${name}: sync handshake done`);
          resolve(peer);
        }
      }
    });

    // Forward local updates to server
    doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote') return;
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MSG_SYNC);
      syncProtocol.writeUpdate(enc, update);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(encoding.toUint8Array(enc));
      }
    });

    ws.on('error', (e: Error) => reject(e));
    setTimeout(() => {
      ws.close();
      doc.destroy();
      reject(new Error(`${name} connection timeout`));
    }, 8000);
  });
}

/** Poll until predicate returns true, or throw after timeout. */
async function waitFor(predicate: () => boolean, timeout = 5000, interval = 100): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('waitFor timed out');
}

// Tests run sequentially — each builds on state from the previous.
// This is intentional: we're testing cumulative CRDT state across a shared room.
describe.runIf(LIVE)('Live sync via wss://api.coop.town', () => {
  let peer1: Peer;
  let peer2: Peer;

  beforeAll(async () => {
    console.log(`\n  Room: ${ROOM}`);
    peer1 = await createPeer('Peer1');
    peer2 = await createPeer('Peer2');
    await new Promise((r) => setTimeout(r, 500)); // let sync settle
  }, 15000);

  afterAll(() => {
    destroyPeer(peer1);
    destroyPeer(peer2);
  });

  it('syncs Peer1 writes to Peer2', async () => {
    const map1 = peer1.doc.getMap('coop');
    map1.set('name', 'Live Test Coop');
    map1.set('ts', new Date().toISOString());

    const map2 = peer2.doc.getMap('coop');
    await waitFor(() => map2.get('name') === 'Live Test Coop');
    console.log('  ✓ Peer1→Peer2: data arrived');
  }, 10000);

  it('syncs Peer2 writes back to Peer1', async () => {
    const map2 = peer2.doc.getMap('coop');
    map2.set('reply', 'Acknowledged');
    map2.set('members', JSON.stringify(['alice', 'bob']));

    const map1 = peer1.doc.getMap('coop');
    await waitFor(() => map1.get('reply') === 'Acknowledged');
    expect(map1.get('members')).toBe(JSON.stringify(['alice', 'bob']));
    console.log('  ✓ Peer2→Peer1: data arrived');
  }, 10000);

  it('handles concurrent writes via CRDT merge', async () => {
    peer1.doc.getMap('coop').set('field-a', 'from-peer1');
    peer2.doc.getMap('coop').set('field-b', 'from-peer2');

    await waitFor(
      () =>
        peer1.doc.getMap('coop').get('field-b') === 'from-peer2' &&
        peer2.doc.getMap('coop').get('field-a') === 'from-peer1',
    );

    expect(peer1.doc.getMap('coop').get('field-a')).toBe('from-peer1');
    expect(peer2.doc.getMap('coop').get('field-b')).toBe('from-peer2');
    console.log('  ✓ Concurrent writes merged correctly');
  }, 10000);

  it('gives late joiner full state', async () => {
    let peer3: Peer | undefined;
    try {
      peer3 = await createPeer('Peer3');

      const map3 = peer3.doc.getMap('coop');
      await waitFor(() => map3.get('name') === 'Live Test Coop');
      expect(map3.get('reply')).toBe('Acknowledged');
      expect(map3.get('field-a')).toBe('from-peer1');
      expect(map3.get('field-b')).toBe('from-peer2');
      console.log('  ✓ Late joiner (Peer3): full state received');
    } finally {
      destroyPeer(peer3);
    }
  }, 15000);
});
