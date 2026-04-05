import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeMocks = vi.hoisted(() => ({
  sendRuntimeMessage: vi.fn(),
}));

vi.mock('../../../../runtime/messages', () => ({
  sendRuntimeMessage: runtimeMocks.sendRuntimeMessage,
}));

const { useSidepanelPermissions } = await import('../useSidepanelPermissions');

describe('useSidepanelPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeMocks.sendRuntimeMessage.mockResolvedValue({ ok: true });
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        randomUUID: vi.fn(() => 'uuid-1'),
      },
    });
  });

  it('issues a delegated permit and reloads the dashboard', async () => {
    const loadDashboard = vi.fn(async () => undefined);
    const setMessage = vi.fn();

    const { result } = renderHook(() =>
      useSidepanelPermissions({
        activeCoop: {
          profile: { id: 'coop-1' },
        } as never,
        runtimeConfig: {
          sessionMode: 'mock',
        } as never,
        setMessage,
        loadDashboard,
      }),
    );

    await act(async () => {
      await result.current.handleIssuePermit({
        coopId: 'coop-1',
        expiresAt: '2026-04-01T00:00:00.000Z',
        maxUses: 3,
        allowedActions: ['archive-artifact'],
      });
    });

    expect(runtimeMocks.sendRuntimeMessage).toHaveBeenCalledWith({
      type: 'issue-permit',
      payload: {
        coopId: 'coop-1',
        expiresAt: '2026-04-01T00:00:00.000Z',
        maxUses: 3,
        allowedActions: ['archive-artifact'],
      },
    });
    expect(loadDashboard).toHaveBeenCalledTimes(1);
    expect(setMessage).not.toHaveBeenCalled();
  });

  it('revokes a delegated permit and reloads the dashboard', async () => {
    const loadDashboard = vi.fn(async () => undefined);

    const { result } = renderHook(() =>
      useSidepanelPermissions({
        activeCoop: {
          profile: { id: 'coop-1' },
        } as never,
        runtimeConfig: {
          sessionMode: 'mock',
        } as never,
        setMessage: vi.fn(),
        loadDashboard,
      }),
    );

    await act(async () => {
      await result.current.handleRevokePermit('permit-1');
    });

    expect(runtimeMocks.sendRuntimeMessage).toHaveBeenCalledWith({
      type: 'revoke-permit',
      payload: {
        permitId: 'permit-1',
      },
    });
    expect(loadDashboard).toHaveBeenCalledTimes(1);
  });

  it('surfaces successful session rotation with a friendly message', async () => {
    const setMessage = vi.fn();
    const loadDashboard = vi.fn(async () => undefined);

    const { result } = renderHook(() =>
      useSidepanelPermissions({
        activeCoop: {
          profile: { id: 'coop-1' },
        } as never,
        runtimeConfig: {
          sessionMode: 'live',
        } as never,
        setMessage,
        loadDashboard,
      }),
    );

    await act(async () => {
      await result.current.handleRotateSessionCapability('cap-1');
    });

    expect(runtimeMocks.sendRuntimeMessage).toHaveBeenCalledWith({
      type: 'rotate-session-capability',
      payload: {
        capabilityId: 'cap-1',
      },
    });
    expect(setMessage).toHaveBeenCalledWith('Garden pass refreshed.');
    expect(loadDashboard).toHaveBeenCalledTimes(1);
  });

  it('executes a delegated action with a deterministic replay id and active coop scope', async () => {
    const loadDashboard = vi.fn(async () => undefined);

    const { result } = renderHook(() =>
      useSidepanelPermissions({
        activeCoop: {
          profile: { id: 'coop-9' },
        } as never,
        runtimeConfig: {
          sessionMode: 'mock',
        } as never,
        setMessage: vi.fn(),
        loadDashboard,
      }),
    );

    await act(async () => {
      await result.current.handleExecuteWithPermit('permit-9', 'archive-artifact', {
        title: 'New garden',
      });
    });

    expect(runtimeMocks.sendRuntimeMessage).toHaveBeenCalledWith({
      type: 'execute-with-permit',
      payload: {
        permitId: 'permit-9',
        replayId: 'dreplay-uuid-1',
        actionClass: 'archive-artifact',
        coopId: 'coop-9',
        actionPayload: {
          title: 'New garden',
        },
      },
    });
    expect(loadDashboard).toHaveBeenCalledTimes(1);
  });
});
