import * as React from "react";
import { AlertTriangle, ChevronDown, Lightbulb, PlayCircle } from "lucide-react";
import { cn } from "@atelier/ui";

/**
 * Composants React pour les 11 types de blocs pédagogiques (docs/06 §1.2).
 *
 * Chaque bloc reçoit `n` (sa position, injectée par l'auteur — voir
 * `blocks.ts`) et pose une ancre `id="bloc-N"` : c'est ce qui permet au
 * lecteur de reprendre une leçon exactement là où il l'avait laissée
 * (feuille de route M2, « reprise exacte ») via `scrollIntoView` /
 * `IntersectionObserver`, sans dépendre d'un compteur séparé côté client.
 *
 * Aucune photographie n'est utilisée ici (ADR-0010) : les illustrations sont
 * des schémas SVG originaux, décrits par un `role="img"` + `aria-label`
 * plutôt qu'une balise `<img>`, pour rester légers et accessibles sans texte
 * alternatif à maintenir séparément.
 */

function BlockAnchor({
  n,
  className,
  children,
}: {
  n: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={`bloc-${n}`} data-block-index={n} className={cn("scroll-mt-24", className)}>
      {children}
    </div>
  );
}

export function Texte({
  n,
  titre,
  children,
}: {
  n: number;
  titre?: string;
  children: React.ReactNode;
}) {
  return (
    <BlockAnchor n={n} className="space-y-2">
      {titre ? (
        <h2 className="font-[family-name:var(--font-display)] text-2xl">{titre}</h2>
      ) : null}
      <div className="space-y-3 leading-relaxed text-[var(--text)]">{children}</div>
    </BlockAnchor>
  );
}

export function ImageAnnotee({
  n,
  legende,
  children,
}: {
  n: number;
  legende: string;
  children: React.ReactNode;
}) {
  return (
    <BlockAnchor n={n} className="space-y-2">
      <figure
        role="img"
        aria-label={legende}
        className="overflow-hidden rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <div className="[&_svg]:h-auto [&_svg]:w-full">{children}</div>
        <figcaption className="mt-3 text-sm text-[var(--text-muted)]">
          {legende}
        </figcaption>
      </figure>
    </BlockAnchor>
  );
}

export function Schema({
  n,
  titre,
  children,
}: {
  n: number;
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <BlockAnchor n={n} className="space-y-2">
      <div
        role="img"
        aria-label={titre}
        className="overflow-hidden rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface)] p-4 [&_svg]:h-auto [&_svg]:w-full"
      >
        {children}
      </div>
      <p className="text-sm text-[var(--text-muted)]">{titre}</p>
    </BlockAnchor>
  );
}

export function AvantApres({
  n,
  avant,
  apres,
  children,
}: {
  n: number;
  avant: string;
  apres: string;
  children: React.ReactNode;
}) {
  return (
    <BlockAnchor n={n} className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <div
          role="img"
          aria-label={avant}
          className="space-y-2 rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface)] p-3"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Avant
          </p>
          <p className="text-sm text-[var(--text)]">{avant}</p>
        </div>
        <div
          role="img"
          aria-label={apres}
          className="space-y-2 rounded-[var(--radius-atelier)] border border-[var(--accent)] bg-[var(--accent-subtle)] p-3"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent-strong)]">
            Après
          </p>
          <p className="text-sm text-[var(--text)]">{apres}</p>
        </div>
      </div>
      {children}
    </BlockAnchor>
  );
}

export function ErreurFrequente({
  n,
  children,
}: {
  n: number;
  children: React.ReactNode;
}) {
  return (
    <BlockAnchor n={n}>
      <div
        role="note"
        aria-label="Erreur fréquente"
        className="flex gap-3 rounded-[var(--radius-atelier)] border border-[var(--danger)] bg-[var(--danger-subtle)] p-4"
      >
        <AlertTriangle
          className="mt-0.5 size-5 shrink-0 text-[var(--danger)]"
          aria-hidden="true"
        />
        <div className="space-y-1 text-sm text-[var(--text)]">
          <p className="font-medium">Erreur fréquente</p>
          <div>{children}</div>
        </div>
      </div>
    </BlockAnchor>
  );
}

export function ConseilDePro({
  n,
  auteur,
  children,
}: {
  n: number;
  auteur?: string;
  children: React.ReactNode;
}) {
  return (
    <BlockAnchor n={n}>
      <div
        role="note"
        aria-label="Conseil de pro"
        className="flex gap-3 rounded-[var(--radius-atelier)] border border-[var(--accent)] bg-[var(--accent-subtle)] p-4"
      >
        <Lightbulb
          className="mt-0.5 size-5 shrink-0 text-[var(--accent-strong)]"
          aria-hidden="true"
        />
        <div className="space-y-1 text-sm text-[var(--text)]">
          <p className="font-medium">
            Conseil de pro
            {auteur ? <span className="font-normal"> — {auteur}</span> : null}
          </p>
          <div>{children}</div>
        </div>
      </div>
    </BlockAnchor>
  );
}

