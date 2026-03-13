import { describe, expect, it } from 'vitest';
import type { LocalInferenceCapability, RefineRequest } from '../../../contracts/schema';
import type { LocalInferenceProvider } from '../inference';
import {
  buildRefinePrompt,
  createHeuristicProvider,
  describeInferenceStatus,
  detectLocalInferenceCapability,
  parseRefineOutput,
  selectInferenceProvider,
} from '../inference';

function buildRefineRequest(overrides?: Partial<RefineRequest>): RefineRequest {
  return {
    draftId: 'draft-1',
    task: 'title-refinement',
    title: 'Watershed grant roundup for 2026',
    summary: 'A roundup of watershed funding opportunities and program deadlines.',
    tags: ['grant', 'watershed'],
    category: 'funding-lead',
    coopName: 'River Coop',
    coopPurpose: 'Share evidence and funding-ready next steps for watershed work.',
    ...overrides,
  };
}

describe('detectLocalInferenceCapability', () => {
  it('returns disabled when user has not opted in', () => {
    const result = detectLocalInferenceCapability({
      userOptIn: false,
      hasWorker: true,
      hasWebGpu: true,
    });
    expect(result.status).toBe('disabled');
    expect(result.userOptIn).toBe(false);
  });

  it('returns unavailable when worker is not available', () => {
    const result = detectLocalInferenceCapability({
      userOptIn: true,
      hasWorker: false,
      hasWebGpu: true,
    });
    expect(result.status).toBe('unavailable');
    expect(result.hasWorker).toBe(false);
    expect(result.userOptIn).toBe(true);
  });

  it('returns failed when there is an error', () => {
    const result = detectLocalInferenceCapability({
      userOptIn: true,
      hasWorker: true,
      hasWebGpu: false,
      error: 'Model initialization failed',
    });
    expect(result.status).toBe('failed');
    expect(result.reason).toBe('Model initialization failed');
  });

  it('returns loading when model is loading', () => {
    const result = detectLocalInferenceCapability({
      userOptIn: true,
      hasWorker: true,
      hasWebGpu: true,
      modelLoading: true,
    });
    expect(result.status).toBe('loading');
    expect(result.reason).toContain('Loading');
  });

  it('returns ready with WebGPU when model is loaded and WebGPU is available', () => {
    const result = detectLocalInferenceCapability({
      userOptIn: true,
      hasWorker: true,
      hasWebGpu: true,
      modelReady: true,
    });
    expect(result.status).toBe('ready');
    expect(result.reason).toContain('WebGPU');
    expect(result.model).toBe('Qwen2.5-0.5B-Instruct');
    expect(result.hasWebGpu).toBe(true);
  });

  it('returns ready without WebGPU when model is loaded on CPU/WASM', () => {
    const result = detectLocalInferenceCapability({
      userOptIn: true,
      hasWorker: true,
      hasWebGpu: false,
      modelReady: true,
    });
    expect(result.status).toBe('ready');
    expect(result.reason).toContain('CPU/WASM');
    expect(result.hasWebGpu).toBe(false);
  });

  it('returns unavailable when opted in but model not yet loaded', () => {
    const result = detectLocalInferenceCapability({
      userOptIn: true,
      hasWorker: true,
      hasWebGpu: false,
    });
    expect(result.status).toBe('unavailable');
    expect(result.reason).toContain('not yet loaded');
  });
});

