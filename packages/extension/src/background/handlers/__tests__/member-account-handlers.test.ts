import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@coop/shared', () => ({
  getAuthSession: vi.fn(),
  getLocalMemberSignerBinding: vi.fn(),
  createMemberAccountRecord: vi.fn((input) => ({
    id: 'macct-1',
    memberId: input.memberId,
    coopId: input.coopId,
    accountAddress: undefined,
    accountType: 'safe',
    ownerPasskeyCredentialId: input.ownerPasskeyCredentialId,
    chainKey: input.chainKey,
    status: 'pending',
    statusNote: 'Account record created, awaiting local provisioning',
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
  })),
  markAccountPredicted: vi.fn((account, accountAddress) => ({
    ...account,
    accountAddress,
    status: 'predicted',
    statusNote: 'Counterfactual account address predicted and ready for lazy deployment',
    predictedAt: '2026-03-20T00:01:00.000Z',
    updatedAt: '2026-03-20T00:01:00.000Z',
  })),
  markAccountActive: vi.fn((account, deploymentTxHash, deployedAccountAddress) => ({
    ...account,
    accountAddress: deployedAccountAddress ?? account.accountAddress,
    status: 'active',
    deploymentTxHash,
    statusNote: 'Account deployed and ready',
    deployedAt: '2026-03-20T00:02:00.000Z',
    updatedAt: '2026-03-20T00:02:00.000Z',
  })),
  predictMemberAccountAddress: vi.fn(async () => '0x1111111111111111111111111111111111111111'),
  createLocalMemberSignerBinding: vi.fn((input) => ({
    id: 'msigner-1',
    coopId: input.coopId,
    memberId: input.memberId,
    accountAddress: input.accountAddress,
    accountType: input.accountType,
    passkeyCredentialId: input.passkeyCredentialId,
    createdAt: '2026-03-20T00:01:00.000Z',
    lastUsedAt: '2026-03-20T00:01:00.000Z',
  })),
  createGreenGoodsWorkSubmissionOutput: vi.fn((input) => input),
  nowIso: vi.fn(() => '2026-03-20T00:03:00.000Z'),
  saveLocalMemberSignerBinding: vi.fn(async () => undefined),
  sendTransactionViaMemberAccount: vi.fn(async () => ({
    txHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    receipt: {},
    accountAddress: '0x1111111111111111111111111111111111111111',
  })),
  submitGreenGoodsWorkSubmission: vi.fn(async () => ({
    txHash: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    detail: 'live Green Goods on Sepolia submitted a Green Goods work submission attestation.',
  })),
  syncGreenGoodsMemberBindings: vi.fn(({ memberAccounts }) => [
    {
      memberId: 'member-1',
      actorAddress: memberAccounts[0]?.accountAddress,
      desiredRoles: ['gardener', 'operator'],
      currentRoles: [],
      status: memberAccounts[0]?.accountAddress ? 'pending-sync' : 'pending-account',
    },
  ]),
}));

vi.mock('../../context', () => ({
  db: {},
  getCoops: vi.fn(),
  saveState: vi.fn(async () => undefined),
  configuredOnchainMode: 'live',
  configuredPimlicoApiKey: 'test-key',
  configuredGreenGoodsWorkSchemaUid:
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
}));

vi.mock('../../operator', () => ({
  findAuthenticatedCoopMember: vi.fn(),
}));

const { handleProvisionMemberOnchainAccount, handleSubmitGreenGoodsWorkSubmission } = await import(
  '../member-account'
);
const shared = await import('@coop/shared');
const context = await import('../../context');
const operator = await import('../../operator');

afterEach(() => {
  vi.clearAllMocks();
});

describe('handleProvisionMemberOnchainAccount', () => {
  it('rejects provisioning without a stored passkey session', async () => {
    vi.mocked(shared.getAuthSession).mockResolvedValue(null);

    const result = await handleProvisionMemberOnchainAccount({
      type: 'provision-member-onchain-account',
      payload: { coopId: 'coop-1', memberId: 'member-1' },
    });

    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining('passkey session'),
    });
  });

  it('predicts an account address, stores a local signer binding, and persists state', async () => {
    vi.mocked(shared.getAuthSession).mockResolvedValue({
      authMode: 'passkey',
      displayName: 'Mina',
      primaryAddress: '0x9999999999999999999999999999999999999999',
      createdAt: '2026-03-20T00:00:00.000Z',
      identityWarning: 'Device bound.',
      passkey: {
        id: 'cred-abc',
        publicKey: '0x1234abcd',
        rpId: 'coop.local',
      },
    });
    vi.mocked(context.getCoops).mockResolvedValue([
      {
        profile: { id: 'coop-1' },
        onchainState: { chainKey: 'sepolia' },
        members: [
          {
            id: 'member-1',
            displayName: 'Mina',
            address: '0x9999999999999999999999999999999999999999',
            role: 'creator',
          },
        ],
        memberAccounts: [],
        greenGoods: {
          enabled: true,
          memberBindings: [],
        },
      },
    ] as never);
    vi.mocked(operator.findAuthenticatedCoopMember).mockReturnValue({
      id: 'member-1',
      displayName: 'Mina',
      address: '0x9999999999999999999999999999999999999999',
      role: 'creator',
    } as never);

    const result = await handleProvisionMemberOnchainAccount({
      type: 'provision-member-onchain-account',
      payload: { coopId: 'coop-1', memberId: 'member-1' },
    });

    expect(result.ok).toBe(true);
    expect(shared.predictMemberAccountAddress).toHaveBeenCalledWith({
      authSession: expect.objectContaining({
        primaryAddress: '0x9999999999999999999999999999999999999999',
      }),
      coopId: 'coop-1',
      memberId: 'member-1',
      chainKey: 'sepolia',
      accountType: 'safe',
    });
    expect(shared.saveLocalMemberSignerBinding).toHaveBeenCalled();
    expect(vi.mocked(context.saveState)).toHaveBeenCalledWith(
      expect.objectContaining({
        memberAccounts: [
          expect.objectContaining({
            memberId: 'member-1',
            accountAddress: '0x1111111111111111111111111111111111111111',
            status: 'predicted',
          }),
        ],
        greenGoods: expect.objectContaining({
          memberBindings: [
            expect.objectContaining({
              memberId: 'member-1',
              actorAddress: '0x1111111111111111111111111111111111111111',
            }),
          ],
        }),
      }),
    );
  });
});

