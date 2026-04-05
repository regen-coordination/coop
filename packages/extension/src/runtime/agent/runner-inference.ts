import type {
  AgentObservation,
  CoopSharedState,
  EcosystemEntityExtractorOutput,
  GrantFitScore,
  OpportunityCandidate,
  ReadablePageExtract,
  ReviewDraft,
  TabRouterOutput,
  ThemeClustererOutput,
} from '@coop/shared';
import { interpretExtractForCoop } from '@coop/shared';
import { resolveObservationEligibleCoopIds } from './runner-observations';
import { compact } from './runner-state';

export function computeGrantFitScores(
  candidates: OpportunityCandidate[],
  coop?: CoopSharedState,
): GrantFitScore[] {
  const purpose = coop?.profile.purpose.toLowerCase() ?? '';
  const topTags = new Set(
    coop?.memoryProfile.topTags.map((tag) => tag.tag.toLowerCase()).slice(0, 12) ?? [],
  );

  return candidates
    .map((candidate) => {
      const haystack = [
        candidate.title,
        candidate.summary,
        candidate.rationale,
        ...candidate.regionTags,
        ...candidate.ecologyTags,
        ...candidate.fundingSignals,
      ]
        .join(' ')
        .toLowerCase();
      const purposeOverlap = purpose
        .split(/\W+/)
        .filter((term) => term.length > 3)
        .some((term) => haystack.includes(term));
      const tagOverlap = [...topTags].filter((tag) => haystack.includes(tag)).length;
      const fundingBoost =
        candidate.fundingSignals.length > 0 ||
        /grant|fund|capital|finance|investment|opportunity/.test(haystack);
      const score = Math.max(
        0.2,
        Math.min(
          0.98,
          candidate.priority * 0.55 +
            (purposeOverlap ? 0.2 : 0) +
            Math.min(0.15, tagOverlap * 0.05) +
            (fundingBoost ? 0.12 : 0),
        ),
      );

      return {
        candidateId: candidate.id,
        candidateTitle: candidate.title,
        score,
        reasons: compact([
          purposeOverlap ? 'Matches coop purpose language.' : undefined,
          tagOverlap > 0 ? 'Matches archived coop themes.' : undefined,
          fundingBoost ? 'Shows clear funding or capital-formation signals.' : undefined,
        ]),
        recommendedTargetCoopId: coop?.profile.id,
      } satisfies GrantFitScore;
    })
    .sort((left, right) => right.score - left.score);
}

export function inferEntitiesFromText(text: string): EcosystemEntityExtractorOutput {
  const tokens = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g) ?? [];
  const uniqueTokens = [...new Set(tokens)].slice(0, 8);
  return {
    entities: uniqueTokens.map((name) => ({
      name,
      kind: /River|Watershed|Basin/i.test(name)
        ? 'watershed'
        : /Network|Alliance|Collective/i.test(name)
          ? 'network'
          : /Council|Fund|Program|Initiative/i.test(name)
            ? 'program'
            : /Valley|Bay|Forest|Region/i.test(name)
              ? 'bioregion'
              : 'organization',
      relevance: 0.55,
    })),
  };
}

export function inferThemes(input: {
  relatedDrafts: ReviewDraft[];
  relatedArtifacts: CoopSharedState['artifacts'];
  observation: AgentObservation;
}): ThemeClustererOutput {
  const titles = [
    ...input.relatedDrafts.map((draft) => draft.title),
    ...input.relatedArtifacts.map((artifact) => artifact.title),
  ];
  const grouped = new Map<string, string[]>();
  for (const title of titles) {
    const key = title.split(/\s+/).slice(0, 2).join(' ').toLowerCase() || 'general';
    grouped.set(key, [...(grouped.get(key) ?? []), title]);
  }
  return {
    themes: [...grouped.entries()].slice(0, 4).map(([label, sourceIds]) => ({
      label,
      summary: `Cluster around ${label} with ${sourceIds.length} recent signals.`,
      sourceIds,
    })),
  };
}

export function inferTabRoutingsHeuristically(input: {
  observation: AgentObservation;
  extracts: ReadablePageExtract[];
  coops: CoopSharedState[];
}): TabRouterOutput {
  const eligibleCoopIds = new Set(
    resolveObservationEligibleCoopIds(input.observation, input.coops),
  );
  return {
    routings: input.extracts.flatMap((extract) =>
      input.coops
        .filter((coop) => eligibleCoopIds.has(coop.profile.id))
        .map((coop) => {
          const interpretation = interpretExtractForCoop(extract, coop);
          return {
            sourceCandidateId: extract.sourceCandidateId,
            extractId: extract.id,
            coopId: coop.profile.id,
            relevanceScore: interpretation.relevanceScore,
            matchedRitualLenses: interpretation.matchedRitualLenses,
            category: interpretation.categoryCandidates[0],
            tags: interpretation.tagCandidates,
            rationale: interpretation.rationale,
            suggestedNextStep: interpretation.suggestedNextStep,
            archiveWorthinessHint: interpretation.archiveWorthinessHint,
          };
        }),
    ),
  };
}