describe('selectInferenceProvider', () => {
  const heuristicProvider: LocalInferenceProvider = {
    kind: 'heuristic',
    label: 'Keyword heuristics',
    refine: async () => ({
      draftId: 'draft-1',
      task: 'title-refinement',
      provider: 'heuristic',
      durationMs: 0,
    }),
  };

  const localModelProvider: LocalInferenceProvider = {
    kind: 'local-model',
    label: 'Local model',
    refine: async () => ({
      draftId: 'draft-1',
      task: 'title-refinement',
      provider: 'local-model',
      model: 'Qwen2.5-0.5B-Instruct',
      durationMs: 0,
    }),
  };

  it('selects local-model when capability is ready and provider exists', () => {
    const capability: LocalInferenceCapability = {
      status: 'ready',
      reason: 'Ready',
      hasWebGpu: true,
      hasWorker: true,
      userOptIn: true,
    };
    const selected = selectInferenceProvider(capability, {
      heuristic: heuristicProvider,
      localModel: localModelProvider,
    });
    expect(selected.kind).toBe('local-model');
  });

  it('falls back to heuristic when capability is not ready', () => {
    const capability: LocalInferenceCapability = {
      status: 'loading',
      reason: 'Loading...',
      hasWebGpu: true,
      hasWorker: true,
      userOptIn: true,
    };
    const selected = selectInferenceProvider(capability, {
      heuristic: heuristicProvider,
      localModel: localModelProvider,
    });
    expect(selected.kind).toBe('heuristic');
  });

  it('falls back to heuristic when no local-model provider is given', () => {
    const capability: LocalInferenceCapability = {
      status: 'ready',
      reason: 'Ready',
      hasWebGpu: true,
      hasWorker: true,
      userOptIn: true,
    };
    const selected = selectInferenceProvider(capability, {
      heuristic: heuristicProvider,
    });
    expect(selected.kind).toBe('heuristic');
  });
});

describe('buildRefinePrompt', () => {
  it('builds a title-refinement prompt', () => {
    const request = buildRefineRequest({ task: 'title-refinement' });
    const prompt = buildRefinePrompt(request);
    expect(prompt).toContain('Rewrite the following title');
    expect(prompt).toContain('River Coop');
    expect(prompt).toContain('Watershed grant roundup for 2026');
    expect(prompt).toContain('funding-lead');
    expect(prompt).toContain('Refined title:');
  });

  it('builds a summary-compression prompt', () => {
    const request = buildRefineRequest({ task: 'summary-compression' });
    const prompt = buildRefinePrompt(request);
    expect(prompt).toContain('Compress the following summary');
    expect(prompt).toContain('River Coop');
    expect(prompt).toContain('Compressed summary:');
  });

  it('builds a tag-suggestion prompt', () => {
    const request = buildRefineRequest({ task: 'tag-suggestion' });
    const prompt = buildRefinePrompt(request);
    expect(prompt).toContain('Suggest 3-6 short');
    expect(prompt).toContain('grant, watershed');
    expect(prompt).toContain('Suggested tags:');
  });

  it('returns empty string for unknown task', () => {
    const request = buildRefineRequest({ task: 'title-refinement' });
    // Force an unknown task value to test the default branch
    // biome-ignore lint/suspicious/noExplicitAny: testing default branch with invalid task
    const prompt = buildRefinePrompt({ ...request, task: 'unknown' as any });
    expect(prompt).toBe('');
  });
});

