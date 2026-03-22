import type { CoopSpaceType, SetupInsights } from '../../contracts/schema';

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

interface LensDefaults {
  currentState: string;
  painPoints: string;
  improvements: string;
}

type LensDefaultsByType = Record<CoopSpaceType, LensDefaults>;

const knowledgeDefaults: LensDefaultsByType = {
  personal: {
    currentState: 'Tabs and notes are scattered across devices and apps.',
    painPoints: 'Good finds get buried before they can be reused.',
    improvements: 'Surface the right reference at the right moment without manual search.',
  },
  family: {
    currentState: 'Household info is spread across all devices and individual memory.',
    painPoints: 'Only one person knows where to find key instructions or records.',
    improvements: 'Any family member can find household info without texting someone else.',
  },
  friends: {
    currentState: 'Good links get dropped in the group chat and scroll away in minutes.',
    painPoints: 'Great recommendations get lost in chat history and nobody can find them.',
    improvements: 'The best finds from the group stay searchable and alive.',
  },
  project: {
    currentState: 'Project docs and references live in scattered tools and individual browsers.',
    painPoints: 'Key context lives in a single person or gets lost between sprints.',
    improvements: 'Project knowledge compounds in one place so the team never re-researches.',
  },
  community: {
    currentState:
      'Useful links and notes for {coop} are spread across browsers, devices, and people.',
    painPoints: 'People repeat the same research because the best finds do not stay visible.',
    improvements: 'Catch loose knowledge early and keep the strongest finds easy to revisit.',
  },
};

const capitalDefaults: LensDefaultsByType = {
  personal: {
    currentState: 'Opportunities and actionable leads are noticed but not tracked.',
    painPoints: 'Good leads expire before being circled back to.',
    improvements: 'Keep actionable opportunities visible until decided upon.',
  },
  family: {
    currentState: 'Shared expenses and budgets live in texts, memory, and separate accounts.',
    painPoints: 'Bills, subscriptions, or care duties get missed when nobody tracks them together.',
    improvements: 'Household finances and care duties stay legible to everyone involved.',
  },
  friends: {
    currentState: 'Plans start strong in the group chat then slowly lose momentum.',
    painPoints: 'Trips and events die because nobody keeps the thread going.',
    improvements: 'Group plans stay alive with clear next steps visible to everyone.',
  },
  project: {
    currentState: 'Budget and resourcing updates live in spreadsheets and async messages.',
    painPoints: 'Resource constraints surface too late to change course.',
    improvements: 'Budget and resource status stay visible so the team can adjust early.',
  },
  community: {
    currentState:
      'Money and resource context for {coop} is currently scattered across tabs, notes, and messages.',
    painPoints: 'Good opportunities are easy to miss before the flock can review them together.',
    improvements:
      'Keep promising opportunities visible in one roost and turn them into shared next steps.',
  },
};

const governanceDefaults: LensDefaultsByType = {
  personal: {
    currentState: 'Everything gets saved; almost nothing gets reviewed.',
    painPoints: 'The backlog grows faster than it gets triaged.',
    improvements: 'A weekly self-review that surfaces what actually matters this week.',
  },
  family: {
    currentState: 'Schedules live in different calendars and verbal reminders.',
    painPoints: 'Someone always forgets the appointment, the pickup, or whose turn it is.',
    improvements: 'One shared view of what is happening, who is responsible, and what comes next.',
  },
  friends: {
    currentState: 'Commitments live in memory and good intentions. No shared record.',
    painPoints: 'Good ideas fade because nobody remembers who was going to do the thing.',
    improvements:
      'Gentle visibility into who said what, without turning friendship into project management.',
  },
  project: {
    currentState: 'Decisions happen on syncs and in threads. Notes exist but are not reviewed.',
    painPoints: 'Deliverables slip when ownership is not explicit and review does not happen.',
    improvements: 'One working review loop where decisions, owners, and blockers stay visible.',
  },
  community: {
    currentState:
      'Decisions and follow-through for {coop} mostly live in meetings, memory, and chat.',
    painPoints:
      'Follow-up slips when nobody can quickly see what was noticed, promised, or still open.',
    improvements:
      'Give the flock one clear review loop for decisions, commitments, and next steps.',
  },
};

const impactDefaults: LensDefaultsByType = {
  personal: {
    currentState: 'Personal progress is not tracked in any structured way.',
    painPoints: 'Good work fades from memory before it can be built on.',
    improvements: 'See a clear thread from research to action to outcome over time.',
  },
  family: {
    currentState: 'Photos pile up in camera rolls but milestones and stories do not get captured.',
    painPoints: 'Child achievements, home projects, and traditions fade from collective memory.',
    improvements:
      'A family timeline that holds milestones, traditions, and shared context together.',
  },
  friends: {
    currentState: 'Photos get shared once but the stories and context fade.',
    painPoints: 'Running jokes, trip memories, and group lore slowly disappear.',
    improvements:
      'A shared story of the group — not just photos, but context, plans, and traditions.',
  },
  project: {
    currentState: 'Progress is discussed in standups but not tracked between them.',
    painPoints: 'Milestones are either invisible or only visible in retrospect.',
    improvements:
      'Delivery signals surface naturally so progress is visible without more meetings.',
  },
  community: {
    currentState:
      'Evidence and progress for {coop} are gathered in different places and often too late.',
    painPoints: 'Useful proof gets buried before anyone can connect it to the right moment.',
    improvements: 'Keep proof close to the work so the coop can notice progress earlier.',
  },
};

function buildLensValue(value: string, fallback: string) {
  return clean(value) || fallback;
}

export function toSetupInsights(
  input: SetupInsightsInput,
  spaceType: CoopSpaceType = 'community',
): SetupInsights {
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
          capitalDefaults[spaceType].currentState.replace('{coop}', coopLabel),
        ),
        painPoints: buildLensValue(input.capitalPain, capitalDefaults[spaceType].painPoints),
        improvements: buildLensValue(input.capitalImprove, capitalDefaults[spaceType].improvements),
      },
      {
        lens: 'impact-reporting',
        currentState: buildLensValue(
          input.impactCurrent,
          impactDefaults[spaceType].currentState.replace('{coop}', coopLabel),
        ),
        painPoints: buildLensValue(input.impactPain, impactDefaults[spaceType].painPoints),
        improvements: buildLensValue(input.impactImprove, impactDefaults[spaceType].improvements),
      },
      {
        lens: 'governance-coordination',
        currentState: buildLensValue(
          input.governanceCurrent,
          governanceDefaults[spaceType].currentState.replace('{coop}', coopLabel),
        ),
        painPoints: buildLensValue(input.governancePain, governanceDefaults[spaceType].painPoints),
        improvements: buildLensValue(
          input.governanceImprove,
          governanceDefaults[spaceType].improvements,
        ),
      },
      {
        lens: 'knowledge-garden-resources',
        currentState: buildLensValue(
          input.knowledgeCurrent,
          knowledgeDefaults[spaceType].currentState.replace('{coop}', coopLabel),
        ),
        painPoints: buildLensValue(input.knowledgePain, knowledgeDefaults[spaceType].painPoints),
        improvements: buildLensValue(
          input.knowledgeImprove,
          knowledgeDefaults[spaceType].improvements,
        ),
      },
    ],
  };
}
