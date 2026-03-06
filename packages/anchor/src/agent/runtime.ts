import type { CoopPillar } from '@coop/shared';
import { runInference } from '../ai/inference';
import {
  runCapitalFormation,
  runCoordination,
  runGovernance,
  runImpactReporting,
} from './pillars';

export interface RuntimeInput {
  coopId: string;
  pillar: CoopPillar;
  text: string;
  sourceType?: 'tab' | 'voice' | 'note';
}

export async function runSkill(input: RuntimeInput): Promise<{ summary: string; actions: string[] }> {
  const sourceType = input.sourceType ?? 'note';
  const base = (() => {
    if (input.pillar === 'impact-reporting') {
      return runImpactReporting({ text: input.text, sourceType });
    }
    if (input.pillar === 'coordination') {
      return runCoordination({ text: input.text, sourceType });
    }
    if (input.pillar === 'governance') {
      return runGovernance({ text: input.text, sourceType });
    }
    return runCapitalFormation({ text: input.text, sourceType });
  })();

  const inferred = await runInference({
    coopId: input.coopId,
    pillar: input.pillar,
    input: input.text,
  });

  return {
    summary: `${base.summary}\n\nAI synthesis: ${inferred.summary}`,
    actions: [...base.actions, ...inferred.actions],
  };
}
