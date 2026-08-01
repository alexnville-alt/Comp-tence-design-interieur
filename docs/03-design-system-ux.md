# 03 — Design system & maquettes UX

> **Statut** : v1.0 — en attente de validation
> Les maquettes sont en ASCII : elles fixent la **structure et la hiérarchie**
> d'information, qui sont les décisions coûteuses à changer. Le rendu fin se
> travaille directement en code sur les composants shadcn/ui.

---

## 1. Intention de design

Le produit emprunte à quatre références, chacune pour une raison précise :

| Référence    | Ce qu'on lui prend                                                                          | Ce qu'on ne lui prend pas                                                 |
| ------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Apple**    | Générosité des espaces, typographie qui porte la hiérarchie, absence de décoration gratuite | Le minimalisme froid — on parle de décoration, la chaleur est un argument |
| **Notion**   | Contenu en blocs, densité maîtrisée, navigation latérale calme                              | La grisaille uniforme                                                     |
| **Figma**    | Ergonomie de l'atelier : panneaux latéraux, inspecteur de propriétés, raccourcis clavier    | La complexité destinée aux professionnels                                 |
| **Duolingo** | Boucle de motivation : progression visible, célébration, série                              | L'infantilisation graphique — notre public est adulte                     |
| **Airbnb**   | La photographie comme sujet principal, cartes chaleureuses                                  | L'orientation transactionnelle                                            |

**Le principe qui tranche les cas ambigus** : _l'interface est un cadre neutre
au service d'images colorées._ Une application de design d'intérieur ne doit
jamais concurrencer visuellement le contenu qu'elle présente. D'où une palette
d'interface volontairement désaturée, avec une seule couleur d'accent.

---

## 2. Tokens

Tous les tokens sont des variables CSS, ce qui permet de basculer clair/sombre
sans recompiler ni dupliquer les classes.

### 2.1 Couleurs

```css
:root {
  /* Neutres — base chaude (teinte ~40°), pas de gris bleuté froid */
  --bg: oklch(99% 0.004 90);
  --surface: oklch(97% 0.006 90);
  --surface-raised: oklch(100% 0 0);
  --border: oklch(90% 0.008 90); /* séparateurs décoratifs */
  --border-strong: oklch(64% 0.012 90); /* bordure d'élément interactif : 3:1 */
  --text: oklch(22% 0.012 60);
  --text-muted: oklch(52% 0.01 60);

  /* Accent unique — terracotta : chaleureux, lié à l'univers matière */
  --accent: oklch(56% 0.15 42);
  --accent-hover: oklch(50% 0.152 42);
  --accent-fg: oklch(99% 0.004 90);
  --accent-subtle: oklch(95% 0.028 42);

  /* Sémantiques */
  --success: oklch(60% 0.13 150);
  --warning: oklch(72% 0.14 75);
  --danger: oklch(58% 0.17 27);
  --info: oklch(60% 0.11 240);

  /* Gravité des problèmes détectés par l'IA */
  --sev-minor: var(--info);
  --sev-medium: var(--warning);
  --sev-major: var(--danger);

  --radius: 0.75rem;
  --shadow-1: 0 1px 2px oklch(20% 0.01 60 / 0.06);
  --shadow-2: 0 4px 16px oklch(20% 0.01 60 / 0.08);
}

:root[data-theme="dark"],
@media (prefers-color-scheme: dark) {
  --bg: oklch(17% 0.01 60);
  --surface: oklch(21% 0.012 60);
  --surface-raised: oklch(25% 0.012 60);
  --border: oklch(32% 0.012 60);
  --text: oklch(95% 0.006 90);
  --text-muted: oklch(68% 0.01 70);
  --border-strong: oklch(52% 0.014 60);
  --accent: oklch(70% 0.14 42); /* remonté : contraste AA sur fond sombre */
  --accent-subtle: oklch(30% 0.045 42);
}
```

**Pourquoi OKLCH** : la luminosité y est perceptuellement uniforme. En passant
de `56%` à `70%` sur l'accent en mode sombre, on sait qu'on gagne réellement en
contraste — ce qui est faux en HSL. Sur un produit où l'on enseigne la couleur,
c'est aussi cohérent avec le discours.

