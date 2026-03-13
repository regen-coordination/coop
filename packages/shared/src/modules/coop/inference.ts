import type {
  LocalInferenceCapability,
  LocalInferenceStatus,
  RefineRequest,
  RefineResult,
  RefineTask,
} from '../../contracts/schema';
import { truncateWords } from '../../utils';

/**
 * LocalInferenceProvider interface — the abstraction over heuristic
 * and model-backed inference paths.
 */
export interface LocalInferenceProvider {
  readonly kind: 'heuristic' | 'local-model';
  readonly label: string;
  refine(request: RefineRequest): Promise<RefineResult>;
}

/**
 * Detect local inference capability from the runtime environment.
 */
export function detectLocalInferenceCapability(input: {
  userOptIn: boolean;
  hasWorker: boolean;
  hasWebGpu: boolean;
  modelReady?: boolean;
  modelLoading?: boolean;
  error?: string;
}): LocalInferenceCapability {
  if (!input.userOptIn) {
    return {
      status: 'disabled',
      reason: 'Local inference is opt-in and currently disabled.',
      hasWebGpu: input.hasWebGpu,
      hasWorker: input.hasWorker,
      userOptIn: false,
    };
  }

  if (!input.hasWorker) {
    return {
      status: 'unavailable',
      reason: 'A long-lived UI context with worker support is required.',
      hasWebGpu: input.hasWebGpu,
      hasWorker: false,
      userOptIn: true,
    };
  }

  if (input.error) {
    return {
      status: 'failed',
      reason: input.error,
      hasWebGpu: input.hasWebGpu,
      hasWorker: true,
      userOptIn: true,
    };
  }

  if (input.modelLoading) {
    return {
      status: 'loading',
      reason: 'Loading local model...',
      hasWebGpu: input.hasWebGpu,
      hasWorker: true,
      userOptIn: true,
    };
  }

  if (input.modelReady) {
    return {
      status: 'ready',
      reason: input.hasWebGpu
        ? 'Local model ready with WebGPU acceleration.'
        : 'Local model ready (CPU/WASM).',
      model: 'Qwen2.5-0.5B-Instruct',
      hasWebGpu: input.hasWebGpu,
      hasWorker: true,
      userOptIn: true,
    };
  }

  return {
    status: 'unavailable',
    reason: 'Local model is not yet loaded. Use "Refine locally" to initialize.',
    hasWebGpu: input.hasWebGpu,
    hasWorker: true,
    userOptIn: true,
  };
}

/**
 * Select which provider to use based on capability.
 */
export function selectInferenceProvider(
  capability: LocalInferenceCapability,
  providers: { heuristic: LocalInferenceProvider; localModel?: LocalInferenceProvider },
): LocalInferenceProvider {
  if (capability.status === 'ready' && providers.localModel) {
    return providers.localModel;
  }
  return providers.heuristic;
}

/**
 * Build a prompt for the local model based on the refine task.
 */
export function buildRefinePrompt(request: RefineRequest): string {
  const context = `Context: This draft is for a coop called "${request.coopName}" whose purpose is: ${request.coopPurpose}.`;

  switch (request.task) {
    case 'title-refinement':
      return [
        'You are a concise editor. Rewrite the following title to be clearer and more descriptive in under 12 words. Return only the new title, nothing else.',
        '',
        context,
        `Category: ${request.category}`,
        `Current title: ${request.title}`,
        '',
        'Refined title:',
      ].join('\n');

    case 'summary-compression':
      return [
        'You are a concise editor. Compress the following summary into 1-2 clear sentences that capture the key point. Return only the compressed summary, nothing else.',
        '',
        context,
        `Title: ${request.title}`,
        `Current summary: ${request.summary}`,
        '',
        'Compressed summary:',
      ].join('\n');

    case 'tag-suggestion':
      return [
        'You are a tag generator. Suggest 3-6 short, lowercase tags (single words or hyphenated phrases) for the following content. Return only the tags separated by commas, nothing else.',
        '',
        context,
        `Title: ${request.title}`,
        `Summary: ${request.summary}`,
        `Existing tags: ${request.tags.join(', ') || 'none'}`,
        '',
        'Suggested tags:',
      ].join('\n');

    default:
      return '';
  }
}

