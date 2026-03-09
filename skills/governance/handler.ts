import type { CoopPillar } from '@coop/shared';

/**
 * Skill: governance
 * 
 * Supports proposal drafting, decision logging, and governance memory.
 * Helps coops make decisions, record them, and maintain accountability.
 */

export interface GovernanceInput {
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
  /** Current governance model if known */
  governanceModel?: 'consensus' | 'majority' | 'authority' | 'liquid' | 'unknown';
}

export interface GovernanceArtifact {
  /** Summary of governance state */
  summary: string;
  /** Detected or drafted proposals */
  proposals: Proposal[];
  /** Identified tradeoffs */
  tradeoffs: Tradeoff[];
  /** Governance actions recommended */
  actions: GovernanceAction[];
  /** Decision record if one can be extracted */
  decisionRecord?: DecisionRecord;
  /** Governance health indicators */
  health: GovernanceHealth;
}

export interface Proposal {
  /** Proposal ID */
  id: string;
  /** Proposal title */
  title: string;
  /** Full description */
  description: string;
  /** Proposed by */
  proposer?: string;
  /** Current status */
  status: 'draft' | 'open' | 'voting' | 'passed' | 'rejected' | 'withdrawn';
  /** Options if this is a decision */
  options?: ProposalOption[];
  /** Supporting rationale */
  rationale?: string;
  /** Source location in text */
  source: string;
}

export interface ProposalOption {
  /** Option label */
  label: string;
  /** Option description */
  description: string;
  /** Pros mentioned */
  pros: string[];
  /** Cons mentioned */
  cons: string[];
}

export interface Tradeoff {
  /** Tradeoff description */
  description: string;
  /** Dimensions being traded off */
  dimensions: string[];
  /** Option A */
  optionA: string;
  /** Option B */
  optionB: string;
  /** Key considerations */
  considerations: string[];
  /** Who is affected */
  stakeholders: string[];
}

export interface GovernanceAction {
  /** Action description */
  description: string;
  /** Priority */
  priority: 'high' | 'medium' | 'low';
  /** Who should take action */
  actor: 'proposer' | 'facilitator' | 'steward' | 'membership';
  /** What governance phase this addresses */
  phase: 'drafting' | 'deliberation' | 'decision' | 'implementation' | 'retrospective';
}

export interface DecisionRecord {
  /** Decision ID */
  id: string;
  /** Decision statement */
  statement: string;
  /** How the decision was made */
  decisionMethod: string;
  /** Who participated */
  participants: string[];
  /** Timestamp */
  timestamp: string;
  /** Rationale recorded */
  rationale: string;
  /** Dissent or concerns noted */
  dissent?: string;
  /** Next review date if applicable */
  reviewDate?: string;
}

export interface GovernanceHealth {
  /** Is there a clear decision path? */
  hasClearPath: boolean;
  /** Are tradeoffs documented? */
  tradeoffsDocumented: boolean;
  /** Is there proposer accountability? */
  hasAccountability: boolean;
  /** Overall readiness score (0-1) */
  readinessScore: number;
}

// Skill metadata for runtime registration
export const metadata = {
  id: 'governance',
  name: 'Governance',
  version: '1.0.0',
  pillar: 'governance' as CoopPillar,
  description: 'Support proposal drafting, decision logging, and governance memory',
  inputSchema: '#/schemas/GovernanceInput',
  outputSchema: '#/schemas/GovernanceArtifact',
};

