import {
  type CoopFeedResponse,
  type CoopPillar,
  type CoopRecord,
  type JoinCoopResponse,
  MEMBRANE_EVENT_TYPE,
  MembraneClient,
  type RunSkillResponse,
  createMembraneEvent,
  saveArtifact,
  visualTokens,
} from "@coop/shared";
import { ReactFlowProvider } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { CanvasView } from "../canvas";

const { colors, spacing, typography, borderRadius, shadows, transitions, effects } = visualTokens;

// SpeechRecognition type declarations (Web Speech API)
declare global {
  interface SpeechRecognitionConstructor {
    new (): SpeechRecognition;
  }
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
  }
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
  }
}

type FeedItem = {
  id: string;
  type: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

type ProcessingState = {
  itemId: string;
  status: "pending" | "processing" | "completed" | "error";
  result?: RunSkillResponse;
  error?: string;
};

const ANCHOR_HTTP_URL = "http://localhost:8787";
const ANCHOR_WS_URL = "ws://localhost:8788";
const ACTIVE_COOP_STORAGE_KEY = "coop.active";

const PILLARS: CoopPillar[] = [
  "impact-reporting",
  "coordination",
  "governance",
  "capital-formation",
];

// Icon components
const MicIcon = ({ recording }: { recording?: boolean }) => (
  <svg
    aria-hidden="true"
    focusable="false"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
    {recording && <circle cx="12" cy="12" r="3" fill={colors.semantic.error} stroke="none" />}
  </svg>
);

const TabIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m3 7 10 10" />
    <rect x="7" y="3" width="14" height="14" rx="2" />
  </svg>
);

const PlusIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

const UploadIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);

const ProcessIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v18" />
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
  </svg>
);

const FeedIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
    <path d="M14 2v6h6" />
    <path d="M2 15h10" />
    <path d="M5 12v6" />
    <path d="M2 18h6" />
  </svg>
);

const CanvasIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 19 7-7 3 3-7 7-3-3z" />
    <path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="m2 2 7.5 7.5" />
    <path d="M22 22l-5.5-5.5" />
  </svg>
);

const SparkleIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

