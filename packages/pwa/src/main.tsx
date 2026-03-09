import {
  type CoopFeedResponse,
  type CoopRecord,
  type JoinCoopResponse,
  MEMBRANE_EVENT_TYPE,
  MembraneClient,
  createMembraneEvent,
  saveArtifact,
} from "@coop/shared";
import { visualTokens } from "@coop/shared";
import { get, set } from "idb-keyval";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

// Import visual tokens
const { colors, spacing, typography, borderRadius, shadows, transitions, effects, animations } =
  visualTokens;

// SpeechRecognition type declarations
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

const ANCHOR_HTTP_URL = "http://localhost:8787";
const ANCHOR_WS_URL = "ws://localhost:8788";
const ACTIVE_COOP_KEY = "coop.active";
const OFFLINE_QUEUE_KEY = "coop.offline-queue";
const DISPLAY_NAME_KEY = "coop.display-name";

type Tab = "feed" | "canvas" | "settings";

interface QueuedNote {
  id: string;
  transcript: string;
  timestamp: string;
  retryCount: number;
}

interface FeedItem {
  id: string;
  type: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

// Global styles component
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      
      * {
        box-sizing: border-box;
        -webkit-tap-highlight-color: transparent;
      }
      
      html, body, #root {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow-x: hidden;
      }
      
      body {
        font-family: ${typography.fontFamily.sans};
        background: ${colors.bg.primary};
        color: ${colors.text.primary};
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      /* Custom scrollbar */
      ::-webkit-scrollbar {
        width: 6px;
      }
      
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      
      ::-webkit-scrollbar-thumb {
        background: ${colors.border.light};
        border-radius: ${borderRadius.full};
      }
      
      /* Animations */
      ${animations.pulse}
      ${animations.glow}
      ${animations.slideIn}
      ${animations.fadeIn}
      ${animations.scaleIn}
      
      .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      
      .animate-glow {
        animation: glow 2s ease-in-out infinite;
      }
      
      .animate-slideIn {
        animation: slideIn 0.3s ${transitions.spring} forwards;
      }
      
      .animate-fadeIn {
        animation: fadeIn 0.2s ease-out forwards;
      }
      
      .animate-scaleIn {
        animation: scaleIn 0.2s ${transitions.spring} forwards;
      }
      
      /* Skeleton loading */
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      
      .skeleton {
        background: linear-gradient(90deg, ${colors.bg.secondary} 25%, ${colors.bg.tertiary} 50%, ${colors.bg.secondary} 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: ${borderRadius.md};
      }
      
      /* Pull to refresh indicator */
      .pull-indicator {
        transition: transform 0.2s ease-out;
      }
      
      /* Mobile optimizations */
      @media (max-width: 480px) {
        html {
          font-size: 16px;
        }
      }
      
      /* Safe area insets for notched devices */
      .safe-bottom {
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }
      
      .safe-top {
        padding-top: env(safe-area-inset-top, 0px);
      }
    `}</style>
  );
}

// Glass Card Component
function GlassCard({
  children,
  style = {},
  className = "",
  hover = true,
  onClick,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}) {
  const [isPressed, setIsPressed] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      className={`animate-slideIn ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      style={{
        background: effects.glass.background,
        backdropFilter: effects.glass.backdropFilter,
        WebkitBackdropFilter: effects.glass.backdropFilter,
        border: effects.glass.border,
        borderRadius: borderRadius.lg,
        boxShadow: shadows.glass,
        transition: transitions.hover,
        transform: isPressed && hover ? "scale(0.98)" : "scale(1)",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Button Component
function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  fullWidth = false,
  style = {},
  icon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  fullWidth?: boolean;
  style?: React.CSSProperties;
  icon?: React.ReactNode;
}) {
  const [isPressed, setIsPressed] = useState(false);

  const sizeStyles = {
    sm: { padding: `${spacing[2]} ${spacing[3]}`, fontSize: typography.sizes.sm.size },
    md: { padding: `${spacing[3]} ${spacing[4]}`, fontSize: typography.sizes.md.size },
    lg: { padding: `${spacing[4]} ${spacing[6]}`, fontSize: typography.sizes.lg.size },
  };

  const variantStyles = {
    primary: {
      background: colors.brand[500],
      color: colors.text.inverse,
      boxShadow: shadows.glow,
    },
    secondary: {
      background: colors.bg.tertiary,
      color: colors.text.primary,
      border: `1px solid ${colors.border.light}`,
    },
    ghost: {
      background: "transparent",
      color: colors.text.secondary,
    },
    danger: {
      background: colors.semantic.error,
      color: colors.text.inverse,
    },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing[2],
        borderRadius: borderRadius.md,
        fontWeight: typography.weights.medium,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: transitions.scale,
        transform: isPressed ? "scale(0.98)" : "scale(1)",
        width: fullWidth ? "100%" : "auto",
        minHeight: "44px",
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

// Input Component
function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  style = {},
  center = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  style?: React.CSSProperties;
  center?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        width: "100%",
        padding: spacing[4],
        fontSize: typography.sizes.md.size,
        fontFamily: typography.fontFamily.sans,
        background: colors.bg.secondary,
        border: `1px solid ${isFocused ? colors.border.focus : colors.border.subtle}`,
        borderRadius: borderRadius.md,
        color: colors.text.primary,
        outline: "none",
        transition: transitions.focus,
        textAlign: center ? "center" : "left",
        letterSpacing: center ? "0.1em" : "normal",
        ...style,
      }}
    />
  );
}

