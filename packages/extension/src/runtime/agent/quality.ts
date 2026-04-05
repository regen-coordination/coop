import type {
  AgentProvider,
  CapitalFormationBriefOutput,
  EcosystemEntityExtractorOutput,
  GrantFitScorerOutput,
  MemoryInsightOutput,
  OpportunityExtractorOutput,
  PublishReadinessCheckOutput,
  ReviewDigestOutput,
  SkillOutputSchemaRef,
  TabRouterOutput,
  ThemeClustererOutput,
} from '@coop/shared';

function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeOutputConfidence(
  schemaRef: SkillOutputSchemaRef,
  output: unknown,
  provider: AgentProvider,
): number {
  if (provider === 'heuristic') {
    return computeHeuristicBaseConfidence(schemaRef, output);
  }

  switch (schemaRef) {
    case 'opportunity-extractor-output':
      return scoreOpportunityExtractor(output as OpportunityExtractorOutput);
    case 'tab-router-output':
      return scoreTabRouter(output as TabRouterOutput);
    case 'grant-fit-scorer-output':
      return scoreGrantFitScorer(output as GrantFitScorerOutput);
    case 'capital-formation-brief-output':
      return scoreCapitalFormationBrief(output as CapitalFormationBriefOutput);
    case 'review-digest-output':
      return scoreReviewDigest(output as ReviewDigestOutput);
    case 'theme-clusterer-output':
      return scoreThemeClusterer(output as ThemeClustererOutput);
    case 'ecosystem-entity-extractor-output':
      return scoreEcosystemEntityExtractor(output as EcosystemEntityExtractorOutput);
    case 'memory-insight-output':
      return scoreMemoryInsight(output as MemoryInsightOutput);
    default:
      return 0.6;
  }
}

function computeHeuristicBaseConfidence(schemaRef: SkillOutputSchemaRef, output: unknown): number {
  switch (schemaRef) {
    case 'tab-router-output': {
      const typed = output as TabRouterOutput;
      return typed.routings?.length > 0 ? 0.4 : 0.15;
    }
    case 'opportunity-extractor-output': {
      const typed = output as OpportunityExtractorOutput;
      return typed.candidates?.length > 0 ? 0.35 : 0.15;
    }
    case 'grant-fit-scorer-output': {
      const typed = output as GrantFitScorerOutput;
      return typed.scores?.length > 0 ? 0.4 : 0.15;
    }
    case 'capital-formation-brief-output':
      return scoreCapitalFormationBrief(output as CapitalFormationBriefOutput);
    case 'review-digest-output':
      return scoreReviewDigest(output as ReviewDigestOutput);
    case 'theme-clusterer-output':
      return scoreThemeClusterer(output as ThemeClustererOutput);
    case 'ecosystem-entity-extractor-output':
      return scoreEcosystemEntityExtractor(output as EcosystemEntityExtractorOutput);
    case 'memory-insight-output':
      return scoreMemoryInsight(output as MemoryInsightOutput);
    case 'publish-readiness-check-output':
      return scorePublishReadinessCheck(output as PublishReadinessCheckOutput);
    default:
      return 0.35;
  }
}

function scoreOpportunityExtractor(output: OpportunityExtractorOutput): number {
  if (!output.candidates?.length) return 0.2;

  let score = 0.4;
  const count = Math.min(output.candidates.length, 5);
  score += count * 0.06;

  const topCandidate = output.candidates[0];
  if (topCandidate) {
    if (wordCount(topCandidate.rationale) >= 8) score += 0.1;
    if (topCandidate.fundingSignals.length > 0) score += 0.05;
    if (topCandidate.ecologyTags.length > 0) score += 0.05;
    if (topCandidate.regionTags.length > 0) score += 0.05;
  }

  return clamp(score, 0.2, 0.95);
}

function scoreTabRouter(output: TabRouterOutput): number {
  if (!output.routings?.length) return 0.2;

  let score = 0.4;
  const count = Math.min(output.routings.length, 5);
  score += count * 0.06;

  const avgRelevance =
    output.routings.reduce((sum, r) => sum + r.relevanceScore, 0) / output.routings.length;
  score += avgRelevance * 0.2;

  const hasRationale = output.routings.every((r) => wordCount(r.rationale) >= 5);
  if (hasRationale) score += 0.1;

  return clamp(score, 0.2, 0.95);
}