**Règle de contraste** : tout texte ≥ 4,5:1, tout élément d'interface ≥ 3:1,
**vérifié dans les deux thèmes** par un test automatisé qui lit directement
`packages/ui/src/tokens.css` (`contrast.test.ts`).

> Les valeurs de luminosité ci-dessus ne sont pas choisies à l'œil mais
> **calculées** pour atteindre le seuil visé. La première version de cette
> spécification donnait `--accent: 62%` et `--border-strong: 82%` : le test
> introduit en M0 a montré qu'elles échouaient respectivement à 3,76:1 et
> 1,70:1. Les valeurs actuelles sont celles qui passent — c'est précisément
> ce qu'un token vérifié par test apporte face à un token choisi visuellement.

**Cas particulier** : les couleurs _pédagogiques_ (nuanciers, palettes générées,
matériaux) ne sont pas des tokens d'interface. Elles sont rendues telles quelles
et toujours accompagnées de leur nom et de leur code — jamais la couleur seule
comme porteuse d'information (WCAG 1.4.1).

### 2.2 Typographie

| Rôle              | Police                         | Usage                                       |
| ----------------- | ------------------------------ | ------------------------------------------- |
| Titres            | **Fraunces** (variable, serif) | H1–H2 : donne le ton éditorial/architecture |
| Interface & corps | **Inter Variable**             | Tout le reste, lisibilité maximale          |
| Chiffres & cotes  | **JetBrains Mono**             | Dimensions, cotations, codes couleur        |

Échelle typographique (ratio 1,25) : 12 · 14 · 16 · 20 · 25 · 31 · 39 · 49 px.
Corps de texte des leçons : 18 px, hauteur de ligne 1,7, largeur max 68
caractères — la lecture longue est un usage central, pas un détail.

### 2.3 Espacement, grille, mouvement

- Espacement sur base 4 px. Rythme vertical des leçons : multiples de 8.
- Grille : 12 colonnes desktop, 4 mobile. Contenu max 1 280 px, lecture 720 px.
- Points de rupture : `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`.
- Durées : 120 ms (retour immédiat) · 220 ms (transition d'élément) ·
  400 ms (transition de page) · 700 ms (célébration XP).
- Courbe par défaut : `cubic-bezier(0.22, 1, 0.36, 1)` — décélération franche,
  perception de rapidité.
- **`prefers-reduced-motion` supprime tout déplacement et parallaxe**, ne
  conserve que les fondus. Non négociable.

---

## 3. Navigation

```
Desktop — barre latérale rétractable          Mobile — barre inférieure
┌────────────┬──────────────────────┐         ┌──────────────────────┐
│ ▣ Tableau  │                      │         │                      │
│ ◆ Parcours │      contenu         │         │      contenu         │
│ ↻ Révisions│                      │         │                      │
│ ⬚ Atelier  │                      │         │                      │
│ ☰ Biblio.  │                      │         ├──────────────────────┤
│ ⌂ Projets  │                      │         │ ▣  ◆  ↻  ☰  ⌂       │
│ ──────────  │                      │         └──────────────────────┘
│ ⚙ Profil   │                      │         (Atelier : desktop/tablette
└────────────┴──────────────────────┘          uniquement — invitation à
                                                passer sur grand écran)
```

L'assistant IA est un **panneau latéral droit invocable partout** (raccourci
`⌘K` / `Ctrl+K`), jamais une page séparée : il doit être disponible _pendant_
la leçon ou _pendant_ la conception, sinon il ne sert à rien.

---

## 4. Écrans clés

### 4.1 Tableau de bord

