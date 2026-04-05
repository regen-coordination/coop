import type { CreateCoopInput } from '@coop/shared';

export const mockCoopSeeds: CreateCoopInput[] = [
  {
    coopName: 'Courtside Signal',
    purpose:
      'Track high-signal stories, culture, and community momentum around the Lakers, Raiders, Chelsea FC, and FC Barcelona.',
    spaceType: 'community',
    creatorDisplayName: 'Ari',
    captureMode: 'manual',
    seedContribution:
      'I bring a cross-sport fan and research lens spanning basketball, football, and global club culture.',
    setupInsights: {
      summary:
        'This coop follows a mix of matchday context, front-office moves, academy pipelines, supporter culture, and community programs across four major clubs with very different rhythms but overlapping fan energy.',
      crossCuttingPainPoints: [
        'Important updates are scattered across league sites, club media, podcasts, and fan channels.',
        'It is hard to separate durable signals from rumor cycles and matchday noise.',
        'Cross-club comparison gets lost because context lives in separate tabs and feeds.',
        'Community and cultural stories get drowned out by transfer chatter and hot takes.',
      ],
      crossCuttingOpportunities: [
        'Build a weekly signal board that compares momentum across the Lakers, Raiders, Chelsea, and Barca.',
        'Capture youth development, supporter culture, and club identity alongside results.',
        'Turn scattered links into clean draft artifacts before group discussion.',
        'Keep an archive of notable eras, rebuilds, and turning points for each club.',
      ],
      lenses: [
        {
          lens: 'capital-formation',
          currentState:
            'Attention spikes around major games, transfer windows, and roster moves, but sponsorship, ownership, and brand strategy context is fragmented.',
          painPoints:
            'The coop loses track of which stories have lasting strategic value versus short-term hype.',
          improvements:
            'Group revenue, ownership, roster-building, and competitive-window signals into one review lane.',
        },
        {
          lens: 'impact-reporting',
          currentState:
            'Community work, foundations, and local impact stories appear intermittently across team channels.',
          painPoints:
            'The social footprint of each club is under-documented compared with pure performance coverage.',
          improvements:
            'Track club-community initiatives, supporter campaigns, and civic impact in a dedicated artifact stream.',
        },
        {
          lens: 'governance-coordination',
          currentState:
            'Group discussion jumps between sports without a shared method for deciding what matters now.',
          painPoints:
            'People over-index on the loudest news cycle instead of the most meaningful long-term signal.',
          improvements:
            'Use review rituals to rank stories by cultural relevance, strategic importance, and staying power.',
        },
        {
          lens: 'knowledge-garden-resources',
          currentState:
            'Key references on club identity, academy systems, supporter culture, and historical arcs are spread across bookmarks and chats.',
          painPoints: 'Research gets repeated and context disappears between match weeks.',
          improvements:
            'Build a durable knowledge garden for each club with timelines, references, and reusable context.',
        },
      ],
    },
  },
  {
    coopName: 'Coop Stack Lab',
    purpose:
      'Explore how a coop can build on web AI, blockchain coordination, privacy-preserving identity, and local-first collaboration.',
    spaceType: 'community',
    creatorDisplayName: 'Ari',
    captureMode: 'manual',
    seedContribution:
      'I bring product, protocol, and cooperative design context for building trustworthy coordination tools.',
    setupInsights: {
      summary:
        'This coop focuses on the technical stack for a next-generation cooperative workspace: local-first AI, verifiable onchain coordination, privacy-preserving member systems, and practical tools that stay usable by normal people.',
      crossCuttingPainPoints: [
        'AI products often centralize user data and weaken trust.',
        'Blockchain coordination remains too complex for everyday cooperative workflows.',
        'Privacy systems are powerful in theory but still hard to integrate into product UX.',
        'Teams struggle to connect local-first software patterns with real governance and shared ownership.',
      ],
      crossCuttingOpportunities: [
        'Prototype a stack that combines browser AI, passkeys, private identity, and onchain execution.',
        'Turn abstract protocol research into implementation-ready product decisions.',
        'Map which coordination actions truly need chain settlement and which should stay local-first.',
        'Develop a shared language for trust, agency, and privacy in cooperative software.',
      ],
      lenses: [
        {
          lens: 'capital-formation',
          currentState:
            'Funding and product narratives around AI, crypto, and privacy are often disconnected from cooperative ownership models.',
          painPoints:
            'Builders lack a coherent frame for what should be financed, owned, and governed together.',
          improvements:
            'Maintain a focused pipeline of technical and economic experiments that support sustainable coop infrastructure.',
        },
        {
          lens: 'impact-reporting',
          currentState:
            'Progress is usually described with launch posts and demos rather than evidence of safer, more trustworthy user outcomes.',
          painPoints:
            'It is difficult to show whether a technical architecture actually improves agency, resilience, or privacy.',
          improvements:
            'Capture implementation notes and product evidence that connect system design to real member benefits.',
        },
        {
          lens: 'governance-coordination',
          currentState:
            'Protocol, product, and legal conversations happen in parallel with weak connective tissue.',
          painPoints:
            'Decision-making slows down because important tradeoffs are discussed in different vocabularies.',
          improvements:
            'Use shared review artifacts to align product decisions, governance implications, and technical constraints.',
        },
        {
          lens: 'knowledge-garden-resources',
          currentState:
            'Research on Web AI, privacy tech, account abstraction, verifiable coordination, and local-first sync lives across notes and repos.',
          painPoints:
            'Important design patterns vanish before they become reusable building blocks.',
          improvements:
            'Curate a knowledge garden of patterns, architecture choices, and implementation references for future coop tooling.',
        },
      ],
    },
  },
  {
    coopName: 'Regen Signal Garden',
    purpose:
      'Surface actionable signals and shared memory for regenerative communities connected to Bloom Network, GreenPill, and ReFi DAO.',
    spaceType: 'community',
    creatorDisplayName: 'Ari',
    captureMode: 'manual',
    seedContribution:
      'I bring a regenerative coordination lens focused on community health, public goods, and real-world deployment.',
    setupInsights: {
      summary:
        'This coop tracks the regenerative ecosystem across community-building, public goods funding, and regenerative finance, with a bias toward practical opportunities emerging around Bloom Network, GreenPill, and ReFi DAO.',
      crossCuttingPainPoints: [
        'Regen opportunities are distributed across events, newsletters, governance threads, and social feeds.',
        'Communities struggle to keep shared memory about pilots, grants, local chapters, and successful rituals.',
        'There is a persistent gap between inspiring narratives and implementation-ready next steps.',
        'Signals about who is building what are often lost across adjacent ecosystems.',
      ],
      crossCuttingOpportunities: [
        'Create one place to review regenerative leads, programs, experiments, and collaboration opportunities.',
        'Track how public goods, local resilience, and regenerative finance overlap in practice.',
        'Preserve reusable community knowledge from convenings, pilots, and member experiments.',
        'Help members move from inspiration to coordinated action with clearer artifacts and follow-ups.',
      ],
      lenses: [
        {
          lens: 'capital-formation',
          currentState:
            'Grant rounds, capital flows, and community-backed funding pathways exist, but they are hard to follow across networks.',
          painPoints:
            'People miss timely opportunities to support or participate in regenerative projects.',
          improvements:
            'Maintain a structured feed of funding, stewardship, and collaboration opportunities across the regen ecosystem.',
        },
        {
          lens: 'impact-reporting',
          currentState:
            'Stories about local regeneration, public goods, and coordination wins are compelling but inconsistent in format.',
          painPoints:
            'Evidence of what worked is difficult to compare or carry across communities.',
          improvements:
            'Standardize impact artifacts so pilots, gatherings, and outcomes are easy to revisit and share.',
        },
        {
          lens: 'governance-coordination',
          currentState:
            'Communities coordinate through calls, chats, and local circles, with limited shared operating memory.',
          painPoints:
            'Decisions and commitments decay when they are not translated into durable cooperative records.',
          improvements:
            'Use a shared review practice to turn meetings, events, and proposals into clear follow-through.',
        },
        {
          lens: 'knowledge-garden-resources',
          currentState:
            'Resources on regenerative practice, public goods, chapter activity, and ReFi experiments are abundant but dispersed.',
          painPoints: 'New members face a steep discovery curve and repeat old research.',
          improvements:
            'Build a living knowledge garden that makes Bloom, GreenPill, and ReFi DAO context easy to navigate.',
        },
      ],
    },
  },
];

export const mockCoopSeedsByName = Object.fromEntries(
  mockCoopSeeds.map((seed) => [seed.coopName, seed]),
) as Record<string, CreateCoopInput>;
