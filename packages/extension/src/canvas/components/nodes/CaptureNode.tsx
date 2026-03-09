import {
  visualBorderRadius as borderRadius,
  visualColors as colors,
  visualShadows as shadows,
  visualSpacing as spacing,
  visualTransitions as transitions,
  visualTypography as typography,
} from "@coop/shared";
import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import type React from "react";
import type { CanvasNodeData } from "../../hooks/useCanvasStore";

export const CaptureNode: React.FC<NodeProps<Node<CanvasNodeData>>> = ({ data, selected }) => {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      style={{
        position: "relative",
        padding: spacing[5],
        minWidth: "220px",
        maxWidth: "320px",
        fontFamily: typography.fontFamily.sans,
        transition: transitions.normal,
        transform: selected ? "scale(1.02)" : "scale(1)",
      }}
    >
      {/* Glass Card Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: colors.surface.glass,
          backdropFilter: "blur(20px) saturate(180%)",
          borderRadius: borderRadius.lg,
          border: `1px solid ${selected ? colors.brand[500] : colors.border.subtle}`,
          boxShadow: selected
            ? `${shadows.glassHover}, 0 0 0 1px ${colors.brand[500]}, 0 0 30px ${colors.brand.glow}`
            : shadows.glass,
          transition: transitions.normal,
        }}
      />

      {/* Glow Effect for Selected State */}
      {selected && (
        <div
          style={{
            position: "absolute",
            inset: "-2px",
            borderRadius: `calc(${borderRadius.lg} + 2px)`,
            background: `linear-gradient(135deg, ${colors.brand.glow} 0%, transparent 50%, ${colors.brand.glow} 100%)`,
            opacity: 0.6,
            filter: "blur(8px)",
            zIndex: -1,
            animation: "pulse 2s ease-in-out infinite",
          }}
        />
      )}

      {/* Content Container */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Connection Handles */}
        <Handle
          type="target"
          position={Position.Top}
          style={{
            width: "10px",
            height: "10px",
            background: selected ? colors.brand[400] : colors.brand[500],
            border: `2px solid ${colors.bg.primary}`,
            borderRadius: "50%",
            transition: transitions.fast,
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            width: "10px",
            height: "10px",
            background: selected ? colors.brand[400] : colors.brand[500],
            border: `2px solid ${colors.bg.primary}`,
            borderRadius: "50%",
            transition: transitions.fast,
          }}
        />

        {/* Header / Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing[2],
            marginBottom: spacing[3],
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              borderRadius: borderRadius.md,
              background: selected
                ? `linear-gradient(135deg, ${colors.brand[500]} 0%, ${colors.brand[600]} 100%)`
                : colors.bg.tertiary,
              boxShadow: selected ? `0 0 12px ${colors.brand.glow}` : "none",
              transition: transitions.fast,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke={selected ? colors.bg.primary : colors.brand[500]}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10,9 9,9 8,9" />
            </svg>
          </div>
          <span
            style={{
              fontSize: typography.sizes.xs.size,
              fontWeight: typography.weights.semibold,
              color: selected ? colors.brand[400] : colors.brand[500],
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              transition: transitions.fast,
            }}
          >
            Capture
          </span>
          {selected && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: "10px",
                color: colors.text.quaternary,
              }}
            >
              ●
            </span>
          )}
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: typography.sizes.md.size,
            fontWeight: typography.weights.semibold,
            color: colors.text.primary,
            lineHeight: typography.sizes.md.lineHeight,
            marginBottom: spacing[3],
            letterSpacing: typography.sizes.md.letterSpacing,
          }}
        >
          {data.label}
        </div>

        {/* Content Preview */}
        {data.content && (
          <div
            style={{
              fontSize: typography.sizes.sm.size,
              color: colors.text.secondary,
              lineHeight: "1.5",
              marginBottom: spacing[4],
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {data.content.length > 120 ? `${data.content.slice(0, 120).trim()}...` : data.content}
          </div>
        )}

        {/* Footer / Metadata */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: spacing[3],
            borderTop: `1px solid ${colors.border.subtle}`,
            marginTop: "auto",
          }}
        >
          <span
            style={{
              fontSize: typography.sizes.xs.size,
              color: colors.text.quaternary,
              fontFamily: typography.fontFamily.mono,
            }}
          >
            {formatDate(data.createdAt)}
          </span>

          {data.author && (
            <span
              style={{
                fontSize: typography.sizes.xs.size,
                color: colors.text.tertiary,
                display: "flex",
                alignItems: "center",
                gap: spacing[1],
              }}
            >
              <span
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${colors.brand[500]} 0%, ${colors.brand[700]} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "8px",
                  color: colors.bg.primary,
                  fontWeight: typography.weights.bold,
                }}
              >
                {data.author.charAt(0).toUpperCase()}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaptureNode;
