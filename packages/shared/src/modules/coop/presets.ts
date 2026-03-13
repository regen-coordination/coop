import type { CoopSpaceType } from '../../contracts/schema';

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
  greenGoodsRecommended: boolean;
}

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
    greenGoodsRecommended: false,
  },
};

export function listCoopSpacePresets() {
  return Object.values(presets);
}

export function getCoopSpacePreset(spaceType: CoopSpaceType = 'community') {
  return presets[spaceType];
}

export function formatCoopSpaceTypeLabel(spaceType: CoopSpaceType) {
  return getCoopSpacePreset(spaceType).label;
}
