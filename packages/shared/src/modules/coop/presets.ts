import type { CoopSpaceType } from '../../contracts/schema';

export type RitualLensId = 'knowledge' | 'capital' | 'governance' | 'impact';

export interface RitualLensPreset {
  id: RitualLensId;
  title: string;
  detail: string;
  transcriptPrompt: string;
  currentQuestion: string;
  painQuestion: string;
  improveQuestion: string;
  currentPlaceholder: string;
  painPlaceholder: string;
  improvePlaceholder: string;
}

export interface CoopSpacePreset {
  id: CoopSpaceType;
  label: string;
  description: string;
  purposePlaceholder: string;
  summaryPlaceholder: string;
  seedContributionPlaceholder: string;
  lensHints: {
    capital: string;
    impact: string;
    governance: string;
    knowledge: string;
  };
  ritualLenses: [RitualLensPreset, RitualLensPreset, RitualLensPreset, RitualLensPreset];
  greenGoodsRecommended: boolean;
}

const personalLenses: CoopSpacePreset['ritualLenses'] = [
  {
    id: 'knowledge',
    title: 'Research',
    detail: 'Name the threads you are actively following so Coop knows what to watch for.',
    transcriptPrompt: 'What threads are you actively following right now?',
    currentQuestion: 'What topics, interests, or research threads are open for you right now?',
    painQuestion: 'Where do your best finds go to die — tabs, bookmarks, notes apps?',
    improveQuestion: 'What would it look like if your captured knowledge actually stayed useful?',
    currentPlaceholder: 'Tabs and notes are scattered across devices and apps.',
    painPlaceholder: 'I save things but never find them when I need them.',
    improvePlaceholder: 'Surface the right reference at the right moment without manual search.',
  },
  {
    id: 'capital',
    title: 'Opportunities',
    detail: 'Track the practical next steps, applications, and openings that keep slipping away.',
    transcriptPrompt: 'What practical next steps keep slipping through the cracks?',
    currentQuestion: 'What opportunities, applications, or actionable leads are you tracking?',
    painQuestion:
      'Which deadlines or openings have you missed because the link or note got buried?',
    improveQuestion: 'What kind of opportunities should Coop surface before they expire?',
    currentPlaceholder: 'I notice opportunities but they get lost in the flow.',
    painPlaceholder: 'Good leads expire before I circle back to them.',
    improvePlaceholder: 'Keep actionable opportunities visible until I decide to act or pass.',
  },
  {
    id: 'governance',
    title: 'Triage',
    detail: 'Describe how you decide what deserves your attention — and what can be let go.',
    transcriptPrompt: 'How do you currently decide what to revisit, act on, or let go?',
    currentQuestion: 'How do you decide what to revisit versus what to archive or drop?',
    painQuestion:
      'Where does your own follow-through break down — too much saved, not enough acted on?',
    improveQuestion: 'What would a better personal review rhythm look like for you?',
    currentPlaceholder: 'I save everything and review almost nothing.',
    painPlaceholder: 'The backlog grows faster than I can triage it.',
    improvePlaceholder: 'A weekly self-review that surfaces what actually matters this week.',
  },
  {
    id: 'impact',
    title: 'Progress',
    detail: 'Define what "moving forward" looks like so Coop can help you notice it.',
    transcriptPrompt:
      'What would make you feel like your captured knowledge actually moved something forward?',
    currentQuestion:
      'How do you currently track whether your research or projects are progressing?',
    painQuestion: 'Where do personal milestones, reflections, or evidence of growth get lost?',
    improveQuestion: 'What kind of progress signal would be most valuable to see surface weekly?',
    currentPlaceholder: 'I do not really track personal progress in any structured way.',
    painPlaceholder: 'Good work fades from memory before I can build on it.',
    improvePlaceholder: 'See a clear thread from research to action to outcome over time.',
  },
];

