import {
  buildReadablePageExtract,
  createAgentObservation,
  createCoop,
  nowIso,
  type CoopSharedState,
} from '@coop/shared';
import { describe, expect, it } from 'vitest';
import { computeGrantFitScores, inferTabRoutingsHeuristically } from '../agent-runner-inference';

function buildSetupInsights() {
  return {
    summary:
      'We need a shared membrane for funding leads, governance follow-up, and knowledge handoff.',
    crossCuttingPainPoints: ['Research disappears', 'Meeting follow-up gets lost'],
    crossCuttingOpportunities: ['Turn tabs into funding-ready evidence'],
    lenses: [
      {
        lens: 'capital-formation',
        currentState: 'We collect grant links in scattered docs.',
        painPoints: 'Funding context arrives too late.',
        improvements: 'Surface fundable leads during weekly review.',
      },
      {
        lens: 'impact-reporting',
        currentState: 'Impact evidence sits in private notes.',
        painPoints: 'Reporting is assembled at the last minute.',
        improvements: 'Keep evidence visible in shared memory.',
      },
      {
        lens: 'governance-coordination',
        currentState: 'Calls happen regularly.',
        painPoints: 'Decision follow-up disappears after meetings.',
        improvements: 'Keep next steps visible in the coop feed.',
      },
      {
        lens: 'knowledge-garden-resources',
        currentState: 'Guides and resources are spread across tabs and drives.',
        painPoints: 'People repeat the same research.',
        improvements: 'Create a living resource commons.',
      },
    ],
  } as const;
}

function buildCoop(input: {
  name: string;
  purpose: string;
  seedContribution: string;
  topTag: string;
  topDomain: string;
}): CoopSharedState {
  const created = createCoop({
    coopName: input.name,
    purpose: input.purpose,
    creatorDisplayName: 'Ari',
    captureMode: 'manual',
    seedContribution: input.seedContribution,
    setupInsights: buildSetupInsights(),
  });

  created.state.memoryProfile.topTags = [
    {
      tag: input.topTag,
      acceptCount: 4,
      lastAcceptedAt: nowIso(),
    },
  ];
  created.state.memoryProfile.topDomains = [
    {
      domain: input.topDomain,
      acceptCount: 3,
      reviewedCount: 0,
      lastAcceptedAt: nowIso(),
    },
  ];
  created.state.memoryProfile.archiveSignals.archivedTagCounts[input.topTag] = 2;
  created.state.memoryProfile.archiveSignals.archivedDomainCounts[input.topDomain] = 2;

  return created.state;
}

function buildExtract() {
  return buildReadablePageExtract({
    candidate: {
      id: 'candidate-1',
      tabId: 1,
      windowId: 1,
      url: 'https://example.org/watershed-grant-roundup?utm_source=newsletter&token=secret',
      canonicalUrl: 'https://example.org/watershed-grant-roundup',
      title: 'Watershed climate resilience grant roundup',
      domain: 'example.org',
      capturedAt: nowIso(),
    },
    metaDescription:
      'A roundup of watershed restoration funding opportunities and application deadlines.',
    headings: ['Funding opportunities', 'River restoration evidence'],
    paragraphs: [
      'This grant roundup tracks watershed restoration opportunities for river collaboratives.',
      'It includes evidence requirements, impact reporting needs, and next steps for proposals.',
    ],
  });
}

describe('agent-runner inference heuristics', () => {
  it('routes only to explicitly eligible coops', () => {
    const river = buildCoop({
      name: 'River Coop',
      purpose: 'Share watershed funding leads and restoration evidence.',
      seedContribution: 'I track river restoration grants and evidence packets.',
      topTag: 'watershed',
      topDomain: 'example.org',
    });
    const forest = buildCoop({
      name: 'Forest Coop',
      purpose: 'Share mushroom cultivation notes and foraging recipes.',
      seedContribution: 'I save fungal field notes and mushroom recipes.',
      topTag: 'mushrooms',
      topDomain: 'forest.example',
    });
    const extract = buildExtract();

    const observation = createAgentObservation({
      trigger: 'roundup-batch-ready',
      title: 'Captured tabs ready for routing',
      summary: 'Route the latest roundup into coop contexts.',
      payload: {
        extractIds: [extract.id],
        eligibleCoopIds: [river.profile.id],
      },
    });

    const output = inferTabRoutingsHeuristically({
      observation,
      extracts: [extract],
      coops: [river, forest],
    });

    expect(output.routings).toHaveLength(1);
    expect(output.routings[0]?.coopId).toBe(river.profile.id);
  });

  it('scores the more relevant coop above unrelated coops', () => {
    const river = buildCoop({
      name: 'River Coop',
      purpose: 'Share watershed funding leads and restoration evidence.',
      seedContribution: 'I track river restoration grants and evidence packets.',
      topTag: 'watershed',
      topDomain: 'example.org',
    });
    const forest = buildCoop({
      name: 'Forest Coop',
      purpose: 'Share mushroom cultivation notes and foraging recipes.',
      seedContribution: 'I save fungal field notes and mushroom recipes.',
      topTag: 'mushrooms',
      topDomain: 'forest.example',
    });
    const extract = buildExtract();
    const observation = createAgentObservation({
      trigger: 'roundup-batch-ready',
      title: 'Captured tabs ready for routing',
      summary: 'Route the latest roundup into coop contexts.',
      payload: {
        extractIds: [extract.id],
      },
    });

    const output = inferTabRoutingsHeuristically({
      observation,
      extracts: [extract],
      coops: [river, forest],
    });
    const byCoop = new Map(output.routings.map((routing) => [routing.coopId, routing]));

    expect(byCoop.get(river.profile.id)?.relevanceScore).toBeGreaterThan(
      byCoop.get(forest.profile.id)?.relevanceScore ?? 0,
    );
    expect(byCoop.get(river.profile.id)?.matchedRitualLenses).toContain('capital-formation');
    expect(byCoop.get(river.profile.id)?.category).toBe('funding-lead');
  });

  it('ranks grant candidates higher when they match coop purpose and memory tags', () => {
    const coop = buildCoop({
      name: 'River Coop',
      purpose: 'Share watershed funding leads and restoration evidence.',
      seedContribution: 'I track river restoration grants and evidence packets.',
      topTag: 'watershed',
      topDomain: 'example.org',
    });

    const scores = computeGrantFitScores(
      [
        {
          id: 'candidate-fit',
          title: 'Watershed resilience grant',
          summary: 'Funding for river restoration collaboratives.',
          rationale: 'Matches watershed restoration work and current funding focus.',
          regionTags: ['pacific-northwest'],
          ecologyTags: ['watershed'],
          fundingSignals: ['grant'],
          priority: 0.72,
          recommendedNextStep: 'Review with the funding circle.',
        },
        {
          id: 'candidate-miss',
          title: 'Urban nightlife sponsorship',
          summary: 'Sponsorship package for downtown events.',
          rationale: 'This is unrelated to ecology or watershed work.',
          regionTags: ['downtown'],
          ecologyTags: [],
          fundingSignals: [],
          priority: 0.72,
          recommendedNextStep: 'Ignore for this coop.',
        },
      ],
      coop,
    );

    expect(scores[0]?.candidateId).toBe('candidate-fit');
    expect(scores[0]?.score).toBeGreaterThan(scores[1]?.score ?? 0);
    expect(scores[0]?.recommendedTargetCoopId).toBe(coop.profile.id);
  });
});