/**
 * Parse raw model output into a structured refine result.
 */
export function parseRefineOutput(
  request: RefineRequest,
  rawOutput: string,
  provider: 'heuristic' | 'local-model',
  model: string | undefined,
  durationMs: number,
): RefineResult {
  const cleaned = rawOutput.trim();

  switch (request.task) {
    case 'title-refinement':
      return {
        draftId: request.draftId,
        task: request.task,
        refinedTitle: cleaned || undefined,
        provider,
        model,
        durationMs,
      };

    case 'summary-compression':
      return {
        draftId: request.draftId,
        task: request.task,
        refinedSummary: cleaned || undefined,
        provider,
        model,
        durationMs,
      };

    case 'tag-suggestion': {
      const tags = cleaned
        .split(/[,\n]+/)
        .map((tag) =>
          tag
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, ''),
        )
        .filter((tag) => tag.length > 1)
        .slice(0, 8);
      return {
        draftId: request.draftId,
        task: request.task,
        suggestedTags: tags.length > 0 ? tags : undefined,
        provider,
        model,
        durationMs,
      };
    }

    default:
      return {
        draftId: request.draftId,
        task: request.task,
        provider,
        model,
        durationMs,
      };
  }
}

/**
 * HeuristicInferenceProvider — the fallback provider that uses keyword
 * matching and text manipulation instead of a model.
 */
export function createHeuristicProvider(): LocalInferenceProvider {
  return {
    kind: 'heuristic',
    label: 'Keyword heuristics',
    async refine(request: RefineRequest): Promise<RefineResult> {
      const start = Date.now();

      switch (request.task) {
        case 'title-refinement': {
          const refined = request.title
            .replace(/\s*[-|]\s*$/, '')
            .replace(/\s*[-|:]\s*(Home|Homepage|Welcome|Main)$/i, '')
            .replace(/^\s*(Home|Homepage|Welcome)\s*[-|:]\s*/i, '')
            .trim();
          return {
            draftId: request.draftId,
            task: request.task,
            refinedTitle: refined !== request.title ? refined : undefined,
            provider: 'heuristic',
            durationMs: Date.now() - start,
          };
        }

        case 'summary-compression': {
          const compressed = truncateWords(request.summary, 24);
          return {
            draftId: request.draftId,
            task: request.task,
            refinedSummary: compressed !== request.summary ? compressed : undefined,
            provider: 'heuristic',
            durationMs: Date.now() - start,
          };
        }

        case 'tag-suggestion': {
          const words = [request.title, request.summary]
            .join(' ')
            .toLowerCase()
            .split(/[^a-z0-9-]+/)
            .filter((w) => w.length > 4);
          const unique = [...new Set(words)].slice(0, 6);
          const newTags = unique.filter((t) => !request.tags.includes(t));
          return {
            draftId: request.draftId,
            task: request.task,
            suggestedTags: newTags.length > 0 ? newTags : undefined,
            provider: 'heuristic',
            durationMs: Date.now() - start,
          };
        }

        default:
          return {
            draftId: request.draftId,
            task: request.task,
            provider: 'heuristic',
            durationMs: Date.now() - start,
          };
      }
    },
  };
}

/** Describes the inference status for display in the UI. */
export function describeInferenceStatus(capability: LocalInferenceCapability): string {
  switch (capability.status) {
    case 'disabled':
      return 'Local inference disabled';
    case 'unavailable':
      return 'Local inference unavailable';
    case 'loading':
      return 'Loading local model...';
    case 'ready':
      return capability.model ? `Local model ready (${capability.model})` : 'Local model ready';
    case 'running':
      return 'Running local inference...';
    case 'failed':
      return `Local inference failed: ${capability.reason}`;
    default:
      return 'Heuristics fallback';
  }
}
