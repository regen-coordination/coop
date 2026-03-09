import type { CoopPillar } from '@coop/shared';

/**
 * Skill: impact-reporting
 * 
 * Transforms captured community evidence into draft impact narratives 
 * and attestations. Aligned with Green Goods verification flows.
 */

export interface ImpactReportingInput {
  /** Raw text content to analyze (tab capture, voice transcript, note) */
  text: string;
  /** Source type affects extraction strategy */
  sourceType: 'tab' | 'voice' | 'note';
  /** Optional coop context for enrichment */
  coopId?: string;
  /** Optional author for attribution */
  authorId?: string;
  /** Optional timestamp override */
  timestamp?: string;
}

export interface ImpactArtifact {
  /** Human-readable impact summary */
  summary: string;
  /** Suggested title for the report */
  title: string;
  /** Extracted stakeholders (people, orgs, communities) */
  stakeholders: string[];
  /** Quantifiable impacts with units */
  metrics: MetricEntry[];
  /** Evidence links found in content */
  evidence: EvidenceLink[];
  /** Suggested follow-up actions */
  actions: ActionItem[];
  /** Attestation payload ready for signing */
  attestation: AttestationPayload;
  /** Confidence score (0-1) */
  confidence: number;
}

export interface MetricEntry {
  /** Metric description */
  description: string;
  /** Numeric value (may be estimated) */
  value?: number;
  /** Unit of measurement */
  unit?: string;
  /** Whether this is a verified or estimated value */
  verified: boolean;
  /** Source within the text */
  source: string;
}

export interface EvidenceLink {
  /** URL or reference */
  url: string;
  /** Type of evidence */
  type: 'image' | 'document' | 'video' | 'url' | 'quote';
  /** Description of what this evidence supports */
  description: string;
}

export interface ActionItem {
  /** Action description */
  description: string;
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** Suggested assignee type */
  assigneeType: 'reporter' | 'validator' | 'community' | 'admin';
  /** Related metric or evidence this validates */
  validates?: string;
}

export interface AttestationPayload {
  /** Schema version */
  version: '1.0.0';
  /** Unique report ID */
  reportId: string;
  /** Timestamp of attestation */
  timestamp: string;
  /** Content hash for integrity */
  contentHash: string;
  /** Claims being attested */
  claims: Claim[];
  /** Required signers */
  requiredSigners: number;
}

export interface Claim {
  /** Claim type */
  type: 'activity' | 'outcome' | 'beneficiary' | 'impact';
  /** Claim statement */
  statement: string;
  /** Supporting evidence refs */
  evidence: string[];
  /** Confidence level */
  confidence: 'high' | 'medium' | 'low';
}

// Skill metadata for runtime registration
export const metadata = {
  id: 'impact-reporting',
  name: 'Impact Reporting',
  version: '1.0.0',
  pillar: 'impact-reporting' as CoopPillar,
  description: 'Transform community evidence into draft impact narratives and attestations',
  inputSchema: '#/schemas/ImpactReportingInput',
  outputSchema: '#/schemas/ImpactArtifact',
};

// Helper functions
function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function toSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractUrls(text: string): string[] {
  const urls = text.match(/https?:\/\/[^\s)\]]+/g) ?? [];
  const markdownLinks = Array.from(text.matchAll(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g)).map(
    (m) => m[1],
  );
  return dedupe([...urls, ...markdownLinks]);
}

function extractMetrics(text: string): MetricEntry[] {
  const sentences = toSentences(text);
  const metrics: MetricEntry[] = [];
  
  // Pattern: number + unit (various formats)
  const patterns = [
    { regex: /\b(\d+(?:[.,]\d+)?)\s*(hours?|hrs?|h)\b/gi, unit: 'hours' },
    { regex: /\b(\d+(?:[.,]\d+)?)\s*(people|participants?|attendees?|volunteers?)\b/gi, unit: 'people' },
    { regex: /\b(\d+(?:[.,]\d+)?)\s*(families|households)\b/gi, unit: 'households' },
    { regex: /\b(\d+(?:[.,]\d+)?)\s*(acres|hectares?)\b/gi, unit: 'acres' },
    { regex: /\b(\d+(?:[.,]\d+)?)\s*(trees?|plants?)\b/gi, unit: 'trees' },
    { regex: /\b(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilograms?)\b/gi, unit: 'kg' },
    { regex: /\b(\d+(?:[.,]\d+)?)\s*(lbs?|pounds?)\b/gi, unit: 'lbs' },
    { regex: /\b(\d+(?:[.,]\d+)?)\s*(\$|USD|dollars?)\b/gi, unit: 'USD' },
    { regex: /\b(\d+(?:[.,]\d+)?)\s*(percent|%|pct)\b/gi, unit: 'percent' },
  ];

  for (const sentence of sentences) {
    for (const { regex, unit } of patterns) {
      let match;
      while ((match = regex.exec(sentence)) !== null) {
        const value = parseFloat(match[1].replace(',', ''));
        metrics.push({
          description: sentence.slice(0, 100),
          value,
          unit,
          verified: false,
          source: sentence,
        });
      }
    }
  }

  // Sentences with numbers that might be metrics
  const metricSentences = sentences
    .filter((s) => /\d/.test(s) && !metrics.some((m) => m.source === s))
    .slice(0, 6);

  for (const sentence of metricSentences) {
    metrics.push({
      description: sentence,
      verified: false,
      source: sentence,
    });
  }

  return metrics.slice(0, 10);
}

