import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createReceiverCapture, createReceiverDeviceIdentity } from '../capture';
import { createReceiverPairingPayload, toReceiverPairingRecord } from '../pairing';
import {
  assertReceiverSyncRelayAck,
  connectReceiverSyncRelay,
  createReceiverSyncRelayAck,
  resolveReceiverRelayWebSocketUrls,
} from '../relay';

describe('receiver relay helpers', () => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: webcrypto,
    });
  }

  it('normalizes usable websocket signaling urls for the relay fallback', () => {
    expect(
      resolveReceiverRelayWebSocketUrls([
        'http://127.0.0.1:4444',
        'https://signals.example.com/socket',
        'ws://127.0.0.1:4444',
        'not-a-url',
      ]),
    ).toEqual(['ws://127.0.0.1:4444/', 'wss://signals.example.com/socket']);
  });

  it('signs and verifies relay acknowledgements before trusting sync success', async () => {
    const pairing = toReceiverPairingRecord(
      createReceiverPairingPayload({
        coopId: 'coop-1',
        coopDisplayName: 'River Coop',
        memberId: 'member-1',
        memberDisplayName: 'Mina',
        signalingUrls: ['ws://127.0.0.1:4444'],
      }),
      '2026-03-11T18:05:00.000Z',
    );
    const device = createReceiverDeviceIdentity('Field Phone');
    const capture = createReceiverCapture({
      deviceId: device.id,
      kind: 'file',
      blob: new Blob(['receiver capture'], { type: 'text/plain' }),
      fileName: 'field-note.txt',
      pairing,
      createdAt: '2026-03-11T18:10:00.000Z',
    });
    const syncedCapture = {
      ...capture,
      syncState: 'synced' as const,
      syncedAt: '2026-03-11T18:10:05.000Z',
      updatedAt: '2026-03-11T18:10:05.000Z',
    };

    const ack = await createReceiverSyncRelayAck({
      pairing,
      requestId: 'relay-request-1',
      capture: syncedCapture,
      ok: true,
      sourceClientId: 'extension-offscreen:pairing-1',
      respondedAt: '2026-03-11T18:10:05.000Z',
    });

    await expect(assertReceiverSyncRelayAck(ack, pairing)).resolves.toMatchObject({
      captureId: syncedCapture.id,
      ok: true,
      capture: expect.objectContaining({
        syncState: 'synced',
      }),
    });

    await expect(
      assertReceiverSyncRelayAck(
        {
          ...ack,
          capture: {
            ...ack.capture,
            syncState: 'failed',
          },
        },
        pairing,
      ),
    ).rejects.toThrow(/integrity check failed/i);
  });
});

describe('connectReceiverSyncRelay reconnection', () => {
  let originalWebSocket: typeof globalThis.WebSocket;
  let mockInstances: MockWebSocket[];

  class MockWebSocket {
    static readonly OPEN = 1;
    static readonly CLOSED = 3;
    readonly OPEN = 1;
    readonly CLOSED = 3;
    url: string;
    readyState = 0;
    private listeners = new Map<string, ((...args: unknown[]) => void)[]>();

    constructor(url: string) {
      this.url = url;
      mockInstances.push(this);
    }

    addEventListener(event: string, handler: (...args: unknown[]) => void) {
      const handlers = this.listeners.get(event) ?? [];
      handlers.push(handler);
      this.listeners.set(event, handlers);
    }

    send(_data: string) {
      if (this.readyState !== 1) {
        throw new Error('WebSocket is not open');
      }
    }

    close() {
      this.readyState = 3;
      this.emit('close', {});
    }

    emit(event: string, data: unknown) {
      const handlers = this.listeners.get(event) ?? [];
      for (const handler of handlers) {
        handler(data);
      }
    }

    simulateOpen() {
      this.readyState = 1;
      this.emit('open', {});
    }

    simulateClose() {
      this.readyState = 3;
      this.emit('close', {});
    }
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mockInstances = [];
    originalWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    globalThis.WebSocket = originalWebSocket;
  });

  it('returns a non-configured relay when no URLs are available', () => {
    const relay = connectReceiverSyncRelay({
      roomId: 'room-1',
      signalingUrls: [],
      onCapture: () => {},
    });

    expect(relay.configured).toBe(false);
    expect(relay.connected).toBe(false);
  });

  it('disconnect stops reconnection attempts', () => {
    const statusChanges: boolean[] = [];
    const relay = connectReceiverSyncRelay({
      roomId: 'room-1',
      signalingUrls: ['ws://127.0.0.1:4444'],
      onCapture: () => {},
      onStatusChange: (state) => statusChanges.push(state.connected),
      reconnectDelayMs: 100,
    });

    expect(relay.configured).toBe(true);
    expect(mockInstances).toHaveLength(1);

    // Simulate the first connection opening then closing
    mockInstances[0].simulateOpen();
    expect(relay.connected).toBe(true);

    // Disconnect before reconnection fires
    relay.disconnect();
    expect(relay.connected).toBe(false);

    // Advance past the reconnect delay -- no new WebSocket should be created
    const instanceCountBefore = mockInstances.length;
    vi.advanceTimersByTime(500);
    expect(mockInstances).toHaveLength(instanceCountBefore);
  });

  it('reconnects after a socket close by cycling through URLs', () => {
    const errors: string[] = [];
    const relay = connectReceiverSyncRelay({
      roomId: 'room-1',
      signalingUrls: ['ws://127.0.0.1:4444', 'ws://127.0.0.1:5555'],
      onCapture: () => {},
      onError: (err) => errors.push(err.message),
      reconnectDelayMs: 100,
    });

    expect(mockInstances).toHaveLength(1);
    expect(mockInstances[0].url).toBe('ws://127.0.0.1:4444/');

    // First socket opens then closes
    mockInstances[0].simulateOpen();
    // Manually set readyState and emit close so handleSocketClosed runs cleanly
    mockInstances[0].readyState = 3;
    mockInstances[0].emit('close', {});

    // At this point the relay's reconnect timer should be scheduled
    // Advance past reconnect delay
    vi.advanceTimersByTime(200);
    expect(mockInstances).toHaveLength(2);
    expect(mockInstances[1].url).toBe('ws://127.0.0.1:5555/');

    // Clean up
    relay.disconnect();
  });

  it('resets connection status on successful reconnect', () => {
    const statusChanges: boolean[] = [];
    const relay = connectReceiverSyncRelay({
      roomId: 'room-1',
      signalingUrls: ['ws://127.0.0.1:4444'],
      onCapture: () => {},
      onStatusChange: (state) => statusChanges.push(state.connected),
      reconnectDelayMs: 100,
    });

    // Open, then close, then reconnect and open again
    mockInstances[0].simulateOpen();
    expect(relay.connected).toBe(true);

    // Emit close event directly (avoiding double-fire from close() method)
    mockInstances[0].readyState = 3;
    mockInstances[0].emit('close', {});
    expect(relay.connected).toBe(false);

    vi.advanceTimersByTime(150);
    expect(mockInstances).toHaveLength(2);

    mockInstances[1].simulateOpen();
    expect(relay.connected).toBe(true);

    // Status changes: connected, disconnected, connected
    expect(statusChanges).toEqual([true, false, true]);

    relay.disconnect();
  });
});
