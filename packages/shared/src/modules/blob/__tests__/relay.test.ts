import { describe, expect, it } from 'vitest';
import {
  type BlobRelayChunk,
  type BlobRelayManifest,
  type BlobRelayNotFound,
  type BlobRelayRequest,
  MESSAGE_BLOB_RELAY,
  blobRelayChunkSchema,
  blobRelayManifestSchema,
  blobRelayMessageSchema,
  blobRelayNotFoundSchema,
  blobRelayRequestSchema,
  decodeBlobRelayMessage,
  encodeBlobRelayMessage,
} from '../relay';

describe('MESSAGE_BLOB_RELAY constant', () => {
  it('equals 2', () => {
    expect(MESSAGE_BLOB_RELAY).toBe(2);
  });
});

describe('Zod schema validation', () => {
  describe('blobRelayRequestSchema', () => {
    it('accepts a valid blob-relay-request', () => {
      const msg = {
        type: 'blob-relay-request',
        blobId: 'b1',
        requestId: 'r1',
        originConnectionId: 'conn-1',
      };
      expect(blobRelayRequestSchema.parse(msg)).toEqual(msg);
    });

    it('rejects missing blobId', () => {
      expect(() =>
        blobRelayRequestSchema.parse({
          type: 'blob-relay-request',
          requestId: 'r1',
          originConnectionId: 'conn-1',
        }),
      ).toThrow();
    });

    it('rejects wrong type literal', () => {
      expect(() =>
        blobRelayRequestSchema.parse({
          type: 'blob-request',
          blobId: 'b1',
          requestId: 'r1',
          originConnectionId: 'conn-1',
        }),
      ).toThrow();
    });

    it('rejects non-string blobId', () => {
      expect(() =>
        blobRelayRequestSchema.parse({
          type: 'blob-relay-request',
          blobId: 123,
          requestId: 'r1',
          originConnectionId: 'conn-1',
        }),
      ).toThrow();
    });
  });

  describe('blobRelayChunkSchema', () => {
    it('accepts a valid blob-relay-chunk', () => {
      const msg = {
        type: 'blob-relay-chunk',
        requestId: 'r1',
        blobId: 'b1',
        chunkIndex: 0,
        totalChunks: 1,
        data: new Uint8Array([1, 2, 3]),
        targetConnectionId: 'conn-2',
      };
      const parsed = blobRelayChunkSchema.parse(msg);
      expect(parsed.type).toBe('blob-relay-chunk');
      expect(parsed.chunkIndex).toBe(0);
      expect(parsed.targetConnectionId).toBe('conn-2');
    });

    it('rejects negative chunkIndex', () => {
      expect(() =>
        blobRelayChunkSchema.parse({
          type: 'blob-relay-chunk',
          requestId: 'r1',
          blobId: 'b1',
          chunkIndex: -1,
          totalChunks: 1,
          data: new Uint8Array([1]),
          targetConnectionId: 'conn-2',
        }),
      ).toThrow();
    });

    it('rejects missing targetConnectionId', () => {
      expect(() =>
        blobRelayChunkSchema.parse({
          type: 'blob-relay-chunk',
          requestId: 'r1',
          blobId: 'b1',
          chunkIndex: 0,
          totalChunks: 1,
          data: new Uint8Array([1]),
        }),
      ).toThrow();
    });
  });

  describe('blobRelayNotFoundSchema', () => {
    it('accepts a valid blob-relay-not-found', () => {
      const msg = {
        type: 'blob-relay-not-found',
        requestId: 'r1',
        blobId: 'b1',
        targetConnectionId: 'conn-2',
      };
      expect(blobRelayNotFoundSchema.parse(msg)).toEqual(msg);
    });

    it('rejects missing requestId', () => {
      expect(() =>
        blobRelayNotFoundSchema.parse({
          type: 'blob-relay-not-found',
          blobId: 'b1',
          targetConnectionId: 'conn-2',
        }),
      ).toThrow();
    });
  });

  describe('blobRelayManifestSchema', () => {
    it('accepts a valid blob-relay-manifest', () => {
      const msg = {
        type: 'blob-relay-manifest',
        blobIds: ['b1', 'b2', 'b3'],
        originConnectionId: 'conn-1',
      };
      expect(blobRelayManifestSchema.parse(msg)).toEqual(msg);
    });

    it('rejects non-array blobIds', () => {
      expect(() =>
        blobRelayManifestSchema.parse({
          type: 'blob-relay-manifest',
          blobIds: 'b1',
          originConnectionId: 'conn-1',
        }),
      ).toThrow();
    });

    it('rejects blobIds array with non-string elements', () => {
      expect(() =>
        blobRelayManifestSchema.parse({
          type: 'blob-relay-manifest',
          blobIds: [1, 2, 3],
          originConnectionId: 'conn-1',
        }),
      ).toThrow();
    });
  });

  describe('blobRelayMessageSchema (discriminated union)', () => {
    it('parses each message type via the discriminated union', () => {
      const request = blobRelayMessageSchema.parse({
        type: 'blob-relay-request',
        blobId: 'b1',
        requestId: 'r1',
        originConnectionId: 'conn-1',
      });
      expect(request.type).toBe('blob-relay-request');

      const notFound = blobRelayMessageSchema.parse({
        type: 'blob-relay-not-found',
        requestId: 'r1',
        blobId: 'b1',
        targetConnectionId: 'conn-2',
      });
      expect(notFound.type).toBe('blob-relay-not-found');

      const manifest = blobRelayMessageSchema.parse({
        type: 'blob-relay-manifest',
        blobIds: ['b1'],
        originConnectionId: 'conn-1',
      });
      expect(manifest.type).toBe('blob-relay-manifest');
    });

    it('rejects unknown type', () => {
      expect(() =>
        blobRelayMessageSchema.parse({
          type: 'blob-relay-unknown',
          blobId: 'b1',
        }),
      ).toThrow();
    });
  });
});

