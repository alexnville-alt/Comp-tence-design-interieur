# ADR-0010 — Contenu pédagogique en MDX versionné dans Git

**Statut** : Accepté · **Date** : 2026-07-31

## Contexte

Le contenu représente le plus gros volume de travail du projet : ~92 leçons,
~350 exercices, ~450 cartes mémoire, ≥ 300 fiches de bibliothèque. Il sera
rédigé, relu et corrigé en continu pendant des mois, souvent en parallèle du
développement.

La question est : où vit ce contenu ?

## Options envisagées

| Option                                                | Verdict                                                                                                                                                                                                              |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **En base, édité via une interface d'administration** | Modification sans déploiement. Mais il faut construire un éditeur, une gestion de versions, une prévisualisation, des rôles — soit un CMS complet, c'est-à-dire un second produit à développer et maintenir. Écarté. |
| **CMS hébergé** (Sanity, Contentful)                  | Interface immédiate. Mais coût récurrent, contenu hors du dépôt, schémas de blocs à redéfinir dans un langage tiers, et dépendance externe pour la ressource la plus critique. Écarté.                               |
| **Markdown pur**                                      | Simple, mais aucun composant riche : impossible de placer un schéma interactif, un comparateur avant/après ou un quiz au fil du texte. Écarté.                                                                       |
| **MDX + frontmatter validé**                          | Contenu versionné, relu en PR, composants riches disponibles. **Retenu.**                                                                                                                                            |

## Décision

**Le contenu vit dans `apps/web/content/` en MDX**, avec un frontmatter YAML
validé par Zod. La base de données ne stocke que des métadonnées et un
`contentHash` ; un script de synchronisation idempotent (`upsert` par `slug`)
publie le contenu.

```mdx
---
slug: "3-4-temperature-couleur"
title: "Températures de couleur et exposition"
minutes: 9
xpReward: 25
cards:
  - front: "Quelle température de couleur pour un salon le soir ?"
    back: "2700 K — blanc chaud. Au-delà de 4000 K, la lumière devient clinique."
    topic: "eclairage"
exercises:
  - type: QUIZ_MCQ
    prompt: "Une pièce orientée nord reçoit une lumière…"
    choices: ["chaude et changeante", "froide et constante", "neutre"]
    correct: [1]
    explanation: "Le nord ne reçoit jamais de soleil direct…"
---

Une pièce orientée nord reçoit une lumière froide et constante…

<Schema src="course-du-soleil" interactive />

<ErreurFrequente>
  Choisir sa peinture sous les néons du magasin.
</ErreurFrequente>

<AllerPlusLoin titre="La notion de Kelvin">
  L'échelle de Kelvin mesure…
</AllerPlusLoin>
```

Trois raisons dominent :

1. **La relecture est le vrai enjeu.** Sur 92 leçons, la cohérence du
   vocabulaire d'un niveau à l'autre et l'absence de contradictions comptent
   plus que le confort d'édition. Git donne gratuitement le diff, l'historique,
   la relecture en pull request et la restauration.
2. **Les exercices et cartes naissent avec la leçon.** Les déclarer dans le
   frontmatter garantit qu'ils restent synchronisés avec le texte qui les
   justifie. Dans un CMS, ce lien se distend inévitablement.
3. **Aucun outil à construire.** L'énergie va dans le contenu, pas dans un
   back-office.

## Conséquences

**Positives** — relecture et historique gratuits ; les composants de bloc sont
typés, donc une leçon ne peut pas contenir un bloc inexistant ; le contenu est
sauvegardé par le simple fait d'exister dans Git ; publication = déploiement,
donc rejouable et réversible.

**Négatives** — publier une correction de faute exige un déploiement (atténué :
les déploiements sont automatisés et durent quelques minutes) ; un contributeur
non technique ne peut pas éditer seul (accepté : la rédaction est faite par le
propriétaire du projet) ; le contenu grossit le dépôt (le texte est léger, les
images vont en stockage objet).

**Garde-fou** — un test en CI vérifie que tout `slug` référencé en base existe
en fichier, et inversement. Une leçon supprimée par erreur fait échouer la
construction plutôt que de casser silencieusement la progression d'un
utilisateur.

## Réversibilité

**Moyenne à élevée.** Passer plus tard à un CMS reviendrait à importer le MDX
(structuré et typé, donc importable par script). L'inverse — extraire un
contenu enfoui dans une base sans historique — serait bien plus douloureux.

## Addendum (M2) — numérotation explicite des blocs

La reprise exacte d'une leçon (rouvrir au bloc quitté) suppose une ancre
stable par bloc. Deux options : analyser l'AST MDX (`remark`/`mdast`) pour
déduire l'index de chaque bloc, ou exiger que chaque composant de bloc porte
explicitement `n={N}` et valider cette numérotation par expression régulière
(`apps/web/src/lib/content/blocks.ts`).

La seconde a été retenue. Une analyse d'AST compterait les blocs correctement
mais n'apporte rien de plus pour ce seul besoin, au prix d'une dépendance et
d'une étape de compilation supplémentaires. La numérotation explicite, elle,
sert aussi d'ancre HTML stable (`id="bloc-3"`) sans étape de post-traitement,
et détecte une erreur de copier-coller d'auteur (un bloc dupliqué garde le
même `n`) — un cas qu'une simple analyse d'AST ne détecterait pas non plus
sans une vérification dédiée équivalente.

**Contrepartie assumée** : l'auteur doit numéroter et renuméroter à la main.
Le script de synchronisation refuse tout `.mdx` mal numéroté avec un message
qui identifie le bloc fautif et la correction attendue — le coût se paie à
l'écriture, jamais à l'exécution.

## Addendum (M7) — un piège YAML invisible à la relecture

En rédigeant les 54 fiches de la bibliothèque, plusieurs listes de
frontmatter (`pros`, `cons`, `mistakes`) ont échoué à la synchronisation avec
`Expected string, received object` — alors que le fichier, relu, semblait
parfaitement correct. Cause : une phrase comme `- Empilable : gain de place…`
contient un deux-points précédé et suivi d'un espace, que le parseur YAML
(`gray-matter`) interprète comme une paire clé/valeur imbriquée plutôt que
comme une chaîne — l'élément de liste devient silencieusement un objet
`{Empilable: "gain de place…"}` au lieu du texte attendu.

C'est un piège spécifiquement français : la typographie française impose une
espace avant le deux-points (« mot : texte »), exactement le motif qui
déclenche l'ambiguïté YAML. Corrigé au cas par cas en entourant de guillemets
les chaînes concernées (`"Empilable : gain de place…"`) plutôt qu'en
supprimant l'espace, pour ne pas sacrifier la typographie correcte. Aucune
validation automatique ne l'empêche à l'avenir — c'est le comportement de
YAML, pas un bug applicatif — donc un futur auteur peut retomber dans le même
piège ; seul un message d'erreur Zod explicite (`ContentValidationError`,
`frontmatter.ts`) le révèle, au moment de la synchronisation.
