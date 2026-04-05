import type { ReadablePageExtract, TabCandidate } from '../../contracts/schema';
import {
  canonicalizeUrl,
  compactWhitespace,
  createId,
  extractDomain,
  hashText,
  nowIso,
  truncateWords,
  unique,
} from '../../utils';

export interface PageSignalInput {
  candidate: TabCandidate;
  metaDescription?: string;
  headings?: string[];
  paragraphs?: string[];
  socialPreviewImageUrl?: string;
  previewImageUrl?: string;
}

export function buildReadablePageExtract(input: PageSignalInput): ReadablePageExtract {
  const headings = unique((input.headings ?? []).map(compactWhitespace))
    .filter(Boolean)
    .slice(0, 5);
  const paragraphs = (input.paragraphs ?? [])
    .map(compactWhitespace)
    .filter((paragraph) => paragraph.length > 40);
  const leadParagraphs = paragraphs.slice(0, 2);
  const salientTextBlocks = unique([...leadParagraphs, ...paragraphs.slice(2, 5)]).slice(0, 5);
  const canonicalUrl = canonicalizeUrl(input.candidate.url);
  const domain = extractDomain(canonicalUrl);
  const cleanedTitle = compactWhitespace(input.candidate.title);
  const textHash = hashText(
    [cleanedTitle, input.metaDescription ?? '', ...headings, ...salientTextBlocks].join(' '),
  );

  return {
    id: createId('extract'),
    sourceCandidateId: input.candidate.id,
    canonicalUrl,
    cleanedTitle,
    domain,
    metaDescription: input.metaDescription
      ? truncateWords(compactWhitespace(input.metaDescription), 32)
      : undefined,
    topHeadings: headings,
    leadParagraphs,
    salientTextBlocks,
    textHash,
    faviconUrl: input.candidate.favicon,
    socialPreviewImageUrl: input.socialPreviewImageUrl ?? input.previewImageUrl,
    previewImageUrl: input.previewImageUrl ?? input.socialPreviewImageUrl,
    createdAt: nowIso(),
  };
}
