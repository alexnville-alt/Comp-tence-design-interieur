# ADR-0002 — Tailwind CSS v4 + shadcn/ui

**Statut** : Accepté · **Date** : 2026-07-31

## Contexte

Le produit exige un mode clair **et** un mode sombre de qualité égale, une
identité visuelle propre (ni « site Bootstrap », ni « démo Material »), une
accessibilité AA vérifiable, et des composants complexes : dialogues, menus,
onglets, curseurs, sélecteurs de couleur, panneaux latéraux.

Contrainte particulière : sur un produit qui **enseigne la couleur**, la
gestion des thèmes ne peut pas être approximative.

## Options envisagées

| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| **MUI / Mantine / Chakra** | Très complet immédiatement | Identité visuelle imposée, coûteuse à effacer ; bundle lourd ; personnalisation en lutte contre le thème |
| **CSS Modules + composants maison** | Contrôle total | Il faut réimplémenter l'accessibilité de chaque composant — plusieurs semaines et des bugs subtils garantis |
| **Tailwind + Radix brut** | Léger, accessible | Aucun composant prêt : beaucoup de câblage répétitif |
| **Tailwind v4 + shadcn/ui** | Composants Radix accessibles **copiés dans le dépôt**, donc pleinement modifiables ; tokens en variables CSS natives | Les mises à jour ne sont pas automatiques ; il faut assumer le code copié |

## Décision

**Tailwind CSS v4 + shadcn/ui**, avec une couche de tokens dans
`packages/ui/tokens.css`.

Deux raisons dominent :

1. **Le code est à nous.** shadcn/ui n'est pas une dépendance mais un
   générateur : les composants atterrissent dans `components/ui/` et se
   modifient comme n'importe quel fichier du projet. Sur un produit avec des
   composants très spécifiques (nuancier, inspecteur de propriétés, carte
   mémoire), ne pas se battre contre une bibliothèque est décisif.
2. **Les thèmes reposent sur des variables CSS natives.** Tailwind v4 abandonne
   la configuration JavaScript au profit du CSS : changer de thème est une
   simple bascule d'attribut, sans classes dupliquées ni recompilation.

Les couleurs sont exprimées en **OKLCH** : sa luminosité est perceptuellement
uniforme, donc les ajustements de contraste entre thèmes sont prévisibles — ce
qui est faux en HSL. Cohérent, de surcroît, avec ce que le produit enseigne.

## Conséquences

**Positives** — bundle CSS réduit ; accessibilité Radix acquise ; thème sombre
sans duplication ; test automatisé possible sur les ratios de contraste des
tokens.

**Négatives** — les correctifs amont de shadcn/ui doivent être reportés
manuellement ; le HTML porte des classes verbeuses (atténué par l'extraction en
composants).

## Réversibilité

**Élevée.** Les composants étant dans le dépôt, il n'y a personne à quitter.
Remplacer Tailwind reviendrait à réécrire du style, sans toucher à la logique.
