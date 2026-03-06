export interface PillarInput {
  text: string;
  sourceType: 'tab' | 'voice' | 'note';
}

export interface PillarOutput {
  title: string;
  summary: string;
  actions: string[];
}

export function runImpactReporting(input: PillarInput): PillarOutput {
  return {
    title: 'Impact reporting draft',
    summary: `Evidence synthesized from ${input.sourceType}: ${input.text.slice(0, 220)}`,
    actions: ['Validate outcomes', 'Attach evidence links', 'Prepare attestation payload'],
  };
}

export function runCoordination(input: PillarInput): PillarOutput {
  return {
    title: 'Coordination action list',
    summary: `Coordination extraction based on ${input.sourceType} input.`,
    actions: ['Assign owners', 'Set due dates', 'Publish weekly sync summary'],
  };
}

export function runGovernance(input: PillarInput): PillarOutput {
  return {
    title: 'Governance proposal draft',
    summary: `Drafted proposal context from ${input.sourceType}.`,
    actions: ['Review options', 'Define decision model', 'Record final decision'],
  };
}

export function runCapitalFormation(input: PillarInput): PillarOutput {
  return {
    title: 'Capital formation brief',
    summary: `Funding signals inferred from ${input.sourceType}: ${input.text.slice(0, 180)}`,
    actions: ['Map opportunities', 'Draft submission packet', 'Schedule outreach'],
  };
}
