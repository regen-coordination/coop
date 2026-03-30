import type { AgentPlan } from '@coop/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sharedMocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
}));

const contextMocks = vi.hoisted(() => ({
  getCoops: vi.fn(),
}));

const operatorMocks = vi.hoisted(() => ({
  findAuthenticatedCoopMember: vi.fn(),
}));

const actionMocks = vi.hoisted(() => ({
  handleProposeAction: vi.fn(),
  handleExecuteAction: vi.fn(),
}));

vi.mock('@coop/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@coop/shared')>();
  return {
    ...actual,
    getAuthSession: sharedMocks.getAuthSession,
  };
});

vi.mock('../../context', () => ({
  db: {},
  getCoops: contextMocks.getCoops,
}));

vi.mock('../../operator', () => ({
  findAuthenticatedCoopMember: operatorMocks.findAuthenticatedCoopMember,
}));

vi.mock('../actions', () => ({
  handleProposeAction: actionMocks.handleProposeAction,
  handleExecuteAction: actionMocks.handleExecuteAction,
}));

const { executeAgentPlanProposals } = await import('../agent-plan-executor');

function makePlan(overrides: Partial<AgentPlan> = {}): AgentPlan {
  return {
    id: 'plan-1',
    observationId: 'observation-1',
    status: 'ready',
    provider: 'heuristic',
    confidence: 0.88,
    goal: 'Run queued action proposals.',
    rationale: 'Auto-run anything already approved.',
    steps: [],
    requiresApproval: false,
    createdAt: '2026-03-29T00:00:00.000Z',
    updatedAt: '2026-03-29T00:00:00.000Z',
    actionProposals: [
      {
        coopId: 'coop-1',
        actionClass: 'green-goods-create-garden',
        payload: { title: 'Garden' },
        approvalMode: 'auto-run-eligible',
      },
    ],
    ...overrides,
  } as AgentPlan;
}

describe('executeAgentPlanProposals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharedMocks.getAuthSession.mockResolvedValue({
      primaryAddress: '0x1111111111111111111111111111111111111111',
    });
    contextMocks.getCoops.mockResolvedValue([
      {
        profile: { id: 'coop-1' },
      },
    ]);
    operatorMocks.findAuthenticatedCoopMember.mockReturnValue({
      id: 'member-1',
    });
    actionMocks.handleProposeAction.mockResolvedValue({
      ok: true,
      data: {
        id: 'bundle-1',
        status: 'approved',
      },
    });
    actionMocks.handleExecuteAction.mockResolvedValue({
      ok: true,
    });
  });

  it('skips proposals when no authenticated member can be resolved for the coop', async () => {
    operatorMocks.findAuthenticatedCoopMember.mockReturnValue(undefined);

    const result = await executeAgentPlanProposals(makePlan());

    expect(result).toEqual({
      executedCount: 0,
      errors: ['No authenticated member is available for coop coop-1.'],
    });
    expect(actionMocks.handleProposeAction).not.toHaveBeenCalled();
  });

  it('captures proposal errors and does not attempt execution', async () => {
    actionMocks.handleProposeAction.mockResolvedValueOnce({
      ok: false,
      error: 'Policy rejected the proposal.',
    });

    const result = await executeAgentPlanProposals(makePlan());

    expect(result).toEqual({
      executedCount: 0,
      errors: ['Policy rejected the proposal.'],
    });
    expect(actionMocks.handleExecuteAction).not.toHaveBeenCalled();
  });

  it('skips execution when the proposal is not auto-run eligible or not approved', async () => {
    actionMocks.handleProposeAction.mockResolvedValueOnce({
      ok: true,
      data: {
        id: 'bundle-1',
        status: 'approved',
      },
    });
    actionMocks.handleProposeAction.mockResolvedValueOnce({
      ok: true,
      data: {
        id: 'bundle-2',
        status: 'proposed',
      },
    });

    const result = await executeAgentPlanProposals(
      makePlan({
        actionProposals: [
          {
            coopId: 'coop-1',
            actionClass: 'green-goods-create-garden',
            memberId: 'member-explicit',
            payload: { title: 'Garden' },
            approvalMode: 'manual',
          },
          {
            coopId: 'coop-1',
            actionClass: 'green-goods-sync-gap-admins',
            payload: { addAdmins: [] },
            approvalMode: 'auto-run-eligible',
          },
        ] as AgentPlan['actionProposals'],
      }),
    );

    expect(result).toEqual({
      executedCount: 0,
      errors: [],
    });
    expect(actionMocks.handleProposeAction).toHaveBeenCalledTimes(2);
    expect(actionMocks.handleProposeAction).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          memberId: 'member-explicit',
        }),
      }),
    );
    expect(actionMocks.handleExecuteAction).not.toHaveBeenCalled();
  });

  it('executes approved auto-run proposals and increments the executed count', async () => {
    const result = await executeAgentPlanProposals(makePlan());

    expect(result).toEqual({
      executedCount: 1,
      errors: [],
    });
    expect(actionMocks.handleProposeAction).toHaveBeenCalledWith({
      type: 'propose-action',
      payload: {
        actionClass: 'green-goods-create-garden',
        coopId: 'coop-1',
        memberId: 'member-1',
        payload: { title: 'Garden' },
      },
    });
    expect(actionMocks.handleExecuteAction).toHaveBeenCalledWith({
      type: 'execute-action',
      payload: { bundleId: 'bundle-1' },
    });
  });

  it('captures execution failures while continuing the plan loop', async () => {
    actionMocks.handleExecuteAction.mockResolvedValueOnce({
      ok: false,
      error: 'Execution reverted.',
    });

    const result = await executeAgentPlanProposals(makePlan());

    expect(result).toEqual({
      executedCount: 0,
      errors: ['Execution reverted.'],
    });
  });
});
