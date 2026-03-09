import type { CoopPillar } from "@coop/shared";
import { runInference } from "../ai/inference.js";
import {
  type PillarOutput,
  runCapitalFormation,
  runCoordination,
  runGovernance,
  runImpactReporting,
} from "./pillars.js";

export interface RuntimeInput {
  coopId: string;
  pillar: CoopPillar;
  text: string;
  sourceType?: "tab" | "voice" | "note";
}

export interface RuntimeOutput {
  summary: string;
  actions: string[];
  stakeholders?: string[];
  metrics?: string[];
  evidence?: string[];
}

function mergeLists(...lists: Array<string[] | undefined>): string[] {
  return [
    ...new Set(
      lists
        .flatMap((list) => list ?? [])
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function runPillarBaseline(
  input: RuntimeInput,
  sourceType: "tab" | "voice" | "note",
): PillarOutput {
  if (input.pillar === "impact-reporting") {
    return runImpactReporting({ text: input.text, sourceType });
  }

  if (input.pillar === "coordination") {
    return runCoordination({ text: input.text, sourceType });
  }

  if (input.pillar === "governance") {
    return runGovernance({ text: input.text, sourceType });
  }

  return runCapitalFormation({ text: input.text, sourceType });
}

export async function runSkill(input: RuntimeInput): Promise<RuntimeOutput> {
  const sourceType = input.sourceType ?? "note";
  const baseline = runPillarBaseline(input, sourceType);

  const inferred = await runInference({
    coopId: input.coopId,
    pillar: input.pillar,
    input: input.text,
    context: {
      sourceType,
      baseline: {
        title: baseline.title,
        summary: baseline.summary,
        actions: baseline.actions,
        stakeholders: baseline.stakeholders,
        metrics: baseline.metrics,
        evidence: baseline.evidence,
      },
    },
  });

  if (input.pillar === "impact-reporting") {
    return {
      summary: inferred.summary,
      actions: mergeLists(baseline.actions, inferred.actions),
      stakeholders: mergeLists(baseline.stakeholders, inferred.stakeholders),
      metrics: mergeLists(baseline.metrics, inferred.metrics),
      evidence: mergeLists(baseline.evidence, inferred.evidence),
    };
  }

  return {
    summary: `${baseline.summary}\n\nAI synthesis: ${inferred.summary}`,
    actions: mergeLists(baseline.actions, inferred.actions),
  };
}