describe('parseRefineOutput', () => {
  it('parses title-refinement output', () => {
    const request = buildRefineRequest({ task: 'title-refinement' });
    const result = parseRefineOutput(
      request,
      '  Watershed Funding Roundup 2026  ',
      'local-model',
      'Qwen2.5-0.5B',
      42,
    );
    expect(result.refinedTitle).toBe('Watershed Funding Roundup 2026');
    expect(result.provider).toBe('local-model');
    expect(result.model).toBe('Qwen2.5-0.5B');
    expect(result.durationMs).toBe(42);
    expect(result.task).toBe('title-refinement');
  });

  it('returns undefined refinedTitle for empty output', () => {
    const request = buildRefineRequest({ task: 'title-refinement' });
    const result = parseRefineOutput(request, '   ', 'heuristic', undefined, 1);
    expect(result.refinedTitle).toBeUndefined();
  });

  it('parses summary-compression output', () => {
    const request = buildRefineRequest({ task: 'summary-compression' });
    const result = parseRefineOutput(
      request,
      'Funding roundup for watershed.',
      'local-model',
      'Qwen2.5-0.5B',
      55,
    );
    expect(result.refinedSummary).toBe('Funding roundup for watershed.');
    expect(result.durationMs).toBe(55);
  });

  it('parses tag-suggestion output with comma separation', () => {
    const request = buildRefineRequest({ task: 'tag-suggestion' });
    const result = parseRefineOutput(
      request,
      'watershed, funding, grant, restoration',
      'local-model',
      'Qwen2.5-0.5B',
      30,
    );
    expect(result.suggestedTags).toEqual(['watershed', 'funding', 'grant', 'restoration']);
  });

  it('filters out single-char tags and limits to 8', () => {
    const request = buildRefineRequest({ task: 'tag-suggestion' });
    const result = parseRefineOutput(
      request,
      'a, watershed, b, funding, grant, restoration, ecology, rivers, policy, conservation, z',
      'heuristic',
      undefined,
      10,
    );
    expect(result.suggestedTags).toBeDefined();
    expect(result.suggestedTags?.every((tag) => tag.length > 1)).toBe(true);
    expect(result.suggestedTags?.length).toBeLessThanOrEqual(8);
  });

  it('returns undefined suggestedTags for empty output', () => {
    const request = buildRefineRequest({ task: 'tag-suggestion' });
    const result = parseRefineOutput(request, '   ', 'heuristic', undefined, 1);
    expect(result.suggestedTags).toBeUndefined();
  });

  it('returns a minimal result for unknown task', () => {
    const request = buildRefineRequest({ task: 'title-refinement' });
    const result = parseRefineOutput(
      // biome-ignore lint/suspicious/noExplicitAny: testing default branch with invalid task
      { ...request, task: 'unknown' as any },
      'whatever',
      'heuristic',
      undefined,
      5,
    );
    expect(result.draftId).toBe('draft-1');
    expect(result.provider).toBe('heuristic');
    expect(result.durationMs).toBe(5);
  });
});

describe('createHeuristicProvider', () => {
  it('has kind "heuristic" and a descriptive label', () => {
    const provider = createHeuristicProvider();
    expect(provider.kind).toBe('heuristic');
    expect(provider.label).toBe('Keyword heuristics');
  });

  it('refines titles by stripping common suffixes', async () => {
    const provider = createHeuristicProvider();
    const request = buildRefineRequest({
      task: 'title-refinement',
      title: 'Watershed guide - Home',
    });
    const result = await provider.refine(request);
    expect(result.provider).toBe('heuristic');
    expect(result.refinedTitle).toBe('Watershed guide');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns undefined refinedTitle when no cleanup applies', async () => {
    const provider = createHeuristicProvider();
    const request = buildRefineRequest({
      task: 'title-refinement',
      title: 'Clean title',
    });
    const result = await provider.refine(request);
    expect(result.refinedTitle).toBeUndefined();
  });

  it('compresses summaries using truncateWords', async () => {
    const provider = createHeuristicProvider();
    const longSummary =
      'This is a very long summary that has many more words than the target maximum of twenty-four words so it should be truncated down to just twenty-four words in the compressed output.';
    const request = buildRefineRequest({
      task: 'summary-compression',
      summary: longSummary,
    });
    const result = await provider.refine(request);
    expect(result.provider).toBe('heuristic');
    expect(result.refinedSummary).toBeDefined();
    expect(result.refinedSummary?.split(/\s+/).length).toBeLessThanOrEqual(25); // 24 words + ellipsis char
  });

  it('returns undefined refinedSummary when summary is already short', async () => {
    const provider = createHeuristicProvider();
    const request = buildRefineRequest({
      task: 'summary-compression',
      summary: 'Short summary here.',
    });
    const result = await provider.refine(request);
    expect(result.refinedSummary).toBeUndefined();
  });

  it('suggests tags from title and summary words', async () => {
    const provider = createHeuristicProvider();
    const request = buildRefineRequest({
      task: 'tag-suggestion',
      title: 'Watershed restoration funding update',
      summary: 'Evidence packet for watershed collaboratives and restoration projects.',
      tags: [],
    });
    const result = await provider.refine(request);
    expect(result.provider).toBe('heuristic');
    expect(result.suggestedTags).toBeDefined();
    expect(result.suggestedTags?.length).toBeGreaterThan(0);
    expect(result.suggestedTags?.length).toBeLessThanOrEqual(6);
    expect(result.suggestedTags?.every((tag) => tag.length > 4)).toBe(true);
  });

  it('filters out existing tags from suggestions', async () => {
    const provider = createHeuristicProvider();
    const request = buildRefineRequest({
      task: 'tag-suggestion',
      title: 'Watershed restoration funding update',
      summary: 'Evidence packet for watershed collaboratives and restoration projects.',
      tags: ['watershed', 'restoration'],
    });
    const result = await provider.refine(request);
    if (result.suggestedTags) {
      expect(result.suggestedTags).not.toContain('watershed');
      expect(result.suggestedTags).not.toContain('restoration');
    }
  });

  it('returns undefined suggestedTags when no new tags can be found', async () => {
    const provider = createHeuristicProvider();
    const request = buildRefineRequest({
      task: 'tag-suggestion',
      title: 'A B C',
      summary: 'So very tiny.',
      tags: [],
    });
    const result = await provider.refine(request);
    expect(result.suggestedTags).toBeUndefined();
  });
});