// Status Badge Component
function StatusBadge({
  status,
  label,
}: {
  status: "online" | "offline" | "connected" | "connecting" | "disconnected";
  label: string;
}) {
  const statusColors = {
    online: colors.semantic.success,
    offline: colors.semantic.error,
    connected: colors.semantic.success,
    connecting: colors.semantic.warning,
    disconnected: colors.semantic.error,
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: spacing[1],
        padding: `${spacing[1]} ${spacing[2]}`,
        borderRadius: borderRadius.sm,
        background: `${statusColors[status]}20`,
        color: statusColors[status],
        fontSize: typography.sizes.xs.size,
        fontWeight: typography.weights.medium,
        letterSpacing: "0.02em",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: statusColors[status],
          animation: status === "connecting" ? "pulse 1.5s infinite" : "none",
        }}
      />
      {label}
    </span>
  );
}

// Toast Container
function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      style={{
        position: "fixed",
        top: spacing[4],
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: spacing[2],
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <GlassCard
          key={toast.id}
          hover={false}
          style={{
            padding: `${spacing[3]} ${spacing[4]}`,
            animation: "slideIn 0.3s ease-out",
          }}
        >
          <span
            style={{
              color:
                toast.type === "error"
                  ? colors.semantic.error
                  : toast.type === "success"
                    ? colors.semantic.success
                    : colors.text.primary,
              fontSize: typography.sizes.sm.size,
              fontWeight: typography.weights.medium,
            }}
          >
            {toast.message}
          </span>
        </GlassCard>
      ))}
    </div>
  );
}

// Waveform Visualization
function Waveform({ isRecording }: { isRecording: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bars = 60;
    const barWidth = canvas.width / bars;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isRecording) {
        for (let i = 0; i < bars; i++) {
          const x = i * barWidth;
          const height = Math.sin(time + i * 0.2) * 20 + Math.random() * 30 + 10;
          const y = (canvas.height - height) / 2;

          const gradient = ctx.createLinearGradient(0, y, 0, y + height);
          gradient.addColorStop(0, colors.brand[400]);
          gradient.addColorStop(1, colors.brand[600]);

          ctx.fillStyle = gradient;
          ctx.fillRect(x + 1, y, barWidth - 2, height);
        }
        time += 0.1;
      } else {
        // Flat line when not recording
        ctx.fillStyle = colors.border.light;
        ctx.fillRect(0, canvas.height / 2 - 1, canvas.width, 2);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={100}
      style={{
        width: "100%",
        maxWidth: "320px",
        height: "100px",
      }}
    />
  );
}

// Full Screen Voice Recorder
function VoiceRecorderScreen({
  isOpen,
  onClose,
  isRecording,
  liveTranscript,
  onToggleRecording,
  recognitionAvailable,
}: {
  isOpen: boolean;
  onClose: () => void;
  isRecording: boolean;
  liveTranscript: string;
  onToggleRecording: () => void;
  recognitionAvailable: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="animate-fadeIn"
      style={{
        position: "fixed",
        inset: 0,
        background: colors.bg.overlay,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing[6],
      }}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "absolute",
          top: spacing[6],
          right: spacing[6],
          background: "transparent",
          border: "none",
          color: colors.text.secondary,
          fontSize: "24px",
          cursor: "pointer",
          padding: spacing[2],
          minHeight: "44px",
          minWidth: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ×
      </button>

      {/* Recording status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: spacing[3],
          marginBottom: spacing[8],
        }}
      >
        {isRecording && (
          <span
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: colors.semantic.error,
              animation: "pulse 1.5s infinite",
            }}
          />
        )}
        <span
          style={{
            fontSize: typography.sizes.xl.size,
            fontWeight: typography.weights.semibold,
            color: isRecording ? colors.semantic.error : colors.text.primary,
            letterSpacing: "-0.02em",
          }}
        >
          {isRecording ? "Recording..." : "Ready to Record"}
        </span>
      </div>

      {/* Waveform */}
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          marginBottom: spacing[8],
        }}
      >
        <Waveform isRecording={isRecording} />
      </div>

      {/* Live transcript */}
      <GlassCard
        hover={false}
        style={{
          width: "100%",
          maxWidth: "400px",
          minHeight: "120px",
          maxHeight: "200px",
          overflow: "auto",
          padding: spacing[4],
          marginBottom: spacing[8],
        }}
      >
        {liveTranscript ? (
          <p
            style={{
              margin: 0,
              fontSize: typography.sizes.lg.size,
              lineHeight: typography.sizes.lg.lineHeight,
              color: colors.text.primary,
            }}
          >
            {liveTranscript}
          </p>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: typography.sizes.md.size,
              color: colors.text.tertiary,
              textAlign: "center",
            }}
          >
            {recognitionAvailable
              ? "Tap the microphone to start recording"
              : "Speech recognition not available on this device"}
          </p>
        )}
      </GlassCard>

      {/* Record button */}
      {recognitionAvailable && (
        <button
          type="button"
          onClick={onToggleRecording}
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            border: "none",
            background: isRecording ? colors.semantic.error : colors.brand[500],
            color: colors.text.inverse,
            fontSize: "32px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isRecording ? `0 0 40px ${colors.semantic.error}50` : shadows.glow,
            transition: transitions.spring,
            animation: isRecording ? "glow 2s infinite" : "none",
            transform: isRecording ? "scale(1.1)" : "scale(1)",
          }}
        >
          {isRecording ? "⏹" : "🎤"}
        </button>
      )}
    </div>
  );
}

