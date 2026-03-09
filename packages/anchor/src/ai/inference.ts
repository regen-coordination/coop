import Anthropic from "@anthropic-ai/sdk";

export interface InferenceRequest {
  coopId: string;
  pillar: "impact-reporting" | "coordination" | "governance" | "capital-formation";
  input: string;
  context?: {
    sourceType?: "tab" | "voice" | "note";
    baseline?: {
      title?: string;
      summary?: string;
      actions?: string[];
      stakeholders?: string[];
      metrics?: string[];
      evidence?: string[];
    };
  };
}

export interface InferenceResult {
  summary: string;
  actions: string[];
  stakeholders?: string[];
  metrics?: string[];
  evidence?: string[];
}

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";

function buildPrompt(request: InferenceRequest): string {
  if (request.pillar === "impact-reporting") {
    return `You are analyzing content for impact reporting. Extract:
- Summary of activities/events
- Key stakeholders involved
- Quantifiable impacts (numbers, outcomes)
- Evidence/links referenced
- Suggested follow-up actions

Content: ${request.input}

Additional context:
${JSON.stringify(request.context ?? {}, null, 2)}

Respond in JSON: {summary, stakeholders[], metrics[], evidence[], actions[]}`;
  }

  if (request.pillar === "coordination") {
    return `You are analyzing coop coordination content.
Extract the most important coordination state and next moves.

Content: ${request.input}

Additional context:
${JSON.stringify(request.context ?? {}, null, 2)}

Respond in JSON: {summary, actions[]}`;
  }

  if (request.pillar === "governance") {
    return `You are analyzing coop governance content.
Extract decision context, tradeoffs, and concrete next governance actions.

Content: ${request.input}

Additional context:
${JSON.stringify(request.context ?? {}, null, 2)}

Respond in JSON: {summary, actions[]}`;
  }

  return `You are analyzing capital-formation content.
Extract the best funding/capital insights and concrete follow-up actions.

Content: ${request.input}

Additional context:
${JSON.stringify(request.context ?? {}, null, 2)}

Respond in JSON: {summary, actions[]}`;
}

function fallbackInference(request: InferenceRequest): InferenceResult {
  const baseSummary = request.context?.baseline?.summary ?? request.input.slice(0, 240);
  const baseActions = request.context?.baseline?.actions ?? [];

  if (request.pillar === "impact-reporting") {
    return {
      summary: baseSummary,
      stakeholders: request.context?.baseline?.stakeholders ?? [],
      metrics: request.context?.baseline?.metrics ?? [],
      evidence: request.context?.baseline?.evidence ?? [],
      actions: [
        ...baseActions,
        "Validate extracted impacts with stakeholders",
        "Attach supporting evidence and links before publishing",
      ],
    };
  }

  return {
    summary: `[${request.pillar}] ${baseSummary}`,
    actions: [
      ...baseActions,
      "Review synthesized output",
      "Promote approved artifact to cold storage",
    ],
  };
}

function parseJsonObject(content: string): Record<string, unknown> | null {
  const trimmed = content.trim();

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    // continue
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1].trim()) as Record<string, unknown>;
    } catch {
      // continue
    }
  }

  return null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeResult(
  parsed: Record<string, unknown>,
  fallback: InferenceResult,
): InferenceResult {
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : fallback.summary;
  const actions = toStringArray(parsed.actions);

  return {
    summary,
    actions: actions.length > 0 ? actions : fallback.actions,
    stakeholders: toStringArray(parsed.stakeholders),
    metrics: toStringArray(parsed.metrics),
    evidence: toStringArray(parsed.evidence),
  };
}

export async function runInference(request: InferenceRequest): Promise<InferenceResult> {
  const fallback = fallbackInference(request);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return fallback;
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 900,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: buildPrompt(request),
        },
      ],
    });

    const text = response.content
      .map((block) => {
        if (block.type === "text") {
          return block.text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!text) {
      return fallback;
    }

    const parsed = parseJsonObject(text);
    if (!parsed) {
      return {
        ...fallback,
        summary: text,
      };
    }

    return normalizeResult(parsed, fallback);
  } catch {
    return fallback;
  }
}
