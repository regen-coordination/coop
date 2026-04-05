import {
  type ArtifactCategory,
  type CoopSharedState,
  type CoopSpaceType,
  type ReadablePageExtract,
  type RitualLens,
  type SetupInsights,
  artifactCategorySchema,
} from '../../contracts/schema';
import { clamp, nowIso, unique } from '../../utils';
import { createCoop } from './flows';

const lensKeywords: Record<RitualLens, string[]> = {
  'capital-formation': ['fund', 'grant', 'capital', 'funding', 'invest', 'budget'],
  'impact-reporting': ['impact', 'metric', 'report', 'outcome', 'evidence'],
  'governance-coordination': ['governance', 'coordination', 'meeting', 'proposal', 'vote'],
  'knowledge-garden-resources': ['resource', 'guide', 'knowledge', 'library', 'toolkit'],
};

const categoryKeywords: Record<ArtifactCategory, string[]> = {
  'setup-insight': ['setup', 'ritual'],
  'coop-soul': ['purpose', 'soul'],
  ritual: ['ritual', 'cadence', 'review'],
  'seed-contribution': ['seed', 'intro'],
  resource: ['guide', 'resource', 'toolkit', 'reference'],
  thought: ['thought', 'reflection', 'idea'],
  insight: ['insight', 'summary', 'synthesis'],
  'funding-lead': ['grant', 'funding', 'capital', 'treasury', 'sponsor'],
  evidence: ['evidence', 'report', 'metric', 'data', 'finding'],
  opportunity: ['opportunity', 'partner', 'collaboration'],
  'next-step': ['next step', 'action', 'todo', 'follow up'],
};

/** Base English function words that add noise to keyword matching.
 *  Domain-specific acronyms (NBA, NFL, MLB, API, etc.) are intentionally NOT here. */
const BASE_ENGLISH_STOPWORDS = new Set([
  // 3-letter
  'the',
  'and',
  'for',
  'are',
  'but',
  'not',
  'all',
  'can',
  'has',
  'its',
  'was',
  'who',
  'how',
  'now',
  'new',
  'old',
  'use',
  'get',
  'got',
  'did',
  'may',
  'any',
  'way',
  'say',
  'too',
  'out',
  'our',
  'own',
  'few',
  'let',
  'see',
  'try',
  'yet',
  'set',
  'run',
  'put',
  'big',
  'end',
  'add',
  'top',
  'per',
  'via',
  'due',
  'one',
  'two',
  'six',
  'ten',
  'day',
  'age',
  'act',
  'bit',
  'lot',
  'key',
  // 4+ letter common function words
  'about',
  'across',
  'after',
  'also',
  'before',
  'from',
  'into',
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
  'using',
  'what',
  'when',
  'with',
  'your',
]);

/** Terms used for lens/category classification that must NOT be treated as stopwords,
 *  even though they appear in template text. Filtering these would degrade scoring
 *  for coops whose purpose overlaps with these domain terms. */
const CLASSIFICATION_KEYWORDS = new Set([
  ...Object.values(lensKeywords).flat(),
  ...Object.values(categoryKeywords)
    .flat()
    .flatMap((term) => term.split(/\s+/)),
]);

function extractAllCoopStateText(state: CoopSharedState): string {
  return [
    state.soul.purposeStatement,
    state.soul.usefulSignalDefinition,
    state.soul.whyThisCoopExists,
    ...state.soul.artifactFocus,
    ...state.rituals.flatMap((r) => [
      r.weeklyReviewCadence,
      ...r.namedMoments,
      r.facilitatorExpectation,
      r.defaultCapturePosture,
    ]),
    ...state.artifacts.flatMap((a) => [
      a.title,
      a.summary,
      ...a.tags,
      a.whyItMatters ?? '',
      a.suggestedNextStep ?? '',
    ]),
  ]
    .filter(Boolean)
    .join(' ');
}

let _cachedStopwords: Set<string> | null = null;

/** Derives stopwords by generating coop state for each space type and collecting
 *  tokens that appear in >= 3 of 5 variants, then unions with base English stopwords.
 *  Classification keywords (used by lens/category matching) are protected from filtering. */
