"use client";

/**
 * Lien d'évitement (M12).
 *
 * Le comportement natif du navigateur pour une ancre `href="#id"` — déplacer
 * le focus clavier vers l'élément ciblé, pas seulement y faire défiler la
 * page — s'est révélé peu fiable en pratique (vérifié : absent en Chromium
 * headless malgré `tabIndex={-1}` sur la cible, un point documenté de longue
 * date par la communauté accessibilité, WebAIM notamment). On ne peut pas
 * compter dessus : le focus est donc déplacé explicitement au clic.
 */
export function SkipLink() {
  return (
    <a
      href="#contenu"
      className="skip-link"
      onClick={(event) => {
        const target = document.getElementById("contenu");
        if (!target) return;
        event.preventDefault();
        target.focus();
        // Conserve le comportement attendu d'un lien d'ancrage : l'URL
        // reflète la destination, et un signet ou un partage de lien y
        // renvoie directement.
        history.pushState(null, "", "#contenu");
      }}
    >
      Aller au contenu principal
    </a>
  );
}
