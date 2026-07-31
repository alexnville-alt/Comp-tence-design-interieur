# ADR-0001 — Next.js 15 App Router avec React Server Components

**Statut** : Accepté · **Date** : 2026-07-31

## Contexte

L'application mélange trois natures de pages très différentes :

- des pages de **contenu long** (leçons, fiches bibliothèque) — beaucoup de
  texte et d'images, peu d'interactivité, à charger vite sur mobile ;
- des pages **hautement interactives** (atelier 2D, quiz, révisions) ;
- des flux **temps réel** (réponses de l'assistant IA en streaming).

Le budget de performance est contraignant (LCP < 2,5 s en 4G) alors que le
public consulte principalement sur mobile.

## Options envisagées

| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| **SPA React + Vite + API séparée** | Simple à comprendre, écosystème connu | Tout le JS part au client ; il faut construire et maintenir une API séparée ; SEO et LCP dégradés sur les pages de contenu |
| **Next.js Pages Router** | Stable, très documenté | Pas de RSC : la page leçon embarque du JS inutile ; streaming laborieux |
| **Next.js App Router + RSC** | Le contenu est rendu serveur, le JS client est réduit au strict interactif ; Server Actions = mutations typées sans API ; streaming natif adapté à l'IA | Modèle mental serveur/client à maîtriser ; certaines bibliothèques exigent `"use client"` |
| **Remix / React Router 7** | Excellente gestion des formulaires et du chargement | Écosystème plus restreint ; pas de RSC aussi mature |

## Décision

**Next.js 15, App Router, RSC par défaut.**

Le facteur décisif est la page leçon : elle représente l'essentiel du temps
d'usage, elle est majoritairement statique, et une SPA classique y enverrait
plusieurs centaines de kilo-octets de JavaScript pour afficher du texte. Avec
les RSC, seuls les blocs réellement interactifs (quiz, comparateur avant/après)
embarquent du code client.

Le streaming natif règle par ailleurs proprement l'affichage progressif des
réponses de l'assistant, sans infrastructure supplémentaire.

## Conséquences

**Positives** — page leçon sous 100 ko de JS ; pas d'API REST à construire et
documenter pour les cas simples ; `<Suspense>` permet d'afficher la structure
du tableau de bord avant les données lentes.

**Négatives** — il faut être rigoureux sur la frontière serveur/client (une
directive `"use client"` placée trop haut annule tout le bénéfice) ;
`react-konva` impose `ssr: false`, donc un chargement différé explicite pour
l'atelier ; certains outils de débogage sont moins matures côté RSC.

**Mitigation** — règle ESLint interdisant `"use client"` dans un fichier de
page, et budget de bundle vérifié en CI : la régression est détectée
mécaniquement, pas à l'œil.

## Réversibilité

**Moyenne.** La logique métier étant isolée dans `packages/domain` et les accès
externes derrière des ports, une migration vers un autre framework React
réécrirait la couche de présentation mais conserverait le cœur. Estimation :
2 à 3 semaines.