describe('describeInferenceStatus', () => {
  it('describes disabled status', () => {
    const cap: LocalInferenceCapability = {
      status: 'disabled',
      reason: 'Disabled',
      hasWebGpu: false,
      hasWorker: false,
      userOptIn: false,
    };
    expect(describeInferenceStatus(cap)).toBe('Local inference disabled');
  });

  it('describes unavailable status', () => {
    const cap: LocalInferenceCapability = {
      status: 'unavailable',
      reason: 'No worker',
      hasWebGpu: false,
      hasWorker: false,
      userOptIn: true,
    };
    expect(describeInferenceStatus(cap)).toBe('Local inference unavailable');
  });

  it('describes loading status', () => {
    const cap: LocalInferenceCapability = {
      status: 'loading',
      reason: 'Loading...',
      hasWebGpu: false,
      hasWorker: true,
      userOptIn: true,
    };
    expect(describeInferenceStatus(cap)).toBe('Loading local model...');
  });

  it('describes ready status with model name', () => {
    const cap: LocalInferenceCapability = {
      status: 'ready',
      reason: 'Ready',
      model: 'Qwen2.5-0.5B-Instruct',
      hasWebGpu: true,
      hasWorker: true,
      userOptIn: true,
    };
    expect(describeInferenceStatus(cap)).toBe('Local model ready (Qwen2.5-0.5B-Instruct)');
  });

  it('describes ready status without model name', () => {
    const cap: LocalInferenceCapability = {
      status: 'ready',
      reason: 'Ready',
      hasWebGpu: false,
      hasWorker: true,
      userOptIn: true,
    };
    expect(describeInferenceStatus(cap)).toBe('Local model ready');
  });

  it('describes running status', () => {
    const cap: LocalInferenceCapability = {
      status: 'running',
      reason: 'Running',
      hasWebGpu: false,
      hasWorker: true,
      userOptIn: true,
    };
    expect(describeInferenceStatus(cap)).toBe('Running local inference...');
  });

  it('describes failed status with reason', () => {
    const cap: LocalInferenceCapability = {
      status: 'failed',
      reason: 'Out of memory',
      hasWebGpu: false,
      hasWorker: true,
      userOptIn: true,
    };
    expect(describeInferenceStatus(cap)).toBe('Local inference failed: Out of memory');
  });
});
