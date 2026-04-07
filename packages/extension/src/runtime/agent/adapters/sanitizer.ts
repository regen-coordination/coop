const MAX_CONTENT_BYTES = 50_000;

/** Patterns that indicate prompt injection attempts */
const INJECTION_PATTERNS: RegExp[] = [
  // System/assistant/user role injection tags
  /<system>[\s\S]*?<\/system>/gi,
  /<assistant>[\s\S]*?<\/assistant>/gi,
  /<user>[\s\S]*?<\/user>/gi,
  /<instructions>[\s\S]*?<\/instructions>/gi,

  // Instruction override patterns — match the phrase + trailing clause up to sentence boundary
  /IGNORE\s+(ALL\s+)?PREVIOUS\s+INSTRUCTIONS[^.!\n]*[.!]?/gi,
  /DISREGARD\s+(ALL\s+)?PREVIOUS[^.!\n]*[.!]?/gi,
  /YOU\s+ARE\s+NOW\s+IN\s+[A-Z]+\s+MODE[^.!\n]*[.!]?/gi,
  /OVERRIDE\s+SYSTEM\s+PROMPT[^.!\n]*[.!]?/gi,
  /FORGET\s+(ALL\s+)?PREVIOUS\s+(INSTRUCTIONS|CONTEXT)[^.!\n]*[.!]?/gi,

  // Embedded data URI payloads (base64 blobs > 100 chars)
  /data:[a-z/+]+;base64,[A-Za-z0-9+/=]{100,}/g,
];

/**
 * Sanitize ingested content by stripping prompt injection patterns,
 * removing embedded payloads, and enforcing size limits.
 * Preserves legitimate markdown formatting.
 */
export function sanitizeIngested(rawContent: string): string {
  let content = rawContent;

  // Apply all injection pattern removals
  for (const pattern of INJECTION_PATTERNS) {
    content = content.replace(pattern, '');
  }

  // Truncate to size limit
  if (content.length > MAX_CONTENT_BYTES) {
    content = content.slice(0, MAX_CONTENT_BYTES);
  }

  // Clean up any resulting double-blank-lines from removals
  content = content.replace(/\n{3,}/g, '\n\n');

  return content;
}