function scoreGrantFitScorer(output: GrantFitScorerOutput): number {
  if (!output.scores?.length) return 0.2;

  let score = 0.4;
  const count = Math.min(output.scores.length, 5);
  score += count * 0.06;

  const avgReasons =
    output.scores.reduce((sum, s) => sum + s.reasons.length, 0) / output.scores.length;
  score += Math.min(avgReasons * 0.08, 0.24);

  return clamp(score, 0.2, 0.95);
}

function scoreCapitalFormationBrief(output: CapitalFormationBriefOutput): number {
  let score = 0.5;

  if (wordCount(output.title ?? '') >= 3) score += 0.05;
  if (wordCount(output.summary ?? '') >= 10) score += 0.1;
  if (wordCount(output.whyItMatters ?? '') >= 8) score += 0.1;
  if (wordCount(output.suggestedNextStep ?? '') >= 5) score += 0.1;
  if ((output.tags ?? []).length >= 2) score += 0.05;
  if ((output.supportingCandidateIds ?? []).length > 0) score += 0.05;

  return clamp(score, 0.3, 0.95);
}

function scoreReviewDigest(output: ReviewDigestOutput): number {
  let score = 0.4;

  if (wordCount(output.summary ?? '') >= 10) score += 0.15;
  if (wordCount(output.whyItMatters ?? '') >= 8) score += 0.1;
  const highlightCount = Math.min((output.highlights ?? []).length, 5);
  score += highlightCount * 0.06;
  if ((output.tags ?? []).length >= 2) score += 0.05;

  return clamp(score, 0.3, 0.95);
}

function scoreThemeClusterer(output: ThemeClustererOutput): number {
  if (!output.themes?.length) return 0.2;

  let score = 0.4;
  const count = Math.min(output.themes.length, 5);
  score += count * 0.08;

  const avgSources =
    output.themes.reduce((sum, t) => sum + (t.sourceIds ?? []).length, 0) / output.themes.length;
  score += Math.min(avgSources * 0.06, 0.18);

  const hasSummaries = output.themes.every((t) => wordCount(t.summary ?? '') >= 5);
  if (hasSummaries) score += 0.1;

  return clamp(score, 0.2, 0.95);
}

function scoreEcosystemEntityExtractor(output: EcosystemEntityExtractorOutput): number {
  if (!output.entities?.length) return 0.2;

  let score = 0.4;
  const count = Math.min(output.entities.length, 5);
  score += count * 0.08;

  const avgRelevance =
    output.entities.reduce((sum, e) => sum + e.relevance, 0) / output.entities.length;
  score += avgRelevance * 0.2;

  return clamp(score, 0.2, 0.95);
}

function scoreMemoryInsight(output: MemoryInsightOutput): number {
  if (!output.insights?.length) return 0.2;

  let score = 0.4;
  const count = Math.min(output.insights.length, 3);
  score += count * 0.1;

  const topInsight = output.insights[0];
  if (topInsight) {
    if (wordCount(topInsight.summary ?? '') >= 8) score += 0.1;
    if (wordCount(topInsight.whyItMatters ?? '') >= 6) score += 0.1;
  }

  return clamp(score, 0.2, 0.95);
}

function scorePublishReadinessCheck(output: PublishReadinessCheckOutput): number {
  let score = 0.4;

  if (output.draftId && output.draftId !== 'unknown') score += 0.15;
  const suggestionCount = Math.min(output.suggestions?.length ?? 0, 3);
  score += suggestionCount * 0.08;

  const patchFieldCount = Object.keys(output.proposedPatch ?? {}).length;
  score += Math.min(patchFieldCount * 0.07, 0.21);

  if (output.ready) {
    score += 0.08;
  } else if (suggestionCount > 0) {
    score += 0.05;
  }

  return clamp(score, 0.3, 0.92);
}