```
┌───────────────────────────────────────────────────────────────┐
│  Bonsoir Alex 👋                        🔥 12 jours   1 240 XP │
├───────────────────────────────────────────────────────────────┤
│  ┌──── PROCHAINE ÉTAPE ─────────────────────────────────────┐ │
│  │  Niveau 3 · Couleurs                                     │ │
│  │  Leçon 3.4 — Températures de couleur et exposition       │ │
│  │  ⏱ 9 min                                    [ Reprendre ] │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌── Révisions ────┐ ┌── Objectif ─────┐ ┌── Mon projet ────┐ │
│  │  12 cartes dues │ │ ███████░░  70 % │ │ Maison Nantes    │ │
│  │  ≈ 4 min        │ │ 3,5 h / 5 h     │ │ 3/7 pièces       │ │
│  │  [ Réviser ]    │ │ cette semaine   │ │ [ Ouvrir ]       │ │
│  └─────────────────┘ └─────────────────┘ └──────────────────┘ │
│                                                               │
│  Votre progression                                            │
│  ●━━━●━━━●━━━◐━━━○━━━○━━━○━━━○  Niveau 4 sur 15               │
│  Découverte · Fondamentaux · Couleurs · Lumière · …           │
│                                                               │
│  ┌── À travailler ───────────────────────────────────────────┐│
│  │  ⚠ Éclairage : 58 % de réussite   [ Réviser ce thème ]    ││
│  │  ✓ Proportions : 91 %                                     ││
│  └───────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────┘
```

**Justification** : une seule action mise en avant (« Prochaine étape »). Le
frein n° 1 d'une plateforme d'apprentissage est la charge de décision au
moment de rouvrir l'application. Le projet personnel est visible en
permanence — c'est le rappel du _pourquoi_ on apprend.

### 4.2 Carte de parcours

```
┌───────────────────────────────────────────────────────────────┐
│  PHASE 1 — LES FONDATIONS                                     │
│    ✓ ① Découverte      ██████████ 100 %   240 XP              │
│    ✓ ② Fondamentaux    ██████████ 100 %   310 XP              │
│    ◐ ③ Couleurs        ██████░░░░  62 %   180 XP              │
│    ○ ④ Lumière         ░░░░░░░░░░   —     verrouillé          │
│  ─────────────────────────────────────────────────────────    │
│  PHASE 2 — LA MATIÈRE            🔒 terminez la phase 1        │
│    ○ ⑤ Mobilier   ○ ⑥ Matériaux                               │
│  ─────────────────────────────────────────────────────────    │
│  PHASE 3 — LES PIÈCES            🔒                            │
│    ⑦ Cuisine  ⑧ Salle de bain  ⑨ Salon  ⑩ Chambre            │
│    ⑪ Bureau   ⑫ Extérieurs                                    │
│  ─────────────────────────────────────────────────────────    │
│  PHASE 4 — LE PROJET RÉEL        🔒                            │
│    ⑬ Architecture intérieure  ⑭ Rénovation  ⑮ Projet pro      │
└───────────────────────────────────────────────────────────────┘
```

Le regroupement en 4 phases évite l'effet « 15 niveaux, je n'y arriverai
jamais ». Le déverrouillage est **progressif mais non punitif** : le mode
exploration (LEARN-13) permet toujours de consulter en avance.

### 4.3 Leçon

```
┌───────────────────────────────────────────────────────────────┐
│ ← Niveau 3 · Couleurs        Leçon 3.4        ●●●●○○○  4/7    │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│   Températures de couleur et exposition                       │
│                                                               │
│   Une pièce orientée nord reçoit une lumière froide et        │
│   constante. Y poser un gris bleuté donne un résultat         │
│   terne — non parce que le gris est mauvais, mais parce       │
│   que rien ne vient réchauffer la lumière.                    │
│                                                               │
│   ┌───────────────────────────────────────────────────────┐   │
│   │   [ schéma : course du soleil selon l'orientation ]   │   │
│   │   ⓘ Cliquez sur les points pour explorer              │   │
│   └───────────────────────────────────────────────────────┘   │
│                                                               │
│   ▸ Aller plus loin : la notion de Kelvin              [+]    │
│                                                               │
│   ┌─ ⚠ ERREUR FRÉQUENTE ──────────────────────────────────┐   │
│   │ Choisir sa peinture sous les néons du magasin.        │   │
│   │ Testez toujours un échantillon sur place, observé     │   │
│   │ le matin, à midi et le soir.                          │   │
│   └───────────────────────────────────────────────────────┘   │
│                                                               │
│   ┌─ 💬 CONSEIL DE PRO ───────────────────────────────────┐   │
│   │ « Peignez un carton A3 plutôt que le mur : vous       │   │
│   │ pourrez le déplacer dans la pièce. »                  │   │
│   └───────────────────────────────────────────────────────┘   │
│                                                               │
│   ┌─ AVANT / APRÈS ───────────────────────────────────────┐   │
│   │  [ image A ] ◀━━━━╋━━━━▶ [ image B ]                  │   │
│   └───────────────────────────────────────────────────────┘   │
│                                                               │
│  [ ⌘K Demander à l'assistant ]            [ Continuer → ]     │
└───────────────────────────────────────────────────────────────┘
```

