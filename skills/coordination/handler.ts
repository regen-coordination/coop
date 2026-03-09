import type { CoopPillar } from '@coop/shared';

/**
 * Skill: coordination
 * 
 * Converts fragmented inputs into coordinated tasks, ownership, and schedules.
 * Detects decisions, open loops, and coordination signals.
 */

export interface CoordinationInput {
  /** Raw text content to analyze */
  text: string;
  /** Source type affects extraction strategy */
  sourceType: 'tab' | 'voice' | 'note';
  /** Optional coop context */
  coopId?: string;
  /** Optional author for attribution */
  authorId?: string;
  /** Optional timestamp override */
  timestamp?: string;
  /** Optional context about current workstreams */
  workstreams?: string[];
}

export interface CoordinationArtifact {
  /** Summary of coordination state */
  summary: string;
  /** Detected decisions (made or pending) */
  decisions: Decision[];
  /** Extracted tasks with ownership */
  tasks: Task[];
  /** Open loops needing closure */
  openLoops: OpenLoop[];
  /** Scheduling signals found */
  schedule: ScheduleSignal[];
  /** Coordination health score */
  health: CoordinationHealth;
  /** Suggested next actions */
  actions: CoordinationAction[];
}

export interface Decision {
  /** Decision ID */
  id: string;
  /** Decision statement */
  statement: string;
  /** Whether decision is made or pending */
  status: 'made' | 'pending' | 'blocked';
  /** Who needs to be involved */
  stakeholders: string[];
  /** Blocking reason if status is blocked */
  blockedReason?: string;
  /** Source location in text */
  source: string;
}

export interface Task {
  /** Task ID */
  id: string;
  /** Task description */
  description: string;
  /** Suggested owner (may be inferred from text) */
  owner?: string;
  /** Priority inferred from urgency language */
  priority: 'urgent' | 'high' | 'medium' | 'low';
  /** Deadline if detected */
  deadline?: string;
  /** Related workstream */
  workstream?: string;
  /** Current status */
  status: 'new' | 'in-progress' | 'blocked' | 'done';
  /** Source location in text */
  source: string;
}

export interface OpenLoop {
  /** Description of what's unresolved */
  description: string;
  /** Why it needs closure */
  impact: string;
  /** Suggested next step */
  nextStep: string;
  /** Who should drive closure */
  ownerHint?: string;
}

export interface ScheduleSignal {
  /** Type of scheduling signal */
  type: 'meeting' | 'deadline' | 'milestone' | 'reminder';
  /** Description */
  description: string;
  /** Date/time if parsed */
  datetime?: string;
  /** Who needs to attend/be aware */
  attendees: string[];
  /** Source location in text */
  source: string;
}

export interface CoordinationHealth {
  /** Ratio of tasks with clear owners (0-1) */
  ownershipClarity: number;
  /** Ratio of decisions that are resolved (0-1) */
  decisionClarity: number;
  /** Count of open loops */
  openLoopCount: number;
  /** Overall health score (0-1) */
  score: number;
}

export interface CoordinationAction {
  /** Action description */
  description: string;
  /** Priority */
  priority: 'urgent' | 'high' | 'medium' | 'low';
  /** Suggested assignee type */
  assigneeType: 'coordinator' | 'task-owner' | 'decision-maker' | 'group';
  /** Category */
  category: 'task' | 'decision' | 'schedule' | 'loop';
}

// Skill metadata for runtime registration
export const metadata = {
  id: 'coordination',
  name: 'Coordination',
  version: '1.0.0',
  pillar: 'coordination' as CoopPillar,
  description: 'Convert fragmented inputs into coordinated tasks, ownership, and schedules',
  inputSchema: '#/schemas/CoordinationInput',
  outputSchema: '#/schemas/CoordinationArtifact',
};

