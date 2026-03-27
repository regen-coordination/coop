import { createId, nowIso } from '@coop/shared';
import { listAgentObservationsByStatus } from '@coop/shared';
import {
  AGENT_LOOP_WAIT_TIMEOUT_MS,
  AGENT_SETTING_KEYS,
  type AgentCycleRequest,
  type AgentCycleState,
} from '../../runtime/agent-config';
import { ensureReceiverSyncOffscreenDocument, getLocalSetting, setLocalSetting } from '../context';
import { db } from '../context';
import { syncAgentObservations } from './agent-reconciliation';

export async function getAgentCycleState() {
  return getLocalSetting<AgentCycleState>(AGENT_SETTING_KEYS.cycleState, {
    running: false,
  });
}

export async function getAgentAutoRunSkillIds() {
  return getLocalSetting<string[]>(AGENT_SETTING_KEYS.autoRunSkillIds, []);
}

export async function requestAgentCycle(reason: string, force = false) {
  const request: AgentCycleRequest = {
    id: createId('agent-cycle'),
    requestedAt: nowIso(),
    reason,
    force,
  };
  await setLocalSetting(AGENT_SETTING_KEYS.cycleRequest, request);
  await ensureReceiverSyncOffscreenDocument();
  try {
    await chrome.runtime.sendMessage({
      type: 'run-agent-cycle-if-pending',
      payload: { reason, force },
    });
  } catch (error) {
    console.warn('[agent-cycle] Could not poke offscreen agent runner:', error);
  }
  return request;
}

export async function drainAgentCycles(input: {
  reason: string;
  force?: boolean;
  maxPasses?: number;
  syncBetweenPasses?: boolean;
}) {
  const maxPasses = input.maxPasses ?? 2;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    if (pass > 0 && input.syncBetweenPasses) {
      await syncAgentObservations();
    }
    const pending = await listAgentObservationsByStatus(db, ['pending']);
    if (pending.length === 0 && pass > 0) {
      break;
    }
    const request = await requestAgentCycle(`${input.reason}:pass-${pass + 1}`, input.force);
    await waitForAgentCycle(request);
  }
}

export async function waitForAgentCycle(
  request: AgentCycleRequest,
  timeoutMs = AGENT_LOOP_WAIT_TIMEOUT_MS,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const state = await getAgentCycleState();
    if (
      state.lastRequestId === request.id &&
      state.lastCompletedAt &&
      state.lastCompletedAt >= request.requestedAt &&
      state.running === false
    ) {
      return state;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return getAgentCycleState();
}
