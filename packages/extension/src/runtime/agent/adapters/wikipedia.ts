import type { StructuredContent } from './types';

interface WikipediaArticleData {
  parse?: {
    title: string;
    pageid: number;
    text?: { '*': string };
    categories?: Array<{ '*': string }>;
    sections?: Array<{ toclevel: number; line: string; number: string }>;
  };
  extract?: string;
  error?: { code: string; info: string };
}

/**
 * Parse a Wikipedia MediaWiki API response into StructuredContent.
 * Handles both successful responses and not-found errors.
 */
export function parseWikipediaArticle(
  data: WikipediaArticleData,
  title: string,
): StructuredContent {
  // Handle error / not-found
  if (data.error || !data.parse) {
    return {
      title,
      body: '',
      metadata: { error: true, message: data.error?.info ?? 'Page not found' },
      sourceRef: `wikipedia:${title}`,
      fetchedAt: new Date().toISOString(),
    };
  }

  const { parse } = data;

  // Extract plain text from extract or HTML
  let body = '';
  if (data.extract) {
    body = data.extract;
  } else if (parse.text?.['*']) {
    // Strip HTML tags for plain text
    body = parse.text['*'].replace(/<[^>]+>/g, '').trim();
  }

  // Extract category names
  const categories = (parse.categories ?? []).map((c) => c['*'].replace(/_/g, ' '));

  // Extract section headings
  const sections = (parse.sections ?? []).map((s) => s.line);

  return {
    title,
    body,
    metadata: {
      pageId: parse.pageid,
      categories,
      sections,
    },
    sourceRef: `wikipedia:${title}`,
    fetchedAt: new Date().toISOString(),
  };
}
