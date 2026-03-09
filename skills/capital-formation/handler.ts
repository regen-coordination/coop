import type { CoopPillar } from '@coop/shared';

/**
 * Skill: capital-formation
 * 
 * Maps opportunities, capital needs, and readiness signals for each Coop.
 * Helps coops identify, evaluate, and pursue funding opportunities.
 */

export interface CapitalFormationInput {
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
  /** Current funding stage if known */
  fundingStage?: 'idea' | 'formation' | 'operation' | 'growth' | 'mature';
  /** Existing capital sources */
  existingCapital?: string[];
}

export interface CapitalFormationArtifact {
  /** Summary of capital situation */
  summary: string;
  /** Detected opportunities */
  opportunities: FundingOpportunity[];
  /** Capital needs identified */
  needs: CapitalNeed[];
  /** Readiness assessment */
  readiness: ReadinessAssessment;
  /** Recommended actions */
  actions: CapitalAction[];
  /** Capital stack suggestion */
  capitalStack: CapitalStackRecommendation;
}

export interface FundingOpportunity {
  /** Opportunity ID */
  id: string;
  /** Opportunity name/title */
  name: string;
  /** Type of capital */
  type: 'grant' | 'loan' | 'equity' | 'revenue' | 'donation' | 'crowdfunding';
  /** Source/funder name */
  source: string;
  /** Estimated amount if mentioned */
  amount?: {
    min?: number;
    max?: number;
    currency: string;
  };
  /** Deadline if mentioned */
  deadline?: string;
  /** Fit score based on coop profile (0-1) */
  fitScore: number;
  /** Requirements mentioned */
  requirements: string[];
  /** Why this matches the coop */
  matchRationale: string;
  /** Source location in text */
  textSource: string;
}

export interface CapitalNeed {
  /** Need ID */
  id: string;
  /** What the capital is for */
  purpose: string;
  /** Estimated amount */
  estimatedAmount?: {
    value: number;
    currency: string;
  };
  /** Urgency */
  urgency: 'immediate' | 'soon' | 'future' | 'ongoing';
  /** Type of capital best suited */
  suggestedType: string[];
  /** Timeframe for need */
  timeframe?: string;
}

export interface ReadinessAssessment {
  /** Overall readiness score (0-1) */
  score: number;
  /** Dimensions of readiness */
  dimensions: {
    documentation: number;
    trackRecord: number;
    financials: number;
    team: number;
    marketValidation: number;
  };
  /** Gaps that need addressing */
  gaps: ReadinessGap[];
  /** Strengths to emphasize */
  strengths: string[];
}

export interface ReadinessGap {
  /** What's missing */
  description: string;
  /** Impact on funding ability */
  impact: 'blocking' | 'significant' | 'minor';
  /** Suggested remediation */
  remediation: string;
}

export interface CapitalAction {
  /** Action description */
  description: string;
  /** Priority */
  priority: 'urgent' | 'high' | 'medium' | 'low';
  /** Who should do this */
  owner: 'coordinator' | 'finance-lead' | 'whole-coop' | 'external-advisor';
  /** Category */
  category: 'opportunity' | 'readiness' | 'application' | 'relationship';
  /** Related opportunity ID if applicable */
  relatedOpportunityId?: string;
}

export interface CapitalStackRecommendation {
  /** Suggested mix of capital types */
  suggestedMix: Array<{
    type: string;
    percentage: number;
    rationale: string;
  }>;
  /** Total target raise */
  targetRaise?: {
    amount: number;
    currency: string;
  };
  /** Timing suggestions */
  timing: string;
}

// Skill metadata for runtime registration
export const metadata = {
  id: 'capital-formation',
  name: 'Capital Formation',
  version: '1.0.0',
  pillar: 'capital-formation' as CoopPillar,
  description: 'Map opportunities, capital needs, and readiness signals for each Coop',
  inputSchema: '#/schemas/CapitalFormationInput',
  outputSchema: '#/schemas/CapitalFormationArtifact',
};

