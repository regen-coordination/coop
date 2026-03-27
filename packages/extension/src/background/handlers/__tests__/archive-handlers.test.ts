import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createStorachaArchiveClient: vi.fn(),
  getAnchorCapability: vi.fn(),
  getAuthSession: vi.fn(),
  getCoopBlob: vi.fn(),
  getCoops: vi.fn(),
  issueArchiveDelegation: vi.fn(),
  listArchiveRecoveryRecords: vi.fn(),
  logPrivilegedAction: vi.fn(),
  notifyExtensionEvent: vi.fn(),
  refreshBadge: vi.fn(),
  removeArchiveRecoveryRecord: vi.fn(),
  requireAnchorModeForFeature: vi.fn(),
  requestArchiveOnChainSealWitness: vi.fn(),
  requestArchiveReceiptFilecoinInfo: vi.fn(),
  resolveArchiveConfigForCoop: vi.fn(),
  resolveReceiverPairingMember: vi.fn(),
  saveState: vi.fn(),
  setArchiveRecoveryRecord: vi.fn(),
  setRuntimeHealth: vi.fn(),
  uploadArchiveBundleToStoracha: vi.fn(),
}));

vi.mock('../../context', () => ({
  configuredArchiveMode: 'live',
  configuredChain: 'sepolia',
  configuredFvmChain: 'filecoin-calibration',
  configuredFvmOperatorKey: undefined,
  configuredFvmRegistryAddress: undefined,
  configuredOnchainMode: 'mock',
  configuredPimlicoApiKey: undefined,
  db: {},
  getCoops: mocks.getCoops,
  notifyExtensionEvent: mocks.notifyExtensionEvent,
  resolveArchiveConfigForCoop: mocks.resolveArchiveConfigForCoop,
  saveState: mocks.saveState,
  setRuntimeHealth: mocks.setRuntimeHealth,
}));

vi.mock('../../dashboard', () => ({
  refreshBadge: mocks.refreshBadge,
}));

vi.mock('../../operator', () => ({
  logPrivilegedAction: mocks.logPrivilegedAction,
}));

vi.mock('../../../runtime/operator', () => ({
  describeArchiveLiveFailure: (error: unknown) =>
    error instanceof Error ? error.message : 'Archive upload failed.',
  requireAnchorModeForFeature: mocks.requireAnchorModeForFeature,
}));

vi.mock('../../../runtime/receiver', () => ({
  resolveReceiverPairingMember: mocks.resolveReceiverPairingMember,
}));

vi.mock('../agent', () => ({
  emitAgentObservationIfMissing: vi.fn(),
}));

vi.mock('../session', () => ({
  createOwnerSafeExecutionContext: vi.fn(),
}));

vi.mock('@coop/shared', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    createStorachaArchiveClient: mocks.createStorachaArchiveClient,
    getAnchorCapability: mocks.getAnchorCapability,
    getAuthSession: mocks.getAuthSession,
    getCoopBlob: mocks.getCoopBlob,
    issueArchiveDelegation: mocks.issueArchiveDelegation,
    listArchiveRecoveryRecords: mocks.listArchiveRecoveryRecords,
    removeArchiveRecoveryRecord: mocks.removeArchiveRecoveryRecord,
    requestArchiveOnChainSealWitness: mocks.requestArchiveOnChainSealWitness,
    requestArchiveReceiptFilecoinInfo: mocks.requestArchiveReceiptFilecoinInfo,
    setArchiveRecoveryRecord: mocks.setArchiveRecoveryRecord,
    uploadArchiveBundleToStoracha: mocks.uploadArchiveBundleToStoracha,
  };
});

const {
  createArchiveBundle,
  createArchiveReceiptFromUpload,
  createCoop,
  createMockArchiveReceipt,
} = await import('@coop/shared');
const { handleArchiveArtifact, handleRefreshArchiveStatus } = await import('../archive');

