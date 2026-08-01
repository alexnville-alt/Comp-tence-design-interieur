import { env, isProduction } from "@/lib/env";

/**
 * Port `Mailer`.
 *
 * Même logique que la couche IA (ADR-0005) : le métier ne connaît qu'une
 * interface, jamais un fournisseur. En développement, l'adaptateur `console`
 * écrit le message dans le terminal — le lien de réinitialisation y est
 * directement cliquable, ce qui évite d'avoir à configurer un service d'e-mail
 * pour travailler.
 */
export interface MailMessage {
  to: string;
  subject: string;
  /** Version texte. Obligatoire : certains clients n'affichent que celle-ci. */
  text: string;
  html?: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

const consoleMailer: Mailer = {
  send(message) {
    console.warn(
      [
        "",
        "┌─ E-MAIL (adaptateur console) ───────────────────────────────",
        `│ À      : ${message.to}`,
        `│ Objet  : ${message.subject}`,
        "├─────────────────────────────────────────────────────────────",
        message.text
          .split("\n")
          .map((line) => `│ ${line}`)
          .join("\n"),
        "└─────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return Promise.resolve();
  },
};

const resendMailer: Mailer = {
  async send(message) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      // On journalise sans jamais inclure le corps du message : un e-mail de
      // réinitialisation contient un jeton valide.
      throw new Error(`Échec d'envoi (${response.status}) : ${detail.slice(0, 200)}`);
    }
  },
};

export const mailer: Mailer =
  env.MAIL_TRANSPORT === "resend" ? resendMailer : consoleMailer;

if (isProduction && env.MAIL_TRANSPORT === "console") {
  console.warn(
    "⚠️  MAIL_TRANSPORT=console en production : aucun e-mail ne sera réellement envoyé.",
  );
}