function extractStakeholders(text: string): string[] {
  const mentions = text.match(/@[a-zA-Z0-9_.-]+/g) ?? [];
  const orgCandidates = Array.from(
    text.matchAll(/\b(?:with|by|from|partner(?:ed)? with|alongside)\s+([A-Z][\w&-]*(?:\s+[A-Z][\w&-]*){0,3})/g),
  ).map((m) => m[1]);

  const listCandidates = text
    .split(/\n|,|;/)
    .map((p) => p.trim())
    .filter((p) => /\b(team|community|coop|council|school|farm|collective|group|members?)\b/i.test(p))
    .slice(0, 4);

  return dedupe([...mentions, ...orgCandidates, ...listCandidates]).slice(0, 8);
}

function generateContentHash(text: string): string {
  // Simple hash for content integrity reference
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// Main handler function
export function handler(input: ImpactReportingInput): ImpactArtifact {
  const urls = extractUrls(input.text);
  const metrics = extractMetrics(input.text);
  const stakeholders = extractStakeholders(input.text);
  const sentences = toSentences(input.text);
  
  // Generate summary from first 2 sentences or first 220 chars
  const primary = sentences.slice(0, 2).join(' ');
  const summary = primary || input.text.slice(0, 220);
  
  // Generate report ID
  const reportId = `ir-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = input.timestamp ?? new Date().toISOString();
  const contentHash = generateContentHash(input.text);

  // Build evidence links
  const evidence: EvidenceLink[] = urls.map((url) => ({
    url,
    type: url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 
          url.match(/\.(pdf|doc|docx)$/i) ? 'document' : 'url',
    description: `Found in ${input.sourceType} capture`,
  }));

  // Build claims from content
  const claims: Claim[] = [
    {
      type: 'activity',
      statement: summary,
      evidence: urls,
      confidence: 'medium',
    },
    ...metrics.slice(0, 3).map((m) => ({
      type: 'outcome' as const,
      statement: m.description,
      evidence: urls.slice(0, 2),
      confidence: (m.verified ? 'high' : 'medium') as 'high' | 'medium' | 'low',
    })),
  ];

  // Build actions
  const actions: ActionItem[] = [
    {
      description: 'Confirm who was involved and add missing stakeholders',
      priority: 'high' as const,
      assigneeType: 'reporter' as const,
    },
    {
      description: 'Validate numeric outcomes and units before publishing',
      priority: 'high' as const,
      assigneeType: 'validator' as const,
      validates: 'metrics',
    },
    ...(evidence.length > 0 
      ? [{
          description: 'Verify evidence links are still accessible',
          priority: 'medium' as const,
          assigneeType: 'validator' as const,
          validates: 'evidence',
        }]
      : [{
          description: 'Attach supporting evidence links',
          priority: 'medium' as const,
          assigneeType: 'reporter' as const,
          validates: 'evidence',
        }]),
    {
      description: 'Review and sign attestation payload',
      priority: 'high' as const,
      assigneeType: 'admin' as const,
    },
  ];

  // Calculate confidence based on data quality
  const hasMetrics = metrics.length > 0;
  const hasEvidence = evidence.length > 0;
  const hasStakeholders = stakeholders.length > 0;
  const confidence = (hasMetrics ? 0.3 : 0) + (hasEvidence ? 0.4 : 0) + (hasStakeholders ? 0.3 : 0);

  return {
    title: 'Impact Report Draft',
    summary: `Impact synthesis (${input.sourceType}): ${summary}`,
    stakeholders,
    metrics,
    evidence,
    actions,
    attestation: {
      version: '1.0.0',
      reportId,
      timestamp,
      contentHash,
      claims,
      requiredSigners: 2,
    },
    confidence,
  };
}

// Export default for dynamic imports
export default { metadata, handler };