describe('encode/decode BlobRelayMessage', () => {
  it('round-trips a BlobRelayRequest', () => {
    const msg: BlobRelayRequest = {
      type: 'blob-relay-request',
      blobId: 'b1',
      requestId: 'r1',
      originConnectionId: 'conn-1',
    };
    const encoded = encodeBlobRelayMessage(msg);
    const decoded = decodeBlobRelayMessage(encoded);
    expect(decoded).toEqual(msg);
  });

  it('round-trips a BlobRelayNotFound', () => {
    const msg: BlobRelayNotFound = {
      type: 'blob-relay-not-found',
      requestId: 'r1',
      blobId: 'b1',
      targetConnectionId: 'conn-2',
    };
    const encoded = encodeBlobRelayMessage(msg);
    const decoded = decodeBlobRelayMessage(encoded);
    expect(decoded).toEqual(msg);
  });

  it('round-trips a BlobRelayManifest', () => {
    const msg: BlobRelayManifest = {
      type: 'blob-relay-manifest',
      blobIds: ['b1', 'b2', 'b3'],
      originConnectionId: 'conn-1',
    };
    const encoded = encodeBlobRelayMessage(msg);
    const decoded = decodeBlobRelayMessage(encoded);
    expect(decoded).toEqual(msg);
  });

  it('round-trips a BlobRelayChunk with binary data', () => {
    const data = new Uint8Array(256);
    for (let i = 0; i < 256; i++) data[i] = i;

    const msg: BlobRelayChunk = {
      type: 'blob-relay-chunk',
      requestId: 'r1',
      blobId: 'b1',
      chunkIndex: 0,
      totalChunks: 1,
      data,
      targetConnectionId: 'conn-2',
    };
    const encoded = encodeBlobRelayMessage(msg);
    const decoded = decodeBlobRelayMessage(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded?.type).toBe('blob-relay-chunk');
    const chunk = decoded as BlobRelayChunk;
    expect(chunk.data).toBeInstanceOf(Uint8Array);
    expect(chunk.data).toEqual(data);
    expect(chunk.targetConnectionId).toBe('conn-2');
  });

  it('encodes chunk data as base64 in the JSON string', () => {
    const msg: BlobRelayChunk = {
      type: 'blob-relay-chunk',
      requestId: 'r1',
      blobId: 'b1',
      chunkIndex: 0,
      totalChunks: 1,
      data: new Uint8Array([72, 101, 108, 108, 111]), // "Hello"
      targetConnectionId: 'conn-2',
    };
    const encoded = encodeBlobRelayMessage(msg);
    const parsed = JSON.parse(encoded);
    expect(parsed._encoding).toBe('base64');
    expect(typeof parsed.data).toBe('string');
    // base64 of "Hello"
    expect(parsed.data).toBe(btoa('Hello'));
  });

  it('round-trips empty Uint8Array in chunk', () => {
    const msg: BlobRelayChunk = {
      type: 'blob-relay-chunk',
      requestId: 'r1',
      blobId: 'b1',
      chunkIndex: 0,
      totalChunks: 1,
      data: new Uint8Array(0),
      targetConnectionId: 'conn-2',
    };
    const encoded = encodeBlobRelayMessage(msg);
    const decoded = decodeBlobRelayMessage(encoded) as BlobRelayChunk;

    expect(decoded).not.toBeNull();
    expect(decoded.data).toBeInstanceOf(Uint8Array);
    expect(decoded.data.length).toBe(0);
  });

  it('returns null for invalid JSON', () => {
    expect(decodeBlobRelayMessage('not json at all')).toBeNull();
  });

  it('returns null for missing type field', () => {
    expect(decodeBlobRelayMessage('{"blobId":"b1"}')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(decodeBlobRelayMessage('')).toBeNull();
  });

  it('returns null for non-object JSON', () => {
    expect(decodeBlobRelayMessage('"just a string"')).toBeNull();
    expect(decodeBlobRelayMessage('42')).toBeNull();
    expect(decodeBlobRelayMessage('null')).toBeNull();
  });
});