**Choix structurants** :

- Une idée par écran, progression visible en tête (7 blocs ici).
- L'approfondissement est **replié par défaut** (LEARN-04) : le débutant n'est
  pas noyé, l'avancé n'est pas frustré.
- Les encadrés « erreur fréquente » et « conseil de pro » sont des types de
  blocs à part entière, pas de la mise en forme libre — ils sont donc
  interrogeables (« montre-moi toutes les erreurs fréquentes du niveau 3 »).

### 4.4 Atelier (simulateur)

```
┌──────┬────────────────────────────────────────────┬──────────────┐
│ OUTILS│  Salon — 4,20 × 5,60 m — 23,5 m²          │ PROPRIÉTÉS   │
│      │                                            │              │
│  ↖   │   ┌──────────────────────────────────┐     │ Canapé 3 pl. │
│  ▭   │   │                        ▭ fenêtre │     │ L 220 cm     │
│  ⌷   │   │   ┌────────┐                     │     │ P  95 cm     │
│  🚪  │   │   │ canapé │      ░░░░░░         │     │ ↻   0°       │
│  🪟  │   │   └────────┘      ░ tapis ░      │     │              │
│  🛋  │   │        ⌷ 78 cm    ░░░░░░         │     │ Matériau     │
│  🎨  │   │   ┌──┐                           │     │ ▣ Lin écru   │
│      │   │   │tv│                     porte │     │              │
│      │   │   └──┘                       ⌐   │     │ ⚠ Passage    │
│      │   └──────────────────────────────────┘     │   78 cm      │
│      │                                            │   < 90 cm    │
│      │  ⓘ 1 alerte de circulation                 │   recommandé │
├──────┴────────────────────────────────────────────┴──────────────┤
│ [2D] [3D iso]   [◀ v2 · v3 ▶]  [Comparer]  [Styles]  [Enregistrer]│
└───────────────────────────────────────────────────────────────────┘
```

Modèle mental emprunté à Figma : outils à gauche, canevas au centre,
inspecteur à droite. Les **alertes de circulation sont affichées en continu**,
pas seulement à la demande : c'est là que se fait l'apprentissage — la règle
se comprend quand on la voit se déclencher sur son propre plan.

Raccourcis : `V` sélection · `R` pièce · `W` mur · `D` porte · `F` fenêtre ·
`M` mobilier · `Espace` panoramique · `⌘Z` annuler · `⌘S` enregistrer.

### 4.5 Analyse photo

```
┌───────────────────────────────────────────────────────────────┐
│  Analyse — Salon                                              │
│  ┌─────────────────────┐  ┌────────────────────────────────┐  │
│  │                     │  │ STYLE DÉTECTÉ                  │  │
│  │   [ photo avec      │  │ Scandinave moderne · 82 %      │  │
│  │     repères         │  │ Nuances : industriel (14 %)    │  │
│  │     numérotés ①②③ ] │  ├────────────────────────────────┤  │
│  │                     │  │ ① 🔴 Éclairage unique au       │  │
│  │                     │  │      plafond                   │  │
│  └─────────────────────┘  │    Une source zénithale seule  │  │
│                           │    écrase les volumes et durcit│  │
│  ┌── AMÉLIORATIONS ────┐  │    les visages.                │  │
│  │ 1. Ajouter 2 points │  │ ② 🟠 Tapis sous-dimensionné    │  │
│  │    lumineux bas     │  │ ③ 🔵 Mur nu au-dessus du canapé│  │
│  │    week-end ·100-500│  ├────────────────────────────────┤  │
│  │ 2. Tapis 200×300    │  │ CIRCULATION                    │  │
│  │ 3. Composition      │  │ Passage principal réduit à     │  │
│  │    murale           │  │ ~70 cm entre table et canapé.  │  │
│  └─────────────────────┘  └────────────────────────────────┘  │
│  [ Ouvrir dans l'atelier ]   [ Demander des alternatives ]    │
└───────────────────────────────────────────────────────────────┘
```