// Helper functions
function generateId(): string {
  return `cf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function toSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Funding opportunity patterns
const FUNDING_PATTERNS = [
  { 
    regex: /\b(grant|funding|RFP|request for proposals?)\s*(?:from|by)?\s*([A-Z][\w\s&-]{2,50})/gi, 
    type: 'grant' as const 
  },
  { 
    regex: /\b(loan|debt financing|credit|lending)\s*(?:from|by)?\s*([A-Z][\w\s&-]{2,50})/gi, 
    type: 'loan' as const 
  },
  { 
    regex: /\b(investment|equity|VC|venture capital|angel)\s*(?:from|by)?\s*([A-Z][\w\s&-]{2,50})/gi, 
    type: 'equity' as const 
  },
  { 
    regex: /\b(crowdfunding|kickstarter|gofundme|community funding)/gi, 
    type: 'crowdfunding' as const 
  },
  { 
    regex: /\b(donation|philanthropic|foundation|gift)\s*(?:from|by)?\s*([A-Z][\w\s&-]{2,50})/gi, 
    type: 'donation' as const 
  },
];

// Amount patterns
const AMOUNT_PATTERNS = [
  { regex: /\$([\d,]+(?:\.\d{2})?)\s*(k|thousand|m|million)?/gi },
  { regex: /(\d+)\s*(k|thousand|m|million)\s*(dollars?|USD)?/gi },
  { regex: /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(dollars?|USD)/gi },
];

function parseAmount(text: string): { min?: number; max?: number; currency: string } | undefined {
  const matches: number[] = [];
  
  for (const { regex } of AMOUNT_PATTERNS) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      const multiplier = match[2]?.toLowerCase();
      
      if (multiplier === 'k' || multiplier === 'thousand') {
        value *= 1000;
      } else if (multiplier === 'm' || multiplier === 'million') {
        value *= 1000000;
      }
      
      matches.push(value);
    }
  }

  if (matches.length === 0) return undefined;
  
  return {
    min: Math.min(...matches),
    max: Math.max(...matches),
    currency: 'USD',
  };
}

function extractDeadline(text: string): string | undefined {
  // Date patterns
  const datePatterns = [
    /\b(deadline|due|by|closes?)\s*:?\s*(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+\d{4})?)/i,
    /\b(deadline|due|by|closes?)\s*:?\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i,
    /\b(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})\s*(deadline|due)/i,
  ];

  for (const pattern of datePatterns) {
    const match = pattern.exec(text);
    if (match) {
      return match[2] || match[1];
    }
  }

  return undefined;
}

function extractOpportunities(text: string): FundingOpportunity[] {
  const sentences = toSentences(text);
  const opportunities: FundingOpportunity[] = [];

  for (const sentence of sentences) {
    for (const { regex, type } of FUNDING_PATTERNS) {
      let match;
      while ((match = regex.exec(sentence)) !== null) {
        const source = match[2] || 'Unknown funder';
        const amount = parseAmount(sentence);
        const deadline = extractDeadline(sentence);

        opportunities.push({
          id: generateId(),
          name: `${source} ${type}`,
          type,
          source,
          amount,
          deadline,
          fitScore: 0.5, // Base score, would be enhanced with coop profile
          requirements: extractRequirements(sentence),
          matchRationale: `Detected ${type} opportunity from ${source}`,
          textSource: sentence,
        });
      }
    }
  }

  return opportunities.slice(0, 5);
}

function extractRequirements(text: string): string[] {
  const requirements: string[] = [];
  const reqPatterns = [
    /\b(requires?|must have|need to|eligibility)\s*:?\s*(.{5,100})/gi,
    /\b(501\(c\)\(3\)|nonprofit|registered|certificate)/gi,
    /\b(budget|financials?|audit|tax return)/gi,
  ];

  for (const { regex } of reqPatterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      requirements.push(match[0]);
    }
  }

  return [...new Set(requirements)].slice(0, 4);
}

function extractNeeds(text: string): CapitalNeed[] {
  const sentences = toSentences(text);
  const needs: CapitalNeed[] = [];

  // Need patterns
  const needPatterns = [
    { regex: /\b(need|raise|seeking|looking for)\s+(\$?[\d,]+(?:k|m)?\s*)?(for|to)\s+(.{10,100})/gi },
    { regex: /\b(funding|capital|money|resources?)\s+(needed|required|for)\s+(.{10,100})/gi },
  ];

  for (const sentence of sentences) {
    for (const { regex } of needPatterns) {
      const match = regex.exec(sentence);
      if (match) {
        const amount = parseAmount(sentence);
        const purpose = match[4] || match[3] || 'General operations';
        
        // Infer urgency
        let urgency: CapitalNeed['urgency'] = 'future';
        if (/\b(ASAP|urgent|immediately|now|this week)\b/i.test(sentence)) {
          urgency = 'immediate';
        } else if (/\b(soon|next month|quarter|this month)\b/i.test(sentence)) {
          urgency = 'soon';
        } else if (/\b(ongoing|continuous|annual|regular)\b/i.test(sentence)) {
          urgency = 'ongoing';
        }

        needs.push({
          id: generateId(),
          purpose: purpose.trim(),
          estimatedAmount: amount ? { value: amount.min || amount.max || 0, currency: amount.currency } : undefined,
          urgency,
          suggestedType: suggestCapitalTypes(purpose),
        });
      }
    }
  }

  return needs.slice(0, 3);
}

function suggestCapitalTypes(purpose: string): string[] {
  const purpose_lower = purpose.toLowerCase();
  
  if (/\b(equipment|building|infrastructure|capital expenditure|capex)\b/.test(purpose_lower)) {
    return ['loan', 'equipment financing', 'grant'];
  }
  if (/\b(operations|salary|payroll|ongoing|general)\b/.test(purpose_lower)) {
    return ['revenue', 'donation', 'loan'];
  }
  if (/\b(growth|scale|expand|new market|hiring)\b/.test(purpose_lower)) {
    return ['equity', 'revenue-based financing', 'loan'];
  }
  if (/\b(project|program|specific|initiative)\b/.test(purpose_lower)) {
    return ['grant', 'donation', 'crowdfunding'];
  }
  
  return ['grant', 'loan', 'donation'];
}

function assessReadiness(
  text: string,
  stage: CapitalFormationInput['fundingStage']
): ReadinessAssessment {
  const dimensions = {
    documentation: 0,
    trackRecord: 0,
    financials: 0,
    team: 0,
    marketValidation: 0,
  };

  // Check for documentation indicators
  if (/\b(bylaws|articles|incorporated|501c3|registered|legal)\b/i.test(text)) {
    dimensions.documentation += 0.3;
  }
  if (/\b(website|brochure|pitch deck|one-pager|materials?)\b/i.test(text)) {
    dimensions.documentation += 0.3;
  }

  // Check for track record
  if (/\b(years?|since|history|completed|delivered|served|helped)\b/i.test(text)) {
    dimensions.trackRecord += 0.3;
  }
  if (/\b(impact|results|outcomes|beneficiaries|success)\b/i.test(text)) {
    dimensions.trackRecord += 0.3;
  }

  // Check for financials
  if (/\b(budget|financial statement|audit|bookkeeping|accounting|revenue)\b/i.test(text)) {
    dimensions.financials += 0.4;
  }
  if (/\b(\$[\d,]+|thousand|million|annual budget)\b/i.test(text)) {
    dimensions.financials += 0.2;
  }

  // Check for team
  if (/\b(team|staff|members?|founders?|directors?|board)\b/i.test(text)) {
    dimensions.team += 0.3;
  }
  if (/\b(experience|expertise|background|skills?)\b/i.test(text)) {
    dimensions.team += 0.3;
  }

  // Check for market validation
  if (/\b(customers?|clients?|partners?|contracts?|demand|market)\b/i.test(text)) {
    dimensions.marketValidation += 0.4;
  }

  // Stage adjustments
  if (stage === 'mature') {
    dimensions.trackRecord += 0.2;
    dimensions.financials += 0.2;
  } else if (stage === 'idea') {
    dimensions.documentation -= 0.1;
    dimensions.trackRecord -= 0.1;
  }

  // Cap at 1.0
  Object.keys(dimensions).forEach((key) => {
    dimensions[key as keyof typeof dimensions] = Math.min(
      1,
      Math.max(0, dimensions[key as keyof typeof dimensions])
    );
  });

  const score = Object.values(dimensions).reduce((a, b) => a + b, 0) / 5;

  // Identify gaps
  const gaps: ReadinessGap[] = [];
  if (dimensions.documentation < 0.4) {
    gaps.push({
      description: 'Legal and organizational documentation',
      impact: 'blocking',
      remediation: 'Prepare bylaws, incorporation docs, and basic marketing materials',
    });
  }
  if (dimensions.financials < 0.4) {
    gaps.push({
      description: 'Financial records and transparency',
      impact: 'significant',
      remediation: 'Set up bookkeeping and prepare financial statements',
    });
  }
  if (dimensions.trackRecord < 0.3) {
    gaps.push({
      description: 'Documented impact and track record',
      impact: 'significant',
      remediation: 'Compile case studies, testimonials, and outcome metrics',
    });
  }

  // Identify strengths
  const strengths: string[] = [];
  if (dimensions.team > 0.6) strengths.push('Strong team credentials');
  if (dimensions.trackRecord > 0.6) strengths.push('Documented impact history');
  if (dimensions.marketValidation > 0.6) strengths.push('Market demand validated');

  return {
    score,
    dimensions,
    gaps,
    strengths,
  };
}

function generateCapitalStack(
  opportunities: FundingOpportunity[],
  needs: CapitalNeed[],
  stage: CapitalFormationInput['fundingStage']
): CapitalStackRecommendation {
  const mix: CapitalStackRecommendation['suggestedMix'] = [];
  
  // Base recommendations by stage
  if (stage === 'idea' || stage === 'formation') {
    mix.push({ type: 'donation', percentage: 40, rationale: 'For early setup and validation' });
    mix.push({ type: 'grant', percentage: 35, rationale: 'Project-specific funding' });
    mix.push({ type: 'crowdfunding', percentage: 25, rationale: 'Community buy-in and validation' });
  } else if (stage === 'operation') {
    mix.push({ type: 'revenue', percentage: 40, rationale: 'Sustainable operations' });
    mix.push({ type: 'grant', percentage: 35, rationale: 'Program expansion' });
    mix.push({ type: 'loan', percentage: 25, rationale: 'Working capital' });
  } else if (stage === 'growth' || stage === 'mature') {
    mix.push({ type: 'revenue', percentage: 50, rationale: 'Core sustainability' });
    mix.push({ type: 'loan', percentage: 30, rationale: 'Growth capital' });
    mix.push({ type: 'equity', percentage: 20, rationale: 'Major expansion' });
  } else {
    // Unknown stage - balanced approach
    mix.push({ type: 'grant', percentage: 30, rationale: 'Non-dilutive funding' });
    mix.push({ type: 'revenue', percentage: 40, rationale: 'Sustainability' });
    mix.push({ type: 'loan', percentage: 30, rationale: 'Flexibility' });
  }

  // Calculate target raise from needs
  let totalTarget = 0;
  for (const need of needs) {
    if (need.estimatedAmount?.value) {
      totalTarget += need.estimatedAmount.value;
    }
  }

  return {
    suggestedMix: mix,
    targetRaise: totalTarget > 0 ? { amount: totalTarget, currency: 'USD' } : undefined,
    timing: stage === 'idea' ? 'Focus on donations and small grants first' :
            stage === 'growth' ? 'Layer in debt and consider equity for scale' :
            'Balance immediate needs with long-term sustainability',
  };
}

function generateActions(
  opportunities: FundingOpportunity[],
  needs: CapitalNeed[],
  readiness: ReadinessAssessment
): CapitalAction[] {
  const actions: CapitalAction[] = [];

  // Urgent: Address blocking gaps
  const blockingGaps = readiness.gaps.filter((g) => g.impact === 'blocking');
  if (blockingGaps.length > 0) {
    actions.push({
      description: `Address ${blockingGaps.length} blocking readiness gaps before pursuing funding`,
      priority: 'urgent',
      owner: 'whole-coop',
      category: 'readiness',
    });
  }

  // High priority opportunities with deadlines
  const deadlineOpps = opportunities.filter((o) => o.deadline);
  for (const opp of deadlineOpps.slice(0, 2)) {
    actions.push({
      description: `Prepare application for ${opp.name} (deadline: ${opp.deadline})`,
      priority: 'high',
      owner: 'coordinator',
      category: 'application',
      relatedOpportunityId: opp.id,
    });
  }

  // Research high-fit opportunities
  const highFitOpps = opportunities.filter((o) => o.fitScore > 0.7);
  for (const opp of highFitOpps.slice(0, 2)) {
    actions.push({
      description: `Research ${opp.name} requirements and gather materials`,
      priority: 'medium',
      owner: 'coordinator',
      category: 'opportunity',
      relatedOpportunityId: opp.id,
    });
  }

  // Relationship building
  if (opportunities.some((o) => o.type === 'equity' || o.type === 'loan')) {
    actions.push({
      description: 'Build relationships with potential lenders/investors',
      priority: 'medium',
      owner: 'finance-lead',
      category: 'relationship',
    });
  }

  return actions;
}

// Main handler function
export function handler(input: CapitalFormationInput): CapitalFormationArtifact {
  const opportunities = extractOpportunities(input.text);
  const needs = extractNeeds(input.text);
  const readiness = assessReadiness(input.text, input.fundingStage);
  const capitalStack = generateCapitalStack(opportunities, needs, input.fundingStage);
  const actions = generateActions(opportunities, needs, readiness);

  return {
    summary: `Capital analysis: ${opportunities.length} opportunities, ${needs.length} needs identified. Readiness score: ${Math.round(readiness.score * 100)}%`,
    opportunities,
    needs,
    readiness,
    actions,
    capitalStack,
  };
}

// Export default for dynamic imports
export default { metadata, handler };
