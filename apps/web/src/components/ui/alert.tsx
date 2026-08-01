import * as React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@atelier/ui";

type Tone = "info" | "success" | "danger";

const TONE_STYLES: Record<Tone, { box: string; Icon: typeof Info }> = {
  info: {
    box: "border-[var(--info)] bg-[var(--info-subtle)]",
    Icon: Info,
  },
  success: {
    box: "border-[var(--success)] bg-[var(--success-subtle)]",
    Icon: CheckCircle2,
  },
  danger: {
    box: "border-[var(--danger)] bg-[var(--danger-subtle)]",
    Icon: AlertCircle,
  },
};

/**
 * Message d'état.
 *
 * Chaque message porte une **icône en plus de la couleur** : la couleur seule
 * ne peut pas véhiculer une information (WCAG 1.4.1). `role="alert"` fait
 * annoncer le message par les lecteurs d'écran dès son apparition, ce qui est
 * indispensable pour une erreur de formulaire.
 */
export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { box, Icon } = TONE_STYLES[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-[var(--radius-atelier)] border p-4 text-sm text-[var(--text)]",
        box,
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        <div className="text-[var(--text)]">{children}</div>
      </div>
    </div>
  );
}
