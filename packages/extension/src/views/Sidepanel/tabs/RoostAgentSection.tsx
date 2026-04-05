import type { AgentMemory, AgentObservation, AgentPlan } from '@coop/shared';
import type { RuntimeSummary } from '../../../runtime/messages';
import { timeAgo } from './roost-helpers';

// ---------------------------------------------------------------------------
// AgentSection
// ---------------------------------------------------------------------------

export interface AgentSectionProps {
  summary: RuntimeSummary | null;
  lastCompletedRun: { completedAt?: string; skillId?: string } | null;
  pendingPlans: AgentPlan[];
  recentObservations: AgentObservation[];
  recentMemories: AgentMemory[];
  agentRunning?: boolean;
  onRunAgentCycle: () => Promise<void>;
  onApproveAgentPlan: (planId: string) => Promise<void>;
  onRejectAgentPlan: (planId: string, reason?: string) => Promise<void>;
}

export function AgentSection({
  summary,
  lastCompletedRun,
  pendingPlans,
  recentObservations,
  recentMemories,
  agentRunning,
  onRunAgentCycle,
  onApproveAgentPlan,
  onRejectAgentPlan,
}: AgentSectionProps) {
  const cadence = (summary as { agentCadenceMinutes?: number } | null)?.agentCadenceMinutes ?? 8;

  return (
    <>
      {/* --- Heartbeat --- */}
      <article className="panel-card roost-hero-card">
        <h2>Agent</h2>
        <div className="roost-activity-list">
          <div className="roost-activity-item">
            <span className="roost-activity-item__title">
              {lastCompletedRun?.completedAt
                ? `Last cycle ${timeAgo(lastCompletedRun.completedAt)}`
                : 'No cycles yet'}
            </span>
            <span className="roost-activity-item__meta">Runs every ~{cadence} min</span>
          </div>
        </div>
        <button
          className="primary-button"
          disabled={agentRunning}
          onClick={() => void onRunAgentCycle()}
          type="button"
        >
          {agentRunning ? 'Running...' : 'Run Now'}
        </button>
      </article>

      {/* --- Pending approvals --- */}
      {pendingPlans.length > 0 ? (
        <article className="panel-card">
          <h2>Needs Approval</h2>
          <div className="roost-activity-list">
            {pendingPlans.map((plan) => (
              <div className="roost-activity-item" key={plan.id}>
                <span className="roost-activity-item__title">{plan.goal}</span>
                <span className="roost-activity-item__meta">
                  Confidence: {Math.round(plan.confidence * 100)}%
                </span>
                <div className="action-row">
                  <button
                    className="primary-button"
                    onClick={() => void onApproveAgentPlan(plan.id)}
                    type="button"
                  >
                    Approve
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => void onRejectAgentPlan(plan.id)}
                    type="button"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {/* --- Recent observations --- */}
      {recentObservations.length > 0 ? (
        <article className="panel-card">
          <h2>Recent Observations</h2>
          <div className="roost-activity-list">
            {recentObservations.map((obs) => (
              <div className="roost-activity-item" key={obs.id}>
                <span className="roost-activity-item__title">{obs.title}</span>
                <span className="roost-activity-item__meta">
                  <span className="badge">{obs.status}</span> &middot; {timeAgo(obs.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {/* --- Agent memories --- */}
      {recentMemories.length > 0 ? (
        <details className="panel-card collapsible-card">
          <summary>
            <h2>Agent Memories</h2>
          </summary>
          <div className="collapsible-card__content stack">
            {recentMemories.map((mem) => (
              <div className="roost-activity-item" key={mem.id}>
                <div className="badge-row">
                  <span className="badge">{mem.type}</span>
                  <span className="badge">{mem.domain}</span>
                </div>
                <span className="roost-activity-item__title">{mem.content}</span>
                <span className="roost-activity-item__meta">{timeAgo(mem.createdAt)}</span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </>
  );
}
