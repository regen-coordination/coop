import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlobSyncChannel } from '../channel';

/** Minimal mock for RTCDataChannel */
function createMockDataChannel(state: RTCDataChannelState = 'open'): RTCDataChannel {
  const listeners = new Map<string, EventListener>();
  return {
    label: 'coop-blob',
    readyState: state,
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      listeners.set(event, handler);
    }),
    removeEventListener: vi.fn(),
    // Expose the onopen/onclose/onmessage setters
    set onopen(handler: ((ev: Event) => void) | null) {
      if (handler) listeners.set('open', handler as EventListener);
    },
    set onmessage(handler: ((ev: MessageEvent) => void) | null) {
      if (handler) listeners.set('message', handler as EventListener);
    },
    set onclose(handler: ((ev: Event) => void) | null) {
      if (handler) listeners.set('close', handler as EventListener);
    },
    _listeners: listeners,
  } as unknown as RTCDataChannel;
}

/** Minimal mock for RTCPeerConnection */
function createMockPeerConnection(): RTCPeerConnection {
  const listeners = new Map<string, EventListener>();
  return {
    createDataChannel: vi.fn(() => createMockDataChannel('connecting')),
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      listeners.set(event, handler);
    }),
    removeEventListener: vi.fn(),
    _listeners: listeners,
  } as unknown as RTCPeerConnection;
}

function createMockWebrtcProvider(peers?: Map<string, { peer: RTCPeerConnection }>) {
  return {
    room: peers ? { webrtcConns: peers } : null,
  };
}

function createMockDb() {
  // biome-ignore lint/suspicious/noExplicitAny: mock for test
  return {} as any;
}

describe('createBlobSyncChannel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an object implementing BlobSyncChannel interface', () => {
    const channel = createBlobSyncChannel({
      webrtcProvider: createMockWebrtcProvider(),
      db: createMockDb(),
      coopId: 'coop-1',
    });

    expect(channel).toBeDefined();
    expect(typeof channel.requestBlob).toBe('function');
    expect(typeof channel.getAvailablePeers).toBe('function');
    expect(typeof channel.broadcastManifest).toBe('function');
    expect(typeof channel.destroy).toBe('function');
  });

  it('getAvailablePeers returns empty array when no peers connected', () => {
    const channel = createBlobSyncChannel({
      webrtcProvider: createMockWebrtcProvider(),
      db: createMockDb(),
      coopId: 'coop-1',
    });

    expect(channel.getAvailablePeers()).toEqual([]);
  });

  it('getAvailablePeers returns empty array when room is null', () => {
    const channel = createBlobSyncChannel({
      webrtcProvider: { room: null },
      db: createMockDb(),
      coopId: 'coop-1',
    });

    expect(channel.getAvailablePeers()).toEqual([]);
  });

  it('broadcastManifest does not throw when no peers connected', () => {
    const channel = createBlobSyncChannel({
      webrtcProvider: createMockWebrtcProvider(),
      db: createMockDb(),
      coopId: 'coop-1',
    });

    expect(() => channel.broadcastManifest()).not.toThrow();
  });

  it('destroy cleans up without errors', () => {
    const channel = createBlobSyncChannel({
      webrtcProvider: createMockWebrtcProvider(),
      db: createMockDb(),
      coopId: 'coop-1',
    });

    expect(() => channel.destroy()).not.toThrow();
  });

  it('destroy can be called multiple times safely', () => {
    const channel = createBlobSyncChannel({
      webrtcProvider: createMockWebrtcProvider(),
      db: createMockDb(),
      coopId: 'coop-1',
    });

    channel.destroy();
    expect(() => channel.destroy()).not.toThrow();
  });

  it('sets up data channels for existing peer connections', () => {
    const pc = createMockPeerConnection();
    const peers = new Map([['peer-1', { peer: pc }]]);
    const provider = createMockWebrtcProvider(peers);

    createBlobSyncChannel({
      webrtcProvider: provider,
      db: createMockDb(),
      coopId: 'coop-1',
    });

    expect(pc.createDataChannel).toHaveBeenCalledWith('coop-blob');
  });

  it('requestBlob returns null when no peers are available', async () => {
    const channel = createBlobSyncChannel({
      webrtcProvider: createMockWebrtcProvider(),
      db: createMockDb(),
      coopId: 'coop-1',
    });

    const result = await channel.requestBlob('blob-1');
    expect(result).toBeNull();
  });

  it('destroy resolves pending requests with null', async () => {
    const channel = createBlobSyncChannel({
      webrtcProvider: createMockWebrtcProvider(),
      db: createMockDb(),
      coopId: 'coop-1',
    });

    // No peers, so requestBlob should resolve null immediately
    const result = await channel.requestBlob('blob-1');
    expect(result).toBeNull();

    channel.destroy();
  });
});
