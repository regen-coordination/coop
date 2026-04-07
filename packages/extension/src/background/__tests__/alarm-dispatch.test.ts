import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockCompleteOnboardingBurst,
  mockEmitKnowledgeLintObservation,
  mockEnsureDbReady,
  mockGetCoops,
  mockHandleAgentHeartbeat,
  mockPollUnsealedArchiveReceipts,
  mockRunCaptureCycle,
  mockRunProactiveAgentCycle,
} = vi.hoisted(() => ({
  mockCompleteOnboardingBurst: vi.fn().mockResolvedValue(undefined),
  mockEmitKnowledgeLintObservation: vi.fn().mockResolvedValue(undefined),
  mockEnsureDbReady: vi.fn().mockResolvedValue(undefined),
  mockGetCoops: vi.fn().mockResolvedValue([]),
  mockHandleAgentHeartbeat: vi.fn().mockResolvedValue(undefined),
  mockPollUnsealedArchiveReceipts: vi.fn().mockResolvedValue(undefined),
  mockRunCaptureCycle: vi.fn().mockResolvedValue(0),
  mockRunProactiveAgentCycle: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../context', () => ({
  alarmNames: {
    capture: 'coop-capture',
    agentCadence: 'agent-proactive-cycle',
    agentHeartbeat: 'agent-heartbeat',
    archiveStatusPoll: 'archive-status-poll',
    onboardingFollowUpPrefix: 'agent-onboarding-followup:',
    knowledgeLint: 'knowledge-lint',
  },
  ensureDbReady: mockEnsureDbReady,
  getCoops: mockGetCoops,
}));

vi.mock('../handlers/agent', () => ({
  completeOnboardingBurst: mockCompleteOnboardingBurst,
  runProactiveAgentCycle: mockRunProactiveAgentCycle,
}));

vi.mock('../handlers/archive', () => ({
  pollUnsealedArchiveReceipts: mockPollUnsealedArchiveReceipts,
}));

vi.mock('../handlers/capture', () => ({
  runCaptureCycle: mockRunCaptureCycle,
}));

vi.mock('../handlers/heartbeat', () => ({
  handleAgentHeartbeat: mockHandleAgentHeartbeat,
}));

vi.mock('../handlers/agent-observation-emitters', () => ({
  emitKnowledgeLintObservation: mockEmitKnowledgeLintObservation,
}));

describe('handleAlarmEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches the scheduled capture alarm to the capture cycle', async () => {
    const { handleAlarmEvent } = await import('../alarm-dispatch');

    await handleAlarmEvent({ name: 'coop-capture' });

    expect(mockEnsureDbReady).toHaveBeenCalledTimes(1);
    expect(mockRunCaptureCycle).toHaveBeenCalledTimes(1);
    expect(mockHandleAgentHeartbeat).not.toHaveBeenCalled();
  });

  it('dispatches the onboarding follow-up alarm with the derived key', async () => {
    const { handleAlarmEvent } = await import('../alarm-dispatch');

    await handleAlarmEvent({ name: 'agent-onboarding-followup:coop-1:member-1' });

    expect(mockRunProactiveAgentCycle).toHaveBeenCalledWith({
      reason: 'onboarding-followup',
      onboardingKey: 'coop-1:member-1',
    });
    expect(mockCompleteOnboardingBurst).toHaveBeenCalledWith('coop-1:member-1');
  });

  it('dispatches the knowledge-lint alarm and emits for each coop', async () => {
    const { handleAlarmEvent } = await import('../alarm-dispatch');

    mockGetCoops.mockResolvedValue([{ profile: { id: 'coop-1' } }, { profile: { id: 'coop-2' } }]);

    await handleAlarmEvent({ name: 'knowledge-lint' });

    expect(mockGetCoops).toHaveBeenCalledTimes(1);
    expect(mockEmitKnowledgeLintObservation).toHaveBeenCalledTimes(2);
    expect(mockEmitKnowledgeLintObservation).toHaveBeenCalledWith({ coopId: 'coop-1' });
    expect(mockEmitKnowledgeLintObservation).toHaveBeenCalledWith({ coopId: 'coop-2' });
    expect(mockRunCaptureCycle).not.toHaveBeenCalled();
  });

  it('handles knowledge-lint alarm with no coops gracefully', async () => {
    const { handleAlarmEvent } = await import('../alarm-dispatch');

    mockGetCoops.mockResolvedValue([]);

    await handleAlarmEvent({ name: 'knowledge-lint' });

    expect(mockEmitKnowledgeLintObservation).not.toHaveBeenCalled();
  });
});
