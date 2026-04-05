import type { ActionBundle, AgentPlan } from '@coop/shared';
import { getAuthSession } from '@coop/shared';
import { db, findAuthenticatedCoopMember, getCoops } from '../agent/runner-state';
import type { RuntimeActionResponse } from '../messages';

export function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

async function resolveActionMemberId(coopId: string) {
  const [coops, authSession] = await Promise.all([getCoops(), getAuthSession(db)]);
  const coop = coops.find((candidate) => candidate.profile.id === coopId);
  return coop ? findAuthenticatedCoopMember(coop, authSession)?.id : undefined;
}

export async function dispatchActionProposal(input: {
  plan: AgentPlan;
  proposal: AgentPlan['actionProposals'][number];
  autoExecute: boolean;
}) {
  const memberId = input.proposal.memberId ?? (await resolveActionMemberId(input.proposal.coopId));
  if (!memberId) {
    return { ok: false, error: 'No authenticated coop member is available to execute this plan.' };
  }

  const proposalResponse = (await chrome.runtime.sendMessage({
    type: 'propose-action',
    payload: {
      actionClass: input.proposal.actionClass,
      coopId: input.proposal.coopId,
      memberId,
      payload: input.proposal.payload,
    },
  })) as RuntimeActionResponse<ActionBundle>;

  if (!proposalResponse.ok || !proposalResponse.data) {
    return { ok: false, error: proposalResponse.error ?? 'Could not create action bundle.' };
  }

  if (!input.autoExecute || proposalResponse.data.status !== 'approved') {
    return { ok: true, executed: false };
  }

  const executeResponse = (await chrome.runtime.sendMessage({
    type: 'execute-action',
    payload: { bundleId: proposalResponse.data.id },
  })) as RuntimeActionResponse<ActionBundle>;

  if (!executeResponse.ok) {
    return { ok: false, error: executeResponse.error ?? 'Could not execute action bundle.' };
  }

  return { ok: true, executed: true };
}