// Feed Card Component
function FeedCard({ item }: { item: FeedItem }) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "voice.transcribed":
        return "🎤";
      case "tab.captured":
        return "🔗";
      case "content.proposed":
        return "💡";
      default:
        return "📝";
    }
  };

  const getTypeLabel = (type: string) => {
    return type.replace(".", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <GlassCard style={{ padding: spacing[4] }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: spacing[3],
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing[2],
          }}
        >
          <span style={{ fontSize: "16px" }}>{getTypeIcon(item.type)}</span>
          <span
            style={{
              fontSize: typography.sizes.xs.size,
              fontWeight: typography.weights.semibold,
              color: colors.brand[400],
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {getTypeLabel(item.type)}
          </span>
        </div>
        <span style={{ fontSize: typography.sizes.xs.size, color: colors.text.tertiary }}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {(() => {
        const transcript = item.payload.transcript;
        return typeof transcript === "string" && transcript ? (
          <p
            style={{
              margin: `0 0 ${spacing[3]} 0`,
              fontSize: typography.sizes.md.size,
              lineHeight: typography.sizes.md.lineHeight,
              color: colors.text.primary,
              fontStyle: "italic",
            }}
          >
            "{transcript}"
          </p>
        ) : null;
      })()}

      {(() => {
        const title = item.payload.title;
        return typeof title === "string" && title ? (
          <p
            style={{
              margin: `0 0 ${spacing[2]} 0`,
              fontSize: typography.sizes.md.size,
              fontWeight: typography.weights.medium,
              color: colors.text.primary,
            }}
          >
            {title}
          </p>
        ) : null;
      })()}

      {(() => {
        const url = item.payload.url;
        return typeof url === "string" && url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: typography.sizes.sm.size,
              color: colors.brand[400],
              wordBreak: "break-all",
              textDecoration: "none",
            }}
          >
            {url}
          </a>
        ) : null;
      })()}
    </GlassCard>
  );
}

// Skeleton Card for loading
function SkeletonCard() {
  return (
    <GlassCard hover={false} style={{ padding: spacing[4] }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: spacing[3] }}>
        <div className="skeleton" style={{ width: "80px", height: "16px" }} />
        <div className="skeleton" style={{ width: "50px", height: "16px" }} />
      </div>
      <div
        className="skeleton"
        style={{ width: "100%", height: "60px", marginBottom: spacing[2] }}
      />
      <div className="skeleton" style={{ width: "60%", height: "16px" }} />
    </GlassCard>
  );
}

// Bottom Tab Navigation
function BottomNav({
  activeTab,
  onTabChange,
  onVoiceClick,
  hasOfflineItems,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onVoiceClick: () => void;
  hasOfflineItems: boolean;
}) {
  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: "feed", icon: "📰", label: "Feed" },
    { id: "canvas", icon: "🎨", label: "Canvas" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: effects.glassStrong.background,
        backdropFilter: effects.glassStrong.backdropFilter,
        WebkitBackdropFilter: effects.glassStrong.backdropFilter,
        borderTop: effects.glass.border,
        padding: `${spacing[2]} ${spacing[4]} calc(${spacing[4]} + env(safe-area-inset-bottom, 0px))`,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        zIndex: 50,
      }}
    >
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: spacing[1],
            background: "transparent",
            border: "none",
            color: activeTab === tab.id ? colors.brand[400] : colors.text.tertiary,
            fontSize: typography.sizes.xs.size,
            cursor: "pointer",
            padding: spacing[2],
            minHeight: "44px",
            minWidth: "60px",
            transition: transitions.fast,
          }}
        >
          <span style={{ fontSize: "20px" }}>
            {tab.id === "feed" && hasOfflineItems ? (
              <span style={{ position: "relative" }}>
                {tab.icon}
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: colors.semantic.warning,
                  }}
                />
              </span>
            ) : (
              tab.icon
            )}
          </span>
          <span>{tab.label}</span>
        </button>
      ))}

      {/* Voice FAB */}
      <button
        type="button"
        onClick={onVoiceClick}
        style={{
          position: "absolute",
          bottom: `calc(${spacing[4]} + env(safe-area-inset-bottom, 0px))`,
          left: "50%",
          transform: "translateX(-50%)",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: "none",
          background: colors.brand[500],
          color: colors.text.inverse,
          fontSize: "24px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: shadows.glow,
          transition: transitions.scale,
          marginBottom: "60px",
        }}
      >
        🎤
      </button>
    </nav>
  );
}