// Helper functions
function generateId(): string {
  return `coord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function toSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractDecisions(text: string): Decision[] {
  const sentences = toSentences(text);
  const decisions: Decision[] = [];
  
  // Patterns for decisions
  const decisionPatterns = [
    // Made decisions
    { regex: /\b(we decided|decision made|agreed to|settled on|chose to)\b(.{10,200})/gi, status: 'made' as const },
    // Pending decisions
    { regex: /\b(need to decide|should we|debating|considering|options for)\b(.{10,200})/gi, status: 'pending' as const },
    // Blocked decisions
    { regex: /\b(blocked by|waiting for|can't decide|need input on)\b(.{10,200})/gi, status: 'blocked' as const },
  ];

  for (const sentence of sentences) {
    for (const { regex, status } of decisionPatterns) {
      const match = regex.exec(sentence);
      if (match) {
        decisions.push({
          id: generateId(),
          statement: sentence,
          status,
          stakeholders: extractMentions(sentence),
          source: sentence,
        });
        break;
      }
    }
  }

  return decisions;
}

function extractMentions(text: string): string[] {
  const mentions = text.match(/@[a-zA-Z0-9_.-]+/g) ?? [];
  const names = Array.from(
    text.matchAll(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?:will|should|to|is|are)/g),
  ).map((m) => m[1]);
  return [...new Set([...mentions, ...names])];
}

function extractTasks(text: string, workstreams?: string[]): Task[] {
  const sentences = toSentences(text);
  const tasks: Task[] = [];
  
  // Task patterns
  const taskPatterns = [
    { regex: /\b(action item|todo|task|need to|must|should)\s*:?\s*(.+)/gi, priority: 'medium' as const },
    { regex: /\b(ASAP|urgent|critical|blocking)\b(.{10,150})/gi, priority: 'urgent' as const },
    { regex: /\b(by end of|due|deadline|before)\b(.{10,150})/gi, priority: 'high' as const },
  ];

  for (const sentence of sentences) {
    for (const { regex, priority } of taskPatterns) {
      const match = regex.exec(sentence);
      if (match) {
        const mentions = extractMentions(sentence);
        const owner = mentions[0]?.replace('@', '');
        
        // Try to match to workstream
        const workstream = workstreams?.find((w) => 
          sentence.toLowerCase().includes(w.toLowerCase())
        );

        tasks.push({
          id: generateId(),
          description: sentence,
          owner,
          priority,
          workstream,
          status: 'new',
          source: sentence,
        });
        break;
      }
    }
  }

  return tasks;
}

function extractOpenLoops(text: string, decisions: Decision[], tasks: Task[]): OpenLoop[] {
  const sentences = toSentences(text);
  const loops: OpenLoop[] = [];
  
  // Find questions and uncertainties
  const questionPattern = /\b(what about|how do we|who will|when should|where is)\b(.{10,200})\?/gi;
  
  for (const sentence of sentences) {
    let match;
    while ((match = questionPattern.exec(sentence)) !== null) {
      const isCovered = 
        decisions.some((d) => d.source === sentence) ||
        tasks.some((t) => t.source === sentence);
      
      if (!isCovered) {
        loops.push({
          description: sentence,
          impact: 'May block progress if not resolved',
          nextStep: 'Assign owner to investigate and resolve',
        });
      }
    }
  }

  return loops.slice(0, 5);
}

function extractScheduleSignals(text: string): ScheduleSignal[] {
  const sentences = toSentences(text);
  const signals: ScheduleSignal[] = [];
  
  // Date/time patterns
  const schedulePatterns = [
    { 
      regex: /\b(meet(?:ing)?|call|sync|check-in)\s+(?:on|at)?\s*(.+)/gi, 
      type: 'meeting' as const 
    },
    { 
      regex: /\b(deadline|due by|need by)\s*(.+)/gi, 
      type: 'deadline' as const 
    },
    { 
      regex: /\b(milestone|launch|release|ship)\s*(.+)/gi, 
      type: 'milestone' as const 
    },
  ];

  for (const sentence of sentences) {
    for (const { regex, type } of schedulePatterns) {
      const match = regex.exec(sentence);
      if (match) {
        signals.push({
          type,
          description: sentence,
          attendees: extractMentions(sentence),
          source: sentence,
        });
      }
    }
  }

  return signals;
}

function calculateHealth(tasks: Task[], decisions: Decision[], openLoops: OpenLoop[]): CoordinationHealth {
  const ownershipClarity = tasks.length > 0 
    ? tasks.filter((t) => t.owner).length / tasks.length 
    : 1;
  
  const decisionClarity = decisions.length > 0
    ? decisions.filter((d) => d.status === 'made').length / decisions.length
    : 1;

  const score = (ownershipClarity * 0.4 + decisionClarity * 0.4 + 
    Math.max(0, 1 - openLoops.length * 0.1) * 0.2);

  return {
    ownershipClarity,
    decisionClarity,
    openLoopCount: openLoops.length,
    score: Math.min(1, Math.max(0, score)),
  };
}

function generateActions(
  tasks: Task[], 
  decisions: Decision[], 
  openLoops: OpenLoop[],
  signals: ScheduleSignal[]
): CoordinationAction[] {
  const actions: CoordinationAction[] = [];

  // High priority: unowned urgent tasks
  const unownedUrgent = tasks.filter((t) => !t.owner && t.priority === 'urgent');
  if (unownedUrgent.length > 0) {
    actions.push({
      description: `Assign owners to ${unownedUrgent.length} urgent unowned tasks`,
      priority: 'urgent',
      assigneeType: 'coordinator',
      category: 'task',
    });
  }

  // Pending decisions
  const pendingDecisions = decisions.filter((d) => d.status === 'pending');
  if (pendingDecisions.length > 0) {
    actions.push({
      description: `Drive ${pendingDecisions.length} pending decisions to resolution`,
      priority: 'high',
      assigneeType: 'decision-maker',
      category: 'decision',
    });
  }

  // Open loops
  if (openLoops.length > 0) {
    actions.push({
      description: `Close ${openLoops.length} open loops`,
      priority: 'medium',
      assigneeType: 'group',
      category: 'loop',
    });
  }

  // Schedule confirmations
  const unconfirmedMeetings = signals.filter((s) => s.type === 'meeting');
  if (unconfirmedMeetings.length > 0) {
    actions.push({
      description: `Confirm ${unconfirmedMeetings.length} meetings and send invites`,
      priority: 'medium',
      assigneeType: 'coordinator',
      category: 'schedule',
    });
  }

  return actions;
}

// Main handler function
export function handler(input: CoordinationInput): CoordinationArtifact {
  const decisions = extractDecisions(input.text);
  const tasks = extractTasks(input.text, input.workstreams);
  const openLoops = extractOpenLoops(input.text, decisions, tasks);
  const schedule = extractScheduleSignals(input.text);
  const health = calculateHealth(tasks, decisions, openLoops);
  const actions = generateActions(tasks, decisions, openLoops, schedule);

  return {
    summary: `Coordination extraction from ${input.sourceType}: ${decisions.length} decisions, ${tasks.length} tasks, ${openLoops.length} open loops`,
    decisions,
    tasks,
    openLoops,
    schedule,
    health,
    actions,
  };
}

// Export default for dynamic imports
export default { metadata, handler };