const familyLenses: CoopSpacePreset['ritualLenses'] = [
  {
    id: 'knowledge',
    title: 'Household Memory',
    detail:
      'Capture the instructions, references, and records your household keeps losing track of.',
    transcriptPrompt: 'What information does your household keep losing track of?',
    currentQuestion:
      'What instructions, records, or references does your family re-search over and over?',
    painQuestion: 'What household knowledge is stuck in a single person or on a single phone?',
    improveQuestion:
      'What would it mean if every household member could find the right info without asking?',
    currentPlaceholder:
      'Recipes, logins, school info, and instructions are spread across all devices.',
    painPlaceholder:
      'Only one person knows where the insurance docs are or how to reset the router.',
    improvePlaceholder: 'Any family member can find household info without texting someone else.',
  },
  {
    id: 'capital',
    title: 'Shared Resources',
    detail: 'Name where money, time, or care coordination gets tangled between household members.',
    transcriptPrompt:
      'Where does budgeting, care, or resource planning get messy in your household?',
    currentQuestion:
      'How does your family currently handle shared expenses, budgets, or care responsibilities?',
    painQuestion: 'Where does money, time, or who-handles-what get confusing or dropped?',
    improveQuestion: 'What household resource question should always have a clear, shared answer?',
    currentPlaceholder:
      'Shared expenses live in texts, memory, and whoever last checked the account.',
    painPlaceholder:
      'Bills, subscriptions, or care duties get missed when nobody tracks them together.',
    improvePlaceholder: 'Household finances and care duties stay legible to everyone involved.',
  },
  {
    id: 'governance',
    title: 'Logistics',
    detail: 'Map the household plans, chores, and responsibilities that fall through the cracks.',
    transcriptPrompt: 'What household plans, chores, or handoffs keep falling through the cracks?',
    currentQuestion: 'How are chores, schedules, and household decisions currently coordinated?',
    painQuestion: 'What household tasks or handoffs break down most often?',
    improveQuestion:
      'What would "everyone knows what is happening this week" look like for your family?',
    currentPlaceholder: 'Schedules live in different calendars and a lot of verbal reminders.',
    painPlaceholder: 'Someone always forgets the appointment, the pickup, or whose turn it is.',
    improvePlaceholder:
      'One shared view of what is happening, who is responsible, and what comes next.',
  },
  {
    id: 'impact',
    title: 'Milestones',
    detail: 'Mark what family moments, traditions, or progress you would want to look back on.',
    transcriptPrompt:
      'What family moments or progress would you want to look back on a year from now?',
    currentQuestion:
      'How does your family currently preserve memories, milestones, and traditions?',
    painQuestion:
      'What family moments or achievements risk being forgotten because nobody documented them?',
    improveQuestion:
      'What would a living family record — not just a photo album — look like for you?',
    currentPlaceholder:
      'Photos pile up in camera rolls but milestones and stories do not get captured.',
    painPlaceholder: 'Kid achievements, home projects, and traditions fade from collective memory.',
    improvePlaceholder:
      'A family timeline that holds milestones, traditions, and shared context together.',
  },
];

