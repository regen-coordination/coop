import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createStorachaArchiveClient,
  issueArchiveDelegation,
  requestArchiveReceiptFilecoinInfo,
  uploadArchiveBundleToStoracha,
} from '../storacha';

const storachaMocks = vi.hoisted(() => {
  const validPieceCid = 'bafkreibuenncyubohem5h4ak6xnlxb6llcxpivtlcbrr6ks5xfevb277xu';
  const addSpace = vi.fn();
  const addProof = vi.fn();
  const setCurrentSpace = vi.fn();
  const uploadFile = vi.fn();
  const filecoinInfo = vi.fn();
  const createDelegation = vi.fn();
  const did = vi.fn(() => 'did:key:test-agent');
  const clientFactory = vi.fn(async () => ({
    did,
    addSpace,
    addProof,
    setCurrentSpace,
    uploadFile,
    createDelegation,
    capability: {
      filecoin: {
        info: filecoinInfo,
      },
    },
  }));
  const parseProof = vi.fn(async (value: string) => ({ proof: value }));

  return {
    addSpace,
    addProof,
    setCurrentSpace,
    uploadFile,
    filecoinInfo,
    createDelegation,
    validPieceCid,
    did,
    clientFactory,
    parseProof,
  };
});

vi.mock('@storacha/client', () => ({
  create: storachaMocks.clientFactory,
}));

vi.mock('@storacha/client/proof', () => ({
  parse: storachaMocks.parseProof,
}));

