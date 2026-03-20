import type { SetupInsights } from '../../contracts/schema';

export interface SetupInsightsInput {
  coopName: string;
  purpose: string;
  summary: string;
  capitalCurrent: string;
  capitalPain: string;
  capitalImprove: string;
  impactCurrent: string;
  impactPain: string;
  impactImprove: string;
  governanceCurrent: string;
  governancePain: string;
  governanceImprove: string;
  knowledgeCurrent: string;
  knowledgePain: string;
  knowledgeImprove: string;
}

export const emptySetupInsightsInput: SetupInsightsInput = {
  coopName: '',
  purpose: '',
  summary: '',
  capitalCurrent: '',
  capitalPain: '',
  capitalImprove: '',
  impactCurrent: '',
  impactPain: '',
  impactImprove: '',
  governanceCurrent: '',
  governancePain: '',
  governanceImprove: '',
  knowledgeCurrent: '',
  knowledgePain: '',
  knowledgeImprove: '',
};

function clean(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function createDefaultSetupSummary(input: Pick<SetupInsightsInput, 'coopName'>) {
  const coopName = clean(input.coopName) || 'This coop';
  return `${coopName} uses Coop to keep useful tabs, notes, and next steps from getting loose.`;
}

function buildLensValue(value: string, fallback: string) {
  return clean(value) || fallback;
}

export function toSetupInsights(input: SetupInsightsInput): SetupInsights {
  const coopLabel = clean(input.coopName) || 'this coop';

  return {
    summary: clean(input.summary) || createDefaultSetupSummary(input),
    crossCuttingPainPoints: [
      clean(input.capitalPain),
      clean(input.impactPain),
      clean(input.governancePain),
      clean(input.knowledgePain),
    ]
      .filter(Boolean)
      .slice(0, 4),
    crossCuttingOpportunities: [
      clean(input.capitalImprove),
      clean(input.impactImprove),
      clean(input.governanceImprove),
      clean(input.knowledgeImprove),
    ]
      .filter(Boolean)
      .slice(0, 4),
    lenses: [
      {
        lens: 'capital-formation',
        currentState: buildLensValue(
          input.capitalCurrent,
          `Money and resource context for ${coopLabel} is currently scattered across tabs, notes, and messages.`,
        ),
        painPoints: buildLensValue(
          input.capitalPain,
          'Good opportunities are easy to miss before the flock can review them together.',
        ),
        improvements: buildLensValue(
          input.capitalImprove,
          'Keep promising opportunities visible in one roost and turn them into shared next steps.',
        ),
      },
      {
        lens: 'impact-reporting',
        currentState: buildLensValue(
          input.impactCurrent,
          `Evidence and progress for ${coopLabel} are gathered in different places and often too late.`,
        ),
        painPoints: buildLensValue(
          input.impactPain,
          'Useful proof gets buried before anyone can connect it to the right moment.',
        ),
        improvements: buildLensValue(
          input.impactImprove,
          'Keep proof close to the work so the coop can notice progress earlier.',
        ),
      },
      {
        lens: 'governance-coordination',
        currentState: buildLensValue(
          input.governanceCurrent,
          `Decisions and follow-through for ${coopLabel} mostly live in meetings, memory, and chat.`,
        ),
        painPoints: buildLensValue(
          input.governancePain,
          'Follow-up slips when nobody can quickly see what was noticed, promised, or still open.',
        ),
        improvements: buildLensValue(
          input.governanceImprove,
          'Give the flock one clear review loop for decisions, commitments, and next steps.',
        ),
      },
      {
        lens: 'knowledge-garden-resources',
        currentState: buildLensValue(
          input.knowledgeCurrent,
          `Useful links and notes for ${coopLabel} are spread across browsers, devices, and people.`,
        ),
        painPoints: buildLensValue(
          input.knowledgePain,
          'People repeat the same research because the best finds do not stay visible.',
        ),
        improvements: buildLensValue(
          input.knowledgeImprove,
          'Catch loose knowledge early and keep the strongest finds easy to revisit.',
        ),
      },
    ],
  };
}
