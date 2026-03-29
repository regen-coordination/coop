import { type AgentPlan, getAuthSession } from '@coop/shared';
import { db, getCoops } from '../context';
import { findAuthenticatedCoopMember } from '../operator';

export async function executeAgentPlanProposals(plan: AgentPlan) {
  const authSession = await getAuthSession(db);
  const coops = await getCoops();
  let executedCount = 0;
  const errors: string[] = [];

  const { handleProposeAction, handleExecuteAction } = await import('./actions');

  for (const proposal of plan.actionProposals) {
    const coop = coops.find((candidate) => candidate.profile.id === proposal.coopId);
    const memberId =
      proposal.memberId ?? (coop ? findAuthenticatedCoopMember(coop, authSession)?.id : undefined);
    if (!memberId) {
      errors.push(`No authenticated member is available for coop ${proposal.coopId}.`);
      continue;
    }

    const proposed = await handleProposeAction({
      type: 'propose-action',
      payload: {
        actionClass: proposal.actionClass,
        coopId: proposal.coopId,
        memberId,
        payload: proposal.payload,
      },
    });
    if (!proposed.ok || !proposed.data) {
      errors.push(proposed.error ?? `Could not propose ${proposal.actionClass}.`);
      continue;
    }

    if (proposal.approvalMode !== 'auto-run-eligible' || proposed.data.status !== 'approved') {
      continue;
    }

    const executed = await handleExecuteAction({
      type: 'execute-action',
      payload: { bundleId: proposed.data.id },
    });
    if (!executed.ok) {
      errors.push(executed.error ?? `Could not execute ${proposal.actionClass}.`);
      continue;
    }
    executedCount += 1;
  }

  return { executedCount, errors };
}
