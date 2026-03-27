import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  parseArchiveOnChainSealWitnessArtifact,
  requestArchiveOnChainSealWitness,
  verifyArchiveOnChainSealWitnessArtifact,
} from '../filecoin-witness';

describe('filecoin on-chain seal witness', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('builds a minimal canonical witness artifact from Lotus JSON-RPC responses', async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            result: {
              Height: 12345,
              Cids: [{ '/': 'bafyhead-1' }, { '/': 'bafyhead-2' }],
            },
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            result: {
              Proposal: {
                PieceCID: { '/': 'baga-piece-1' },
                PieceSize: 2048,
                VerifiedDeal: true,
                Provider: 'f01234',
                StartEpoch: 12000,
                EndEpoch: 18000,
              },
              State: {
                SectorStartEpoch: 12010,
                LastUpdatedEpoch: 12340,
                SlashEpoch: -1,
              },
            },
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            result: [
              {
                SectorNumber: 9,
                SealedCID: { '/': 'bafysealed-1' },
                DealIDs: [77, 88],
                Activation: 12010,
                Expiration: 20000,
                SectorKeyCID: null,
              },
            ],
          }),
      } as Response);

    const witness = await requestArchiveOnChainSealWitness({
      pieceCid: 'baga-piece-1',
      dealId: '77',
      provider: 'f01234',
      rpcUrl: 'https://lotus.example/rpc/v1',
      rpcToken: 'secret-token',
      witnessedAt: '2026-03-27T10:00:00.000Z',
    });

    const parsed = parseArchiveOnChainSealWitnessArtifact(witness.proof);
    const verification = await verifyArchiveOnChainSealWitnessArtifact({
      pieceCid: 'baga-piece-1',
      dealId: '77',
      provider: 'f01234',
      serializedProof: witness.proof,
      proofCid: witness.proofCid,
    });

    expect(verification.ok).toBe(true);
    expect(parsed.tipSet).toEqual({
      height: 12345,
      cids: ['bafyhead-1', 'bafyhead-2'],
    });
    expect(parsed.deal).toEqual({
      dealId: '77',
      provider: 'f01234',
      pieceCid: 'baga-piece-1',
      pieceSize: 2048,
      verifiedDeal: true,
      startEpoch: 12000,
      endEpoch: 18000,
      sectorStartEpoch: 12010,
      lastUpdatedEpoch: 12340,
      slashEpoch: -1,
    });
    expect(parsed.activeSector).toEqual({
      sectorNumber: 9,
      activation: 12010,
      expiration: 20000,
      sealedCid: 'bafysealed-1',
    });
    expect(witness.proof).not.toContain('Client');
    expect(witness.proof).not.toContain('Label');
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://lotus.example/rpc/v1',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer secret-token',
        }),
      }),
    );
  });

  it('fails when the independently queried provider has no active sector for the deal', async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            result: {
              Height: 12345,
              Cids: [{ '/': 'bafyhead-1' }],
            },
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            result: {
              Proposal: {
                PieceCID: { '/': 'baga-piece-1' },
                PieceSize: 2048,
                VerifiedDeal: true,
                Provider: 'f01234',
                StartEpoch: 12000,
                EndEpoch: 18000,
              },
              State: {
                SectorStartEpoch: 12010,
                LastUpdatedEpoch: 12340,
                SlashEpoch: -1,
              },
            },
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            jsonrpc: '2.0',
            id: 1,
            result: [
              {
                SectorNumber: 9,
                SealedCID: { '/': 'bafysealed-1' },
                DealIDs: [88],
                Activation: 12010,
                Expiration: 20000,
                SectorKeyCID: null,
              },
            ],
          }),
      } as Response);

    await expect(
      requestArchiveOnChainSealWitness({
        pieceCid: 'baga-piece-1',
        dealId: '77',
        provider: 'f01234',
        rpcUrl: 'https://lotus.example/rpc/v1',
      }),
    ).rejects.toThrow("did not find deal 77 in provider f01234's active sectors");
  });
});