// Shared styles using design tokens
const styles: Record<string, React.CSSProperties> = {
  main: {
    fontFamily: typography.fontFamily.sans,
    background: colors.bg.primary,
    color: colors.text.primary,
    minHeight: "100vh",
    padding: spacing[4],
    display: "flex",
    flexDirection: "column",
    gap: spacing[6],
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
  },
  card: {
    background: colors.surface.card,
    backdropFilter: effects.glass.backdropFilter,
    border: effects.glass.border,
    borderRadius: borderRadius.lg,
    padding: spacing[5],
    boxShadow: shadows.glass,
    transition: transitions.hover,
  },
  cardHover: {
    background: colors.surface.elevated,
    border: `1px solid ${colors.border.light}`,
    boxShadow: shadows.glassHover,
  },
  glass: {
    background: effects.glass.background,
    backdropFilter: effects.glass.backdropFilter,
    border: effects.glass.border,
    borderRadius: borderRadius.md,
  },
  input: {
    background: colors.bg.secondary,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: borderRadius.md,
    padding: `${spacing[3]} ${spacing[4]}`,
    color: colors.text.primary,
    fontSize: typography.sizes.sm.size,
    fontFamily: typography.fontFamily.sans,
    outline: "none",
    transition: transitions.focus,
    minHeight: "44px",
    width: "100%",
    boxSizing: "border-box",
  },
  inputFocus: {
    border: `1px solid ${colors.border.focus}`,
    boxShadow: `0 0 0 2px ${colors.brand.glow}`,
  },
  button: {
    background: colors.brand[500],
    color: colors.text.inverse,
    border: "none",
    borderRadius: borderRadius.md,
    padding: `${spacing[3]} ${spacing[5]}`,
    fontSize: typography.sizes.sm.size,
    fontWeight: typography.weights.medium,
    fontFamily: typography.fontFamily.sans,
    cursor: "pointer",
    transition: transitions.hover,
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  buttonHover: {
    background: colors.brand[600],
    boxShadow: shadows.glow,
    transform: "translateY(-1px)",
  },
  buttonSecondary: {
    background: colors.bg.quaternary,
    color: colors.text.primary,
    border: `1px solid ${colors.border.light}`,
  },
  buttonSecondaryHover: {
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.medium}`,
  },
  buttonGhost: {
    background: "transparent",
    color: colors.text.secondary,
    border: `1px solid ${colors.border.subtle}`,
  },
  buttonGhostHover: {
    background: colors.surface.glassHover,
    color: colors.text.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    transform: "none",
    boxShadow: "none",
  },
  buttonDanger: {
    background: "rgba(248, 113, 113, 0.15)",
    color: colors.semantic.error,
    border: `1px solid ${colors.semantic.error}30`,
  },
  buttonDangerHover: {
    background: "rgba(248, 113, 113, 0.25)",
    boxShadow: "0 0 20px rgba(248, 113, 113, 0.3)",
  },
  tabNav: {
    display: "flex",
    gap: spacing[1],
    background: colors.bg.secondary,
    padding: spacing[1],
    borderRadius: borderRadius.lg,
  },
  tabButton: {
    flex: 1,
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.sizes.sm.size,
    fontWeight: typography.weights.medium,
    background: "transparent",
    color: colors.text.tertiary,
    border: "none",
    borderRadius: borderRadius.md,
    cursor: "pointer",
    transition: transitions.hover,
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  tabButtonActive: {
    background: colors.bg.tertiary,
    color: colors.brand[500],
    boxShadow: shadows.sm,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[2],
  },
  title: {
    fontSize: typography.sizes["2xl"].size,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.sizes["2xl"].letterSpacing,
    margin: 0,
    background: `linear-gradient(135deg, ${colors.text.primary} 0%, ${colors.brand[400]} 100%)`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  subtitle: {
    fontSize: typography.sizes.xs.size,
    color: colors.text.tertiary,
    margin: 0,
    letterSpacing: typography.sizes.xs.letterSpacing,
    textTransform: "uppercase" as const,
  },
  sectionTitle: {
    fontSize: typography.sizes.md.size,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    margin: `0 0 ${spacing[3]} 0`,
  },
  label: {
    fontSize: typography.sizes.xs.size,
    fontWeight: typography.weights.medium,
    color: colors.text.tertiary,
    textTransform: "uppercase" as const,
    letterSpacing: typography.sizes.xs.letterSpacing,
    marginBottom: spacing[2],
  },
  textSecondary: {
    fontSize: typography.sizes.sm.size,
    color: colors.text.secondary,
  },
  textTertiary: {
    fontSize: typography.sizes.xs.size,
    color: colors.text.tertiary,
  },
  captureButton: {
    flex: 1,
    background: colors.bg.quaternary,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.lg,
    padding: spacing[5],
    cursor: "pointer",
    transition: transitions.hover,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: spacing[3],
    minHeight: "80px",
  },
  captureButtonHover: {
    background: colors.surface.glassHover,
    border: `1px solid ${colors.brand[500]}50`,
    boxShadow: `0 0 20px ${colors.brand.glow}`,
  },
  captureButtonActive: {
    background: `${colors.brand.pulse}`,
    border: `1px solid ${colors.brand[500]}`,
    boxShadow: shadows.glow,
  },
  dropZone: {
    border: `1px dashed ${colors.border.light}`,
    borderRadius: borderRadius.lg,
    padding: spacing[7],
    textAlign: "center" as const,
    color: colors.text.tertiary,
    background: colors.bg.secondary,
    transition: transitions.hover,
    cursor: "copy",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: spacing[3],
  },
  dropZoneActive: {
    border: `2px solid ${colors.brand[500]}`,
    background: colors.brand.pulse,
    color: colors.brand[500],
  },
  feedItem: {
    background: colors.bg.secondary,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    marginBottom: spacing[3],
    transition: transitions.hover,
  },
  feedItemHover: {
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.light}`,
  },
  processingBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: spacing[2],
    padding: `${spacing[1]} ${spacing[3]}`,
    background: "rgba(96, 165, 250, 0.15)",
    color: colors.semantic.info,
    borderRadius: borderRadius.full,
    fontSize: typography.sizes.xs.size,
    fontWeight: typography.weights.medium,
  },
  completedBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: spacing[2],
    padding: `${spacing[1]} ${spacing[3]}`,
    background: "rgba(74, 222, 128, 0.15)",
    color: colors.semantic.success,
    borderRadius: borderRadius.full,
    fontSize: typography.sizes.xs.size,
    fontWeight: typography.weights.medium,
  },
  errorBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: spacing[2],
    padding: `${spacing[1]} ${spacing[3]}`,
    background: "rgba(248, 113, 113, 0.15)",
    color: colors.semantic.error,
    borderRadius: borderRadius.full,
    fontSize: typography.sizes.xs.size,
    fontWeight: typography.weights.medium,
  },
  skillResult: {
    background: "rgba(74, 222, 128, 0.08)",
    border: "1px solid rgba(74, 222, 128, 0.2)",
    borderRadius: borderRadius.md,
    padding: spacing[4],
    marginTop: spacing[3],
  },
  select: {
    background: colors.bg.secondary,
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: borderRadius.md,
    padding: `${spacing[3]} ${spacing[4]}`,
    color: colors.text.primary,
    fontSize: typography.sizes.sm.size,
    fontFamily: typography.fontFamily.sans,
    outline: "none",
    cursor: "pointer",
    minHeight: "44px",
    width: "100%",
  },
  canvasContainer: {
    height: "400px",
    border: `1px solid ${colors.border.subtle}`,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    background: colors.bg.secondary,
  },
  transcriptBox: {
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    fontSize: typography.sizes.sm.size,
    color: colors.text.secondary,
    lineHeight: typography.sizes.sm.lineHeight,
    marginTop: spacing[3],
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: spacing[2],
    padding: `${spacing[2]} 0`,
  },
  codeDisplay: {
    fontFamily: typography.fontFamily.mono,
    fontSize: typography.sizes.sm.size,
    color: colors.brand[400],
    background: colors.brand.pulse,
    padding: `${spacing[1]} ${spacing[3]}`,
    borderRadius: borderRadius.sm,
    letterSpacing: "0.05em",
  },
};