const friendsLenses: CoopSpacePreset['ritualLenses'] = [
  {
    id: 'knowledge',
    title: 'Shared Finds',
    detail:
      'Catch the recommendations, links, and discoveries your group shares but can never find later.',
    transcriptPrompt:
      'What recommendations or discoveries does your group share that nobody can find later?',
    currentQuestion:
      'Where do the group recommendations, links, and shared interests currently live?',
    painQuestion: 'What great finds have been lost in group chats, DMs, or personal bookmarks?',
    improveQuestion: 'What would it look like if the best finds from your group stayed findable?',
    currentPlaceholder: 'Good links get dropped in the group chat and scroll away in minutes.',
    painPlaceholder:
      'Someone shared that perfect restaurant / article / deal — but nobody can find it now.',
    improvePlaceholder: 'A shared collection where the best group finds stay searchable and alive.',
  },
  {
    id: 'capital',
    title: 'Group Plans',
    detail:
      'Name the trips, events, and shared goals that keep stalling because coordination gets messy.',
    transcriptPrompt: 'What trips, events, or shared goals keep stalling in your group?',
    currentQuestion: 'What group plans, trips, or shared goals are in motion or stuck right now?',
    painQuestion:
      'Which plans have died because nobody could keep the thread going across DMs and calendars?',
    improveQuestion: 'What group plan would actually happen if coordination were easier?',
    currentPlaceholder: 'Plans start strong in the group chat then slowly lose momentum.',
    painPlaceholder:
      'The trip that never got booked, the event no one organized, the idea that stalled.',
    improvePlaceholder: 'Group plans stay alive with clear next steps visible to everyone.',
  },
  {
    id: 'governance',
    title: 'Follow-through',
    detail: 'Describe how "I will send that" and "let us do that" actually play out in your group.',
    transcriptPrompt:
      'When someone says "I will send that" or "let us do that," how often does it actually happen?',
    currentQuestion: 'How does your group currently keep track of who said they would do what?',
    painQuestion:
      'What promises or plans evaporate because there is no shared memory of the commitment?',
    improveQuestion:
      'What lightweight accountability would help without making it feel like a task manager?',
    currentPlaceholder: 'Commitments live in memory and good intentions. No shared record.',
    painPlaceholder: 'Good ideas fade because nobody remembers who was going to do the thing.',
    improvePlaceholder:
      'Gentle visibility into who said what, without turning friendship into project management.',
  },
  {
    id: 'impact',
    title: 'Shared Moments',
    detail: 'Mark what experiences, traditions, or group goals deserve a shared record.',
    transcriptPrompt:
      'What experiences, traditions, or group goals would you want a shared record of?',
    currentQuestion: 'What shared experiences or traditions define your group?',
    painQuestion:
      'What group memories, inside jokes, or meaningful moments have already been lost?',
    improveQuestion: 'What kind of shared record would make your group feel more like a group?',
    currentPlaceholder: 'Photos get shared once but the stories and context fade.',
    painPlaceholder: 'The running jokes, trip memories, and group lore slowly disappear.',
    improvePlaceholder:
      'A shared story of the group — not just photos, but context, plans, and traditions.',
  },
];

const communityLenses: CoopSpacePreset['ritualLenses'] = [
  {
    id: 'knowledge',
    title: 'Collective Intelligence',
    detail:
      'Name the research, context, and institutional memory your community rebuilds from scratch each cycle.',
    transcriptPrompt:
      'What context or institutional memory does your community keep rebuilding from scratch?',
    currentQuestion:
      'Where does the collective knowledge of your community currently live — and who can access it?',
    painQuestion:
      'What research, decisions, or context gets lost when members rotate or projects close?',
    improveQuestion:
      'What would it mean if new members could start from shared context instead of zero?',
    currentPlaceholder: 'Knowledge lives across Notion, Drive, Discord, and individual browsers.',
    painPlaceholder:
      'New members re-research what was already found. Reports get written and forgotten.',
    improvePlaceholder:
      'A living knowledge base where the strongest community finds compound over time.',
  },
  {
    id: 'capital',
    title: 'Funding & Resources',
    detail:
      'Track how your community notices, evaluates, and acts on funding or resource opportunities.',
    transcriptPrompt:
      'How does your community notice and act on funding opportunities before they expire?',
    currentQuestion:
      'How does your community currently discover and evaluate funding, grants, or resource opportunities?',
    painQuestion:
      'Which opportunities have expired because they surfaced in DMs and never reached the right people?',
    improveQuestion:
      'What would a shared pipeline for funding leads and resource opportunities look like?',
    currentPlaceholder: 'Grant leads surface in DMs, calls, and whoever happens to see the tweet.',
    painPlaceholder:
      'Good funding leads die in inboxes before the group can evaluate them together.',
    improvePlaceholder:
      'A shared feed where funding leads are visible, scored, and actionable by the group.',
  },
  {
    id: 'governance',
    title: 'Governance',
    detail:
      'Map how proposals, commitments, and accountability are currently tracked across your community.',
    transcriptPrompt:
      'How are proposals, commitments, and accountability tracked in your community?',
    currentQuestion: 'How are decisions made, recorded, and followed through on in your community?',
    painQuestion:
      'What commitments or decisions have slipped because nobody could see what was still open?',
    improveQuestion:
      'What would legible governance look like — not more process, but clearer follow-through?',
    currentPlaceholder: 'Decisions happen on calls and in chats. Meeting notes exist somewhere.',
    painPlaceholder:
      'Three meetings later nobody can say what was decided, by whom, or what is still open.',
    improvePlaceholder:
      'One clear review loop where decisions, owners, and open items stay visible.',
  },
  {
    id: 'impact',
    title: 'Evidence & Outcomes',
    detail: 'Define what your community needs to prove — to funders, to members, or to itself.',
    transcriptPrompt:
      'What does your community need to prove, and where does that proof currently live?',
    currentQuestion:
      'What evidence does your community need to produce — for funders, members, or the public?',
    painQuestion: 'Where does proof of progress get scattered or arrive too late to be useful?',
    improveQuestion:
      'What would it look like if impact evidence accumulated naturally alongside the work?',
    currentPlaceholder:
      'Impact reports get assembled at the end of a cycle from whatever people remember.',
    painPlaceholder:
      'Evidence is gathered retroactively, missing the richest signals from the actual work.',
    improvePlaceholder:
      'Impact evidence accumulates steadily so reporting is assembly, not archaeology.',
  },
];

