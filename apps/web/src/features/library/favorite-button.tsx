"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleFavoriteAction } from "./favorites-actions";

export function FavoriteButton({
  slug,
  initialFavorite,
}: {
  slug: string;
  initialFavorite: boolean;
}) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={isFavorite ? "secondary" : "primary"}
      disabled={isPending}
      aria-pressed={isFavorite}
      onClick={() => {
        // Optimiste : le bouton change immédiatement, `toggleFavoriteAction`
        // revérifie tout côté serveur (existence de la fiche, session) — en
        // cas de désaccord, l'état serveur, source de vérité, l'emporte.
        const next = !isFavorite;
        setIsFavorite(next);
        startTransition(async () => {
          const result = await toggleFavoriteAction(slug);
          if (result.ok) setIsFavorite(result.isFavorite);
          else setIsFavorite(!next);
        });
      }}
    >
      {isFavorite ? "★ Retirer des favoris" : "☆ Ajouter aux favoris"}
    </Button>
  );
}
