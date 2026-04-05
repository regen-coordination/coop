import type {
  AgentMemory,
  AgentObservation,
  CapitalFormationBriefOutput,
  GrantFitScorerOutput,
  MemoryInsightOutput,
  OpportunityExtractorOutput,
  PublishReadinessCheckOutput,
  ReviewDigestOutput,
  SkillOutputSchemaRef,
  TabRouterOutput,
  ThemeClustererOutput,
} from '@coop/shared';
import { createAgentMemory, truncateWords } from '@coop/shared';
import { db } from './runner-state';

export function extractMemoriesFromOutput(
  schemaRef: SkillOutputSchemaRef,
  output: unknown,
  outputConfidence?: number,
): Array<{
  type: AgentMemory['type'];
  content: string;
  confidence: number;
  domain: string;
  expiresAt?: string;
}> {
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  switch (schemaRef) {
    case 'opportunity-extractor-output': {
      const typed = output as OpportunityExtractorOutput;
      if (!typed.candidates?.length) return [];
      const topCandidate = typed.candidates[0];
      const rationaleBasis =
        (topCandidate?.fundingSignals?.length ?? 0) > 0
          ? 'funding signals'
          : 'ecological relevance';
      const topCandidateTitle = topCandidate?.title ?? 'Unknown candidate';
      const topCandidatePriority =
        typeof topCandidate?.priority === 'number' ? topCandidate.priority.toFixed(2) : '0.50';
      const topTitles = typed.candidates
        .slice(0, 3)
        .map((c) => c.title)
        .join(', ');
      return [
        {
          type: 'observation-outcome',
          content: `Extracted ${typed.candidates.length} opportunity candidates: ${topTitles}`,
          confidence: outputConfidence ?? 0.7,
          domain: 'opportunities',
          expiresAt: thirtyDaysFromNow,
        },
        {
          type: 'decision-context' as const,
          content: `Decision: Surfaced ${typed.candidates.length} opportunity candidates\nRationale: Priority ordering based on ${rationaleBasis}\nTop candidate: ${topCandidateTitle} (priority: ${topCandidatePriority})`,
          confidence: topCandidate?.priority ?? 0.5,
          domain: 'opportunities',
          expiresAt: thirtyDaysFromNow,
        },
      ];
    }
    case 'theme-clusterer-output': {
      const typed = output as ThemeClustererOutput;
      if (!typed.themes?.length) return [];
      const labels = typed.themes.map((t) => t.label).join(', ');
      return [
        {
          type: 'domain-pattern',
          content: `Emerging themes: ${labels}`,
          confidence: outputConfidence ?? 0.65,
          domain: 'themes',
        },
      ];
    }
    case 'review-digest-output': {
      const typed = output as ReviewDigestOutput;
      if (!typed.summary) return [];
      return [
        {
          type: 'coop-context',
          content: `Review digest: ${truncateWords(typed.summary, 60)}`,
          confidence: outputConfidence ?? 0.8,
          domain: 'reviews',
        },
      ];
    }
    case 'capital-formation-brief-output': {
      const typed = output as CapitalFormationBriefOutput;
      return [
        {
          type: 'observation-outcome',
          content: `Capital formation brief: ${typed.title} — ${truncateWords(typed.whyItMatters, 40)}`,
          confidence: outputConfidence ?? 0.75,
          domain: 'funding',
          expiresAt: thirtyDaysFromNow,
        },
        {
          type: 'decision-context' as const,
          content: `Decision: Created capital formation brief "${typed.title}"\nRationale: ${truncateWords(typed.whyItMatters, 30)}`,
          confidence: outputConfidence ?? 0.75,
          domain: 'funding',
          expiresAt: thirtyDaysFromNow,
        },
      ];
    }
    case 'memory-insight-output': {
      const typed = output as MemoryInsightOutput;
      if (!typed.insights.length) return [];
      return typed.insights.slice(0, 2).map((insight) => ({
        type: 'coop-context' as const,
        content: `Memory insight: ${insight.title} — ${truncateWords(insight.summary, 32)}`,
        confidence: insight.confidence,
        domain: 'insights',
        expiresAt: thirtyDaysFromNow,
      }));
    }
    case 'publish-readiness-check-output': {
      const typed = output as PublishReadinessCheckOutput;
      const suggestions = typed.suggestions?.join('; ') ?? 'none';
      return [
        {
          type: 'skill-pattern',
          content: `Publish readiness: ${typed.ready ? 'ready' : 'not ready'}. Suggestions: ${suggestions}`,
          confidence: outputConfidence ?? 0.7,
          domain: 'publishing',
          expiresAt: thirtyDaysFromNow,
        },
        {
          type: 'decision-context' as const,
          content: `Decision: Draft ${typed.draftId} ${typed.ready ? 'ready' : 'not ready'} for publish\nRationale: ${typed.suggestions?.slice(0, 2).join('; ') ?? 'No suggestions'}`,
          confidence: typed.ready ? 0.85 : 0.6,
          domain: 'publishing',
          expiresAt: thirtyDaysFromNow,
        },
      ];
    }
    case 'tab-router-output': {
      const typed = output as TabRouterOutput;
      if (!typed.routings?.length) return [];
      const topRouting = typed.routings.reduce(
        (best, r) => (r.relevanceScore > best.relevanceScore ? r : best),
        typed.routings[0],
      );
      const alternatives = typed.routings
        .filter((r) => r.coopId !== topRouting.coopId)
        .slice(0, 3)
        .map((r) => `${r.coopId} (${r.relevanceScore.toFixed(2)})`)
        .join(', ');
      return [
        {
          type: 'decision-context' as const,
          content: `Decision: Routed extract ${topRouting.extractId} to ${topRouting.coopId}\nRationale: ${truncateWords(topRouting.rationale, 30)} (relevance: ${topRouting.relevanceScore.toFixed(2)})${alternatives ? `\nAlternatives: ${alternatives}` : ''}`,
          confidence: topRouting.relevanceScore,
          domain: 'routing',
          expiresAt: thirtyDaysFromNow,
        },
      ];
    }
    case 'grant-fit-scorer-output': {
      const typed = output as GrantFitScorerOutput;
      if (!typed.scores?.length) return [];
      const topScore = typed.scores.reduce(
        (best, s) => (s.score > best.score ? s : best),
        typed.scores[0],
      );
      return [
        {
          type: 'decision-context' as const,
          content: `Decision: Scored ${typed.scores.length} grant candidates\nRationale: ${topScore.reasons.slice(0, 2).join('; ')}\nTop fit: ${topScore.candidateTitle} (score: ${topScore.score.toFixed(2)})`,
          confidence: topScore.score,
          domain: 'funding',
          expiresAt: thirtyDaysFromNow,
        },
      ];
    }
    default:
      // Green Goods, ERC-8004, ecosystem-entity-extractor,
      // and other transactional/scoring skills — no memories
      return [];
  }
}

export async function writeSkillMemories(
  schemaRef: SkillOutputSchemaRef,
  output: unknown,
  observation: AgentObservation,
  skillRunId: string,
  outputConfidence?: number,
): Promise<void> {
  try {
    const entries = extractMemoriesFromOutput(schemaRef, output, outputConfidence);
    if (entries.length === 0) return;
    const coopId = observation.coopId;
    if (!coopId) return;

    for (const entry of entries) {
      await createAgentMemory(db, {
        coopId,
        type: entry.type,
        content: entry.content,
        confidence: entry.confidence,
        domain: entry.domain,
        expiresAt: entry.expiresAt,
        sourceObservationId: observation.id,
        sourceSkillRunId: skillRunId,
      });
    }
  } catch (error) {
    // Fire-and-forget: never break the agent cycle
    console.warn('[agent-memory] Failed to write skill memories:', error);
  }
}