const projectLenses: CoopSpacePreset['ritualLenses'] = [
  {
    id: 'knowledge',
    title: 'Project Memory',
    detail: 'Capture the research, references, and context the project team keeps re-finding.',
    transcriptPrompt:
      'What project research or context does your team keep re-finding from scratch?',
    currentQuestion: 'Where does project research, references, and shared context currently live?',
    painQuestion: 'What project knowledge is stuck in a single browser or lost between handoffs?',
    improveQuestion:
      'What would it mean if the whole team could start from shared project context?',
    currentPlaceholder: 'Project docs live in scattered tools and individual browser tabs.',
    painPlaceholder: 'Key context lives in one head or gets lost between sprints.',
    improvePlaceholder: 'Project knowledge compounds in one place so the team never re-researches.',
  },
  {
    id: 'capital',
    title: 'Budget & Resourcing',
    detail: 'Name the budget, grant, or resourcing questions that matter for this project.',
    transcriptPrompt: 'What budget, grant, or resourcing questions affect this project?',
    currentQuestion: 'How does this project track its budget, funding, or resource dependencies?',
    painQuestion: 'Where do resourcing gaps or funding updates get lost between project leads?',
    improveQuestion:
      'What resource visibility would keep the project from stalling on practical needs?',
    currentPlaceholder: 'Budget and resourcing updates live in spreadsheets and async messages.',
    painPlaceholder: 'Resource constraints surface too late to change course.',
    improvePlaceholder: 'Budget and resource status stay visible so the team can adjust early.',
  },
  {
    id: 'governance',
    title: 'Decisions & Delivery',
    detail: 'Map how the working team keeps decisions legible and delivery on track.',
    transcriptPrompt: 'How does your project team keep decisions legible and delivery on track?',
    currentQuestion: 'How does your project team currently make and track decisions?',
    painQuestion:
      'What project decisions or deliverables have slipped because accountability was unclear?',
    improveQuestion: 'What would clearer project follow-through look like for this team?',
    currentPlaceholder:
      'Decisions happen on syncs and in threads. Notes exist but are not reviewed.',
    painPlaceholder: 'Deliverables slip when ownership is not explicit and review does not happen.',
    improvePlaceholder:
      'One working review loop where decisions, owners, and blockers stay visible.',
  },
  {
    id: 'impact',
    title: 'Delivery Signals',
    detail: 'Define the evidence and progress signals that tell the team the project is moving.',
    transcriptPrompt: 'What signals tell your team that the project is actually moving forward?',
    currentQuestion: 'What evidence or milestones tell the team this project is on track?',
    painQuestion: 'Where do delivery signals get lost between standups and status reports?',
    improveQuestion:
      'What would make project progress legible without adding more status meetings?',
    currentPlaceholder: 'Progress is discussed in standups but not tracked between them.',
    painPlaceholder: 'Milestones are either invisible or only visible in retrospect.',
    improvePlaceholder:
      'Delivery signals surface naturally so progress is visible without more meetings.',
  },
];