export function InterieurCelebre({
  n,
  nom,
  designer,
  children,
}: {
  n: number;
  nom: string;
  designer?: string;
  children: React.ReactNode;
}) {
  return (
    <BlockAnchor n={n} className="space-y-2">
      <div className="rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="font-[family-name:var(--font-display)] text-lg">
          {nom}
          {designer ? (
            <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
              — {designer}
            </span>
          ) : null}
        </p>
        <div className="mt-2 text-sm leading-relaxed text-[var(--text)]">{children}</div>
      </div>
    </BlockAnchor>
  );
}

export function ARetenir({ n, points }: { n: number; points: string[] }) {
  return (
    <BlockAnchor n={n}>
      <div className="space-y-2 rounded-[var(--radius-atelier)] border border-[var(--success)] bg-[var(--success-subtle)] p-4">
        <p className="font-medium text-[var(--text)]">À retenir</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--text)]">
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
    </BlockAnchor>
  );
}

export function TableauComparatif({
  n,
  titre,
  children,
}: {
  n: number;
  titre?: string;
  children: React.ReactNode;
}) {
  return (
    <BlockAnchor n={n} className="space-y-2">
      {titre ? <p className="font-medium text-[var(--text)]">{titre}</p> : null}
      <div className="overflow-x-auto rounded-[var(--radius-atelier)] border border-[var(--border)]">
        <table className="w-full border-collapse text-sm [&_td]:border-t [&_td]:border-[var(--border)] [&_td]:p-3 [&_th]:border-b [&_th]:border-[var(--border-strong)] [&_th]:bg-[var(--surface)] [&_th]:p-3 [&_th]:text-left [&_th]:font-medium">
          {children}
        </table>
      </div>
    </BlockAnchor>
  );
}

export function EmplacementVideo({
  n,
  titre,
  url,
}: {
  n: number;
  titre: string;
  /** Fournie par le lecteur de leçon (`Lesson.videoUrl`), pas par l'auteur MDX. */
  url?: string;
}) {
  return (
    <BlockAnchor n={n}>
      {url ? (
        <div className="overflow-hidden rounded-[var(--radius-atelier)] border border-[var(--border)]">
          <video controls className="w-full" aria-label={titre}>
            <source src={url} />
          </video>
        </div>
      ) : (
        <div
          role="img"
          aria-label={`Vidéo à venir : ${titre}`}
          className="flex items-center gap-3 rounded-[var(--radius-atelier)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-6 text-[var(--text-muted)]"
        >
          <PlayCircle className="size-6 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium text-[var(--text)]">{titre}</p>
            <p className="text-sm">Vidéo à venir.</p>
          </div>
        </div>
      )}
    </BlockAnchor>
  );
}

export function AllerPlusLoin({
  n,
  titre = "Aller plus loin",
  children,
}: {
  n: number;
  titre?: string;
  children: React.ReactNode;
}) {
  return (
    <BlockAnchor n={n}>
      {/* `<details>` : disclosure clavier et lecteur d'écran natifs, sans JS
          (critère d'acceptation M2 — lecture 100 % clavier). */}
      <details className="group rounded-[var(--radius-atelier)] border border-[var(--border)] bg-[var(--surface)] open:bg-[var(--surface-raised)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 font-medium text-[var(--text)] [&::-webkit-details-marker]:hidden">
          {titre}
          <ChevronDown
            className="size-4 shrink-0 text-[var(--text-muted)] transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-[var(--text)]">
          {children}
        </div>
      </details>
    </BlockAnchor>
  );
}

/**
 * Fabrique de composants MDX pour une leçon donnée : seul `EmplacementVideo`
 * dépend de la leçon (son `Lesson.videoUrl`), d'où une fabrique plutôt qu'un
 * contexte React — plus simple à câbler dans `next-mdx-remote/rsc`, qui
 * attend un objet `components` statique par compilation.
 */
export function createLessonComponents(videoUrl: string | null) {
  return {
    Texte,
    ImageAnnotee,
    Schema,
    AvantApres,
    ErreurFrequente,
    ConseilDePro,
    InterieurCelebre,
    ARetenir,
    TableauComparatif,
    EmplacementVideo: (props: { n: number; titre: string }) =>
      videoUrl ? (
        <EmplacementVideo {...props} url={videoUrl} />
      ) : (
        <EmplacementVideo {...props} />
      ),
    AllerPlusLoin,
  };
}
