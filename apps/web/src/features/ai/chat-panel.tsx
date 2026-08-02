"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { cn } from "@atelier/ui";
import { Button } from "@/components/ui/button";
import { isChatStreamEvent, parseSseFrame, type ChatStreamEvent } from "./sse";

/**
 * Assistant IA contextuel (docs/05 M5, AI-01).
 *
 * `<details>`/`<summary>` plutôt qu'un composant d'accordéon maison : bascule
 * au clavier (`Entrée`/`Espace`) et sémantique de repli gratuites, sans code
 * à maintenir ni piège à tester. Le flux se lit token par token dans le texte
 * affiché ; une zone `aria-live` séparée, visuellement masquée, n'annonce que
 * le début et la fin de la réponse — l'annoncer à chaque fragment noierait un
 * lecteur d'écran sous des dizaines d'interruptions par réponse.
 */

interface ChatTurn {
  role: "user" | "assistant" | "system";
  content: string;
}

type ChatAnchor =
  | { lessonId: string; projectId?: undefined }
  | { projectId: string; lessonId?: undefined };

export function ChatPanel({
  summary = "Assistant IA — poser une question sur cette leçon",
  disclaimer = "L'assistant explique et oriente, mais ne remplace jamais un professionnel du bâtiment. Pour un mur porteur, l'électricité, le gaz, l'amiante ou le plomb, il vous renverra vers un professionnel qualifié plutôt que de répondre.",
  ...anchor
}: ChatAnchor & { summary?: string; disclaimer?: string }) {
  const [turns, setTurns] = React.useState<ChatTurn[]>([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const conversationIdRef = React.useRef<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const send = React.useCallback(
    async (message: string) => {
      setTurns((prev) => [...prev, { role: "user", content: message }]);
      setStreaming(true);
      setStatus("Réponse en cours…");

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversationIdRef.current ?? undefined,
            lessonId: anchor.lessonId,
            projectId: anchor.projectId,
            message,
          }),
        });

        if (!response.ok || !response.body) {
          setTurns((prev) => [
            ...prev,
            { role: "system", content: "L'assistant est momentanément indisponible." },
          ]);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantText = "";
        let assistantStarted = false;

        const appendDelta = (text: string) => {
          if (!assistantStarted) {
            assistantStarted = true;
            setTurns((prev) => [...prev, { role: "assistant", content: "" }]);
          }
          assistantText += text;
          setTurns((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: assistantText };
            return next;
          });
        };

        const handleEvent = (event: ChatStreamEvent) => {
          switch (event.type) {
            case "conversation":
              conversationIdRef.current = event.conversationId;
              break;
            case "delta":
              appendDelta(event.text);
              break;
            case "done":
              setStatus("Réponse reçue.");
              break;
            case "error":
              setStatus("");
              setTurns((prev) => [...prev, { role: "system", content: event.message }]);
              break;
          }
        };

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const parsed = parseSseFrame(frame);
            if (isChatStreamEvent(parsed)) handleEvent(parsed);
          }
        }
      } catch {
        setTurns((prev) => [
          ...prev,
          { role: "system", content: "La connexion à l'assistant a été interrompue." },
        ]);
      } finally {
        setStreaming(false);
        setStatus((current) => (current === "Réponse en cours…" ? "" : current));
      }
    },
    [anchor.lessonId, anchor.projectId],
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || streaming) return;
    setInput("");
    void send(message);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  }

  return (
    <details className="rounded-[var(--radius-atelier)] border border-[var(--border-strong)] bg-[var(--surface-raised)]">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-[var(--text)]">
        {summary}
      </summary>

      <div className="space-y-4 border-t border-[var(--border)] p-4">
        <p className="text-xs text-[var(--text-muted)]">{disclaimer}</p>

        <ol aria-label="Conversation avec l'assistant" className="space-y-3">
          {turns.map((turn, i) => (
            <li
              key={i}
              className={cn(
                "rounded-[var(--radius-atelier)] px-3 py-2 text-sm",
                turn.role === "user" && "ml-6 bg-[var(--accent)] text-[var(--accent-fg)]",
                turn.role === "assistant" &&
                  "mr-6 bg-[var(--surface)] text-[var(--text)]",
                turn.role === "system" &&
                  "border border-[var(--border-strong)] text-[var(--text-muted)]",
              )}
            >
              {turn.content || (streaming && turn.role === "assistant" ? "…" : "")}
            </li>
          ))}
        </ol>

        <p role="status" aria-live="polite" className="sr-only">
          {status}
        </p>

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <label htmlFor="ai-chat-input" className="sr-only">
            Votre question
          </label>
          <textarea
            id="ai-chat-input"
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            rows={2}
            placeholder="Écrivez votre question, puis Entrée pour envoyer (Maj+Entrée pour une nouvelle ligne)"
            className={cn(
              "flex w-full resize-none rounded-[var(--radius-atelier)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]",
              "placeholder:text-[var(--text-muted)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
          <Button type="submit" size="icon" disabled={streaming || !input.trim()}>
            <Send aria-hidden="true" />
            <span className="sr-only">Envoyer</span>
          </Button>
        </form>
      </div>
    </details>
  );
}
