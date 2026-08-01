import type { AiRole } from "@atelier/db";
import type { ChatMessage } from "@atelier/ai";

/**
 * Prompt système du chat pédagogique (ADR-0005 ; docs/02 §5.2, §5.4 niveau 2).
 *
 * Préfixe **stable** : jamais de donnée variable interpolée (date, identité,
 * leçon en cours) — c'est ce qui permet la mise en cache de prompt côté
 * fournisseur (`cache_control: ephemeral`). Le contexte variable (leçon,
 * historique de la conversation) va dans les messages, jamais ici — voir
 * `buildLessonContextMessage`.
 *
 * La citation obligatoire des fiches bibliothèque (docs/02 §5.4, 2e niveau)
 * n'est pas dans ce prompt : la bibliothèque interne n'existe pas avant M7
 * (`LibraryItem`). Imposer une citation qu'aucune fiche ne peut fournir
 * produirait des citations inventées — pire que pas de règle du tout. La
 * consigne sera ajoutée avec M7, pas avant.
 */
export const CHAT_SYSTEM_PROMPT = `Tu es l'assistant pédagogique d'Atelier, une plateforme d'apprentissage du design d'intérieur.

Ton rôle : expliquer, orienter, faire réviser — jamais remplacer un professionnel du bâtiment. Tu ne donnes aucune consigne d'exécution technique (comment couper, percer, câbler, souder, poser) : sur ces sujets, tu renvoies vers un professionnel qualifié plutôt que d'improviser une réponse.

Sur tout budget ou coût, utilise toujours l'expression « ordre de grandeur » plutôt qu'un chiffre présenté comme définitif : les prix varient selon la région, le fournisseur et la période.

Réponds en français, avec un vocabulaire professionnel expliqué simplement, adapté à un apprenant qui peut être un complet débutant.`;

interface LessonContext {
  title: string;
  summary: string;
}

/**
 * Message de contexte, reconstruit à chaque requête à partir de la leçon
 * courante — **jamais persisté** en `AiMessage` : ce n'est pas quelque chose
 * que l'apprenant a écrit, l'afficher dans l'historique du fil serait
 * trompeur. Rôle `user` car le port `AiProvider` ne modélise pas de rôle
 * « système » par message (le vrai prompt système est `CHAT_SYSTEM_PROMPT`).
 */
export function buildLessonContextMessage(lesson: LessonContext): ChatMessage {
  return {
    role: "user",
    content: `[Contexte de la conversation : l'apprenant est actuellement sur la leçon « ${lesson.title} ». Résumé : ${lesson.summary}]`,
  };
}

/**
 * Convertit l'historique persisté (`AiMessage`) vers la forme attendue par
 * `AiProvider` — le port ne connaît que `user`/`assistant` (voir
 * `packages/ai/src/port.ts`) ; les messages `SYSTEM` (garde-fou de quota,
 * jamais écrits par le fournisseur) ne font pas partie du contexte renvoyé
 * au modèle.
 */
export function toChatHistory(
  messages: { role: AiRole; content: string }[],
): ChatMessage[] {
  return messages
    .filter((message) => message.role === "USER" || message.role === "ASSISTANT")
    .map((message) => ({
      role: message.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: message.content,
    }));
}
