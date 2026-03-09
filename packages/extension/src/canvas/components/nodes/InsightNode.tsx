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

export const InsightNode: React.FC<NodeProps<Node<CanvasNodeData>>> = ({ data, selected }) => {
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

  const actions = data.metadata?.actions;
  const hasActions = Array.isArray(actions) && actions.length > 0;

  return (
    <div
      style={{
        position: "relative",
        padding: spacing[5],
        minWidth: "240px",
        maxWidth: "340px",
        fontFamily: typography.fontFamily.sans,
        transition: transitions.normal,
        transform: selected ? "scale(1.02)" : "scale(1)",
      }}
    >
      {/* Glass Card Background with Orange Tint */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: selected
            ? "linear-gradient(145deg, rgba(251, 191, 36, 0.05) 0%, rgba(255, 255, 255, 0.03) 100%)"
            : colors.surface.glass,
          backdropFilter: "blur(20px) saturate(180%)",
          borderRadius: borderRadius.lg,
          border: `1px solid ${selected ? colors.semantic.warning : colors.border.subtle}`,
          boxShadow: selected
            ? `${shadows.glassHover}, 0 0 0 1px ${colors.semantic.warning}, 0 0 30px rgba(251, 191, 36, 0.3)`
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
            background:
              "linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, transparent 50%, rgba(251, 191, 36, 0.3) 100%)",
            opacity: 0.5,
            filter: "blur(10px)",
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
            background: selected ? "#F59E0B" : colors.semantic.warning,
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
            background: selected ? "#F59E0B" : colors.semantic.warning,
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
                ? `linear-gradient(135deg, ${colors.semantic.warning} 0%, #F59E0B 100%)`
                : "rgba(251, 191, 36, 0.15)",
              boxShadow: selected ? "0 0 12px rgba(251, 191, 36, 0.4)" : "none",
              transition: transitions.fast,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke={selected ? colors.bg.primary : colors.semantic.warning}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M9.663 17h4.673M12 3v1m0 16v1m-6.364-9.364l-.707.707m12.728 0l-.707-.707M5.636 16.364l-.707-.707m12.728 0l-.707.707M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <span
            style={{
              fontSize: typography.sizes.xs.size,
              fontWeight: typography.weights.semibold,
              color: selected ? "#F59E0B" : colors.semantic.warning,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              transition: transitions.fast,
            }}
          >
            AI Insight
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

        {/* Content */}
        {data.content && (
          <div
            style={{
              fontSize: typography.sizes.sm.size,
              color: colors.text.secondary,
              lineHeight: "1.6",
              marginBottom: hasActions ? spacing[4] : spacing[4],
            }}
          >
            {data.content}
          </div>
        )}

        {/* Suggested Actions */}
        {hasActions && (
          <div
            style={{
              marginBottom: spacing[4],
              padding: spacing[4],
              background: "rgba(251, 191, 36, 0.08)",
              borderRadius: borderRadius.md,
              border: "1px solid rgba(251, 191, 36, 0.15)",
            }}
          >
            <div
              style={{
                fontSize: typography.sizes.xs.size,
                fontWeight: typography.weights.semibold,
                color: colors.semantic.warning,
                marginBottom: spacing[2],
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Suggested Actions
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: spacing[4],
                fontSize: typography.sizes.sm.size,
                color: colors.text.tertiary,
                lineHeight: "1.6",
              }}
            >
              {(actions as string[]).slice(0, 3).map((action) => (
                <li
                  key={action}
                  style={{
                    position: "relative",
                    paddingLeft: spacing[2],
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: `-${spacing[3]}`,
                      color: colors.semantic.warning,
                      fontSize: "8px",
                      top: "5px",
                    }}
                  >
                    ▶
                  </span>
                  {action}
                </li>
              ))}
            </ul>
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
                  background: `linear-gradient(135deg, ${colors.semantic.warning} 0%, #F59E0B 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "8px",
                  color: colors.bg.primary,
                  fontWeight: typography.weights.bold,
                }}
              >
                🤖
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightNode;
