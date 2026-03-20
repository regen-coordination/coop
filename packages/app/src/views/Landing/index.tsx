import { type SetupInsightsInput, emptySetupInsightsInput, toSetupInsights } from '@coop/shared';
import { useEffect, useMemo, useRef, useState } from 'react';

type TranscriptKey = 'capital' | 'impact' | 'governance' | 'knowledge';
type TranscriptMap = Record<TranscriptKey, string>;
type SetupFieldKey = keyof SetupInsightsInput;
type LensStatus = 'empty' | 'drafting' | 'ready';

type SpeechRecognitionAlternativeLike = {
  transcript?: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorLike = {
  error?: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onstart: (() => void) | null;
  abort?: () => void;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

type JourneyChicken = {
  id: string;
  label: string;
};

type RitualCard = {
  id: TranscriptKey;
  eyebrow: string;
  title: string;
  detail: string;
  transcriptPrompt: string;
  currentKey: SetupFieldKey;
  painKey: SetupFieldKey;
  improveKey: SetupFieldKey;
  currentPlaceholder: string;
  painPlaceholder: string;
  improvePlaceholder: string;
};

type LensProgress = {
  captureReady: boolean;
  distillReady: boolean;
  status: LensStatus;
  filledCount: number;
};

const journeyChickens: JourneyChicken[] = [
  { id: 'tabs', label: 'Tabs' },
  { id: 'notes', label: 'Notes' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'signals', label: 'Signals' },
];

const ritualCards: RitualCard[] = [
  {
    id: 'capital',
    eyebrow: 'Lens 1',
    title: 'Money & resources',
    detail:
      'Name how this group notices funding, opportunities, and practical support before they disappear.',
    transcriptPrompt:
      'Capture the part of the conversation about opportunities, resources, and what the group needs to notice faster.',
    currentKey: 'capitalCurrent',
    painKey: 'capitalPain',
    improveKey: 'capitalImprove',
    currentPlaceholder:
      'Funding context lives across inboxes, tabs, and whoever happened to save the link.',
    painPlaceholder: 'Good leads disappear before the flock can review them together.',
    improvePlaceholder: 'Keep promising opportunities visible in one shared review loop.',
  },
  {
    id: 'impact',
    eyebrow: 'Lens 2',
    title: 'Impact & progress',
    detail:
      'Gather how evidence, field signals, and proof of progress currently surface across the community.',
    transcriptPrompt:
      'Capture the discussion about evidence, proof, milestones, and what usually arrives too late.',
    currentKey: 'impactCurrent',
    painKey: 'impactPain',
    improveKey: 'impactImprove',
    currentPlaceholder: 'Progress updates show up in calls, chats, and stray notes after the fact.',
    painPlaceholder: 'Useful proof gets buried before anyone can connect it to the right moment.',
    improvePlaceholder:
      'Keep evidence close to the work so progress is easier to revisit and share.',
  },
  {
    id: 'governance',
    eyebrow: 'Lens 3',
    title: 'Decisions & teamwork',
    detail:
      'Make visible where decisions, commitments, and follow-through get lost once the meeting ends.',
    transcriptPrompt:
      'Capture the discussion about meetings, commitments, and where follow-through slips today.',
    currentKey: 'governanceCurrent',
    painKey: 'governancePain',
    improveKey: 'governanceImprove',
    currentPlaceholder: 'Decisions mostly live in meetings, memory, and whoever took notes.',
    painPlaceholder:
      'Follow-up slips when nobody can quickly see what was noticed, promised, or still open.',
    improvePlaceholder:
      'Give the flock one clear review loop for decisions, commitments, and next steps.',
  },
  {
    id: 'knowledge',
    eyebrow: 'Lens 4',
    title: 'Knowledge & tools',
    detail:
      'Describe where tabs, references, notes, and shared memory currently live across people and devices.',
    transcriptPrompt:
      'Capture the discussion about tabs, tools, files, and where useful references run loose today.',
    currentKey: 'knowledgeCurrent',
    painKey: 'knowledgePain',
    improveKey: 'knowledgeImprove',
    currentPlaceholder: 'Useful links and notes are spread across browsers, devices, and people.',
    painPlaceholder: 'People repeat the same research because the best finds do not stay visible.',
    improvePlaceholder: 'Catch loose knowledge early and keep the strongest finds easy to revisit.',
  },
];

const storyFlightPaths: Record<
  JourneyChicken['id'],
  Array<{ x: string; y: string; rotate: number; scale?: number }>
> = {
  tabs: [
    { x: '2vw', y: '-2vh', rotate: -12, scale: 1.03 },
    { x: '15vw', y: '-16vh', rotate: 6, scale: 0.99 },
    { x: '23vw', y: '-22vh', rotate: -4, scale: 0.94 },
  ],
  notes: [
    { x: '8vw', y: '6vh', rotate: 10, scale: 1.01 },
    { x: '16vw', y: '18vh', rotate: 3, scale: 0.97 },
    { x: '24vw', y: '16vh', rotate: -4, scale: 0.92 },
  ],
  ideas: [
    { x: '-6vw', y: '8vh', rotate: -8, scale: 1.02 },
    { x: '-14vw', y: '14vh', rotate: 8, scale: 0.98 },
    { x: '-22vw', y: '13vh', rotate: 2, scale: 0.92 },
  ],
  signals: [
    { x: '-2vw', y: '-7vh', rotate: 9, scale: 1.01 },
    { x: '-15vw', y: '-18vh', rotate: -5, scale: 0.97 },
    { x: '-23vw', y: '-23vh', rotate: 3, scale: 0.92 },
  ],
};

const arrivalFlightPaths: Record<
  JourneyChicken['id'],
  Array<{ x: string; y: string; rotate: number; scale?: number; opacity?: number }>
> = {
  tabs: [
    { x: '10vw', y: '-10vh', rotate: -8, scale: 0.96, opacity: 1 },
    { x: '23vw', y: '-18vh', rotate: -3, scale: 0.78, opacity: 0.8 },
    { x: '29vw', y: '-22vh', rotate: 0, scale: 0.42, opacity: 0 },
  ],
  notes: [
    { x: '12vw', y: '4vh', rotate: 8, scale: 0.94, opacity: 1 },
    { x: '24vw', y: '-2vh', rotate: 2, scale: 0.74, opacity: 0.8 },
    { x: '28vw', y: '-6vh', rotate: -2, scale: 0.4, opacity: 0 },
  ],
  ideas: [
    { x: '-12vw', y: '4vh', rotate: -8, scale: 0.94, opacity: 1 },
    { x: '-24vw', y: '-2vh', rotate: -2, scale: 0.74, opacity: 0.8 },
    { x: '-28vw', y: '-6vh', rotate: 2, scale: 0.4, opacity: 0 },
  ],
  signals: [
    { x: '-10vw', y: '-10vh', rotate: 8, scale: 0.96, opacity: 1 },
    { x: '-23vw', y: '-18vh', rotate: 3, scale: 0.78, opacity: 0.8 },
    { x: '-29vw', y: '-22vh', rotate: 0, scale: 0.42, opacity: 0 },
  ],
};

export const emptyLandingTranscripts: TranscriptMap = {
  capital: '',
  impact: '',
  governance: '',
  knowledge: '',
};

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function compact<T>(values: Array<T | null | undefined>) {
  return values.filter((value): value is T => value != null);
}

function resolveSpeechRecognitionConstructor(target: Window & typeof globalThis) {
  const speechWindow = target as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function resolveSpeechError(error?: string) {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone or speech permissions were denied. Type notes manually for this lens.';
    case 'audio-capture':
      return 'No microphone is available here. You can still type notes into the ritual.';
    case 'no-speech':
      return 'No speech was detected. Try again or type notes manually.';
    default:
      return 'Live transcript stopped unexpectedly. Your typed notes are still safe.';
  }
}

function findCard(cardId: TranscriptKey) {
  return ritualCards.find((card) => card.id === cardId) ?? ritualCards[0];
}

function getLensProgress(
  card: RitualCard,
  setupInput: SetupInsightsInput,
  transcripts: TranscriptMap,
): LensProgress {
  const transcript = cleanText(transcripts[card.id]);
  const current = cleanText(setupInput[card.currentKey]);
  const pain = cleanText(setupInput[card.painKey]);
  const improve = cleanText(setupInput[card.improveKey]);
  const filledCount = [transcript, current, pain, improve].filter(Boolean).length;
  const captureReady = Boolean(transcript || current || pain || improve);
  const distillReady = [current, pain, improve].filter(Boolean).length >= 2;
  const status: LensStatus =
    current && pain && improve ? 'ready' : filledCount > 0 ? 'drafting' : 'empty';

  return {
    captureReady,
    distillReady,
    status,
    filledCount,
  };
}

function statusLabel(status: LensStatus) {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'drafting':
      return 'Drafting';
    default:
      return 'Not started';
  }
}

export function buildLandingSetupPacket(
  setupInput: SetupInsightsInput,
  transcripts: TranscriptMap,
) {
  const setupInsights = toSetupInsights(setupInput);

  return {
    coopName: cleanText(setupInput.coopName) || 'This coop',
    purpose: cleanText(setupInput.purpose) || 'Keep useful context from getting loose.',
    summary: setupInsights.summary,
    setupInsights,
    transcripts: {
      moneyAndResources: cleanText(transcripts.capital),
      impactAndProgress: cleanText(transcripts.impact),
      decisionsAndTeamwork: cleanText(transcripts.governance),
      knowledgeAndTools: cleanText(transcripts.knowledge),
    },
  };
}

function ChickenSprite({ label, showLabel = true }: { label: string; showLabel?: boolean }) {
  return (
    <>
      <svg
        aria-hidden="true"
        className="scene-chicken-svg"
        viewBox="0 0 150 118"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          className="chicken-tail"
          d="M34 61c-10-8-14-19-11-31 16 0 30 6 38 18-6 8-15 12-27 13Z"
        />
        <path
          className="chicken-body"
          d="M42 31c15-10 38-13 61-6 27 9 42 31 36 52-5 19-25 31-48 31-18 0-35-6-46-18-16-16-18-41-3-59Z"
        />
        <path
          className="chicken-wing"
          d="M78 53c17 1 30 11 31 24 0 9-8 17-19 20-15-2-25-10-26-21 0-11 6-19 14-23Z"
        />
        <path
          className="chicken-comb"
          d="M80 22c4-9 9-14 16-14 5 0 9 3 12 8 5-5 11-6 17-1 5 5 6 12 1 21H82c-6-3-7-8-2-14Z"
        />
        <circle className="chicken-eye" cx="104" cy="49" r="3.3" />
        <path className="chicken-beak" d="M117 54l22 6-22 8-4-7 4-7Z" />
        <path className="chicken-leg" d="M66 100v15" />
        <path className="chicken-leg" d="M90 103v15" />
        <path className="chicken-foot" d="M60 116h12" />
        <path className="chicken-foot" d="M84 118h12" />
      </svg>
      {showLabel ? <span className="scene-chicken-label">{label}</span> : null}
    </>
  );
}

function CoopIllustration() {
  return (
    <svg
      aria-hidden="true"
      className="scene-coop-svg"
      viewBox="0 0 320 278"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path className="coop-roof" d="M67 94L160 26l93 68-16 18H83z" />
      <rect className="coop-body" x="56" y="94" width="208" height="154" rx="30" />
      <rect className="coop-window" x="88" y="124" width="54" height="54" rx="14" />
      <rect className="coop-window" x="178" y="124" width="54" height="54" rx="14" />
      <rect className="coop-door" x="134" y="170" width="52" height="78" rx="16" />
      <path className="coop-slat" d="M104 104v132" />
      <path className="coop-slat" d="M160 104v132" />
      <path className="coop-slat" d="M216 104v132" />
      <path className="coop-trim" d="M56 152h208" />
    </svg>
  );
}

export function App({ appHref = '/pair' }: { appHref?: string }) {
  const landingRootRef = useRef<HTMLDivElement | null>(null);
  const storyJourneyRef = useRef<HTMLElement | null>(null);
  const arrivalJourneyRef = useRef<HTMLElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recognitionHadErrorRef = useRef(false);

  const storySunRef = useRef<HTMLDivElement | null>(null);
  const storyGlowLeftRef = useRef<HTMLDivElement | null>(null);
  const storyGlowRightRef = useRef<HTMLDivElement | null>(null);
  const storyCloudARef = useRef<HTMLDivElement | null>(null);
  const storyCloudBRef = useRef<HTMLDivElement | null>(null);
  const storyHillBackRef = useRef<HTMLDivElement | null>(null);
  const storyHillMidRef = useRef<HTMLDivElement | null>(null);
  const storyHillFrontRef = useRef<HTMLDivElement | null>(null);
  const storyPathRef = useRef<HTMLDivElement | null>(null);
  const storyCoopRef = useRef<HTMLDivElement | null>(null);

  const arrivalGlowLeftRef = useRef<HTMLDivElement | null>(null);
  const arrivalGlowRightRef = useRef<HTMLDivElement | null>(null);
  const arrivalCloudRef = useRef<HTMLDivElement | null>(null);
  const arrivalHillBackRef = useRef<HTMLDivElement | null>(null);
  const arrivalHillMidRef = useRef<HTMLDivElement | null>(null);
  const arrivalHillFrontRef = useRef<HTMLDivElement | null>(null);
  const arrivalPathRef = useRef<HTMLDivElement | null>(null);
  const arrivalCoopRef = useRef<HTMLDivElement | null>(null);
  const arrivalInsideFlockRef = useRef<HTMLDivElement | null>(null);

  const storyChickenRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const arrivalChickenRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [setupInput, setSetupInput] = useState<SetupInsightsInput>(emptySetupInsightsInput);
  const [transcripts, setTranscripts] = useState<TranscriptMap>(emptyLandingTranscripts);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [activeLensIndex, setActiveLensIndex] = useState(0);
  const [ritualView, setRitualView] = useState<'cards' | 'summary'>('cards');
  const [recordingLens, setRecordingLens] = useState<TranscriptKey | null>(null);
  const [transcriptStatus, setTranscriptStatus] = useState(
    'Run this on a shared call, use live transcript if available, or type directly into the ritual lens.',
  );
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const speechRecognition =
    typeof window === 'undefined' ? null : resolveSpeechRecognitionConstructor(window);
  const activeLens = ritualCards[activeLensIndex];
  const setupPacket = buildLandingSetupPacket(setupInput, transcripts);
  const setupPacketText = JSON.stringify(setupPacket, null, 2);

  const lensProgress = useMemo(
    () => ritualCards.map((card) => getLensProgress(card, setupInput, transcripts)),
    [setupInput, transcripts],
  );
  const activeLensProgress = lensProgress[activeLensIndex];
  const completedLensCount = lensProgress.filter((progress) => progress.status === 'ready').length;
  const allLensesReady = completedLensCount === ritualCards.length;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);

    return () => {
      mediaQuery.removeEventListener('change', updatePreference);
    };
  }, []);

  useEffect(() => {
    const isTestEnvironment =
      typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);

    if (typeof window === 'undefined' || prefersReducedMotion || isTestEnvironment) {
      return undefined;
    }

    let cancelled = false;
    let revertAnimations = () => undefined;

    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([gsapModule, scrollTriggerModule]) => {
        if (cancelled) {
          return;
        }

        const { gsap } = gsapModule;
        const { ScrollTrigger } = scrollTriggerModule;
        const scope = landingRootRef.current;

        if (!scope || !storyJourneyRef.current || !arrivalJourneyRef.current) {
          return;
        }

        gsap.registerPlugin(ScrollTrigger);

        const context = gsap.context(() => {
          const storyChickens = compact(
            journeyChickens.map((chicken) => storyChickenRefs.current[chicken.id]),
          );
          const arrivalChickens = compact(
            journeyChickens.map((chicken) => arrivalChickenRefs.current[chicken.id]),
          );

          const storyCoopParts = {
            roof: storyCoopRef.current?.querySelector('.coop-roof') ?? null,
            body: storyCoopRef.current?.querySelector('.coop-body') ?? null,
            frames: Array.from(
              storyCoopRef.current?.querySelectorAll(
                '.coop-window, .coop-door, .coop-slat, .coop-trim',
              ) ?? [],
            ),
          };

          const arrivalCoopParts = {
            roof: arrivalCoopRef.current?.querySelector('.coop-roof') ?? null,
            body: arrivalCoopRef.current?.querySelector('.coop-body') ?? null,
            frames: Array.from(
              arrivalCoopRef.current?.querySelectorAll(
                '.coop-window, .coop-door, .coop-slat, .coop-trim',
              ) ?? [],
            ),
          };

          gsap.set(storyChickens, { transformOrigin: '50% 50%' });
          gsap.set(arrivalChickens, { transformOrigin: '50% 50%', opacity: 0.94 });
          gsap.set(compact([storyCoopParts.roof, storyCoopParts.body]), {
            transformOrigin: '50% 100%',
          });
          gsap.set(compact([arrivalCoopParts.roof, arrivalCoopParts.body]), {
            transformOrigin: '50% 100%',
          });
          gsap.set(storyCoopParts.frames, { transformOrigin: '50% 50%' });
          gsap.set(arrivalCoopParts.frames, { transformOrigin: '50% 50%' });

          const storyTimeline = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: storyJourneyRef.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 1.1,
            },
          });

          storyTimeline
            .fromTo(
              storyGlowLeftRef.current,
              { x: '-8vw', y: '-2vh', scale: 0.92 },
              { x: '10vw', y: '8vh', scale: 1.18 },
              0,
            )
            .fromTo(
              storyGlowRightRef.current,
              { x: '6vw', y: '-4vh', scale: 0.96 },
              { x: '-12vw', y: '5vh', scale: 1.12 },
              0,
            )
            .fromTo(
              storySunRef.current,
              { x: '-2vw', y: '0vh', scale: 1 },
              { x: '12vw', y: '5vh', scale: 1.08 },
              0,
            )
            .fromTo(storyCloudARef.current, { x: '-4vw', y: 0 }, { x: '10vw', y: '6vh' }, 0)
            .fromTo(storyCloudBRef.current, { x: '2vw', y: 0 }, { x: '-8vw', y: '4vh' }, 0)
            .fromTo(
              storyHillBackRef.current,
              { x: '-2vw', y: '2vh', scaleX: 1.02 },
              { x: '6vw', y: '-3vh', scaleX: 1.08 },
              0,
            )
            .fromTo(
              storyHillMidRef.current,
              { x: '1vw', y: 0, scaleX: 1 },
              { x: '-7vw', y: '-4vh', scaleX: 1.08 },
              0,
            )
            .fromTo(
              storyHillFrontRef.current,
              { x: '-1vw', y: 0, scaleX: 1 },
              { x: '9vw', y: '-5vh', scaleX: 1.09 },
              0,
            )
            .fromTo(
              storyPathRef.current,
              { scaleX: 0.82, scaleY: 0.94, rotate: -10, opacity: 0.3 },
              { scaleX: 1.12, scaleY: 1.08, rotate: -4, opacity: 0.78 },
              0.12,
            )
            .fromTo(
              storyCoopParts.body,
              { y: 80, scale: 0.72, autoAlpha: 0.18 },
              { y: 0, scale: 1, autoAlpha: 0.98 },
              0.22,
            )
            .fromTo(
              storyCoopParts.roof,
              { y: -70, scaleX: 0.84, autoAlpha: 0 },
              { y: 0, scaleX: 1, autoAlpha: 1 },
              0.34,
            )
            .fromTo(
              storyCoopParts.frames,
              { y: 18, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, stagger: 0.04 },
              0.44,
            );

          for (const chicken of journeyChickens) {
            const node = storyChickenRefs.current[chicken.id];
            const path = storyFlightPaths[chicken.id];

            if (!node || !path) {
              continue;
            }

            storyTimeline.to(
              node,
              {
                keyframes: path.map((frame) => ({
                  x: frame.x,
                  y: frame.y,
                  rotation: frame.rotate,
                  scale: frame.scale ?? 1,
                })),
              },
              0,
            );
          }

          storyTimeline.to(
            '.journey-scene-story .scene-chicken-label',
            { autoAlpha: 0.72, y: -4, stagger: 0.04 },
            0.44,
          );

          const arrivalTimeline = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: arrivalJourneyRef.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 1.15,
            },
          });

          arrivalTimeline
            .fromTo(
              arrivalGlowLeftRef.current,
              { x: '-10vw', y: '3vh', scale: 0.9 },
              { x: '6vw', y: '-4vh', scale: 1.04 },
              0,
            )
            .fromTo(
              arrivalGlowRightRef.current,
              { x: '12vw', y: '4vh', scale: 0.92 },
              { x: '-6vw', y: '-5vh', scale: 1.06 },
              0,
            )
            .fromTo(arrivalCloudRef.current, { x: '-4vw', y: 0 }, { x: '8vw', y: '5vh' }, 0)
            .fromTo(arrivalHillBackRef.current, { x: '3vw', y: '2vh' }, { x: '-5vw', y: '-3vh' }, 0)
            .fromTo(arrivalHillMidRef.current, { x: '-2vw', y: 0 }, { x: '6vw', y: '-4vh' }, 0)
            .fromTo(arrivalHillFrontRef.current, { x: '2vw', y: 0 }, { x: '-4vw', y: '-5vh' }, 0)
            .fromTo(
              arrivalPathRef.current,
              { scaleX: 0.88, rotate: 8, opacity: 0.2 },
              { scaleX: 1.06, rotate: 0, opacity: 0.68 },
              0.08,
            )
            .fromTo(
              arrivalCoopParts.body,
              { y: 110, scale: 0.74, autoAlpha: 0.22 },
              { y: 0, scale: 1, autoAlpha: 1 },
              0.12,
            )
            .fromTo(
              arrivalCoopParts.roof,
              { y: -86, scaleX: 0.78, autoAlpha: 0 },
              { y: 0, scaleX: 1, autoAlpha: 1 },
              0.22,
            )
            .fromTo(
              arrivalCoopParts.frames,
              { y: 18, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, stagger: 0.04 },
              0.3,
            )
            .fromTo(
              arrivalInsideFlockRef.current,
              { autoAlpha: 0, scale: 0.85 },
              { autoAlpha: 1, scale: 1 },
              0.62,
            );

          for (const chicken of journeyChickens) {
            const node = arrivalChickenRefs.current[chicken.id];
            const path = arrivalFlightPaths[chicken.id];

            if (!node || !path) {
              continue;
            }

            arrivalTimeline.to(
              node,
              {
                keyframes: path.map((frame) => ({
                  x: frame.x,
                  y: frame.y,
                  rotation: frame.rotate,
                  scale: frame.scale ?? 1,
                  opacity: frame.opacity ?? 1,
                })),
              },
              0.06,
            );
          }
        }, scope);

        revertAnimations = () => {
          context.revert();
        };
      },
    );

    return () => {
      cancelled = true;
      revertAnimations();
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;

      if (!recognition) {
        return;
      }

      if (recognition.abort) {
        recognition.abort();
        return;
      }

      recognition.stop();
    };
  }, []);

  function setStoryChickenRef(id: string) {
    return (node: HTMLDivElement | null) => {
      storyChickenRefs.current[id] = node;
    };
  }

  function setArrivalChickenRef(id: string) {
    return (node: HTMLDivElement | null) => {
      arrivalChickenRefs.current[id] = node;
    };
  }

  function updateField(key: SetupFieldKey, value: string) {
    setSetupInput((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateTranscript(key: TranscriptKey, value: string) {
    setTranscripts((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function stopRecording() {
    if (!recognitionRef.current || !recordingLens) {
      return;
    }

    setTranscriptStatus(`Saving the ${findCard(recordingLens).title.toLowerCase()} transcript...`);
    recognitionRef.current.stop();
  }

  function startRecording(cardId: TranscriptKey) {
    if (!speechRecognition) {
      setTranscriptStatus(
        'This browser does not expose live transcript here yet. Type notes directly into the ritual card.',
      );
      return;
    }

    if (recognitionRef.current) {
      if (recognitionRef.current.abort) {
        recognitionRef.current.abort();
      } else {
        recognitionRef.current.stop();
      }
      recognitionRef.current = null;
      setRecordingLens(null);
    }

    recognitionHadErrorRef.current = false;

    const recognition = new speechRecognition();
    const baseTranscript = cleanText(transcripts[cardId]);

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setRecordingLens(cardId);
      setTranscriptStatus(`${findCard(cardId).title} is listening on this device.`);
    };

    recognition.onresult = (event) => {
      const nextSegments: string[] = [];

      for (const result of Array.from(event.results)) {
        const transcript = result[0]?.transcript?.trim();

        if (transcript) {
          nextSegments.push(transcript);
        }
      }

      updateTranscript(cardId, [baseTranscript, nextSegments.join(' ')].filter(Boolean).join(' '));
    };

    recognition.onerror = (event) => {
      recognitionHadErrorRef.current = true;
      setRecordingLens(null);
      recognitionRef.current = null;
      setTranscriptStatus(resolveSpeechError(event.error));
    };

    recognition.onend = () => {
      setRecordingLens((current) => (current === cardId ? null : current));
      recognitionRef.current = null;

      if (recognitionHadErrorRef.current) {
        return;
      }

      setTranscriptStatus(`${findCard(cardId).title} transcript is ready to edit.`);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function jumpToLens(nextIndex: number) {
    if (recordingLens) {
      stopRecording();
    }

    setRitualView('cards');
    setActiveLensIndex(Math.max(0, Math.min(nextIndex, ritualCards.length - 1)));
  }

  async function copySetupNotes() {
    if (!navigator.clipboard?.writeText) {
      setCopyState('failed');
      return;
    }

    try {
      await navigator.clipboard.writeText(setupPacketText);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('failed');
      window.setTimeout(() => setCopyState('idle'), 1800);
    }
  }

  return (
    <div className="page-shell landing-shell" ref={landingRootRef}>
      <div className="backdrop landing-backdrop" />

      <header className="topbar landing-topbar">
        <a aria-label="Coop landing page" href="#meadow">
          <img className="wordmark" src="/branding/coop-wordmark-flat.png" alt="Coop" />
        </a>
        <nav aria-label="Landing navigation" className="topnav">
          <a href="#meadow">The Meadow</a>
          <a href="#migration">What Is Coop</a>
          <a href="#ritual">The Ritual</a>
          <a href="#coop">Why Coop</a>
          <a href="#resources">Resources</a>
        </nav>
      </header>

      <main className="landing-main">
        <section className="journey-section story-journey" id="meadow" ref={storyJourneyRef}>
          <div
            aria-hidden="true"
            className={
              prefersReducedMotion
                ? 'journey-scene journey-scene-story is-static'
                : 'journey-scene journey-scene-story'
            }
          >
            <div className="journey-scene-inner">
              <div className="scene-glow scene-glow-left" ref={storyGlowLeftRef} />
              <div className="scene-glow scene-glow-right" ref={storyGlowRightRef} />
              <div className="scene-sun" ref={storySunRef} />
              <div className="scene-cloud scene-cloud-a" ref={storyCloudARef} />
              <div className="scene-cloud scene-cloud-b" ref={storyCloudBRef} />
              <div className="scene-hill scene-hill-back" ref={storyHillBackRef} />
              <div className="scene-hill scene-hill-mid" ref={storyHillMidRef} />
              <div className="scene-hill scene-hill-front" ref={storyHillFrontRef} />
              <div className="scene-path" ref={storyPathRef} />

              <div className="scene-coop story-scene-coop" ref={storyCoopRef}>
                <CoopIllustration />
              </div>

              {journeyChickens.map((chicken) => (
                <div
                  className={`scene-chicken scene-chicken-${chicken.id}`}
                  key={chicken.id}
                  ref={setStoryChickenRef(chicken.id)}
                >
                  <ChickenSprite label={chicken.label} />
                </div>
              ))}
            </div>
          </div>

          <div className="journey-panels">
            <article className="journey-panel">
              <div className="story-card nest-card">
                <p className="eyebrow">The Meadow</p>
                <h1>Gather your flock before the good stuff runs loose.</h1>
                <p className="lede">
                  Start with the real problem: tabs, notes, ideas, and signals rarely arrive in one
                  place, and communities miss important moments in the handoff between noticing and
                  remembering.
                </p>
                <p className="quiet-note">
                  The chickens stay scattered here on purpose. They stand in for the fragments that
                  usually live across browsers, devices, chats, and people.
                </p>
                <div className="cta-row">
                  <a className="button button-primary" href="#ritual">
                    Start the ritual
                  </a>
                  <a className="button button-secondary" href="#migration">
                    See why Coop matters
                  </a>
                </div>
              </div>
            </article>

            <article className="journey-panel journey-panel-right" id="migration">
              <div className="story-card nest-card">
                <p className="eyebrow">The Migration</p>
                <h2>Coop gives scattered context one path into shared memory.</h2>
                <p className="lede">
                  This is the product story: Coop notices signal early, helps the group review it
                  together, and only keeps what deserves a shared home. The flock moves, the meadow
                  shifts, and the coop starts assembling while that story lands.
                </p>
                <div className="story-points">
                  <div className="story-point">
                    <strong>Notice what is forming</strong>
                    <p>
                      Loose tabs, voice notes, photos, files, and links stop living as isolated
                      finds.
                    </p>
                  </div>
                  <div className="story-point">
                    <strong>Review before publish</strong>
                    <p>
                      The Roost gives the group one place to decide what is signal and what can stay
                      private.
                    </p>
                  </div>
                  <div className="story-point">
                    <strong>Keep only what matters</strong>
                    <p>
                      Shared memory grows from intention, not from cloud exhaust or background
                      noise.
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="section ritual-section" id="ritual">
          <div className="section-heading">
            <p className="eyebrow">The Ritual</p>
            <h2>Pause the migration and define how this coop actually works.</h2>
            <p className="lede ritual-section-copy">
              This is where the page stops being a story and becomes a facilitator tool. The
              chickens step out of the way, the interface gets quieter, and the group does the work
              of shaping its coop together.
            </p>
          </div>

          <div className="ritual-shell">
            <aside className="ritual-context nest-card">
              <h3>Facilitator cockpit</h3>
              <p>
                One person screen-shares, the group talks, and each lens captures what is true now,
                what keeps slipping away, and what the coop should improve. Live transcript stays
                local to this browser session when it is available.
              </p>

              <div className="ritual-meter">
                <div className="ritual-meter-header">
                  <strong>{completedLensCount} of 4 lenses ready</strong>
                  <span>{allLensesReady ? 'Ready to synthesize' : 'Still drafting'}</span>
                </div>
                <div aria-hidden="true" className="ritual-meter-bar">
                  <span style={{ width: `${(completedLensCount / ritualCards.length) * 100}%` }} />
                </div>
              </div>

              <div className="ritual-intro-grid">
                <label className="ritual-field">
                  <span>Coop name</span>
                  <input
                    onChange={(event) => updateField('coopName', event.target.value)}
                    placeholder="The Roost"
                    type="text"
                    value={setupInput.coopName}
                  />
                </label>

                <label className="ritual-field">
                  <span>Why this coop exists</span>
                  <textarea
                    onChange={(event) => updateField('purpose', event.target.value)}
                    placeholder="Turn scattered knowledge into shared coordination for the group."
                    value={setupInput.purpose}
                  />
                </label>
              </div>

              <div aria-label="Ritual lens navigation" className="ritual-chip-grid">
                {ritualCards.map((card, index) => (
                  <button
                    className={index === activeLensIndex ? 'ritual-chip is-active' : 'ritual-chip'}
                    key={card.id}
                    onClick={() => jumpToLens(index)}
                    type="button"
                  >
                    <span>{card.eyebrow}</span>
                    <strong>{card.title}</strong>
                    <small className="ritual-chip-meta">
                      {lensProgress[index]?.filledCount ?? 0} / 4 captured ·{' '}
                      {statusLabel(lensProgress[index]?.status ?? 'empty')}
                    </small>
                  </button>
                ))}
              </div>

              <p className="quiet-note ritual-note">
                {speechRecognition
                  ? 'Live transcript is available here if the browser and microphone allow it.'
                  : 'Manual notes are the reliable default here because this browser does not expose live transcript.'}
              </p>
            </aside>

            <div className="ritual-workbench">
              {ritualView === 'cards' ? (
                <article className="ritual-card nest-card">
                  <div className="ritual-card-header">
                    <div>
                      <p className="eyebrow">{activeLens.eyebrow}</p>
                      <h3>{activeLens.title}</h3>
                    </div>
                    <div className="ritual-card-progress">{activeLensIndex + 1} / 4</div>
                  </div>

                  <p className="lede ritual-card-copy">{activeLens.detail}</p>

                  <div className="ritual-loop-strip" aria-label="Ritual loop">
                    <div
                      className={
                        activeLensProgress.captureReady
                          ? 'ritual-loop-chip is-complete'
                          : 'ritual-loop-chip'
                      }
                    >
                      1. Capture
                    </div>
                    <div
                      className={
                        activeLensProgress.distillReady
                          ? 'ritual-loop-chip is-complete'
                          : 'ritual-loop-chip'
                      }
                    >
                      2. Distill
                    </div>
                    <div
                      className={
                        activeLensProgress.status === 'ready'
                          ? 'ritual-loop-chip is-complete'
                          : 'ritual-loop-chip'
                      }
                    >
                      3. Shape
                    </div>
                  </div>

                  <div className="ritual-transcript-shell">
                    <div className="ritual-transcript-header">
                      <div>
                        <strong>Lens transcript</strong>
                        <p>{activeLens.transcriptPrompt}</p>
                      </div>
                      <button
                        className={
                          recordingLens === activeLens.id
                            ? 'button button-primary ritual-record-button is-recording'
                            : 'button button-secondary ritual-record-button'
                        }
                        onClick={() =>
                          recordingLens === activeLens.id
                            ? stopRecording()
                            : startRecording(activeLens.id)
                        }
                        type="button"
                      >
                        {recordingLens === activeLens.id ? 'Stop transcript' : 'Record lens notes'}
                      </button>
                    </div>
                    <output aria-live="polite" className="ritual-transcript-status">
                      {transcriptStatus}
                    </output>
                    <label className="ritual-field">
                      <span>Transcript notes for this lens</span>
                      <textarea
                        onChange={(event) => updateTranscript(activeLens.id, event.target.value)}
                        placeholder="Live transcript lands here, or type the lens notes directly."
                        value={transcripts[activeLens.id]}
                      />
                    </label>
                  </div>

                  <div className="ritual-prompt-grid">
                    <label className="ritual-field">
                      <span>How do you do this now?</span>
                      <textarea
                        onChange={(event) => updateField(activeLens.currentKey, event.target.value)}
                        placeholder={activeLens.currentPlaceholder}
                        value={setupInput[activeLens.currentKey]}
                      />
                    </label>
                    <label className="ritual-field">
                      <span>What is not working well?</span>
                      <textarea
                        onChange={(event) => updateField(activeLens.painKey, event.target.value)}
                        placeholder={activeLens.painPlaceholder}
                        value={setupInput[activeLens.painKey]}
                      />
                    </label>
                    <label className="ritual-field">
                      <span>What should improve?</span>
                      <textarea
                        onChange={(event) => updateField(activeLens.improveKey, event.target.value)}
                        placeholder={activeLens.improvePlaceholder}
                        value={setupInput[activeLens.improveKey]}
                      />
                    </label>
                  </div>

                  <div className="ritual-card-actions">
                    <button
                      className="button button-secondary"
                      disabled={activeLensIndex === 0}
                      onClick={() => jumpToLens(activeLensIndex - 1)}
                      type="button"
                    >
                      Previous lens
                    </button>
                    <button
                      className="button button-secondary"
                      onClick={() => setRitualView('summary')}
                      type="button"
                    >
                      View setup notes
                    </button>
                    <button
                      className="button button-primary"
                      onClick={() =>
                        activeLensIndex === ritualCards.length - 1
                          ? setRitualView('summary')
                          : jumpToLens(activeLensIndex + 1)
                      }
                      type="button"
                    >
                      {activeLensIndex === ritualCards.length - 1 ? 'Open synthesis' : 'Next lens'}
                    </button>
                  </div>
                </article>
              ) : (
                <article className="ritual-summary nest-card">
                  <div className="ritual-card-header">
                    <div>
                      <p className="eyebrow">Synthesis</p>
                      <h3>Turn the ritual into setup notes.</h3>
                    </div>
                    <div className="ritual-card-progress">
                      {completedLensCount} / {ritualCards.length} ready
                    </div>
                  </div>

                  <p className="lede ritual-card-copy">
                    Review the summary, keep the transcript notes if they help, and hand these notes
                    to the trusted member who will install the extension and create the coop.
                  </p>

                  <p className="quiet-note ritual-summary-note">
                    {allLensesReady
                      ? 'All four lenses have enough structure to become a strong setup packet.'
                      : 'You can still copy a draft now, but the setup gets sharper when every lens has all three answers.'}
                  </p>

                  <label className="ritual-field">
                    <span>Overall setup summary</span>
                    <textarea
                      onChange={(event) => updateField('summary', event.target.value)}
                      placeholder="Summarize how this group wants Coop to turn loose context into shared work."
                      value={setupInput.summary}
                    />
                  </label>

                  <div className="ritual-summary-grid">
                    <div className="ritual-summary-card">
                      <strong>Cross-cutting pain points</strong>
                      <ul className="ritual-bullet-list">
                        {setupPacket.setupInsights.crossCuttingPainPoints.length > 0 ? (
                          setupPacket.setupInsights.crossCuttingPainPoints.map((item) => (
                            <li key={item}>{item}</li>
                          ))
                        ) : (
                          <li>
                            Coop will infer defaults if the group leaves some tensions unstated.
                          </li>
                        )}
                      </ul>
                    </div>
                    <div className="ritual-summary-card">
                      <strong>Cross-cutting opportunities</strong>
                      <ul className="ritual-bullet-list">
                        {setupPacket.setupInsights.crossCuttingOpportunities.length > 0 ? (
                          setupPacket.setupInsights.crossCuttingOpportunities.map((item) => (
                            <li key={item}>{item}</li>
                          ))
                        ) : (
                          <li>
                            Any missing opportunity fields will fall back to readable starter
                            guidance.
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div className="prompt-shell ritual-packet-shell">
                    <div className="prompt-toolbar">
                      <div>
                        <strong>Setup packet</strong>
                        <div>Compatible with Coop&apos;s four-lens setup insights shape.</div>
                      </div>
                      <button
                        className={
                          copyState === 'copied'
                            ? 'button button-primary button-small'
                            : 'button button-secondary button-small'
                        }
                        onClick={() => void copySetupNotes()}
                        type="button"
                      >
                        {copyState === 'copied'
                          ? 'Copied setup notes'
                          : copyState === 'failed'
                            ? 'Clipboard unavailable'
                            : 'Copy setup notes'}
                      </button>
                    </div>
                    <pre>{setupPacketText}</pre>
                  </div>

                  <div className="ritual-card-actions">
                    <button
                      className="button button-secondary"
                      onClick={() => setRitualView('cards')}
                      type="button"
                    >
                      Back to cards
                    </button>
                    <a className="button button-secondary" href={appHref}>
                      Open receiver app
                    </a>
                    <a className="button button-primary" href="#resources">
                      Continue to install/create
                    </a>
                  </div>
                </article>
              )}
            </div>
          </div>
        </section>

        <section className="journey-section arrival-journey" id="coop" ref={arrivalJourneyRef}>
          <div
            aria-hidden="true"
            className={
              prefersReducedMotion
                ? 'journey-scene journey-scene-arrival is-static'
                : 'journey-scene journey-scene-arrival'
            }
          >
            <div className="journey-scene-inner">
              <div className="scene-glow scene-glow-left" ref={arrivalGlowLeftRef} />
              <div className="scene-glow scene-glow-right" ref={arrivalGlowRightRef} />
              <div className="scene-cloud scene-cloud-center" ref={arrivalCloudRef} />
              <div className="scene-hill scene-hill-back" ref={arrivalHillBackRef} />
              <div className="scene-hill scene-hill-mid" ref={arrivalHillMidRef} />
              <div className="scene-hill scene-hill-front" ref={arrivalHillFrontRef} />
              <div className="scene-path scene-path-arrival" ref={arrivalPathRef} />

              <div className="scene-coop arrival-scene-coop" ref={arrivalCoopRef}>
                <CoopIllustration />
                <div className="scene-inside-flock" ref={arrivalInsideFlockRef}>
                  <span className="inside-bird inside-bird-a" />
                  <span className="inside-bird inside-bird-b" />
                  <span className="inside-bird inside-bird-c" />
                  <span className="inside-bird inside-bird-d" />
                </div>
              </div>

              {journeyChickens.map((chicken) => (
                <div
                  className={`scene-chicken scene-chicken-${chicken.id} scene-chicken-arrival`}
                  key={chicken.id}
                  ref={setArrivalChickenRef(chicken.id)}
                >
                  <ChickenSprite label={chicken.label} showLabel={false} />
                </div>
              ))}
            </div>
          </div>

          <div className="journey-panels">
            <article className="journey-panel">
              <div className="story-card nest-card">
                <p className="eyebrow">The Coop</p>
                <h2>The flock finally has somewhere to stay.</h2>
                <p className="lede">
                  Coop exists for groups that keep losing continuity between calls, research, shared
                  links, and proof of progress. It gives that context a review ritual, a roost for
                  drafts, and a shared memory only for what deserves to stick.
                </p>
                <div className="badge-row">
                  <span className="badge">Browser-first</span>
                  <span className="badge">Local-first</span>
                  <span className="badge">Review in the Roost</span>
                  <span className="badge">Share with intent</span>
                </div>
              </div>
            </article>

            <article className="journey-panel journey-panel-right">
              <div className="story-card nest-card">
                <p className="eyebrow">What Happens Next</p>
                <h2>Run the ritual, copy the notes, then launch the coop with a trusted member.</h2>
                <div className="story-points">
                  <div className="story-point">
                    <strong>1. Keep the packet</strong>
                    <p>
                      The setup notes become the clean handoff from group conversation to coop
                      creation.
                    </p>
                  </div>
                  <div className="story-point">
                    <strong>2. Install the extension</strong>
                    <p>
                      Pin Coop, open the sidepanel, and use the ritual output to create the coop.
                    </p>
                  </div>
                  <div className="story-point">
                    <strong>3. Start the real loop</strong>
                    <p>
                      Capture locally, review together, and only publish what the group wants to
                      keep.
                    </p>
                  </div>
                </div>
                <div className="cta-row">
                  <a className="button button-primary" href="#resources">
                    See next steps
                  </a>
                  <a
                    className="button button-secondary"
                    href="https://github.com/regen-coordination/coop"
                  >
                    GitHub
                  </a>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer className="footer section landing-footer" id="resources">
        <div className="footer-card landing-footer-card">
          <div>
            <p className="eyebrow">Resources</p>
            <h2>Install the tools, keep the notes, and launch the coop when the group is ready.</h2>
          </div>

          <div className="resource-grid">
            <article className="resource-card">
              <h3>Privacy first</h3>
              <p>
                Passive capture, transcript notes, and draft shaping stay local until the group
                explicitly decides what belongs in the coop.
              </p>
            </article>
            <article className="resource-card">
              <h3>Install extension</h3>
              <p>
                Load the extension, pin Coop, and use the ritual notes to create the coop with a
                trusted member.
              </p>
              <a href="/spec/extension-install-and-distribution.md">Install guide</a>
            </article>
            <article className="resource-card">
              <h3>Open receiver</h3>
              <p>
                Use the receiver app on a phone to capture voice notes, photos, files, and links.
              </p>
              <a href={appHref}>Receiver app</a>
            </article>
            <article className="resource-card">
              <h3>Read the docs</h3>
              <p>
                Architecture, design direction, and product docs stay available once the landing
                story ends.
              </p>
              <a href="/spec/coop-os-architecture-vnext.md">Architecture docs</a>
            </article>
          </div>

          <div className="footer-links">
            <a href="/spec/coop-design-direction.md">Design direction</a>
            <a href="/spec/demo-and-deploy-runbook.md">Demo runbook</a>
            <a href="https://github.com/regen-coordination/coop">GitHub</a>
            <a href="#meadow">Back to top</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
