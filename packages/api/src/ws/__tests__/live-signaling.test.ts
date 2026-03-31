/**
 * Live signaling test — verifies y-webrtc signaling through wss://api.coop.town.
 * This is the peer discovery layer that enables direct P2P WebRTC connections.
 *
 * Gated behind COOP_LIVE_TESTS=true to avoid hitting production in CI.
 *
 * Run with: COOP_LIVE_TESTS=true bun run test -- packages/api/src/ws/__tests__/live-signaling.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';

const LIVE = process.env.COOP_LIVE_TESTS === 'true';
const SIGNALING_URL = 'wss://api.coop.town';

interface SignalingMessage {
  type: string;
  topic?: string;
  data?: { type?: string; from?: string; sdp?: string };
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

function connectSignaling(name: string): Promise<{ ws: WebSocket; messages: SignalingMessage[] }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(SIGNALING_URL);
    const messages: SignalingMessage[] = [];

    ws.on('open', () => {
      console.log(`  ✓ ${name}: connected to signaling`);
      resolve({ ws, messages });
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as SignalingMessage;
        messages.push(msg);
      } catch {
        // binary message, ignore for signaling test
      }
    });

    ws.on('error', (e: Error) => reject(e));
    setTimeout(() => {
      ws.close();
      reject(new Error(`${name} signaling timeout`));
    }, 5000);
  });
}

// Tests run sequentially — subscribe must happen before publish tests.
describe.runIf(LIVE)('Live signaling via wss://api.coop.town', () => {
  const ROOM = `signaling-test-${Date.now()}`;
  let peer1: { ws: WebSocket; messages: SignalingMessage[] };
  let peer2: { ws: WebSocket; messages: SignalingMessage[] };

  beforeAll(async () => {
    console.log(`\n  Room: ${ROOM}`);
    peer1 = await connectSignaling('Peer1');
    peer2 = await connectSignaling('Peer2');
  }, 10000);

  afterAll(() => {
    peer1?.ws.close();
    peer2?.ws.close();
  });

  it('both peers can subscribe to the same room', async () => {
    peer1.ws.send(JSON.stringify({ type: 'subscribe', topics: [ROOM] }));
    peer2.ws.send(JSON.stringify({ type: 'subscribe', topics: [ROOM] }));
    // Allow subscriptions to register on the server
    await new Promise((r) => setTimeout(r, 300));
    console.log('  ✓ Both peers subscribed');
  });

  it('peer1 publish reaches peer2', async () => {
    const signal = {
      type: 'publish',
      topic: ROOM,
      data: { type: 'signal', from: 'peer1', sdp: 'test-offer-data' },
    };
    peer1.ws.send(JSON.stringify(signal));
    console.log('  → Peer1 published signal');

    await waitFor(() =>
      peer2.messages.some(
        (m) => m.type === 'publish' && m.topic === ROOM && m.data?.from === 'peer1',
      ),
    );
    console.log('  ✓ Peer2 received signal from Peer1');
  }, 5000);

  it('peer2 publish reaches peer1', async () => {
    peer1.messages.length = 0;

    const signal = {
      type: 'publish',
      topic: ROOM,
      data: { type: 'signal', from: 'peer2', sdp: 'test-answer-data' },
    };
    peer2.ws.send(JSON.stringify(signal));
    console.log('  → Peer2 published signal');

    await waitFor(() =>
      peer1.messages.some(
        (m) => m.type === 'publish' && m.topic === ROOM && m.data?.from === 'peer2',
      ),
    );
    console.log('  ✓ Peer1 received signal from Peer2');
  }, 5000);

  it('unsubscribe stops message delivery', async () => {
    peer2.messages.length = 0;

    peer2.ws.send(JSON.stringify({ type: 'unsubscribe', topics: [ROOM] }));
    await new Promise((r) => setTimeout(r, 300));

    peer1.ws.send(
      JSON.stringify({
        type: 'publish',
        topic: ROOM,
        data: { type: 'signal', from: 'peer1', sdp: 'should-not-arrive' },
      }),
    );

    // Wait a reasonable period — message should NOT arrive
    await new Promise((r) => setTimeout(r, 1000));

    const received = peer2.messages.find((m) => m.data?.sdp === 'should-not-arrive');
    expect(received).toBeFalsy();
    console.log('  ✓ Unsubscribed peer did not receive message');
  }, 5000);

  it('ping/pong keepalive works', async () => {
    peer1.messages.length = 0;
    peer1.ws.send(JSON.stringify({ type: 'ping' }));

    await waitFor(() => peer1.messages.some((m) => m.type === 'pong'));
    console.log('  ✓ Ping/pong keepalive working');
  }, 5000);
});
