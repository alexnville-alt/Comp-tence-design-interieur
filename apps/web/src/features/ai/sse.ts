/**
 * Analyse d'une trame SSE unique (`data: {...}`), côté client.
 *
 * Pure et testable sans réseau : le découpage d'un flux en trames complètes
 * (mise en tampon d'un fragment coupé en plein milieu par le réseau) reste
 * dans `chat-panel.tsx`, qui a l'état du flux — cette fonction ne fait que
 * la partie sans état, une trame déjà complète en entrée.
 */
export function parseSseFrame(frame: string): unknown {
  const trimmed = frame.trim();
  if (!trimmed.startsWith("data: ")) return null;
  try {
    return JSON.parse(trimmed.slice("data: ".length));
  } catch {
    return null;
  }
}

export type ChatStreamEvent =
  | { type: "conversation"; conversationId: string }
  | { type: "delta"; text: string }
  | { type: "done"; guardrail?: string; quotaExceeded?: boolean }
  | { type: "error"; reason: string; message: string };

export function isChatStreamEvent(value: unknown): value is ChatStreamEvent {
  if (typeof value !== "object" || value === null || !("type" in value)) return false;
  const { type } = value;
  return (
    type === "conversation" || type === "delta" || type === "done" || type === "error"
  );
}
