import type { ReadablePageExtract } from '../../contracts/schema';
import { compactWhitespace, unique } from '../../utils';

const DEDUPE_STOPWORDS = new Set([
  'about',
  'after',
  'also',
  'before',
  'brief',
  'for',
  'from',
  'into',
  'local',
  'more',
  'over',
  'that',
  'their',
  'them',
  'then',
  'they',
  'this',
  'those',
  'through',
  'update',
  'updates',
  'using',
  'with',
  'your',
]);

const DEDUPE_BOILERPLATE_TOKENS = new Set([
  'account',
  'article',
  'click',
  'cookie',
  'cookies',
  'follow',
  'login',
  'newsletter',
  'page',
  'print',
  'privacy',
  'read',
  'share',
  'sign',
  'subscribe',
  'terms',
]);

function tokenizeExtractDedupeText(value: string, minLength = 4) {
  return (
    compactWhitespace(value)
      .toLowerCase()
      .replace(/-/g, '')
      .replace(/https?:\/\/\S+/g, ' ')
      .match(/[a-z0-9]+/g)
      ?.filter(
        (token) =>
          token.length >= minLength &&
          !DEDUPE_STOPWORDS.has(token) &&
          !DEDUPE_BOILERPLATE_TOKENS.has(token),
      ) ?? []
  );
}

function extractDedupeSignal(extract: ReadablePageExtract) {
  const titleTokens = unique(tokenizeExtractDedupeText(extract.cleanedTitle, 3));
  const contentTokens = unique(
    tokenizeExtractDedupeText(
      [
        extract.metaDescription,
        ...extract.topHeadings,
        ...extract.leadParagraphs,
        ...extract.salientTextBlocks,
      ]
        .filter(Boolean)
        .join(' '),
      4,
    ),
  );

  return {
    titleTokens: new Set(titleTokens),
    contentTokens: new Set(contentTokens),
  };
}

function countSharedTokens(left: Set<string>, right: Set<string>) {
  let shared = 0;
  for (const token of left) {
    if (right.has(token)) {
      shared += 1;
    }
  }
  return shared;
}

function jaccardSimilarity(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  const shared = countSharedTokens(left, right);
  if (shared === 0) {
    return 0;
  }

  return shared / (left.size + right.size - shared);
}

export function arePageExtractsNearDuplicates(
  left: ReadablePageExtract,
  right: ReadablePageExtract,
) {
  if (left.id === right.id) {
    return true;
  }

  if (left.canonicalUrl === right.canonicalUrl || left.textHash === right.textHash) {
    return true;
  }

  if (left.domain !== right.domain) {
    return false;
  }

  const leftSignal = extractDedupeSignal(left);
  const rightSignal = extractDedupeSignal(right);

  if (leftSignal.contentTokens.size < 10 || rightSignal.contentTokens.size < 10) {
    return false;
  }

  const sharedTitle = countSharedTokens(leftSignal.titleTokens, rightSignal.titleTokens);
  const sharedContent = countSharedTokens(leftSignal.contentTokens, rightSignal.contentTokens);
  const contentSimilarity = jaccardSimilarity(leftSignal.contentTokens, rightSignal.contentTokens);
  const titleSimilarity = jaccardSimilarity(leftSignal.titleTokens, rightSignal.titleTokens);
  const titlesMatch =
    sharedTitle > 0 &&
    sharedTitle === leftSignal.titleTokens.size &&
    sharedTitle === rightSignal.titleTokens.size;

  if (titlesMatch && contentSimilarity >= 0.6 && sharedContent >= 10) {
    return true;
  }

  if (titleSimilarity >= 0.72 && contentSimilarity >= 0.68 && sharedContent >= 10) {
    return true;
  }

  return contentSimilarity >= 0.84 && sharedContent >= 14;
}
