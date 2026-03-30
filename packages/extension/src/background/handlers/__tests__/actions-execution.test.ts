import type { ActionBundle, ActionPolicy } from '@coop/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sharedMocks = vi.hoisted(() => ({
  createActionLogEntry: vi.fn((input: Record<string, unknown>) => input),
  createDefaultPolicies: vi.fn(),
  createReplayGuard: vi.fn(() => ({
    hasSeen: vi.fn(() => false),
  })),
  executeBundle: vi.fn(),
  findMatchingPolicy: vi.fn(),
  getActionBundle: vi.fn(),
  listActionPolicies: vi.fn(),
  listRecordedReplayIds: vi.fn(),
  nowIso: vi.fn(() => '2026-03-29T00:00:00.000Z'),
  recordReplayId: vi.fn(async () => undefined),
  saveActionBundle: vi.fn(async () => undefined),
  saveActionLogEntry: vi.fn(async () => undefined),
  setActionPolicies: vi.fn(async () => undefined),
}));

const operatorMocks = vi.hoisted(() => ({
  getTrustedNodeContext: vi.fn(),
}));

const executorMocks = vi.hoisted(() => ({
  buildActionExecutors: vi.fn(),
}));

vi.mock('@coop/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@coop/shared')>();
  return {
    ...actual,
    createActionLogEntry: sharedMocks.createActionLogEntry,
    createDefaultPolicies: sharedMocks.createDefaultPolicies,
    createReplayGuard: sharedMocks.createReplayGuard,
    executeBundle: sharedMocks.executeBundle,
    findMatchingPolicy: sharedMocks.findMatchingPolicy,
    getActionBundle: sharedMocks.getActionBundle,
    listActionPolicies: sharedMocks.listActionPolicies,
    listRecordedReplayIds: sharedMocks.listRecordedReplayIds,
    nowIso: sharedMocks.nowIso,
    recordReplayId: sharedMocks.recordReplayId,
    saveActionBundle: sharedMocks.saveActionBundle,
    saveActionLogEntry: sharedMocks.saveActionLogEntry,
    setActionPolicies: sharedMocks.setActionPolicies,
  };
});

vi.mock('../../context', () => ({
  db: {},
}));

vi.mock('../../operator', () => ({
  getTrustedNodeContext: operatorMocks.getTrustedNodeContext,
}));

vi.mock('../action-executors', () => ({
  buildActionExecutors: executorMocks.buildActionExecutors,
}));

const { handleExecuteAction } = await import('../actions');

function makeBundle(overrides: Partial<ActionBundle> = {}): ActionBundle {
  return {
    id: 'bundle-1',
    replayId: 'replay-1',
    coopId: 'coop-1',
    memberId: 'member-1',
    actionClass: 'green-goods-create-garden',
    payload: { title: 'Starter garden' },
    status: 'approved',
    ...overrides,
  } as ActionBundle;
}

function makePolicy(overrides: Partial<ActionPolicy> = {}): ActionPolicy {
  return {
    id: 'policy-1',
    actionClass: 'green-goods-create-garden',
    approvalRequired: true,
    replayProtection: true,
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
    ...overrides,
  } as ActionPolicy;
}

describe('handleExecuteAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const bundle = makeBundle();
    const policy = makePolicy();
    const trustedNodeContext = {
      ok: true,
      coop: {
        profile: { id: 'coop-1' },
      },
      member: {
        id: 'member-1',
        displayName: 'Ava',
      },
      authSession: {
        primaryAddress: '0x1111111111111111111111111111111111111111',
      },
    };

    sharedMocks.getActionBundle.mockResolvedValue(bundle);
    operatorMocks.getTrustedNodeContext.mockResolvedValue(trustedNodeContext);
    sharedMocks.listActionPolicies.mockResolvedValue([policy]);
    sharedMocks.findMatchingPolicy.mockReturnValue(policy);
    sharedMocks.listRecordedReplayIds.mockResolvedValue(['replay-old']);
    executorMocks.buildActionExecutors.mockReturnValue({
      'green-goods-create-garden': vi.fn(),
    });
    sharedMocks.executeBundle.mockResolvedValue({
      ok: true,
      detail: 'Executed successfully.',
      bundle: {
        ...bundle,
        status: 'executed',
      },
    });
  });

  it('returns an error when the bundle is missing', async () => {
    sharedMocks.getActionBundle.mockResolvedValue(undefined);

    const result = await handleExecuteAction({
      type: 'execute-action',
      payload: {
        bundleId: 'missing-bundle',
      },
    });

    expect(result).toEqual({
      ok: false,
      error: 'Action bundle not found.',
    });
  });

  it('returns an error when no matching policy exists for the bundle', async () => {
    sharedMocks.findMatchingPolicy.mockReturnValue(undefined);

    const result = await handleExecuteAction({
      type: 'execute-action',
      payload: {
        bundleId: 'bundle-1',
      },
    });

    expect(result).toEqual({
      ok: false,
      error: 'No policy found for action class "green-goods-create-garden".',
    });
  });

  it('records replay ids, saves bundles, and writes success logs for successful execution', async () => {
    const result = await handleExecuteAction({
      type: 'execute-action',
      payload: {
        bundleId: 'bundle-1',
      },
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        id: 'bundle-1',
        status: 'executed',
      }),
      error: undefined,
    });
    expect(sharedMocks.createReplayGuard).toHaveBeenCalledWith(['replay-old']);
    expect(executorMocks.buildActionExecutors).toHaveBeenCalledWith({
      bundle: expect.objectContaining({
        id: 'bundle-1',
      }),
      trustedNodeContext: expect.objectContaining({
        ok: true,
      }),
    });
    expect(sharedMocks.executeBundle).toHaveBeenCalledWith({
      bundle: expect.objectContaining({
        id: 'bundle-1',
      }),
      policy: expect.objectContaining({
        id: 'policy-1',
      }),
      replayGuard: expect.any(Object),
      handlers: expect.any(Object),
    });
    expect(sharedMocks.saveActionLogEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'execution-started',
      }),
    );
    expect(sharedMocks.recordReplayId).toHaveBeenCalledWith(
      expect.anything(),
      'replay-1',
      'bundle-1',
      '2026-03-29T00:00:00.000Z',
    );
    expect(sharedMocks.saveActionLogEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'execution-succeeded',
        detail: 'Executed successfully.',
      }),
    );
  });

  it('writes failure logs and skips replay recording when execution fails', async () => {
    sharedMocks.executeBundle.mockResolvedValue({
      ok: false,
      detail: 'Execution failed.',
      bundle: {
        ...makeBundle(),
        status: 'failed',
      },
    });

    const result = await handleExecuteAction({
      type: 'execute-action',
      payload: {
        bundleId: 'bundle-1',
      },
    });

    expect(result).toEqual({
      ok: false,
      data: expect.objectContaining({
        id: 'bundle-1',
        status: 'failed',
      }),
      error: 'Execution failed.',
    });
    expect(sharedMocks.recordReplayId).not.toHaveBeenCalled();
    expect(sharedMocks.saveActionLogEntry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'execution-failed',
        detail: 'Execution failed.',
      }),
    );
  });
});
