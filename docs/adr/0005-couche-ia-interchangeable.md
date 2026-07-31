# ADR-0005 — Couche IA en port/adaptateur, Anthropic par défaut

**Statut** : Accepté · **Date** : 2026-07-31

## Contexte

L'IA est utilisée pour cinq fonctions distinctes : chat pédagogique, correction
d'exercices ouverts, analyse de photos (vision), générateurs (palettes,
moodboards, listes), critique de projet.

Trois contraintes cadrent le choix :

1. Le marché des modèles évolue vite — s'enfermer dans un SDK serait un pari
   coûteux.
2. Le coût doit être mesuré à l'appel près et plafonné.
3. **Une panne du fournisseur ne doit pas empêcher d'apprendre.**

## Options envisagées

| Option | Verdict |
|--------|---------|
| **Appeler le SDK directement dans les composants** | Le plus rapide à écrire, et le plus coûteux ensuite : SDK dispersé dans tout le code, tests impossibles sans réseau, changement de fournisseur = réécriture générale. Écarté. |
| **Utiliser une bibliothèque d'abstraction générique** | Abstraction déjà faite, mais alignée sur le plus petit dénominateur commun : les spécificités qui comptent ici (cache de prompt, `effort`, sorties structurées, vision) sont mal exposées. Écarté. |
| **Port maison + adaptateurs** | Trois interfaces à écrire et maintenir, mais contrôle total et tests hors ligne. **Retenu.** |

## Décision

Un port `AiProvider` à **trois méthodes** — `streamChat`, `complete`
(structuré), `analyzeImage` — dans `packages/ai`, avec deux adaptateurs livrés :
**Anthropic** (production) et **factice** (développement et CI).

Modèle par défaut : **`claude-opus-5`**, retenu pour la vision native
(indispensable à l'analyse photo, fonctionnalité différenciante), le contexte
étendu (le contexte projet accumule vite plusieurs milliers de tokens) et la
qualité d'explication pédagogique. Tarif : 5 $ / MTok en entrée, 25 $ / MTok en
sortie.

Trois choix d'implémentation notables :

- **Streaming systématique.** Au-delà d'environ 16 000 tokens de sortie, une
  requête non streamée risque un dépassement de délai HTTP. Comme on veut de
  toute façon un affichage progressif, on streame partout.
- **Mise en cache du prompt système.** Notre prompt système (règles
  pédagogiques, garde-fous, format) est long et stable : c'est le cas d'usage
  exact du cache de préfixe. **Conséquence contraignante** : aucune donnée
  variable (date, identité, contexte de leçon) ne doit y être interpolée, sinon
  le cache ne se déclenche plus jamais. Le variable va dans les messages.
- **Sorties structurées obligatoires.** Toute réponse alimentant l'interface
  passe par un schéma Zod. On ne parse jamais du texte libre pour en extraire
  des données.

## Conséquences

**Positives** — CI entièrement hors ligne grâce à l'adaptateur factice ;
comptabilité des coûts centralisée en un point ; changement de modèle par
configuration ; on peut router une tâche simple vers un modèle moins cher sans
toucher au métier.

**Négatives** — le port est un plus petit dénominateur commun : exploiter une
fonctionnalité très spécifique à un fournisseur demandera d'élargir
l'interface ; l'adaptateur factice doit être maintenu en cohérence, sinon les
tests deviennent mensongers.

**Mitigation** — des tests de contrat identiques s'exécutent sur les deux
adaptateurs ; une suite « en direct » (`AI_LIVE=1`) est lancée manuellement
avant chaque release.

## Réversibilité

**Élevée par construction** — c'est précisément l'objet de cet ADR. Changer de
fournisseur = un nouvel adaptateur + faire passer les tests de contrat.
Estimation : 2 à 3 jours.