function App() {
  const [displayName, setDisplayName] = useState("Local User");
  const [coopName, setCoopName] = useState("My Coop");
  const [shareCode, setShareCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [activeCoop, setActiveCoop] = useState<CoopRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"feed" | "canvas">("feed");
  const [dictating, setDictating] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [processingStates, setProcessingStates] = useState<Record<string, ProcessingState>>({});
  const [selectedPillar, setSelectedPillar] = useState<CoopPillar>("impact-reporting");
  const [dragOver, setDragOver] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const membrane = useMemo(() => new MembraneClient(), []);
  const transcriptRef = useRef("");
  const activeCoopRef = useRef<CoopRecord | null>(null);

  const recognition = useMemo(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return null;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    return r as SpeechRecognition;
  }, []);

  const refreshFeed = useCallback(async (coopId = activeCoopRef.current?.id) => {
    if (!coopId) {
      setFeed([]);
      return;
    }
    try {
      const response = await fetch(`${ANCHOR_HTTP_URL}/api/coops/${coopId}/feed`);
      if (response.ok) {
        const data = (await response.json()) as CoopFeedResponse;
        setFeed(
          data.items.map((item) => ({
            id: item.id,
            type: item.type,
            createdAt: item.createdAt,
            payload:
              typeof item.content === "object" && item.content !== null
                ? (item.content as Record<string, unknown>)
                : { value: item.content },
          })),
        );
        return;
      }
    } catch {
      // Fall through to local IndexedDB
    }
    const response = await chrome.runtime.sendMessage({ type: "feed.get", coopId });
    if (response?.ok) {
      setFeed(response.items);
    }
  }, []);

  async function createCoop() {
    const response = await fetch(`${ANCHOR_HTTP_URL}/api/coops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: coopName, creatorName: displayName }),
    });
    if (!response.ok) return;
    const created = (await response.json()) as CoopRecord;
    setActiveCoop(created);
    setShareCode(created.shareCode);
    localStorage.setItem(ACTIVE_COOP_STORAGE_KEY, JSON.stringify(created));
    await refreshFeed(created.id);
  }

  async function joinCoop() {
    const response = await fetch(`${ANCHOR_HTTP_URL}/api/coops/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareCode: joinCode, displayName }),
    });
    if (!response.ok) return;
    const joined = (await response.json()) as JoinCoopResponse;
    setActiveCoop(joined.coop);
    setShareCode(joined.coop.shareCode);
    localStorage.setItem(ACTIVE_COOP_STORAGE_KEY, JSON.stringify(joined.coop));
    await refreshFeed(joined.coop.id);
  }

  async function addCurrentTab() {
    if (!activeCoop) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    let payload: Record<string, unknown>;
    try {
      const [result] = await chrome.tabs.sendMessage(tab.id, { type: "capture.active.tab" });
      if (result?.ok) {
        payload = result.payload;
      } else {
        throw new Error("Content script capture failed");
      }
    } catch {
      payload = {
        title: tab.title ?? "Untitled tab",
        url: tab.url ?? "",
        textSnippet: "",
        article: null,
      };
    }
    const itemId = crypto.randomUUID();
    await saveArtifact({
      id: itemId,
      type: "tab.captured",
      payload,
      createdAt: new Date().toISOString(),
    });
    await chrome.runtime.sendMessage({
      type: "tab.captured",
      coopId: activeCoop.id,
      payload,
    });
    membrane.publish(
      createMembraneEvent({
        coopId: activeCoop.id,
        type: MEMBRANE_EVENT_TYPE.TAB_CAPTURED,
        payload,
      }),
    );
    await refreshFeed();
  }

  function startVoice() {
    if (!recognition || !activeCoop) return;
    setDictating(true);
    setLiveTranscript("");
    transcriptRef.current = "";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      transcriptRef.current += final;
      setLiveTranscript(transcriptRef.current + interim);
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setDictating(false);
    };
    recognition.onend = async () => {
      const finalTranscript = transcriptRef.current.trim();
      if (finalTranscript && activeCoop) {
        const itemId = crypto.randomUUID();
        await saveArtifact({
          id: itemId,
          type: "voice.transcribed",
          payload: { transcript: finalTranscript },
          createdAt: new Date().toISOString(),
        });
        await chrome.runtime.sendMessage({
          type: "voice.transcribed",
          coopId: activeCoop.id,
          payload: { transcript: finalTranscript },
        });
        membrane.publish(
          createMembraneEvent({
            coopId: activeCoop.id,
            type: MEMBRANE_EVENT_TYPE.VOICE_TRANSCRIBED,
            payload: { transcript: finalTranscript },
          }),
        );
        await refreshFeed();
      }
      setDictating(false);
      setLiveTranscript("");
      transcriptRef.current = "";
    };
    recognition.start();
  }

  function stopVoice() {
    if (!recognition) return;
    recognition.stop();
    setDictating(false);
  }

  async function runSkillOnItem(item: FeedItem) {
    if (!activeCoop) return;
    const itemId = item.id;
    setProcessingStates((prev) => ({ ...prev, [itemId]: { itemId, status: "processing" } }));
    let text = "";
    if (item.payload.transcript) {
      text = String(item.payload.transcript);
    } else if (item.payload.textSnippet) {
      text = String(item.payload.textSnippet);
    } else if (item.payload.article && typeof item.payload.article === "object") {
      const article = item.payload.article as Record<string, unknown>;
      text = String(article.textContent || article.excerpt || "");
    } else if (item.payload.title) {
      text = String(item.payload.title);
    }
    if (!text.trim()) {
      setProcessingStates((prev) => ({
        ...prev,
        [itemId]: { itemId, status: "error", error: "No text content to process" },
      }));
      return;
    }
    try {
      const response = await fetch(`${ANCHOR_HTTP_URL}/api/skills/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coopId: activeCoop.id,
          pillar: selectedPillar,
          text,
          sourceType: item.type === "voice.transcribed" ? "voice" : "tab",
        }),
      });
      if (!response.ok) throw new Error(`Skill run failed: ${response.status}`);
      const result = (await response.json()) as RunSkillResponse;
      setProcessingStates((prev) => ({
        ...prev,
        [itemId]: { itemId, status: "completed", result },
      }));
    } catch (err) {
      setProcessingStates((prev) => ({
        ...prev,
        [itemId]: {
          itemId,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        },
      }));
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!activeCoop) return;
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const payload = {
            type: "image",
            name: file.name,
            size: file.size,
            dataUrl: event.target?.result,
          };
          await saveArtifact({
            id: crypto.randomUUID(),
            type: "file.dropped",
            payload,
            createdAt: new Date().toISOString(),
          });
          membrane.publish(
            createMembraneEvent({
              coopId: activeCoop.id,
              type: MEMBRANE_EVENT_TYPE.CONTENT_PROPOSED,
              payload,
            }),
          );
          await refreshFeed();
        };
        reader.readAsDataURL(file);
      } else if (
        file.type === "text/plain" ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".md")
      ) {
        const text = await file.text();
        const payload = {
          type: "text",
          name: file.name,
          size: file.size,
          content: text.slice(0, 10000),
        };
        await saveArtifact({
          id: crypto.randomUUID(),
          type: "file.dropped",
          payload,
          createdAt: new Date().toISOString(),
        });
        membrane.publish(
          createMembraneEvent({
            coopId: activeCoop.id,
            type: MEMBRANE_EVENT_TYPE.CONTENT_PROPOSED,
            payload,
          }),
        );
        await refreshFeed();
      }
    }
  }

  useEffect(() => {
    activeCoopRef.current = activeCoop;
  }, [activeCoop]);

  useEffect(() => {
    membrane.connect(ANCHOR_WS_URL);
    const saved = localStorage.getItem(ACTIVE_COOP_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as CoopRecord;
      setActiveCoop(parsed);
      setShareCode(parsed.shareCode);
      void refreshFeed(parsed.id);
    }
    const unsubscribe = membrane.subscribe((event) => {
      const coop = activeCoopRef.current;
      if (!coop || event.coopId !== coop.id) return;
      void refreshFeed(coop.id);
    });
    return () => {
      unsubscribe();
      membrane.disconnect();
    };
  }, [membrane, refreshFeed]);

  useEffect(() => {
    if (!activeCoop) return;
    membrane.publish(
      createMembraneEvent({
        coopId: activeCoop.id,
        type: MEMBRANE_EVENT_TYPE.JOIN,
        payload: { displayName },
      }),
    );
    void refreshFeed(activeCoop.id);
  }, [activeCoop, displayName, membrane, refreshFeed]);

  const getButtonStyle = (
    buttonId: string,
    variant: "primary" | "secondary" | "ghost" | "danger" = "primary",
    disabled = false,
  ) => {
    let baseStyle = { ...styles.button };
    if (variant === "secondary") baseStyle = { ...baseStyle, ...styles.buttonSecondary };
    if (variant === "ghost") baseStyle = { ...baseStyle, ...styles.buttonGhost };
    if (variant === "danger") baseStyle = { ...baseStyle, ...styles.buttonDanger };

    if (disabled) {
      return { ...baseStyle, ...styles.buttonDisabled };
    }

    if (hoveredButton === buttonId) {
      if (variant === "primary") baseStyle = { ...baseStyle, ...styles.buttonHover };
      if (variant === "secondary") baseStyle = { ...baseStyle, ...styles.buttonSecondaryHover };
      if (variant === "ghost") baseStyle = { ...baseStyle, ...styles.buttonGhostHover };
      if (variant === "danger") baseStyle = { ...baseStyle, ...styles.buttonDangerHover };
    }

    return baseStyle;
  };

  return (
    <main style={styles.main}>
      {/* Header */}
      <section>
        <div style={styles.header}>
          <h1 style={styles.title}>Coop</h1>
        </div>
        <p style={styles.subtitle}>Knowledge Commons</p>
      </section>

      {/* User & Coop Status Card */}
      <section style={styles.card}>
        <div style={{ display: "flex", flexDirection: "column", gap: spacing[4] }}>
          <div>
            <label htmlFor="displayName" style={styles.label}>
              Display Name
            </label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={styles.input}
              placeholder="Enter your name"
            />
          </div>

          {activeCoop ? (
            <div style={styles.glass}>
              <div style={{ padding: spacing[4] }}>
                <div style={{ ...styles.textSecondary, marginBottom: spacing[2] }}>
                  <span style={styles.label}>Active Coop</span>
                </div>
                <div
                  style={{
                    fontSize: typography.sizes.lg.size,
                    fontWeight: typography.weights.semibold,
                    marginBottom: spacing[2],
                  }}
                >
                  {activeCoop.name}
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.textTertiary}>Share Code:</span>
                  <span style={styles.codeDisplay}>{activeCoop.shareCode}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ ...styles.glass, padding: spacing[4], textAlign: "center" }}>
              <span style={styles.textTertiary}>No active coop selected</span>
            </div>
          )}
        </div>
      </section>

      {/* Create Coop Card */}
      {!activeCoop && (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>
            <span style={{ display: "flex", alignItems: "center", gap: spacing[2] }}>
              <PlusIcon />
              Create Coop
            </span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
            <input
              value={coopName}
              onChange={(e) => setCoopName(e.target.value)}
              style={styles.input}
              placeholder="Enter coop name"
            />
            <button
              type="button"
              onClick={createCoop}
              disabled={!coopName.trim() || !displayName.trim()}
              style={getButtonStyle("create", "primary", !coopName.trim() || !displayName.trim())}
              onMouseEnter={() => setHoveredButton("create")}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <PlusIcon />
              Create Coop
            </button>
          </div>
        </section>
      )}

      {/* Join Coop Card */}
      {!activeCoop && (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Join Coop</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
            <input
              placeholder="Enter sharing code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              style={styles.input}
            />
            <button
              type="button"
              onClick={joinCoop}
              disabled={!joinCode.trim() || !displayName.trim()}
              style={getButtonStyle("join", "secondary", !joinCode.trim() || !displayName.trim())}
              onMouseEnter={() => setHoveredButton("join")}
              onMouseLeave={() => setHoveredButton(null)}
            >
              Join Coop
            </button>
          </div>
        </section>
      )}

      {/* Capture Section */}
      {activeCoop && (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Capture</h2>
          <div style={{ display: "flex", gap: spacing[3], marginBottom: spacing[4] }}>
            <button
              type="button"
              onClick={addCurrentTab}
              disabled={!activeCoop}
              style={{
                ...styles.captureButton,
                ...(hoveredButton === "captureTab" ? styles.captureButtonHover : {}),
              }}
              onMouseEnter={() => setHoveredButton("captureTab")}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <TabIcon />
              <span
                style={{
                  fontSize: typography.sizes.sm.size,
                  fontWeight: typography.weights.medium,
                }}
              >
                Capture Tab
              </span>
            </button>
            <button
              type="button"
              onClick={dictating ? stopVoice : startVoice}
              disabled={!activeCoop || (!dictating && !recognition)}
              style={{
                ...styles.captureButton,
                ...(dictating ? styles.captureButtonActive : {}),
                ...(hoveredButton === "voice" && !dictating ? styles.captureButtonHover : {}),
              }}
              onMouseEnter={() => setHoveredButton("voice")}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <MicIcon recording={dictating} />
              <span
                style={{
                  fontSize: typography.sizes.sm.size,
                  fontWeight: typography.weights.medium,
                  color: dictating ? colors.semantic.error : undefined,
                }}
              >
                {dictating ? "Stop" : recognition ? "Voice" : "No Mic"}
              </span>
            </button>
          </div>

          {liveTranscript && (
            <div style={styles.transcriptBox}>
              <div style={{ ...styles.label, marginBottom: spacing[2] }}>Transcript</div>
              {liveTranscript}
            </div>
          )}

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              ...styles.dropZone,
              ...(dragOver ? styles.dropZoneActive : {}),
            }}
          >
            <UploadIcon />
            <span
              style={{ fontSize: typography.sizes.sm.size, fontWeight: typography.weights.medium }}
            >
              {dragOver ? "Drop files here!" : "Drag & drop files"}
            </span>
            <span style={styles.textTertiary}>Images, text, or markdown</span>
          </div>
        </section>
      )}

      {/* Skill Processing Section */}
      {activeCoop && (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>
            <span style={{ display: "flex", alignItems: "center", gap: spacing[2] }}>
              <SparkleIcon />
              Skill Processing
            </span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
            <div>
              <label htmlFor="selectedPillar" style={styles.label}>
                Select Pillar
              </label>
              <select
                id="selectedPillar"
                value={selectedPillar}
                onChange={(e) => setSelectedPillar(e.target.value as CoopPillar)}
                style={styles.select}
              >
                {PILLARS.map((p) => (
                  <option key={p} value={p} style={{ background: colors.bg.secondary }}>
                    {p.replace("-", " ")}
                  </option>
                ))}
              </select>
            </div>
            <p style={styles.textTertiary}>Click "Process" on any feed item to run AI analysis</p>
          </div>
        </section>
      )}

      {/* Tab Navigation */}
      {activeCoop && (
        <section>
          <div style={styles.tabNav}>
            <button
              type="button"
              onClick={() => setActiveTab("feed")}
              style={{
                ...styles.tabButton,
                ...(activeTab === "feed" ? styles.tabButtonActive : {}),
              }}
            >
              <FeedIcon />
              Feed
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("canvas")}
              style={{
                ...styles.tabButton,
                ...(activeTab === "canvas" ? styles.tabButtonActive : {}),
              }}
            >
              <CanvasIcon />
              Canvas
            </button>
          </div>
        </section>
      )}

      {/* Feed Tab Content */}
      {activeCoop && activeTab === "feed" && (
        <section style={styles.card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: spacing[4],
            }}
          >
            <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Activity Feed</h2>
            <span style={styles.textTertiary}>{feed.length} items</span>
          </div>
          <div style={{ maxHeight: "400px", overflow: "auto", marginRight: `-${spacing[2]}` }}>
            {feed.length === 0 ? (
              <div
                style={{ textAlign: "center", padding: spacing[8], color: colors.text.tertiary }}
              >
                <p style={{ margin: 0 }}>No items yet</p>
                <p style={{ ...styles.textTertiary, marginTop: spacing[2] }}>
                  Start capturing to see activity
                </p>
              </div>
            ) : (
              <div>
                {feed.map((item) => {
                  const processing = processingStates[item.id];
                  return (
                    <div
                      key={item.id}
                      style={{
                        ...styles.feedItem,
                        ...(hoveredButton === `feed-${item.id}` ? styles.feedItemHover : {}),
                      }}
                      onMouseEnter={() => setHoveredButton(`feed-${item.id}`)}
                      onMouseLeave={() => setHoveredButton(null)}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: spacing[2],
                        }}
                      >
                        <span
                          style={{
                            fontSize: typography.sizes.xs.size,
                            fontWeight: typography.weights.semibold,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: colors.brand[400],
                          }}
                        >
                          {item.type.replace(".", " ")}
                        </span>
                        <span style={styles.textTertiary}>
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      {typeof item.payload.title === "string" && (
                        <div
                          style={{
                            fontSize: typography.sizes.sm.size,
                            color: colors.text.primary,
                            marginBottom: spacing[2],
                          }}
                        >
                          {item.payload.title}
                        </div>
                      )}

                      {typeof item.payload.transcript === "string" && (
                        <div
                          style={{
                            ...styles.textSecondary,
                            fontStyle: "italic",
                            marginBottom: spacing[2],
                          }}
                        >
                          "{item.payload.transcript.slice(0, 120)}
                          {item.payload.transcript.length > 120 ? "..." : ""}"
                        </div>
                      )}

                      <div
                        style={{
                          display: "flex",
                          gap: spacing[2],
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        {processing?.status === "processing" && (
                          <span style={styles.processingBadge}>
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background: colors.semantic.info,
                                animation: "pulse 1.5s ease-in-out infinite",
                              }}
                            />
                            Processing...
                          </span>
                        )}

                        {processing?.status === "completed" && (
                          <span style={styles.completedBadge}>✓ AI Analysis Complete</span>
                        )}

                        {processing?.status === "error" && (
                          <span style={styles.errorBadge}>✕ {processing.error}</span>
                        )}

                        <button
                          type="button"
                          onClick={() => runSkillOnItem(item)}
                          disabled={!activeCoop || processing?.status === "processing"}
                          style={{
                            ...getButtonStyle(
                              `process-${item.id}`,
                              "ghost",
                              !activeCoop || processing?.status === "processing",
                            ),
                            padding: `${spacing[1]} ${spacing[3]}`,
                            minHeight: "32px",
                            fontSize: typography.sizes.xs.size,
                          }}
                          onMouseEnter={() => setHoveredButton(`process-${item.id}`)}
                          onMouseLeave={() => setHoveredButton(null)}
                        >
                          <ProcessIcon />
                          {processing?.status === "processing" ? "Processing..." : "Process"}
                        </button>
                      </div>

                      {processing?.status === "completed" && processing.result && (
                        <div style={styles.skillResult}>
                          <div
                            style={{
                              ...styles.label,
                              marginBottom: spacing[3],
                              color: colors.semantic.success,
                            }}
                          >
                            AI Analysis
                          </div>
                          <div style={{ ...styles.textSecondary, marginBottom: spacing[3] }}>
                            {processing.result.summary}
                          </div>
                          {processing.result.actions.length > 0 && (
                            <div>
                              <div style={{ ...styles.label, marginBottom: spacing[2] }}>
                                Actions
                              </div>
                              <ul
                                style={{
                                  margin: 0,
                                  paddingLeft: spacing[4],
                                  color: colors.text.secondary,
                                }}
                              >
                                {processing.result.actions.map((action) => (
                                  <li key={action} style={{ marginBottom: spacing[1] }}>
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Canvas Tab Content */}
      {activeCoop && activeTab === "canvas" && (
        <section style={styles.canvasContainer}>
          <ReactFlowProvider>
            <CanvasView coopId={activeCoop.id} />
          </ReactFlowProvider>
        </section>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        
        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: ${colors.bg.secondary};
          border-radius: ${borderRadius.sm};
        }
        ::-webkit-scrollbar-thumb {
          background: ${colors.border.medium};
          border-radius: ${borderRadius.sm};
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${colors.border.strong};
        }
      `}</style>
    </main>
  );
}

const root = document.querySelector("#root");
if (root) {
  createRoot(root).render(<App />);
}
