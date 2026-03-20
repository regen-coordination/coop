import { describe, expect, it } from 'vitest';
import {
  createDefaultSetupSummary,
  emptySetupInsightsInput,
  toSetupInsights,
} from '../setup-insights';

describe('shared setup insights shaping', () => {
  it('starts from an empty shared setup-insights input', () => {
    expect(emptySetupInsightsInput.summary).toBe('');
    expect(emptySetupInsightsInput.coopName).toBe('');
    expect(emptySetupInsightsInput.knowledgeImprove).toBe('');
  });

  it('builds a four-lens setup payload and trims empty cross-cutting items', () => {
    const insights = toSetupInsights({
      ...emptySetupInsightsInput,
      summary: 'A shared membrane for tabs, evidence, and next steps.',
      capitalCurrent: 'Funding context is scattered.',
      capitalPain: 'Grant links disappear in chats.',
      capitalImprove: 'Track leads in one shared flow.',
      impactCurrent: 'Evidence is gathered late.',
      impactPain: '',
      impactImprove: 'Keep impact evidence visible earlier.',
      governanceCurrent: 'Calls happen weekly.',
      governancePain: 'Follow-up slips after the meeting.',
      governanceImprove: 'Use a shared review board.',
      knowledgeCurrent: 'Resources live in browser tabs.',
      knowledgePain: 'People repeat research.',
      knowledgeImprove: '',
    });

    expect(insights.lenses).toHaveLength(4);
    expect(insights.crossCuttingPainPoints).toEqual([
      'Grant links disappear in chats.',
      'Follow-up slips after the meeting.',
      'People repeat research.',
    ]);
    expect(insights.crossCuttingOpportunities).toEqual([
      'Track leads in one shared flow.',
      'Keep impact evidence visible earlier.',
      'Use a shared review board.',
    ]);
  });

  it('fills missing setup answers with readable defaults for a shorter hatch flow', () => {
    const insights = toSetupInsights({
      ...emptySetupInsightsInput,
      coopName: 'Pocket Flock',
      purpose: 'Keep good ideas from getting loose.',
    });

    expect(createDefaultSetupSummary({ coopName: 'Pocket Flock' })).toContain(
      'Pocket Flock uses Coop',
    );
    expect(insights.summary).toContain('Pocket Flock uses Coop');
    expect(insights.lenses).toHaveLength(4);
    expect(insights.lenses.every((lens) => lens.currentState.length > 0)).toBe(true);
    expect(insights.lenses.every((lens) => lens.painPoints.length > 0)).toBe(true);
    expect(insights.lenses.every((lens) => lens.improvements.length > 0)).toBe(true);
    expect(insights.crossCuttingPainPoints).toEqual([]);
    expect(insights.crossCuttingOpportunities).toEqual([]);
  });
});
