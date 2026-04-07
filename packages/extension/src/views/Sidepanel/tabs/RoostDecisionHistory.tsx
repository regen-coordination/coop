import { timeAgo } from './roost-helpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DecisionEntry {
  id: string;
  skillId: string;
  confidence: number;
  timestamp: string;
  outcome: 'approved' | 'rejected' | 'skipped';
  sourceRefs: string[];
  precedentNote?: string;
}

export interface RoostDecisionHistoryProps {
  decisions: DecisionEntry[];
}

// ---------------------------------------------------------------------------
// RoostDecisionHistory
// ---------------------------------------------------------------------------

const MAX_DISPLAY = 12;
const MAX_SOURCE_REFS = 3;

export function RoostDecisionHistory({ decisions }: RoostDecisionHistoryProps) {
  if (decisions.length === 0) {
    return (
      <article className="panel-card">
        <h2>Decision History</h2>
        <p className="helper-text">No decisions recorded yet</p>
      </article>
    );
  }

  const visible = decisions.slice(0, MAX_DISPLAY);

  return (
    <article className="panel-card">
      <h2>Decision History</h2>
      <div className="roost-activity-list">
        {visible.map((d) => (
          <div
            className={`operator-log-entry${d.outcome === 'skipped' ? ' muted' : ''}`}
            data-testid="decision-entry"
            key={d.id}
          >
            <div className="badge-row">
              <span className="badge">{d.skillId}</span>
              <span className="badge">{Math.round(d.confidence * 100)}%</span>
              <span className="badge">{d.outcome}</span>
              <span className="badge">{timeAgo(d.timestamp)}</span>
            </div>
            {d.sourceRefs.length > 0 && (
              <p className="helper-text">
                Based on: {d.sourceRefs.slice(0, MAX_SOURCE_REFS).join(', ')}
              </p>
            )}
            {d.precedentNote && <p className="helper-text">{d.precedentNote}</p>}
          </div>
        ))}
      </div>
    </article>
  );
}