Chaque problème porte un **numéro placé sur la photo** et une explication du
_pourquoi_ (AI-02). La gravité est indiquée par une couleur **et** un chiffre —
jamais par la couleur seule.

---

## 5. Composants spécifiques au domaine

Au-delà des primitives shadcn/ui, ces composants sont propres au produit :

| Composant           | Rôle                                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| `LessonBlock`       | Rendu polymorphe d'un bloc de leçon selon son type                          |
| `QuizCard`          | 5 variantes de question, retour immédiat avec explication                   |
| `FlashcardReview`   | Carte retournable, 4 boutons FSRS (À revoir / Difficile / Correct / Facile) |
| `RoomCanvas`        | Le canevas de l'atelier (react-konva)                                       |
| `PropertyInspector` | Panneau de propriétés contextuel                                            |
| `BeforeAfterSlider` | Volet glissant, tactile et clavier                                          |
| `ColorSwatch`       | Pastille + nom + code + ratio de contraste                                  |
| `MaterialCard`      | Texture, avantages/inconvénients, budget, entretien                         |
| `Moodboard`         | Grille libre glisser-déposer, export image                                  |
| `SeverityBadge`     | Gravité (icône + libellé + couleur)                                         |
| `XpBurst`           | Célébration d'XP, désactivée si `prefers-reduced-motion`                    |
| `StreakFlame`       | Série de jours                                                              |
| `AssistantPanel`    | Panneau latéral IA, réponse en streaming, citations                         |

---

## 6. Accessibilité — points de vigilance réels

Les trois zones où ce produit risque concrètement d'échouer, et la parade :

1. **Le canevas de l'atelier.** Un canvas est opaque pour un lecteur d'écran.
   Parade : un arbre DOM parallèle en `aria-live`, listant les objets de la
   pièce avec leurs positions, et un mode de manipulation **entièrement au
   clavier** (Tab pour sélectionner, flèches pour déplacer par pas de 1/10 cm,
   `R` pour pivoter). L'utilisateur entend « Canapé, 220 cm, contre le mur
   nord, à 78 cm de la table basse ».
2. **La couleur comme contenu.** Impossible à contourner sur un produit qui
   enseigne la couleur. Parade : chaque couleur est toujours accompagnée de son
   nom et de son code ; les exercices de palette acceptent une réponse textuelle ;
   un mode simulation daltonisme (protanopie/deutéranopie/tritanopie) est
   proposé comme **outil pédagogique** — il enseigne en même temps qu'il rend
   accessible.
3. **Le glisser-déposer.** Toute interaction par glissement a une alternative
   au clavier et un menu contextuel équivalent.

Plus les fondamentaux : focus visible partout (`:focus-visible`, 2 px accent),
zones tactiles ≥ 44 px, hiérarchie de titres correcte, `aria-live` sur les XP
et alertes, texte alternatif obligatoire sur toute image de leçon (rédigé, pas
généré).

---

## 7. États et micro-interactions

| État            | Traitement                                                                               |
| --------------- | ---------------------------------------------------------------------------------------- |
| Chargement      | Squelettes qui reprennent la forme finale — jamais de roue centrée                       |
| Vide            | Illustration + une phrase d'explication + une seule action                               |
| Erreur          | Ce qui s'est passé + ce que l'utilisateur peut faire + moyen de réessayer                |
| IA indisponible | Bandeau discret « l'assistant est momentanément indisponible » ; **le reste fonctionne** |
| Hors ligne      | Bandeau persistant ; les leçons en cache restent lisibles (V2)                           |
| Réussite        | Coche + XP + son court (désactivable, coupé par défaut)                                  |
| Échec de quiz   | Jamais de rouge agressif : « pas encore », explication, possibilité de refaire           |

**Sur le ton** : on ne félicite pas pour un clic. La célébration est réservée
aux jalons réels (fin de niveau, projet terminé, série de 7 jours). Une
gratification systématique perd tout sens.
