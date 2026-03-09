export interface PillarInput {
  text: string;
  sourceType: "tab" | "voice" | "note";
}

export interface PillarOutput {
  title: string;
  summary: string;
  actions: string[];
  stakeholders?: string[];
  metrics?: string[];
  evidence?: string[];
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function toSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function extractEvidence(text: string): string[] {
  const urls = text.match(/https?:\/\/[^\s)\]]+/g) ?? [];
  const markdownLinks = Array.from(text.matchAll(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g)).map(
    (match) => match[1],
  );
  return dedupe([...urls, ...markdownLinks]);
}

function extractMetrics(text: string): string[] {
  const sentences = toSentences(text);
  const metricSentences = sentences.filter((sentence) => /\d/.test(sentence));

  if (metricSentences.length > 0) {
    return dedupe(metricSentences.slice(0, 6));
  }

  const patterns =
    text.match(
      /\b\d+(?:[.,]\d+)?\s?(?:%|hours?|people|participants?|volunteers?|families|households|acres|trees|dollars?|\$)\b/gi,
    ) ?? [];
  return dedupe(patterns).slice(0, 6);
}

function extractStakeholders(text: string): string[] {
  const mentions = text.match(/@[a-zA-Z0-9_.-]+/g) ?? [];
  const orgCandidates = Array.from(
    text.matchAll(
      /\b(?:with|by|from|partner(?:ed)? with|alongside)\s+([A-Z][\w&-]*(?:\s+[A-Z][\w&-]*){0,3})/g,
    ),
  ).map((match) => match[1]);

  const listCandidates = text
    .split(/\n|,|;/)
    .map((part) => part.trim())
    .filter((part) =>
      /\b(team|community|coop|council|school|farm|collective|group|members?)\b/i.test(part),
    )
    .slice(0, 4);

  return dedupe([...mentions, ...orgCandidates, ...listCandidates]).slice(0, 8);
}

function buildImpactSummary(text: string, sourceType: PillarInput["sourceType"]): string {
  const sentences = toSentences(text);
  const primary = sentences.slice(0, 2).join(" ");
  if (primary) {
    return `Impact synthesis (${sourceType}): ${primary}`;
  }

  return `Impact synthesis (${sourceType}): ${text.slice(0, 220)}`;
}

export function runImpactReporting(input: PillarInput): PillarOutput {
  const evidence = extractEvidence(input.text);
  const metrics = extractMetrics(input.text);
  const stakeholders = extractStakeholders(input.text);

  return {
    title: "Impact reporting draft",
    summary: buildImpactSummary(input.text, input.sourceType),
    stakeholders,
    metrics,
    evidence,
    actions: [
      "Confirm who was involved and add missing stakeholders",
      "Validate numeric outcomes and units before publishing",
      evidence.length > 0
        ? "Verify evidence links are still accessible"
        : "Attach supporting evidence links",
      "Prepare attestation payload",
    ],
  };
}

export function runCoordination(input: PillarInput): PillarOutput {
  return {
    title: "Coordination action list",
    summary: `Coordination extraction based on ${input.sourceType} input.`,
    actions: ["Assign owners", "Set due dates", "Publish weekly sync summary"],
  };
}

export function runGovernance(input: PillarInput): PillarOutput {
  return {
    title: "Governance proposal draft",
    summary: `Drafted proposal context from ${input.sourceType}.`,
    actions: ["Review options", "Define decision model", "Record final decision"],
  };
}

export function runCapitalFormation(input: PillarInput): PillarOutput {
  return {
    title: "Capital formation brief",
    summary: `Funding signals inferred from ${input.sourceType}: ${input.text.slice(0, 180)}`,
    actions: ["Map opportunities", "Draft submission packet", "Schedule outreach"],
  };
}