export function buildTemplateCorpusStopwords(): Set<string> {
  if (_cachedStopwords) return _cachedStopwords;

  const dummySetupInsights = {
    summary: 'Template summary for stopword derivation.',
    crossCuttingPainPoints: ['Template pain point.'],
    crossCuttingOpportunities: ['Template opportunity.'],
    lenses: [
      {
        lens: 'capital-formation',
        currentState: 'Template.',
        painPoints: 'Template.',
        improvements: 'Template.',
      },
      {
        lens: 'impact-reporting',
        currentState: 'Template.',
        painPoints: 'Template.',
        improvements: 'Template.',
      },
      {
        lens: 'governance-coordination',
        currentState: 'Template.',
        painPoints: 'Template.',
        improvements: 'Template.',
      },
      {
        lens: 'knowledge-garden-resources',
        currentState: 'Template.',
        painPoints: 'Template.',
        improvements: 'Template.',
      },
    ],
  };

  const spaceTypes: CoopSpaceType[] = ['community', 'project', 'friends', 'family', 'personal'];
  const tokenCounts = new Map<string, number>();

  for (const spaceType of spaceTypes) {
    const { state } = createCoop({
      coopName: 'Template Coop',
      purpose: 'Template purpose for stopword derivation.',
      spaceType,
      creatorDisplayName: 'Template',
      captureMode: 'manual',
      seedContribution: 'Template seed.',
      setupInsights: dummySetupInsights,
    });

    const allText = extractAllCoopStateText(state);
    const tokens = new Set(
      allText
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2),
    );

    for (const token of tokens) {
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    }
  }

  const result = new Set<string>();
  for (const [token, count] of tokenCounts) {
    if (count >= 3 && !CLASSIFICATION_KEYWORDS.has(token)) {
      result.add(token);
    }
  }
  for (const word of BASE_ENGLISH_STOPWORDS) {
    result.add(word);
  }

  _cachedStopwords = result;
  return result;
}

/** Diagnose the keyword bank for a coop, breaking down tokens by source layer. */
export function diagnoseKeywordBank(coop: CoopSharedState): {
  tokens: string[];
  tokenCount: number;
  sources: {
    purpose: string[];
    soul: string[];
    setup: string[];
    artifacts: string[];
    memory: string[];
  };
  boilerplateFiltered: string[];
  boilerplateRatio: number;
} {
  const stopwords = buildTemplateCorpusStopwords();

  function rawTokens(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2);
  }

  function partition(raw: string[]): { kept: string[]; filtered: string[] } {
    const kept: string[] = [];
    const filtered: string[] = [];
    for (const token of raw) {
      if (stopwords.has(token)) {
        filtered.push(token);
      } else {
        kept.push(token);
      }
    }
    return { kept, filtered };
  }

  const purposeRaw = rawTokens([coop.profile.name, coop.profile.purpose].join(' '));
  const soulRaw = rawTokens(
    [
      coop.soul.purposeStatement,
      coop.soul.usefulSignalDefinition,
      coop.soul.whyThisCoopExists,
      ...coop.soul.artifactFocus,
    ].join(' '),
  );
  const setupRaw = rawTokens(
    coop.setupInsights.lenses
      .flatMap((lens) => [lens.currentState, lens.painPoints, lens.improvements])
      .join(' '),
  );
  const artifactRaw = rawTokens(
    coop.artifacts.flatMap((a) => [a.title, a.summary, ...a.tags]).join(' '),
  );
  const memoryRaw = rawTokens(
    [
      ...coop.memoryProfile.topDomains.map((item) => item.domain),
      ...coop.memoryProfile.topTags.map((item) => item.tag),
    ].join(' '),
  );

  const purposePartitioned = partition(purposeRaw);
  const soulPartitioned = partition(soulRaw);
  const setupPartitioned = partition(setupRaw);
  const artifactPartitioned = partition(artifactRaw);
  const memoryPartitioned = partition(memoryRaw);

  const allKept = [
    ...purposePartitioned.kept,
    ...soulPartitioned.kept,
    ...setupPartitioned.kept,
    ...artifactPartitioned.kept,
    ...memoryPartitioned.kept,
  ];
  const allFiltered = [
    ...purposePartitioned.filtered,
    ...soulPartitioned.filtered,
    ...setupPartitioned.filtered,
    ...artifactPartitioned.filtered,
    ...memoryPartitioned.filtered,
  ];
  const totalRaw = allKept.length + allFiltered.length;
  const tokens = unique(allKept);

  return {
    tokens,
    tokenCount: tokens.length,
    sources: {
      purpose: unique(purposePartitioned.kept),
      soul: unique(soulPartitioned.kept),
      setup: unique(setupPartitioned.kept),
      artifacts: unique(artifactPartitioned.kept),
      memory: unique(memoryPartitioned.kept),
    },
    boilerplateFiltered: unique(allFiltered),
    boilerplateRatio: totalRaw > 0 ? allFiltered.length / totalRaw : 0,
  };
}

