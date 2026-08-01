# ADR-0006 — Simulateur 2D en V1, 3D différée en V2

**Statut** : Accepté · **Date** : 2026-07-31

## Contexte

Le simulateur est la fonctionnalité la plus coûteuse du projet et celle qui
risque le plus la dérive de périmètre : chaque ajout (courbes, multi-étage,
textures, ombres portées, escaliers) semble raisonnable isolément et rapproche
insensiblement d'un logiciel de CAO complet.

Il faut donc décider **ce qu'on ne fera pas**, pas seulement ce qu'on fera.

## Options envisagées

| Option                                                       | Verdict                                                                                                                                                                                                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3D complète dès la V1** (three.js / R3F)                   | Spectaculaire, mais : modélisation des meubles à produire ou acquérir, gestion des matériaux et de l'éclairage, contrôles de caméra, performance mobile, accessibilité quasi impossible. Représente à lui seul plusieurs mois. Écarté pour la V1. |
| **Intégrer un outil tiers** (iframe d'un service de plan 3D) | Rapide, mais aucun contrôle pédagogique, données hors de notre base, impossible d'y brancher l'analyse de circulation ou la critique IA. Écarté.                                                                                                  |
| **2D canvas + vue isométrique simple**                       | Couvre l'essentiel de la pédagogie de l'aménagement, reste testable et accessible, laisse la 3D ouverte. **Retenu.**                                                                                                                              |

## Décision

**Atelier 2D (react-konva) en V1. Vue 3D isométrique simple en option si le
planning le permet. 3D navigable renvoyée en V2.**

Le raisonnement est pédagogique avant d'être technique : **les décisions
d'aménagement se prennent en plan.** Circulation, zonage, proportions,
implantation d'une cuisine, dégagement d'une porte, dimensionnement d'un
tapis — tout cela se lit et s'enseigne en 2D. La 3D sert à _communiquer_ un
projet, pas à le _concevoir_. Elle est donc utile, mais pas prioritaire.

### Périmètre géométrique gelé pour la V1

| Autorisé                                      | Exclu                                 |
| --------------------------------------------- | ------------------------------------- |
| Murs droits, épaisseur paramétrable           | Murs courbes, arcs                    |
| Pièces rectangulaires puis polygonales        | Formes libres, découpes complexes     |
| Un niveau à la fois                           | Multi-étage, escaliers en volume      |
| Portes battantes / coulissantes / à galandage | Portes pliantes, verrières sur mesure |
| Fenêtres rectangulaires avec allège           | Fenêtres de toit, baies cintrées      |
| Empreintes de mobilier (boîtes englobantes)   | Modèles 3D détaillés                  |
| Aplats de couleur et textures répétées        | Matériaux physiquement réalistes      |
| Éclairage schématique (position, type)        | Simulation photométrique              |

**Cette liste est contraignante.** Toute demande d'ajout devra soit entrer dans
la colonne de gauche, soit faire l'objet d'un nouvel ADR qui remplace
celui-ci — pas d'un ajout discret en cours de module.

## Conséquences

**Positives** — M4 reste tenable ; les performances sont atteignables (60 fps
sur canvas 2D avec 150 objets est confortable) ; le canevas 2D **peut être
rendu accessible au clavier**, ce qui serait pratiquement hors de portée en 3D ;
la géométrie reste testable comme du calcul pur, sans navigateur.

**Négatives** — moins impressionnant en démonstration ; certains utilisateurs
peinent à se représenter un volume à partir d'un plan.

**Mitigation de ce dernier point** — c'est le rôle du niveau 13
(« Architecture intérieure ») : lire un plan, dessiner une coupe et une
perspective est une **compétence à acquérir**, pas un obstacle à contourner.
La contrainte technique devient ici un objectif pédagogique.

## Réversibilité

**Élevée.** Le schéma de scène (`SceneSchema`) décrit des données géométriques
indépendantes du rendu : murs, ouvertures, empreintes, hauteurs. Un moteur 3D
consommerait ces mêmes données. La 2D n'est pas un cul-de-sac, c'est la
première vue d'un modèle qui en supportera plusieurs.

## Addendum (M4) — comment le canevas devient accessible au clavier

Un `<canvas>` (react-konva) est opaque pour un lecteur d'écran et pour la
navigation `Tab` : la « accessibilité clavier » annoncée ci-dessus comme
conséquence positive n'est pas un acquis du choix 2D, elle demande une
structure dédiée. Concrètement (`apps/web/src/features/studio/`) :

1. **Un arbre DOM parallèle** (`AccessibleSceneList`) liste chaque mur,
   ouverture et meuble comme un `<button>` focalisable et décrit en toutes
   lettres (« Mur, 400 cm », « Canapé 3 places, 220 × 95 cm, à 100 ; 100 cm »).
   `Tab` y sélectionne l'objet dans le même store que le canevas — les deux
   sont deux vues d'un seul état, jamais deux sources de vérité.
2. **La création d'objets passe par une saisie numérique et des boutons**
   (dimensions de pièce, catalogue de mobilier), pas par un tracé à la souris
   — c'est ce qui rend « une pièce complète se construit entièrement au
   clavier » vérifiable, pas seulement plausible.
3. **Le placement d'une porte/fenêtre a exigé une seconde voie.** La première
   implémentation ne permettait de poser une ouverture que par clic sur un mur
   dans le canevas — trouvé en revue, avant la livraison du module : aucun
   chemin clavier n'existait. Le correctif ajoute, dans `PropertyInspector`,
   un bouton « Ajouter une porte/fenêtre » actif dès qu'un mur est sélectionné
   (au clavier ou à la souris) : l'ouverture est posée centrée sur le mur, puis
   ajustée par les mêmes champs numériques que ceux qui servent déjà à la
   repositionner après un clic. `createOpeningOnWall`
   (`features/studio/scene-utils.ts`) porte cette logique commune aux deux
   chemins, pour qu'ils restent garantis identiques.