// Helper functions
function generateId(): string {
  return `gov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function toSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractMentions(text: string): string[] {
  const mentions = text.match(/@[a-zA-Z0-9_.-]+/g) ?? [];
  return [...new Set(mentions)];
}

function extractProposals(text: string, model: GovernanceInput['governanceModel']): Proposal[] {
  const sentences = toSentences(text);
  const proposals: Proposal[] = [];
  
  // Proposal patterns
  const proposalPatterns = [
    { regex: /\b(propose|proposal|suggest|motion):?\s*(.+)/gi, type: 'draft' as const },
    { regex: /\b(we should|let's|I think we|consider)\s+(.{10,200})/gi, type: 'draft' as const },
    { regex: /\b(decided|resolution|passed|approved)\s*:?\s*(.+)/gi, type: 'passed' as const },
  ];

  for (const sentence of sentences) {
    for (const { regex, type } of proposalPatterns) {
      const match = regex.exec(sentence);
      if (match) {
        const mentions = extractMentions(sentence);
        const proposer = mentions[0]?.replace('@', '');
        
        // Try to extract options if present
        const options = extractOptions(sentence, text);

        proposals.push({
          id: generateId(),
          title: sentence.slice(0, 80),
          description: sentence,
          proposer,
          status: type,
          options: options.length > 0 ? options : undefined,
          source: sentence,
        });
        break;
      }
    }
  }

  return proposals;
}

function extractOptions(sentence: string, fullText: string): ProposalOption[] {
  const options: ProposalOption[] = [];
  
  // Look for "option A/B", "approach 1/2", or "vs" patterns
  const optionPattern = /\b(option|approach|choice)\s*([A-B]|\d)|\b(.{5,50})\s+vs\.?\s+(.{5,50})/gi;
  let match;
  
  while ((match = optionPattern.exec(fullText)) !== null) {
    if (match[3] && match[4]) {
      options.push({
        label: 'Option A',
        description: match[3].trim(),
        pros: [],
        cons: [],
      });
      options.push({
        label: 'Option B',
        description: match[4].trim(),
        pros: [],
        cons: [],
      });
    }
  }

  return options.slice(0, 4);
}

function extractTradeoffs(text: string): Tradeoff[] {
  const sentences = toSentences(text);
  const tradeoffs: Tradeoff[] = [];
  
  // Tradeoff patterns
  const tradeoffPatterns = [
    { regex: /\b(tradeoff|trade-off|balance|weigh)\s*(.{10,300})/gi },
    { regex: /\b(on one hand|on the other hand|pros? and cons?|advantages?)\s*(.{10,300})/gi },
    { regex: /\b(risk|downside|cost|benefit)\s*(.{10,200})/gi },
  ];

  for (const sentence of sentences) {
    for (const { regex } of tradeoffPatterns) {
      const match = regex.exec(sentence);
      if (match) {
        tradeoffs.push({
          description: sentence,
          dimensions: extractDimensions(sentence),
          optionA: 'Status quo',
          optionB: 'Proposed change',
          considerations: extractConsiderations(sentence),
          stakeholders: extractMentions(sentence),
        });
        break;
      }
    }
  }

  return tradeoffs.slice(0, 3);
}

function extractDimensions(text: string): string[] {
  const dimensions = [
    'cost', 'time', 'quality', 'speed', 'risk', 'equity', 'access',
    'sustainability', 'scalability', 'control', 'autonomy', 'privacy',
  ];
  
  return dimensions.filter((d) => 
    text.toLowerCase().includes(d)
  );
}

function extractConsiderations(text: string): string[] {
  const considerations: string[] = [];
  
  // Look for explicit consideration patterns
  const considerationPattern = /\b(risk|benefit|cost|impact|consequence)s?\s*(?:is|of|are|:)\s*(.{5,100})/gi;
  let match;
  
  while ((match = considerationPattern.exec(text)) !== null) {
    considerations.push(`${match[1]}: ${match[2].trim()}`);
  }

  return considerations.slice(0, 5);
}

function extractDecisionRecord(text: string): DecisionRecord | undefined {
  const sentences = toSentences(text);
  
  // Look for explicit decision patterns
  const decisionPatterns = [
    /\b(decided|decision|resolved|agreed)\s*:?\s*(that\s+)?(.{10,300})/i,
    /\b(we will|we have chosen|the consensus is)\s+(.{10,300})/i,
  ];

  for (const sentence of sentences) {
    for (const pattern of decisionPatterns) {
      const match = pattern.exec(sentence);
      if (match) {
        const statement = match[3] || match[2] || sentence;
        
        return {
          id: generateId(),
          statement: statement.trim(),
          decisionMethod: inferDecisionMethod(text),
          participants: extractMentions(text),
          timestamp: new Date().toISOString(),
          rationale: extractRationale(text),
        };
      }
    }
  }

  return undefined;
}

function inferDecisionMethod(text: string): string {
  if (/\b(consensus|everyone agreed|unanimous)/i.test(text)) {
    return 'consensus';
  }
  if (/\b(voted|majority|poll)/i.test(text)) {
    return 'majority vote';
  }
  if (/\b([Ll]ead|[Oo]wner|[Ss]teward)\s+(decided|chose|selected)/i.test(text)) {
    return 'authority decision';
  }
  return 'unclear';
}

function extractRationale(text: string): string {
  const sentences = toSentences(text);
  const rationaleSentences = sentences.filter((s) =>
    /\b(because|since|given that|rationale|reason|therefore|thus)\b/i.test(s)
  );
  
  return rationaleSentences.slice(0, 2).join(' ') || 'Rationale not explicitly recorded';
}

function generateActions(
  proposals: Proposal[],
  tradeoffs: Tradeoff[],
  decisionRecord: DecisionRecord | undefined,
  model: GovernanceInput['governanceModel']
): GovernanceAction[] {
  const actions: GovernanceAction[] = [];

  // Drafting phase actions
  const draftProposals = proposals.filter((p) => p.status === 'draft');
  if (draftProposals.length > 0) {
    actions.push({
      description: `Formalize ${draftProposals.length} draft proposal(s) with clear options and rationale`,
      priority: 'high',
      actor: 'proposer',
      phase: 'drafting',
    });
  }

  // Deliberation phase
  if (tradeoffs.length === 0 && draftProposals.length > 0) {
    actions.push({
      description: 'Document key tradeoffs for active proposals',
      priority: 'medium',
      actor: 'facilitator',
      phase: 'deliberation',
    });
  }

  // Decision phase
  if (draftProposals.length > 0 && !decisionRecord) {
    actions.push({
      description: `Move ${draftProposals.length} proposal(s) to decision using ${model || 'appropriate'} method`,
      priority: 'high',
      actor: 'steward',
      phase: 'decision',
    });
  }

  // Record keeping
  if (decisionRecord) {
    actions.push({
      description: 'Archive decision record and communicate to membership',
      priority: 'medium',
      actor: 'steward',
      phase: 'implementation',
    });
  }

  return actions;
}

function calculateHealth(
  proposals: Proposal[],
  tradeoffs: Tradeoff[],
  decisionRecord: DecisionRecord | undefined
): GovernanceHealth {
  const hasClearPath = proposals.some((p) => p.status !== 'draft') || decisionRecord !== undefined;
  const tradeoffsDocumented = tradeoffs.length > 0 || proposals.every((p) => !p.options);
  const hasAccountability = proposals.every((p) => p.proposer !== undefined);

  const score = (
    (hasClearPath ? 0.4 : 0) +
    (tradeoffsDocumented ? 0.3 : 0) +
    (hasAccountability ? 0.3 : 0)
  );

  return {
    hasClearPath,
    tradeoffsDocumented,
    hasAccountability,
    readinessScore: score,
  };
}

// Main handler function
export function handler(input: GovernanceInput): GovernanceArtifact {
  const proposals = extractProposals(input.text, input.governanceModel);
  const tradeoffs = extractTradeoffs(input.text);
  const decisionRecord = extractDecisionRecord(input.text);
  const actions = generateActions(proposals, tradeoffs, decisionRecord, input.governanceModel);
  const health = calculateHealth(proposals, tradeoffs, decisionRecord);

  return {
    summary: `Governance analysis: ${proposals.length} proposals, ${tradeoffs.length} tradeoffs${decisionRecord ? ', 1 decision recorded' : ''}`,
    proposals,
    tradeoffs,
    actions,
    decisionRecord,
    health,
  };
}

// Export default for dynamic imports
export default { metadata, handler };
