import { describe, expect, it } from 'vitest';
import { computeOutputConfidence } from '../agent/quality';

function makeEntityExtractionOutput(
  entityCount: number,
  relationshipCount = 0,
  typeDiversity = false,
) {
  const types = typeDiversity
    ? ['person', 'organization', 'location', 'event', 'object']
    : ['object'];

  return {
    entities: Array.from({ length: entityCount }, (_, i) => ({
      id: `ent-${i}`,
      name: `Entity ${i}`,
      type: types[i % types.length],
      description: `Description for entity ${i}`,
      sourceRef: `test:source-${i}`,
    })),
    relationships: Array.from({ length: relationshipCount }, (_, i) => ({
      from: `ent-${i}`,
      to: `ent-${(i + 1) % entityCount || 0}`,
      type: 'related-to',
      confidence: 0.8,
      t_valid: '2026-01-01T00:00:00.000Z',
      t_invalid: null,
      provenance: 'test',
    })),
  };
}

describe('entity-extraction-output confidence scoring', () => {
  it('returns 0.25 base for heuristic provider', () => {
    const output = makeEntityExtractionOutput(1);
    const confidence = computeOutputConfidence('entity-extraction-output', output, 'heuristic');
    // Base heuristic confidence should be around 0.25 for minimal entity output
    expect(confidence).toBeGreaterThanOrEqual(0.2);
    expect(confidence).toBeLessThanOrEqual(0.4);
  });

  it('confidence increases with entity count', () => {
    const few = computeOutputConfidence(
      'entity-extraction-output',
      makeEntityExtractionOutput(1),
      'transformers',
    );
    const many = computeOutputConfidence(
      'entity-extraction-output',
      makeEntityExtractionOutput(10),
      'transformers',
    );
    expect(many).toBeGreaterThan(few);
  });

  it('confidence increases with relationship count', () => {
    const noRels = computeOutputConfidence(
      'entity-extraction-output',
      makeEntityExtractionOutput(5, 0),
      'transformers',
    );
    const withRels = computeOutputConfidence(
      'entity-extraction-output',
      makeEntityExtractionOutput(5, 5),
      'transformers',
    );
    expect(withRels).toBeGreaterThan(noRels);
  });

  it('confidence increases with type diversity', () => {
    const homogeneous = computeOutputConfidence(
      'entity-extraction-output',
      makeEntityExtractionOutput(5, 0, false),
      'transformers',
    );
    const diverse = computeOutputConfidence(
      'entity-extraction-output',
      makeEntityExtractionOutput(5, 0, true),
      'transformers',
    );
    expect(diverse).toBeGreaterThan(homogeneous);
  });

  it('confidence is clamped to [0.2, 0.95]', () => {
    const empty = computeOutputConfidence(
      'entity-extraction-output',
      makeEntityExtractionOutput(0),
      'transformers',
    );
    expect(empty).toBeGreaterThanOrEqual(0.2);

    const maxed = computeOutputConfidence(
      'entity-extraction-output',
      makeEntityExtractionOutput(50, 50, true),
      'transformers',
    );
    expect(maxed).toBeLessThanOrEqual(0.95);
  });

  it('returns 0.2 for empty entities', () => {
    const confidence = computeOutputConfidence(
      'entity-extraction-output',
      makeEntityExtractionOutput(0),
      'transformers',
    );
    expect(confidence).toBe(0.2);
  });
});
