import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";

/**
 * Connexion Google.
 *
 * Rendu uniquement si OAuth est configuré (`hasGoogleOAuth`) : un bouton
 * présent mais non fonctionnel est pire que son absence.
 *
 * Le bouton est un formulaire posté vers une Server Action, et non un lien :
 * une navigation qui déclenche un changement d'état doit passer par une
 * requête POST, sinon un préchargement de lien pourrait la déclencher seul.
 */
export function GoogleButton({
  callbackUrl = "/tableau-de-bord",
}: {
  callbackUrl?: string;
}) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: callbackUrl });
      }}
    >
      <Button type="submit" variant="secondary" className="w-full">
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12.24 10.29v3.63h5.11c-.21 1.32-1.54 3.87-5.11 3.87-3.08 0-5.59-2.55-5.59-5.69s2.51-5.69 5.59-5.69c1.75 0 2.93.75 3.6 1.39l2.45-2.36C16.7 3.79 14.66 2.9 12.24 2.9 7.15 2.9 3.03 7.02 3.03 12.1s4.12 9.2 9.21 9.2c5.32 0 8.84-3.74 8.84-9 0-.6-.06-1.06-.15-1.52z"
          />
        </svg>
        Continuer avec Google
      </Button>
    </form>
  );
}