export function keywordBank(coop: CoopSharedState) {
  const stopwords = buildTemplateCorpusStopwords();
  // Prioritize user-supplied purpose and name — these are the strongest signals
  // about what this coop actually cares about.
  const purposeTerms = [coop.profile.name, coop.profile.purpose];
  const soulTerms = [
    coop.soul.purposeStatement,
    coop.soul.usefulSignalDefinition,
    coop.soul.whyThisCoopExists,
    ...coop.soul.artifactFocus,
  ];
  const setupTerms = coop.setupInsights.lenses.flatMap((lens) => [
    lens.currentState,
    lens.painPoints,
    lens.improvements,
  ]);
  const artifactTerms = coop.artifacts.flatMap((artifact) => [
    artifact.title,
    artifact.summary,
    ...artifact.tags,
  ]);
  const memoryTerms = [
    ...coop.memoryProfile.topDomains.map((item) => item.domain),
    ...coop.memoryProfile.topTags.map((item) => item.tag),
  ];

  return unique(
    [...purposeTerms, ...soulTerms, ...setupTerms, ...artifactTerms, ...memoryTerms]
      .join(' ')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !stopwords.has(word)),
  );
}

/** Split text into a set of lowercase alphanumeric tokens for word-boundary matching. */
export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 0),
  );
}

export function scoreAgainstCoop(extract: ReadablePageExtract, coop: CoopSharedState) {
  const bank = keywordBank(coop);
  if (bank.length === 0) return 0.08;

  const titleTokens = tokenize(extract.cleanedTitle ?? '');
  const bodyTokens = tokenize(
    [
      extract.cleanedTitle,
      extract.metaDescription,
      ...extract.topHeadings,
      ...extract.leadParagraphs,
      ...extract.salientTextBlocks,
    ]
      .filter(Boolean)
      .join(' '),
  );

  const titleMatches = bank.filter((token) => titleTokens.has(token)).length;
  const bodyMatches = bank.filter((token) => bodyTokens.has(token)).length;
  const domainBoost =
    coop.memoryProfile.topDomains.find((entry) => entry.domain === extract.domain)?.acceptCount ??
    0;

  // Raw score: title matches are strong signals, body matches add breadth,
  // domain history gives continuity.
  const absoluteScore = titleMatches * 0.12 + bodyMatches * 0.04 + Math.min(domainBoost, 3) * 0.06;

  // Coverage bonus: when a meaningful fraction of the keyword bank matches,
  // the signal is stronger than individual match counts suggest — especially
  // for focused coops with sparse but intentional keyword banks (e.g. a
  // "sports" coop with 3-5 keywords where 2-3 body matches is high coverage).
  // Require at least 2 body matches to avoid single-word false positives.
  const matchRatio = bodyMatches / bank.length;
  const coverageBonus = bodyMatches >= 2 && matchRatio >= 0.15 ? matchRatio * 0.18 : 0;

  const raw = absoluteScore + coverageBonus;
  return clamp(raw, 0.08, 0.98);
}

export function classifyLenses(extract: ReadablePageExtract, insights: SetupInsights) {
  const haystack = [
    extract.cleanedTitle,
    extract.metaDescription,
    ...extract.topHeadings,
    ...extract.salientTextBlocks,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const directMatches = insights.lenses
    .map((lens) => lens.lens)
    .filter((lens) => lensKeywords[lens].some((keyword) => haystack.includes(keyword)));

  return directMatches.length > 0 ? unique(directMatches) : [insights.lenses[0].lens];
}

export function classifyCategory(extract: ReadablePageExtract): ArtifactCategory {
  const haystack = [
    extract.cleanedTitle,
    extract.metaDescription,
    ...extract.topHeadings,
    ...extract.salientTextBlocks,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const ordered = Object.entries(categoryKeywords)
    .map(([category, keywords]) => ({
      category: artifactCategorySchema.parse(category),
      score: keywords.filter((keyword) => haystack.includes(keyword)).length,
    }))
    .sort((left, right) => right.score - left.score);

  return ordered[0]?.score ? ordered[0].category : 'insight';
}

export function deriveTags(extract: ReadablePageExtract, coop: CoopSharedState) {
  const rawWords = [
    ...extract.topHeadings,
    ...extract.cleanedTitle.split(/[\s/]+/),
    ...extract.salientTextBlocks.slice(0, 2).join(' ').split(/\s+/),
  ]
    .map((word) => word.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    .filter((word) => word.length > 4);

  const memoryTags = coop.memoryProfile.topTags.map((item) => item.tag);
  return unique([...rawWords, ...memoryTags]).slice(0, 6);
}

export { lensKeywords, categoryKeywords };