const presets: Record<CoopSpaceType, CoopSpacePreset> = {
  community: {
    id: 'community',
    label: 'Community',
    description: 'Shared intelligence, governance, and capital formation across a real group.',
    purposePlaceholder: 'Coordinate local stewardship, evidence, and shared funding context.',
    summaryPlaceholder:
      'Summarize how this community wants to turn loose context into shared work.',
    seedContributionPlaceholder:
      'What context, leads, or lived knowledge are you bringing in first?',
    lensHints: {
      capital:
        'How does this group notice, evaluate, and move on funding or resource opportunities?',
      impact: 'How does the group gather evidence, field signals, and proof of progress today?',
      governance: 'How are decisions, commitments, and follow-through coordinated now?',
      knowledge: 'Where do tabs, references, notes, and shared memory currently live?',
    },
    ritualLenses: communityLenses,
    greenGoodsRecommended: true,
  },
  project: {
    id: 'project',
    label: 'Project',
    description: 'A time-bound collaboration space with lighter rituals and clearer deliverables.',
    purposePlaceholder: 'Keep project research, evidence, and next steps in one review loop.',
    summaryPlaceholder: 'Summarize the project membrane you want Coop to provide.',
    seedContributionPlaceholder: 'What project context or active workstream are you seeding first?',
    lensHints: {
      capital: 'What budget, grant, or resourcing questions matter for this project?',
      impact: 'What evidence or delivery signals tell the team the project is moving?',
      governance: 'How do the working team and facilitators keep decisions legible?',
      knowledge: 'Where do project references, notes, and assets currently get lost?',
    },
    ritualLenses: projectLenses,
    greenGoodsRecommended: true,
  },
  friends: {
    id: 'friends',
    label: 'Friends',
    description: 'A lighter shared curation and planning space for a small trusted circle.',
    purposePlaceholder: 'Share useful finds, plans, and serendipitous context without losing it.',
    summaryPlaceholder: 'Summarize how this friend group wants to keep useful context in motion.',
    seedContributionPlaceholder:
      'What links, ideas, or plans are you tossing into the shared nest first?',
    lensHints: {
      capital: 'What trips, purchases, mutual aid, or opportunity planning should stay visible?',
      impact: 'What moments, progress, or shared commitments matter to this group?',
      governance: 'How do plans get made, confirmed, or forgotten across the group?',
      knowledge: 'Where do recommendations, reminders, and shared references currently disappear?',
    },
    ritualLenses: friendsLenses,
    greenGoodsRecommended: false,
  },
  family: {
    id: 'family',
    label: 'Family',
    description: 'A household memory and planning capsule for practical coordination over time.',
    purposePlaceholder: 'Keep household plans, memories, and resources legible across devices.',
    summaryPlaceholder: 'Summarize the household coordination membrane this family needs.',
    seedContributionPlaceholder:
      'What household context, routine, or memory are you seeding first?',
    lensHints: {
      capital: 'What budgeting, care, or resource planning questions should stay visible?',
      impact: 'What family milestones, care notes, or records matter to keep together?',
      governance: 'How are chores, schedules, and decisions coordinated right now?',
      knowledge: 'Where do instructions, links, and household memory currently get scattered?',
    },
    ritualLenses: familyLenses,
    greenGoodsRecommended: false,
  },
  personal: {
    id: 'personal',
    label: 'Personal',
    description:
      'A private cross-device memory membrane for one person first, sharing later if needed.',
    purposePlaceholder:
      'Turn personal tabs, notes, and field captures into durable reviewable memory.',
    summaryPlaceholder:
      'Summarize what you want your personal Coop to remember and surface back to you.',
    seedContributionPlaceholder:
      'What research thread, life area, or active question are you seeding first?',
    lensHints: {
      capital:
        'What opportunities, applications, or practical next steps do you want to keep visible?',
      impact: 'What evidence, reflections, or checkpoints matter to you personally?',
      governance: 'How do you currently decide what to revisit, act on, or archive?',
      knowledge: 'Where do your tabs, notes, and reference materials currently pile up?',
    },
    ritualLenses: personalLenses,
    greenGoodsRecommended: false,
  },
};

export function listCoopSpacePresets() {
  return Object.values(presets);
}

export function getCoopSpacePreset(spaceType: CoopSpaceType = 'community') {
  return presets[spaceType];
}

export function getRitualLenses(spaceType: CoopSpaceType = 'community') {
  return presets[spaceType].ritualLenses;
}

export function formatCoopSpaceTypeLabel(spaceType: CoopSpaceType) {
  return getCoopSpacePreset(spaceType).label;
}
