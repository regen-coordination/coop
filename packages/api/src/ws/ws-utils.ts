import type { WSContext } from 'hono/ws';

/**
 * Stable identity key for a WSContext.
 *
 * Hono's Bun adapter creates a fresh WSContext wrapper per event, so we
 * key on ws.raw (the underlying Bun ServerWebSocket) which is stable.
 */
export function rawKey(ws: WSContext): object {
  return (ws.raw ?? ws) as object;
}
