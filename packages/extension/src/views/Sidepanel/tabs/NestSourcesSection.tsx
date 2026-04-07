import { useState } from 'react';
import { SourceBadge, type SourceType } from '../../shared/SourceBadge';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NestSourcesSectionProps {
  sources: Array<{
    id: string;
    type: SourceType;
    identifier: string;
    label: string;
    active: boolean;
    lastFetchedAt: string | null;
    entityCount: number;
  }>;
  onAddSource: (type: string, identifier: string, label: string) => void;
  onRemoveSource: (sourceId: string) => void;
  onToggleSource: (sourceId: string, active: boolean) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SOURCE_TYPES: SourceType[] = ['youtube', 'github', 'rss', 'reddit', 'npm', 'wikipedia'];
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getHealthClass(lastFetchedAt: string | null): string | null {
  if (!lastFetchedAt) return null;
  const age = Date.now() - new Date(lastFetchedAt).getTime();
  return age <= SEVEN_DAYS_MS ? 'source-card__health--fresh' : 'source-card__health--stale';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NestSourcesSection({
  sources,
  onAddSource,
  onRemoveSource,
  onToggleSource,
}: NestSourcesSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState<SourceType>('youtube');
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const totalEntities = sources.reduce((sum, s) => sum + s.entityCount, 0);

  const handleSubmit = () => {
    if (!newIdentifier.trim() || !newLabel.trim()) return;
    onAddSource(newType, newIdentifier.trim(), newLabel.trim());
    setNewIdentifier('');
    setNewLabel('');
    setShowAddForm(false);
  };

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------
  if (sources.length === 0 && !showAddForm) {
    return (
      <section className="stack">
        <div className="empty-state">
          <p>No sources configured yet</p>
          <p className="helper-text">
            Add knowledge sources like YouTube channels, GitHub repos, or RSS feeds to enrich your
            coop&apos;s agent.
          </p>
          <button className="secondary-button" onClick={() => setShowAddForm(true)} type="button">
            Add source
          </button>
        </div>

        {showAddForm ? null : null}
      </section>
    );
  }

  // -----------------------------------------------------------------------
  // Source list
  // -----------------------------------------------------------------------
  return (
    <section className="stack">
      {sources.map((source) => {
        const healthClass = getHealthClass(source.lastFetchedAt);
        return (
          <article className="source-card" key={source.id}>
            <div className="badge-row">
              <SourceBadge type={source.type} name={source.label} />
              {healthClass ? <span className={`source-card__health ${healthClass}`} /> : null}
            </div>
            <p className="helper-text">{source.entityCount} entities</p>
            <div className="badge-row">
              <label>
                <input
                  type="checkbox"
                  checked={source.active}
                  aria-label="Active"
                  onChange={() => onToggleSource(source.id, !source.active)}
                />{' '}
                Active
              </label>
              <button
                className="secondary-button"
                aria-label="Remove"
                onClick={() => onRemoveSource(source.id)}
                type="button"
              >
                Remove
              </button>
            </div>
          </article>
        );
      })}

      {/* --- Add source button / form --- */}
      {!showAddForm ? (
        <button className="secondary-button" onClick={() => setShowAddForm(true)} type="button">
          Add source
        </button>
      ) : (
        <div className="panel-card">
          <fieldset>
            <legend className="helper-text">Source type</legend>
            {SOURCE_TYPES.map((st) => (
              <label key={st}>
                <input
                  type="radio"
                  name="source-type"
                  value={st}
                  checked={newType === st}
                  aria-label={st}
                  onChange={() => setNewType(st)}
                />{' '}
                {st}
              </label>
            ))}
          </fieldset>
          <label>
            Identifier
            <input
              type="text"
              aria-label="Identifier"
              value={newIdentifier}
              onChange={(e) => setNewIdentifier(e.target.value)}
            />
          </label>
          <label>
            Label
            <input
              type="text"
              aria-label="Label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </label>
          <button className="secondary-button" onClick={handleSubmit} type="button">
            Submit
          </button>
        </div>
      )}

      {/* --- Footer --- */}
      <p className="helper-text">
        {sources.length} sources &middot; {totalEntities} entities total
      </p>
    </section>
  );
}