// Coop Selector Screen
function CoopSelector({
  displayName,
  onDisplayNameChange,
  onCreateCoop,
  onJoinCoop,
  joinCode,
  onJoinCodeChange,
  canCreate,
  canJoin,
}: {
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  onCreateCoop: () => void;
  onJoinCoop: () => void;
  joinCode: string;
  onJoinCodeChange: (code: string) => void;
  canCreate: boolean;
  canJoin: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: spacing[6],
        padding: spacing[4],
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: spacing[4] }}>
        <h1
          style={{
            margin: `0 0 ${spacing[2]} 0`,
            fontSize: "32px",
            fontWeight: typography.weights.bold,
            letterSpacing: "-0.03em",
          }}
        >
          Coop
        </h1>
        <p style={{ margin: 0, color: colors.text.tertiary, fontSize: typography.sizes.md.size }}>
          Voice-first knowledge commons
        </p>
      </div>

      {/* Display Name */}
      <section>
        <label
          htmlFor="display-name"
          style={{
            display: "block",
            fontSize: typography.sizes.sm.size,
            fontWeight: typography.weights.medium,
            color: colors.text.secondary,
            marginBottom: spacing[2],
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Your Display Name
        </label>
        <Input
          id="display-name"
          value={displayName}
          onChange={onDisplayNameChange}
          placeholder="Enter your name"
        />
      </section>

      {/* Create Coop Card */}
      <GlassCard>
        <div style={{ padding: spacing[5] }}>
          <div style={{ marginBottom: spacing[4] }}>
            <h2
              style={{
                margin: `0 0 ${spacing[2]} 0`,
                fontSize: typography.sizes.xl.size,
                fontWeight: typography.weights.semibold,
              }}
            >
              Create a Coop
            </h2>
            <p
              style={{ margin: 0, color: colors.text.tertiary, fontSize: typography.sizes.md.size }}
            >
              Start a new community space
            </p>
          </div>
          <Button
            onClick={onCreateCoop}
            disabled={!canCreate}
            fullWidth
            size="lg"
            icon={<span>✨</span>}
          >
            Create Coop
          </Button>
        </div>
      </GlassCard>

      {/* Or divider */}
      <div style={{ display: "flex", alignItems: "center", gap: spacing[3] }}>
        <div style={{ flex: 1, height: "1px", background: colors.border.subtle }} />
        <span style={{ color: colors.text.tertiary, fontSize: typography.sizes.sm.size }}>OR</span>
        <div style={{ flex: 1, height: "1px", background: colors.border.subtle }} />
      </div>

      {/* Join Coop Card */}
      <GlassCard>
        <div style={{ padding: spacing[5] }}>
          <div style={{ marginBottom: spacing[4] }}>
            <h2
              style={{
                margin: `0 0 ${spacing[2]} 0`,
                fontSize: typography.sizes.xl.size,
                fontWeight: typography.weights.semibold,
              }}
            >
              Join a Coop
            </h2>
            <p
              style={{ margin: 0, color: colors.text.tertiary, fontSize: typography.sizes.md.size }}
            >
              Enter a share code to join
            </p>
          </div>
          <Input
            value={joinCode}
            onChange={onJoinCodeChange}
            placeholder="XXXX-XXXX"
            center
            style={{
              fontSize: "24px",
              fontWeight: typography.weights.semibold,
              marginBottom: spacing[4],
              textTransform: "uppercase",
            }}
          />
          <Button
            onClick={onJoinCoop}
            disabled={!canJoin}
            fullWidth
            size="lg"
            variant="secondary"
            icon={<span>🔗</span>}
          >
            Join Coop
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

// Active Coop Card
function ActiveCoopCard({
  coop,
  shareCode,
  onLeave,
}: {
  coop: CoopRecord;
  shareCode: string;
  onLeave: () => void;
}) {
  const [showCode, setShowCode] = useState(false);

  return (
    <GlassCard>
      <div style={{ padding: spacing[4] }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: spacing[3],
          }}
        >
          <div>
            <h2
              style={{
                margin: `0 0 ${spacing[1]} 0`,
                fontSize: typography.sizes.xl.size,
                fontWeight: typography.weights.semibold,
              }}
            >
              {coop.name}
            </h2>
            <p
              style={{ margin: 0, color: colors.text.tertiary, fontSize: typography.sizes.sm.size }}
            >
              {coop.members.length} member{coop.members.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            onClick={onLeave}
            variant="ghost"
            size="sm"
            style={{ color: colors.semantic.error }}
          >
            Leave
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setShowCode(!showCode)}
          style={{
            background: colors.bg.tertiary,
            borderRadius: borderRadius.md,
            padding: spacing[3],
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            border: "none",
            width: "100%",
            textAlign: "left",
          }}
        >
          <div>
            <span style={{ fontSize: typography.sizes.xs.size, color: colors.text.tertiary }}>
              Share Code
            </span>
            <p
              style={{
                margin: `${spacing[1]} 0 0 0`,
                fontSize: typography.sizes.lg.size,
                fontWeight: typography.weights.medium,
                fontFamily: typography.fontFamily.mono,
                letterSpacing: "0.1em",
              }}
            >
              {showCode ? shareCode : "••••-••••"}
            </p>
          </div>
          <span style={{ color: colors.text.tertiary, fontSize: typography.sizes.sm.size }}>
            {showCode ? "🙈" : "👁"}
          </span>
        </button>
      </div>
    </GlassCard>
  );
}

// Offline Queue Card
function OfflineQueueCard({
  queue,
  isOnline,
  onSync,
}: {
  queue: QueuedNote[];
  isOnline: boolean;
  onSync: () => void;
}) {
  if (queue.length === 0) return null;

  return (
    <GlassCard style={{ borderLeft: `3px solid ${colors.semantic.warning}` }}>
      <div style={{ padding: spacing[4] }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: spacing[3],
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: spacing[2] }}>
            <span style={{ fontSize: "16px" }}>📴</span>
            <span
              style={{
                fontSize: typography.sizes.md.size,
                fontWeight: typography.weights.semibold,
                color: colors.semantic.warning,
              }}
            >
              Offline Queue ({queue.length} note{queue.length !== 1 ? "s" : ""})
            </span>
          </div>
          <Button
            onClick={onSync}
            disabled={!isOnline}
            size="sm"
            variant={isOnline ? "primary" : "secondary"}
          >
            {isOnline ? "Sync" : "Offline"}
          </Button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: spacing[2] }}>
          {queue.slice(0, 3).map((note) => (
            <div
              key={note.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: `${spacing[2]} 0`,
                borderBottom: `1px solid ${colors.border.subtle}`,
              }}
            >
              <span
                style={{
                  fontSize: typography.sizes.sm.size,
                  color: colors.text.secondary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "200px",
                }}
              >
                {note.transcript.slice(0, 40)}...
              </span>
              <span style={{ fontSize: typography.sizes.xs.size, color: colors.text.quaternary }}>
                {new Date(note.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
          {queue.length > 3 && (
            <p
              style={{ margin: 0, fontSize: typography.sizes.sm.size, color: colors.text.tertiary }}
            >
              ...and {queue.length - 3} more
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

// Feed Screen
function FeedScreen({
  feed,
  isLoading,
  onRefresh,
  activeCoop,
}: {
  feed: FeedItem[];
  isLoading: boolean;
  onRefresh: () => void;
  activeCoop: CoopRecord | null;
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPulling && window.scrollY === 0) {
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        setPullDistance(Math.min(delta * 0.5, 80));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      onRefresh();
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        padding: spacing[4],
        paddingBottom: `calc(${spacing[12]} + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      {/* Pull to refresh indicator */}
      <div
        className="pull-indicator"
        style={{
          height: pullDistance,
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: spacing[2],
        }}
      >
        {pullDistance > 0 && (
          <span
            style={{
              fontSize: typography.sizes.sm.size,
              color: colors.text.tertiary,
              transform: `rotate(${(pullDistance / 80) * 360}deg)`,
              transition: "transform 0.1s",
            }}
          >
            ↓
          </span>
        )}
      </div>

      {/* Active Coop Info */}
      {activeCoop && (
        <div style={{ marginBottom: spacing[4] }}>
          <p
            style={{
              margin: `0 0 ${spacing[2]} 0`,
              color: colors.text.tertiary,
              fontSize: typography.sizes.sm.size,
            }}
          >
            Active Coop
          </p>
        </div>
      )}

      {/* Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: spacing[3] }}>
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : feed.length === 0 ? (
          <GlassCard
            hover={false}
            style={{
              padding: spacing[8],
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "48px", marginBottom: spacing[4], display: "block" }}>🎤</span>
            <p
              style={{
                margin: 0,
                color: colors.text.secondary,
                fontSize: typography.sizes.lg.size,
              }}
            >
              No activity yet
            </p>
            <p
              style={{
                margin: `${spacing[2]} 0 0 0`,
                color: colors.text.tertiary,
                fontSize: typography.sizes.md.size,
              }}
            >
              Tap the mic to start recording
            </p>
          </GlassCard>
        ) : (
          feed.map((item) => <FeedCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

// Canvas Screen (placeholder)
function CanvasScreen() {
  return (
    <div
      style={{
        padding: spacing[6],
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
      }}
    >
      <GlassCard
        hover={false}
        style={{
          padding: spacing[8],
          textAlign: "center",
          maxWidth: "400px",
        }}
      >
        <span style={{ fontSize: "48px", marginBottom: spacing[4], display: "block" }}>🎨</span>
        <h2
          style={{
            margin: `0 0 ${spacing[3]} 0`,
            fontSize: typography.sizes["2xl"].size,
            fontWeight: typography.weights.semibold,
          }}
        >
          Canvas
        </h2>
        <p style={{ margin: 0, color: colors.text.secondary, fontSize: typography.sizes.md.size }}>
          Visual organization coming soon. Organize your captures into boards and clusters.
        </p>
      </GlassCard>
    </div>
  );
}

// Settings Screen
function SettingsScreen({
  displayName,
  onDisplayNameChange,
  activeCoop,
  shareCode,
  onLeaveCoop,
  offlineQueue,
  isOnline,
  onSync,
  connectionStatus,
}: {
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  activeCoop: CoopRecord | null;
  shareCode: string;
  onLeaveCoop: () => void;
  offlineQueue: QueuedNote[];
  isOnline: boolean;
  onSync: () => void;
  connectionStatus: "connected" | "disconnected" | "connecting";
}) {
  return (
    <div
      style={{
        padding: spacing[4],
        paddingBottom: `calc(${spacing[12]} + env(safe-area-inset-bottom, 0px))`,
        display: "flex",
        flexDirection: "column",
        gap: spacing[4],
      }}
    >
      {/* Profile Section */}
      <section>
        <h2
          style={{
            margin: `0 0 ${spacing[4]} 0`,
            fontSize: typography.sizes.lg.size,
            fontWeight: typography.weights.semibold,
            color: colors.text.secondary,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Profile
        </h2>
        <GlassCard>
          <div style={{ padding: spacing[4] }}>
            <label
              htmlFor="profile-display-name"
              style={{
                display: "block",
                fontSize: typography.sizes.xs.size,
                color: colors.text.tertiary,
                marginBottom: spacing[2],
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Display Name
            </label>
            <Input
              id="profile-display-name"
              value={displayName}
              onChange={onDisplayNameChange}
              placeholder="Your name"
            />
          </div>
        </GlassCard>
      </section>

      {/* Network Status */}
      <section>
        <h2
          style={{
            margin: `0 0 ${spacing[4]} 0`,
            fontSize: typography.sizes.lg.size,
            fontWeight: typography.weights.semibold,
            color: colors.text.secondary,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Status
        </h2>
        <GlassCard>
          <div
            style={{
              padding: spacing[4],
              display: "flex",
              flexDirection: "column",
              gap: spacing[3],
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: typography.sizes.md.size, color: colors.text.secondary }}>
                Network
              </span>
              <StatusBadge
                status={isOnline ? "online" : "offline"}
                label={isOnline ? "Online" : "Offline"}
              />
            </div>
            {activeCoop && (
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span style={{ fontSize: typography.sizes.md.size, color: colors.text.secondary }}>
                  Coop Connection
                </span>
                <StatusBadge
                  status={connectionStatus}
                  label={
                    connectionStatus === "connected"
                      ? "Connected"
                      : connectionStatus === "connecting"
                        ? "Connecting"
                        : "Disconnected"
                  }
                />
              </div>
            )}
          </div>
        </GlassCard>
      </section>

      {/* Active Coop */}
      {activeCoop && (
        <section>
          <h2
            style={{
              margin: `0 0 ${spacing[4]} 0`,
              fontSize: typography.sizes.lg.size,
              fontWeight: typography.weights.semibold,
              color: colors.text.secondary,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Active Coop
          </h2>
          <ActiveCoopCard coop={activeCoop} shareCode={shareCode} onLeave={onLeaveCoop} />
        </section>
      )}

      {/* Offline Queue */}
      <section>
        <h2
          style={{
            margin: `0 0 ${spacing[4]} 0`,
            fontSize: typography.sizes.lg.size,
            fontWeight: typography.weights.semibold,
            color: colors.text.secondary,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Offline Queue
        </h2>
        <OfflineQueueCard queue={offlineQueue} isOnline={isOnline} onSync={onSync} />
        {offlineQueue.length === 0 && (
          <GlassCard hover={false} style={{ padding: spacing[4], textAlign: "center" }}>
            <p
              style={{ margin: 0, color: colors.text.tertiary, fontSize: typography.sizes.md.size }}
            >
              No items in queue
            </p>
          </GlassCard>
        )}
      </section>

      {/* About */}
      <section style={{ marginTop: "auto" }}>
        <GlassCard hover={false} style={{ padding: spacing[4], textAlign: "center" }}>
          <p
            style={{ margin: 0, color: colors.text.quaternary, fontSize: typography.sizes.sm.size }}
          >
            Coop v0.1.0 • Install for offline access
          </p>
        </GlassCard>
      </section>
    </div>
  );
}

// Main App Component
function App() {
  // Core state
  const [displayName, setDisplayName] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [activeCoop, setActiveCoop] = useState<CoopRecord | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("feed");

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const transcriptRef = useRef("");

  // Feed state
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);

  // Offline queue state
  const [offlineQueue, setOfflineQueue] = useState<QueuedNote[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Network status
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Membrane client
  const membrane = useMemo(() => new MembraneClient(), []);

  // Speech recognition
  const recognition = useMemo(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      return null;
    }
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    return r;
  }, []);

  // Toast helper
  const showToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const activeCoopId = activeCoop?.id ?? null;

  const refreshFeed = useCallback(async () => {
    if (!activeCoopId) {
      return;
    }

    setIsLoadingFeed(true);

    try {
      const response = await fetch(`${ANCHOR_HTTP_URL}/api/coops/${activeCoopId}/feed`);

      if (!response.ok) {
        throw new Error("Failed to fetch feed");
      }

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
    } catch (error) {
      console.error("Failed to refresh feed:", error);
      showToast("Failed to load feed", "error");
    } finally {
      setIsLoadingFeed(false);
    }
  }, [activeCoopId, showToast]);

  const syncOfflineQueue = useCallback(async () => {
    if (!activeCoopId || offlineQueue.length === 0) {
      return;
    }

    const successfulIds: string[] = [];

    for (const note of offlineQueue) {
      try {
        membrane.publish(
          createMembraneEvent({
            coopId: activeCoopId,
            type: MEMBRANE_EVENT_TYPE.VOICE_TRANSCRIBED,
            payload: { transcript: note.transcript },
          }),
        );

        successfulIds.push(note.id);
      } catch (error) {
        console.error(`Failed to sync note ${note.id}:`, error);
      }
    }

    if (successfulIds.length > 0) {
      setOfflineQueue((prev) => prev.filter((note) => !successfulIds.includes(note.id)));
      refreshFeed();
      showToast(`${successfulIds.length} notes synced!`, "success");
    }
  }, [activeCoopId, membrane, offlineQueue, refreshFeed, showToast]);

  // Load saved state on mount
  useEffect(() => {
    async function loadSavedState() {
      const savedName = await get(DISPLAY_NAME_KEY);
      if (savedName) {
        setDisplayName(savedName);
      }

      const savedCoop = await get(ACTIVE_COOP_KEY);
      if (savedCoop) {
        setActiveCoop(savedCoop);
        setShareCode(savedCoop.shareCode);
      }

      const savedQueue = await get(OFFLINE_QUEUE_KEY);
      if (savedQueue) {
        setOfflineQueue(savedQueue);
      }
    }

    loadSavedState();
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast("Back online", "success");
      syncOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast("Offline mode", "info");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [showToast, syncOfflineQueue]);

  // Connect to WebSocket when active coop changes
  useEffect(() => {
    if (!activeCoopId) {
      return;
    }

    membrane.connect(ANCHOR_WS_URL);
    setConnectionStatus("connecting");

    const unsubscribe = membrane.subscribe((event) => {
      if (event.coopId !== activeCoopId) {
        return;
      }

      if (event.type === MEMBRANE_EVENT_TYPE.JOINED) {
        setConnectionStatus("connected");
      }

      // Refresh feed on any relevant event
      if (
        ["tab.captured", "voice.transcribed", "content.proposed"].includes(event.type as string)
      ) {
        refreshFeed();
      }
    });

    membrane.publish(
      createMembraneEvent({
        coopId: activeCoopId,
        type: MEMBRANE_EVENT_TYPE.JOIN,
        payload: { displayName },
      }),
    );

    refreshFeed();

    return () => {
      unsubscribe();
      membrane.disconnect();
    };
  }, [activeCoopId, displayName, membrane, refreshFeed]);

  // Save state changes
  useEffect(() => {
    if (displayName) {
      set(DISPLAY_NAME_KEY, displayName);
    }
  }, [displayName]);

  useEffect(() => {
    if (activeCoop) {
      set(ACTIVE_COOP_KEY, activeCoop);
    }
  }, [activeCoop]);

  useEffect(() => {
    set(OFFLINE_QUEUE_KEY, offlineQueue);
  }, [offlineQueue]);

  async function createCoop() {
    if (!displayName.trim()) {
      showToast("Please enter your display name", "error");
      return;
    }

    try {
      const response = await fetch(`${ANCHOR_HTTP_URL}/api/coops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "My Mobile Coop",
          creatorName: displayName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create coop");
      }

      const created = (await response.json()) as CoopRecord;
      setActiveCoop(created);
      setShareCode(created.shareCode);
      showToast("Coop created!", "success");
    } catch (error) {
      console.error("Failed to create coop:", error);
      showToast("Failed to create coop", "error");
    }
  }

  async function joinCoop() {
    if (!displayName.trim()) {
      showToast("Please enter your display name", "error");
      return;
    }

    if (!joinCode.trim()) {
      showToast("Please enter a share code", "error");
      return;
    }

    try {
      const response = await fetch(`${ANCHOR_HTTP_URL}/api/coops/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareCode: joinCode.toUpperCase(),
          displayName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to join coop");
      }

      const joined = (await response.json()) as JoinCoopResponse;
      setActiveCoop(joined.coop);
      setShareCode(joined.coop.shareCode);
      showToast("Joined coop!", "success");
    } catch (error) {
      console.error("Failed to join coop:", error);
      showToast("Failed to join coop", "error");
    }
  }

  function startRecording() {
    if (!recognition || !activeCoop) {
      return;
    }

    setIsRecording(true);
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
      setIsRecording(false);
      showToast("Recording error", "error");
    };

    recognition.onend = () => {
      if (isRecording) {
        const finalTranscript = transcriptRef.current.trim();
        if (finalTranscript) {
          handleTranscriptComplete(finalTranscript);
        }
        setIsRecording(false);
        setLiveTranscript("");
        transcriptRef.current = "";
        setShowVoiceRecorder(false);
      }
    };

    recognition.start();
    showToast("Recording started", "info");
  }

  function stopRecording() {
    if (!recognition) {
      return;
    }

    recognition.stop();
    setIsRecording(false);

    const finalTranscript = transcriptRef.current.trim();
    if (finalTranscript) {
      handleTranscriptComplete(finalTranscript);
    }

    setLiveTranscript("");
    transcriptRef.current = "";
    setShowVoiceRecorder(false);
    showToast("Recording saved", "success");
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  async function handleTranscriptComplete(transcript: string) {
    if (!activeCoop) {
      return;
    }

    // Save locally first (offline-first)
    await saveArtifact({
      id: crypto.randomUUID(),
      type: "voice.transcribed",
      payload: { transcript },
      createdAt: new Date().toISOString(),
    });

    if (isOnline && connectionStatus === "connected") {
      // Send immediately if online
      try {
        membrane.publish(
          createMembraneEvent({
            coopId: activeCoop.id,
            type: MEMBRANE_EVENT_TYPE.VOICE_TRANSCRIBED,
            payload: { transcript },
          }),
        );

        // Refresh feed
        refreshFeed();
        showToast("Note shared!", "success");
      } catch (error) {
        console.error("Failed to send transcript:", error);
        queueForOffline(transcript);
        showToast("Queued for sync", "info");
      }
    } else {
      // Queue for later sync
      queueForOffline(transcript);
      showToast("Saved offline", "info");
    }
  }

  function queueForOffline(transcript: string) {
    const queuedNote: QueuedNote = {
      id: crypto.randomUUID(),
      transcript,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    setOfflineQueue((prev) => [...prev, queuedNote]);
  }

  function leaveCoop() {
    setActiveCoop(null);
    setShareCode("");
    setJoinCode("");
    setFeed([]);
    membrane.disconnect();
    setConnectionStatus("disconnected");

    // Clear from IndexedDB
    set(ACTIVE_COOP_KEY, null);
    showToast("Left coop", "info");
  }

  // Main render
  return (
    <>
      <GlobalStyles />
      <ToastContainer toasts={toasts} />

      <div
        style={{
          minHeight: "100vh",
          background: colors.bg.primary,
          paddingBottom: activeCoop ? "120px" : "0",
        }}
      >
        {!activeCoop ? (
          <CoopSelector
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            onCreateCoop={createCoop}
            onJoinCoop={joinCoop}
            joinCode={joinCode}
            onJoinCodeChange={setJoinCode}
            canCreate={!!displayName.trim()}
            canJoin={!!displayName.trim() && !!joinCode.trim()}
          />
        ) : (
          <>
            {/* Main content area */}
            <main>
              {activeTab === "feed" && (
                <FeedScreen
                  feed={feed}
                  isLoading={isLoadingFeed}
                  onRefresh={refreshFeed}
                  activeCoop={activeCoop}
                />
              )}
              {activeTab === "canvas" && <CanvasScreen />}
              {activeTab === "settings" && (
                <SettingsScreen
                  displayName={displayName}
                  onDisplayNameChange={setDisplayName}
                  activeCoop={activeCoop}
                  shareCode={shareCode}
                  onLeaveCoop={leaveCoop}
                  offlineQueue={offlineQueue}
                  isOnline={isOnline}
                  onSync={syncOfflineQueue}
                  connectionStatus={connectionStatus}
                />
              )}
            </main>

            {/* Bottom Navigation */}
            <BottomNav
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onVoiceClick={() => setShowVoiceRecorder(true)}
              hasOfflineItems={offlineQueue.length > 0}
            />
          </>
        )}

        {/* Voice Recorder Full Screen */}
        <VoiceRecorderScreen
          isOpen={showVoiceRecorder}
          onClose={() => {
            if (isRecording) {
              stopRecording();
            }
            setShowVoiceRecorder(false);
          }}
          isRecording={isRecording}
          liveTranscript={liveTranscript}
          onToggleRecording={toggleRecording}
          recognitionAvailable={!!recognition}
        />
      </div>
    </>
  );
}

const root = document.querySelector("#root");
if (root) {
  createRoot(root).render(<App />);
}