describe('storacha archive helpers', () => {
  const validAudienceDid = 'did:key:z6MkuTR1Q9bmw2iPVobJeEkUdMZkbGGcXK5KdYE8vKygUvGp';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('issues trusted-node delegation from static config without a signer key', async () => {
    const delegation = await issueArchiveDelegation({
      request: {
        audienceDid: validAudienceDid,
        coopId: 'coop-1',
        scope: 'artifact',
        operation: 'upload',
        artifactIds: ['artifact-1'],
        actorAddress: '0x1111111111111111111111111111111111111111',
        safeAddress: '0x2222222222222222222222222222222222222222',
        chainKey: 'sepolia',
      },
      config: {
        spaceDid: 'did:key:space',
        delegationIssuer: 'trusted-node-demo',
        gatewayBaseUrl: 'https://storacha.link',
        spaceDelegation: 'space-proof',
        proofs: ['proof-a'],
        allowsFilecoinInfo: false,
        expirationSeconds: 600,
      },
    });

    expect(delegation.spaceDid).toBe('did:key:space');
    expect(delegation.delegationIssuer).toBe('trusted-node-demo');
    expect(delegation.proofs).toEqual(['proof-a']);
    expect(delegation.allowsFilecoinInfo).toBe(false);
  });

  it('issues signer-backed trusted-node delegation with upload abilities', async () => {
    storachaMocks.createDelegation.mockResolvedValue({
      archive: async () => ({ ok: new Uint8Array([1, 2, 3, 4]) }),
    });

    const delegation = await issueArchiveDelegation({
      request: {
        audienceDid: validAudienceDid,
        coopId: 'coop-1',
        scope: 'artifact',
        operation: 'upload',
        artifactIds: ['artifact-1'],
        actorAddress: '0x1111111111111111111111111111111111111111',
        safeAddress: '0x2222222222222222222222222222222222222222',
        chainKey: 'sepolia',
      },
      config: {
        agentPrivateKey: 'agent-private-key',
        spaceDid: 'did:key:space',
        delegationIssuer: 'trusted-node-demo',
        gatewayBaseUrl: 'https://storacha.link',
        spaceDelegation: 'space-proof',
        proofs: ['proof-a', 'proof-b'],
        allowsFilecoinInfo: true,
        expirationSeconds: 600,
      },
      decodeSigner: () =>
        ({
          did: () => 'did:key:trusted-node',
        }) as never,
      createDelegationClient: async () =>
        ({
          addSpace: storachaMocks.addSpace,
          addProof: storachaMocks.addProof,
          setCurrentSpace: storachaMocks.setCurrentSpace,
          createDelegation: storachaMocks.createDelegation,
        }) as never,
    });

    expect(storachaMocks.parseProof).toHaveBeenCalledWith('space-proof');
    expect(storachaMocks.parseProof).toHaveBeenCalledWith('proof-a');
    expect(storachaMocks.parseProof).toHaveBeenCalledWith('proof-b');
    expect(storachaMocks.setCurrentSpace).toHaveBeenCalledWith('did:key:space');
    expect(storachaMocks.createDelegation).toHaveBeenCalledWith(
      expect.anything(),
      ['filecoin/offer', 'space/blob/add', 'space/index/add', 'upload/add', 'filecoin/info'],
      expect.objectContaining({
        expiration: expect.any(Number),
      }),
    );
    expect(delegation.delegationIssuer).toBe('did:key:trusted-node');
    expect(delegation.proofs).toEqual([]);
    expect(delegation.allowsFilecoinInfo).toBe(true);
  });

  it('issues follow-up delegation with only filecoin/info ability', async () => {
    const createDelegation = vi.fn().mockResolvedValue({
      archive: async () => ({ ok: new Uint8Array([9, 9, 9]) }),
    });

    await issueArchiveDelegation({
      request: {
        audienceDid: validAudienceDid,
        coopId: 'coop-1',
        scope: 'artifact',
        operation: 'follow-up',
        artifactIds: ['artifact-1'],
        actorAddress: '0x1111111111111111111111111111111111111111',
        safeAddress: '0x2222222222222222222222222222222222222222',
        chainKey: 'sepolia',
        receiptId: 'receipt-1',
        rootCid: 'bafyroot',
        pieceCids: ['bafkpiece1'],
      },
      config: {
        agentPrivateKey: 'agent-private-key',
        spaceDid: 'did:key:space',
        delegationIssuer: 'trusted-node-demo',
        gatewayBaseUrl: 'https://storacha.link',
        spaceDelegation: 'space-proof',
        proofs: [],
        allowsFilecoinInfo: false,
        expirationSeconds: 600,
      },
      decodeSigner: () =>
        ({
          did: () => 'did:key:trusted-node',
        }) as never,
      createDelegationClient: async () =>
        ({
          addSpace: vi.fn(),
          addProof: vi.fn(),
          setCurrentSpace: vi.fn(),
          createDelegation,
        }) as never,
    });

    expect(createDelegation).toHaveBeenCalledWith(
      expect.anything(),
      ['filecoin/info'],
      expect.objectContaining({
        expiration: expect.any(Number),
      }),
    );
  });

  it('rejects static follow-up delegation when config does not allow filecoin info', async () => {
    await expect(
      issueArchiveDelegation({
        request: {
          audienceDid: validAudienceDid,
          coopId: 'coop-1',
          scope: 'artifact',
          operation: 'follow-up',
          artifactIds: ['artifact-1'],
          receiptId: 'receipt-1',
          rootCid: 'bafyroot',
          pieceCids: ['bafkpiece1'],
        },
        config: {
          spaceDid: 'did:key:space',
          delegationIssuer: 'trusted-node-demo',
          gatewayBaseUrl: 'https://storacha.link',
          spaceDelegation: 'space-proof',
          proofs: ['proof-a'],
          allowsFilecoinInfo: false,
          expirationSeconds: 600,
        },
      }),
    ).rejects.toThrow('Static trusted-node archive config does not allow Filecoin info follow-up.');
  });

  it('fails clearly when trusted-node archive config is malformed', async () => {
    await expect(
      issueArchiveDelegation({
        request: {
          audienceDid: validAudienceDid,
          coopId: 'coop-1',
          scope: 'artifact',
          operation: 'upload',
          artifactIds: [],
        },
        config: {
          delegationIssuer: 'trusted-node-demo',
          gatewayBaseUrl: 'https://storacha.link',
          spaceDelegation: 'space-proof',
          proofs: [],
          allowsFilecoinInfo: false,
          expirationSeconds: 600,
        } as never,
      }),
    ).rejects.toThrow();
  });

  it('uploads an archive bundle with delegated proofs and collects shard metadata', async () => {
    storachaMocks.uploadFile.mockImplementation(
      async (
        _blob: Blob,
        options?: {
          onShardStored?: (meta: {
            cid: { toString(): string };
            piece?: { toString(): string };
          }) => void;
        },
      ) => {
        options?.onShardStored?.({
          cid: { toString: () => 'bafyshard1' },
          piece: { toString: () => 'bafkpiece1' },
        });
        options?.onShardStored?.({
          cid: { toString: () => 'bafyshard2' },
        });
        return { toString: () => 'bafyroot' };
      },
    );

    const client = await createStorachaArchiveClient();
    const result = await uploadArchiveBundleToStoracha({
      client,
      bundle: {
        id: 'bundle-1',
        scope: 'artifact',
        targetCoopId: 'coop-1',
        createdAt: new Date().toISOString(),
        payload: {
          coop: { id: 'coop-1', name: 'Archive Coop' },
          artifacts: [{ id: 'artifact-1', title: 'Proof of work' }],
        },
      },
      delegation: {
        spaceDid: 'did:key:space',
        delegationIssuer: 'trusted-node-demo',
        gatewayBaseUrl: 'https://storacha.link',
        spaceDelegation: 'space-proof',
        proofs: ['proof-a', 'proof-b'],
        allowsFilecoinInfo: false,
      },
    });

    expect(storachaMocks.addSpace).toHaveBeenCalledTimes(1);
    expect(storachaMocks.addProof).toHaveBeenCalledTimes(2);
    expect(storachaMocks.setCurrentSpace).toHaveBeenCalledWith('did:key:space');
    expect(result.rootCid).toBe('bafyroot');
    expect(result.shardCids).toEqual(['bafyshard1', 'bafyshard2']);
    expect(result.pieceCids).toEqual(['bafkpiece1']);
    expect(result.gatewayUrl).toBe('https://storacha.link/ipfs/bafyroot');
  });

  it('requests Filecoin follow-up info for a live receipt', async () => {
    storachaMocks.filecoinInfo.mockResolvedValue({
      out: {
        ok: {
          piece: { toString: () => 'bafkpiece1' },
          aggregates: [{ aggregate: { toString: () => 'bafyaggregate' }, inclusion: {} }],
          deals: [
            {
              aggregate: { toString: () => 'bafyaggregate' },
              provider: { toString: () => 'f01234' },
              aux: {
                dataSource: {
                  dealID: 77,
                },
              },
            },
          ],
        },
      },
    });

    const info = await requestArchiveReceiptFilecoinInfo({
      client: await createStorachaArchiveClient(),
      receipt: {
        id: 'receipt-1',
        scope: 'artifact',
        targetCoopId: 'coop-1',
        artifactIds: ['artifact-1'],
        bundleReference: 'bundle-1',
        rootCid: 'bafyroot',
        shardCids: ['bafyshard1'],
        pieceCids: [storachaMocks.validPieceCid],
        gatewayUrl: 'https://storacha.link/ipfs/bafyroot',
        uploadedAt: new Date().toISOString(),
        filecoinStatus: 'offered',
        delegationIssuer: 'trusted-node-demo',
        delegation: {
          issuer: 'trusted-node-demo',
          mode: 'live',
          allowsFilecoinInfo: true,
        },
      },
      delegation: {
        spaceDid: 'did:key:space',
        delegationIssuer: 'trusted-node-demo',
        gatewayBaseUrl: 'https://storacha.link',
        spaceDelegation: 'space-proof',
        proofs: ['proof-a'],
        allowsFilecoinInfo: true,
      },
    });

    expect(storachaMocks.filecoinInfo).toHaveBeenCalledTimes(1);
    expect(info.pieceCid).toBe('bafkpiece1');
    expect(info.aggregates[0]?.aggregate).toBe('bafyaggregate');
    expect(info.deals[0]?.dealId).toBe('77');
  });
});