describe('handleSubmitGreenGoodsWorkSubmission', () => {
  it('submits work from the local member signer binding and persists the updated state', async () => {
    vi.mocked(shared.getAuthSession).mockResolvedValue({
      authMode: 'passkey',
      displayName: 'Mina',
      primaryAddress: '0x9999999999999999999999999999999999999999',
      createdAt: '2026-03-20T00:00:00.000Z',
      identityWarning: 'Device bound.',
      passkey: {
        id: 'cred-abc',
        publicKey: '0x1234abcd',
        rpId: 'coop.local',
      },
    });
    vi.mocked(shared.getLocalMemberSignerBinding).mockResolvedValue({
      id: 'msigner-1',
      coopId: 'coop-1',
      memberId: 'member-1',
      accountAddress: '0x1111111111111111111111111111111111111111',
      accountType: 'safe',
      passkeyCredentialId: 'cred-abc',
      createdAt: '2026-03-20T00:01:00.000Z',
      lastUsedAt: '2026-03-20T00:01:00.000Z',
    } as never);
    vi.mocked(context.getCoops).mockResolvedValue([
      {
        profile: { id: 'coop-1' },
        onchainState: { chainKey: 'sepolia' },
        members: [
          {
            id: 'member-1',
            displayName: 'Mina',
            address: '0x9999999999999999999999999999999999999999',
            role: 'member',
          },
        ],
        memberAccounts: [
          {
            id: 'macct-1',
            memberId: 'member-1',
            coopId: 'coop-1',
            accountAddress: '0x1111111111111111111111111111111111111111',
            accountType: 'safe',
            ownerPasskeyCredentialId: 'cred-abc',
            chainKey: 'sepolia',
            status: 'predicted',
            statusNote: 'Counterfactual account address predicted and ready for lazy deployment',
            createdAt: '2026-03-20T00:00:00.000Z',
            updatedAt: '2026-03-20T00:01:00.000Z',
          },
        ],
        greenGoods: {
          enabled: true,
          gardenAddress: '0x5555555555555555555555555555555555555555',
          memberBindings: [],
        },
      },
    ] as never);
    vi.mocked(operator.findAuthenticatedCoopMember).mockReturnValue({
      id: 'member-1',
      displayName: 'Mina',
      address: '0x9999999999999999999999999999999999999999',
      role: 'member',
    } as never);

    const result = await handleSubmitGreenGoodsWorkSubmission({
      type: 'submit-green-goods-work-submission',
      payload: {
        coopId: 'coop-1',
        memberId: 'member-1',
        submission: {
          actionUid: 6,
          title: 'Planting Event - 2026-03-20',
          feedback: 'Field crew completed the irrigation line.',
          metadataCid: 'bafy-metadata',
          mediaCids: ['bafy-media-1', 'bafy-media-2'],
        },
      },
    });

    expect(result.ok).toBe(true);
    expect(shared.submitGreenGoodsWorkSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        gardenAddress: '0x5555555555555555555555555555555555555555',
        output: expect.objectContaining({
          actionUid: 6,
          title: 'Planting Event - 2026-03-20',
          metadataCid: 'bafy-metadata',
          mediaCids: ['bafy-media-1', 'bafy-media-2'],
        }),
        schemaUid: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        liveExecutor: expect.any(Function),
      }),
    );
    expect(vi.mocked(context.saveState)).toHaveBeenCalledWith(
      expect.objectContaining({
        memberAccounts: [
          expect.objectContaining({
            memberId: 'member-1',
            status: 'active',
            deploymentTxHash: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
          }),
        ],
        greenGoods: expect.objectContaining({
          lastWorkSubmissionAt: expect.any(String),
          lastTxHash: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        }),
      }),
    );
    expect(shared.saveLocalMemberSignerBinding).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        lastUsedAt: '2026-03-20T00:03:00.000Z',
        lastError: undefined,
      }),
    );
  });
});
