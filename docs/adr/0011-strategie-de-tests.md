# ADR-0011 — Stratégie de tests et simulation des appels IA

**Statut** : Accepté · **Date** : 2026-07-31

## Contexte

Trois catégories de code posent des problèmes de test très différents :

1. **La logique métier** (FSRS, XP, géométrie, notation) — déterministe et
   critique : une erreur y est silencieuse et corrompt durablement la
   progression d'un utilisateur.
2. **Le canevas de l'atelier** — impossible à tester par le DOM : un canvas
   n'expose rien.
3. **Les appels IA** — non déterministes, payants, lents, et dépendants du
   réseau.

Une stratégie uniforme (« on écrit des tests ») ne dit rien d'utile ici. Il faut
décider **où** porte l'effort et **comment** on neutralise le non-déterminisme.

## Décision

### 1. La pyramide est volontairement déséquilibrée vers le domaine

| Niveau | Couverture visée | Justification |
|--------|------------------|---------------|
| `packages/domain` | **≥ 90 %** | Code pur, rapide à tester, et le plus coûteux en cas de bug |
| Server Actions / accès données | ~70 % | Testées sur un PostgreSQL jetable (Testcontainers), pas sur un simulacre de Prisma |
| Composants interactifs | ~60 % | Quiz, exercices, inspecteur de propriétés |
| E2E | 6 parcours | Ce qui casse le produit s'il tombe |

On ne vise **pas** un pourcentage global. Un chiffre unique pousse à tester ce
qui est facile (rendu de composants triviaux) plutôt que ce qui est risqué.

### 2. La géométrie se teste sans navigateur

Toute la logique du simulateur — surfaces, largeurs de circulation, collisions,
débattement de porte, magnétisme — vit dans `packages/domain/geometry` sous
forme de fonctions pures. Les tests sont des calculs, pas des interactions.

```ts
it("signale un passage principal sous 90 cm", () => {
  const scene = sceneAvec({ canape: { x: 0, y: 0, w: 220 }, table: { y: 78 } });
  expect(analyserCirculation(scene).alertes).toContainEqual(
    expect.objectContaining({ type: "passage_etroit", mesureCm: 78 }),
  );
});
```

Le composant React n'est alors qu'une couche de dessin : ce qu'on teste dans le
navigateur (Playwright) se limite à « le clic sélectionne », « la flèche
déplace de 1 cm », « le rechargement restaure la scène ».

### 3. L'IA est simulée par défaut, jamais par des chaînes figées

L'adaptateur factice ne renvoie pas du texte brut mais des objets **validés par
les mêmes schémas Zod** que la production. Conséquence : si un schéma évolue et
que le simulacre ne suit pas, les tests échouent — ce qui est exactement le
comportement souhaité.

```ts
export const fakeAiProvider: AiProvider = {
  async analyzeImage() {
    return { data: AnalysePhoto.parse(FIXTURE_SALON), usage: ZERO, costEuros: 0,
             model: "fake" };
  },
  // …
};
```

**Des tests de contrat identiques s'exécutent sur les deux adaptateurs.** Le
jeu réel n'est lancé qu'à la demande (`AI_LIVE=1`), manuellement, avant chaque
release — car il coûte de l'argent et n'est pas déterministe.

Ce qu'on vérifie sur le vrai fournisseur : que la réponse valide le schéma, que
le streaming produit bien des fragments, que le pré-filtrage de sécurité se
déclenche. Ce qu'on ne vérifie **pas** : le contenu exact de la réponse — ce
serait un test instable par nature.

### 4. L'accessibilité est un test, pas une relecture

axe-core est exécuté dans Playwright sur les 10 écrans clés, en clair et en
sombre. Zéro violation critique ou sérieuse est une condition de fusion. Le
contraste des tokens est en plus vérifié par un test unitaire sur les valeurs
OKLCH — une régression de thème est ainsi détectée avant même le rendu.

## Conséquences

**Positives** — CI totalement hors ligne et gratuite ; suite du domaine sous une
seconde, donc réellement exécutée pendant le développement ; l'accessibilité ne
dépend pas de la vigilance humaine.

**Négatives** — l'adaptateur factice est un artefact à maintenir : s'il diverge,
les tests rassurent à tort ; les tests de bout en bout du canevas restent
limités (on teste la logique, pas le rendu visuel).

**Mitigation** — les fixtures du simulacre sont générées **à partir de vraies
réponses** capturées lors des sessions `AI_LIVE`, puis figées. Elles restent
donc réalistes sans être instables.

## Réversibilité

**Élevée.** Rien ici n'est verrouillant : Vitest et Playwright sont
remplaçables, et l'essentiel — la logique métier isolée et testable — reste
valable quel que soit l'outil.