function buildSetupInsights() {
  return {
    summary: 'Archive handler test insights.',
    crossCuttingPainPoints: ['Archive uploads can miss attachment bytes'],
    crossCuttingOpportunities: ['Keep attachment archival explicit and tested'],
    lenses: [
      {
        lens: 'capital-formation',
        currentState: 'Artifacts include binary evidence.',
        painPoints: 'Archive uploads can lose attachment bytes.',
        improvements: 'Upload missing blobs before sealing receipts.',
      },
      {
        lens: 'impact-reporting',
        currentState: 'Artifacts carry media context.',
        painPoints: 'Attachment retrieval breaks without archive CIDs.',
        improvements: 'Persist attachment archive CIDs after upload.',
      },
      {
        lens: 'governance-coordination',
        currentState: 'Receipts are stored locally.',
        painPoints: 'Blob failures are hard to trace.',
        improvements: 'Fail loudly when required blob data is missing.',
      },
      {
        lens: 'knowledge-garden-resources',
        currentState: 'Research can include files.',
        painPoints: 'Files are omitted from archive payloads.',
        improvements: 'Bundle attachment bytes deliberately.',
      },
    ],
  } as const;
}

function buildCoopWithAttachment() {
  const created = createCoop({
    coopName: 'Archive Handler Coop',
    purpose: 'Exercise archive handler attachment uploads.',
    creatorDisplayName: 'Ari',
    captureMode: 'manual',
    seedContribution: 'I bring attachment-heavy archive coverage.',
    setupInsights: buildSetupInsights(),
  });
  const artifact = created.state.artifacts[0];
  if (!artifact) {
    throw new Error('Expected an initial artifact.');
  }

  return {
    coop: {
      ...created.state,
      artifacts: created.state.artifacts.map((candidate) =>
        candidate.id === artifact.id
          ? {
              ...candidate,
              attachments: [
                {
                  blobId: 'blob-1',
                  mimeType: 'image/png',
                  byteSize: 3,
                  kind: 'image' as const,
                },
              ],
            }
          : candidate,
      ),
    },
    artifactId: artifact.id,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.createStorachaArchiveClient.mockResolvedValue({
    did: () => 'did:key:audience',
  });
  mocks.getAnchorCapability.mockResolvedValue(null);
  mocks.issueArchiveDelegation.mockResolvedValue({
    spaceDid: 'did:key:space',
    delegationIssuer: 'did:key:issuer',
    gatewayBaseUrl: 'https://storacha.link',
    spaceDelegation: 'space-proof',
    proofs: [],
    allowsFilecoinInfo: false,
  });
  mocks.resolveArchiveConfigForCoop.mockResolvedValue({
    spaceDid: 'did:key:space',
    delegationIssuer: 'did:key:issuer',
    gatewayBaseUrl: 'https://storacha.link',
    spaceDelegation: 'space-proof',
    proofs: [],
    allowsFilecoinInfo: false,
    expirationSeconds: 600,
  });
  mocks.requestArchiveOnChainSealWitness.mockResolvedValue({
    proof: '{"type":"coop-filecoin-onchain-seal-witness"}',
    proofCid: 'bafysealwitness',
  });
  mocks.requestArchiveReceiptFilecoinInfo.mockResolvedValue({
    pieceCid: 'bafkpiece',
    aggregates: [{ aggregate: 'bafyaggregate' }],
    deals: [
      {
        aggregate: 'bafyaggregate',
        provider: 'f01234',
        dealId: '44',
      },
    ],
    lastUpdatedAt: '2026-03-27T10:00:00.000Z',
  });
  mocks.resolveReceiverPairingMember.mockImplementation((coop: { members: unknown[] }) => {
    return coop.members[0];
  });
  mocks.listArchiveRecoveryRecords.mockResolvedValue([]);
  mocks.requireAnchorModeForFeature.mockImplementation(() => undefined);
  mocks.removeArchiveRecoveryRecord.mockResolvedValue(undefined);
  mocks.saveState.mockResolvedValue(undefined);
  mocks.setArchiveRecoveryRecord.mockResolvedValue(undefined);
  mocks.uploadArchiveBundleToStoracha.mockResolvedValue({
    audienceDid: 'did:key:audience',
    rootCid: 'bafyroot',
    shardCids: ['bafyshard'],
    pieceCids: ['bafkpiece'],
    gatewayUrl: 'https://storacha.link/ipfs/bafyroot',
    blobCids: {
      'blob-1': 'bafyblob',
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('archive handlers', () => {
  it('reconciles a pending archive recovery before starting a duplicate artifact upload', async () => {
    const { coop, artifactId } = buildCoopWithAttachment();
    const bundle = createArchiveBundle({
      scope: 'artifact',
      state: coop,
      artifactIds: [artifactId],
    });
    const recoveredReceipt = createMockArchiveReceipt({
      bundle,
      delegationIssuer: 'did:key:issuer',
      artifactIds: [artifactId],
    });

    mocks.getCoops.mockResolvedValue([coop]);
    mocks.listArchiveRecoveryRecords.mockResolvedValue([
      {
        id: 'archive-recovery-1',
        coopId: coop.profile.id,
        createdAt: '2026-03-27T00:00:00.000Z',
        receipt: recoveredReceipt,
        artifactIds: [artifactId],
        blobUploads: {
          'blob-1': {
            archiveCid: 'bafyblob-recovered',
          },
        },
      },
    ]);

    const result = await handleArchiveArtifact({
      type: 'archive-artifact',
      payload: {
        coopId: coop.profile.id,
        artifactId,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.data).toEqual(recoveredReceipt);
    expect(mocks.saveState).toHaveBeenCalledTimes(1);
    expect(mocks.removeArchiveRecoveryRecord).toHaveBeenCalledWith({}, 'archive-recovery-1');
    expect(mocks.uploadArchiveBundleToStoracha).not.toHaveBeenCalled();
  });

  it('uploads required attachment blobs and stores returned archive CIDs on the artifact', async () => {
    const { coop, artifactId } = buildCoopWithAttachment();
    mocks.getCoops.mockResolvedValue([coop]);
    mocks.getAuthSession.mockResolvedValue({
      primaryAddress: coop.members[0]?.address,
    });
    mocks.getCoopBlob.mockResolvedValue({
      record: {
        blobId: 'blob-1',
      },
      bytes: new Uint8Array([1, 2, 3]),
    });

    const result = await handleArchiveArtifact({
      type: 'archive-artifact',
      payload: {
        coopId: coop.profile.id,
        artifactId,
      },
    });

    expect(result.ok).toBe(true);
    expect(mocks.uploadArchiveBundleToStoracha).toHaveBeenCalledTimes(1);

    const uploadInput = mocks.uploadArchiveBundleToStoracha.mock.calls[0]?.[0] as {
      blobBytes?: Map<string, Uint8Array>;
    };
    expect(Array.from(uploadInput.blobBytes?.keys() ?? [])).toEqual(['blob-1']);
    expect(Array.from(uploadInput.blobBytes?.get('blob-1') ?? [])).toEqual([1, 2, 3]);

    const savedState = mocks.saveState.mock.calls[0]?.[0] as typeof coop | undefined;
    const savedArtifact = savedState?.artifacts.find((artifact) => artifact.id === artifactId);
    expect(savedArtifact?.archiveStatus).toBe('archived');
    expect(savedArtifact?.attachments[0]?.archiveCid).toBe('bafyblob');
    expect(savedState?.archiveReceipts).toHaveLength(1);
  });

  it('keeps a recovery record when remote upload succeeds but local receipt persistence fails', async () => {
    const { coop, artifactId } = buildCoopWithAttachment();
    mocks.getCoops.mockResolvedValue([coop]);
    mocks.getAuthSession.mockResolvedValue({
      primaryAddress: coop.members[0]?.address,
    });
    mocks.getCoopBlob.mockResolvedValue({
      record: {
        blobId: 'blob-1',
      },
      bytes: new Uint8Array([1, 2, 3]),
    });
    mocks.saveState.mockRejectedValueOnce(new Error('Dexie write failed'));

    const result = await handleArchiveArtifact({
      type: 'archive-artifact',
      payload: {
        coopId: coop.profile.id,
        artifactId,
      },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Archive upload completed remotely');
    expect(mocks.uploadArchiveBundleToStoracha).toHaveBeenCalledTimes(1);
    expect(mocks.setArchiveRecoveryRecord).toHaveBeenCalledTimes(1);
    expect(mocks.removeArchiveRecoveryRecord).not.toHaveBeenCalled();
    expect(mocks.notifyExtensionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKind: 'archive-artifact',
        state: 'recovery-pending',
      }),
    );
  });

  it('attaches independent on-chain seal witnesses during live archive follow-up refresh', async () => {
    const { coop, artifactId } = buildCoopWithAttachment();
    const receipt = {
      ...createArchiveReceiptFromUpload({
        bundle: createArchiveBundle({
          scope: 'artifact',
          state: coop,
          artifactIds: [artifactId],
        }),
        delegationIssuer: 'did:key:issuer',
        delegationMode: 'live',
        allowsFilecoinInfo: true,
        rootCid: 'bafyroot',
        shardCids: ['bafyshard'],
        pieceCids: ['bafkpiece'],
        gatewayUrl: 'https://storacha.link/ipfs/bafyroot',
        artifactIds: [artifactId],
      }),
      filecoinStatus: 'sealed' as const,
      filecoinInfo: {
        pieceCid: 'bafkpiece',
        aggregates: [{ aggregate: 'bafyaggregate', inclusionProofAvailable: false }],
        deals: [
          {
            aggregate: 'bafyaggregate',
            provider: 'f01234',
            dealId: '44',
          },
        ],
        lastUpdatedAt: '2026-03-27T09:00:00.000Z',
      },
    };
    mocks.getCoops.mockResolvedValue([
      {
        ...coop,
        archiveReceipts: [receipt],
      },
    ]);
    mocks.getAuthSession.mockResolvedValue({
      primaryAddress: coop.members[0]?.address,
    });
    mocks.resolveArchiveConfigForCoop.mockResolvedValue({
      spaceDid: 'did:key:space',
      delegationIssuer: 'did:key:issuer',
      gatewayBaseUrl: 'https://storacha.link',
      spaceDelegation: 'space-proof',
      proofs: [],
      allowsFilecoinInfo: true,
      expirationSeconds: 600,
      filecoinWitnessRpcUrl: 'https://lotus.example/rpc/v1',
      filecoinWitnessRpcToken: 'token-1',
    });

    const result = await handleRefreshArchiveStatus({
      type: 'refresh-archive-status',
      payload: {
        coopId: coop.profile.id,
        receiptId: receipt.id,
      },
    });

    expect(result.ok).toBe(true);
    expect(mocks.requestArchiveReceiptFilecoinInfo).toHaveBeenCalledTimes(1);
    expect(mocks.requestArchiveOnChainSealWitness).toHaveBeenCalledWith({
      pieceCid: 'bafkpiece',
      dealId: '44',
      provider: 'f01234',
      rpcUrl: 'https://lotus.example/rpc/v1',
      rpcToken: 'token-1',
    });

    const savedState = mocks.saveState.mock.calls[0]?.[0] as
      | {
          archiveReceipts: Array<{
            filecoinInfo?: { deals: Array<{ onChainSealWitnessCid?: string }> };
          }>;
        }
      | undefined;
    expect(savedState?.archiveReceipts[0]?.filecoinInfo?.deals[0]?.onChainSealWitnessCid).toBe(
      'bafysealwitness',
    );
  });

  it('fails before upload when an attachment blob is missing locally and has no archive CID', async () => {
    const { coop, artifactId } = buildCoopWithAttachment();
    mocks.getCoops.mockResolvedValue([coop]);
    mocks.getAuthSession.mockResolvedValue({
      primaryAddress: coop.members[0]?.address,
    });
    mocks.getCoopBlob.mockResolvedValue(null);

    const result = await handleArchiveArtifact({
      type: 'archive-artifact',
      payload: {
        coopId: coop.profile.id,
        artifactId,
      },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Archive is missing local blob data');
    expect(mocks.uploadArchiveBundleToStoracha).not.toHaveBeenCalled();
    expect(mocks.saveState).not.toHaveBeenCalled();
  });
});
