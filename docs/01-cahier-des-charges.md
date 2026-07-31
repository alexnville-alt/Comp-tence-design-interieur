# 01 — Cahier des charges

> **Statut** : v1.0 — en attente de validation
> **Portée** : définit *quoi* construire et *pour qui*. Le *comment* est dans
> [02-architecture-technique.md](02-architecture-technique.md).

---

## 1. Vision produit

### 1.1 Problème

Apprendre le design d'intérieur en autodidacte est aujourd'hui inefficace :

- **Le savoir est éclaté** — Pinterest donne de l'inspiration mais pas de méthode ;
  YouTube donne des tutoriels isolés sans progression ; les livres donnent de la
  théorie sans mise en pratique ; les formations en ligne coûtent 500–3000 € et
  restent passives.
- **Aucun retour sur son travail** — un débutant qui aménage son salon n'a
  personne pour lui dire *pourquoi* sa composition ne fonctionne pas.
- **Le fossé théorie → chantier** — on peut connaître la règle du triangle
  d'activité en cuisine et ignorer totalement qu'un plan de travail se pose
  après le carrelage mural.

### 1.2 Proposition de valeur

Une plateforme unique qui fait trois choses qu'aucun produit existant ne combine :

1. **Une progression pédagogique structurée** (15 niveaux, 4 phases), avec
   répétition espacée et projets fil rouge — l'apprentissage est le produit, pas
   un blog.
2. **Un atelier de conception intégré** — on apprend une notion puis on
   l'applique *immédiatement* sur son propre plan, dans le même outil.
3. **Un mentor IA qui critique le travail réel** — l'utilisateur photographie sa
   pièce, l'IA analyse proportions, circulation, lumière et style, et propose des
   corrections argumentées, comme le ferait un architecte d'intérieur.

### 1.3 Ce que le produit n'est PAS

Cadrage explicite, pour éviter la dérive de périmètre :

| Ce n'est pas | Pourquoi |
|--------------|----------|
| Un logiciel de CAO professionnel (AutoCAD, SketchUp) | L'atelier sert l'apprentissage et le projet personnel, pas la production de plans d'exécution cotés opposables. |
| Une marketplace de mobilier | Aucune transaction, aucun partenariat commercial en V1. La bibliothèque est documentaire. |
| Un réseau social de décoration | Pas de fil d'actualité, pas de likes. Le partage éventuel (V2) est limité aux projets. |
| Un bureau d'études | Les recommandations sont pédagogiques. Tout ce qui touche à la structure, l'électricité ou le gaz renvoie explicitement à un professionnel qualifié. |

---

## 2. Utilisateurs

### 2.1 Persona principal — « Alex, le propriétaire ambitieux »

- 30–50 ans, vient d'acheter une maison ou un appartement à rénover.
- Budget travaux réel (30–120 k€), veut éviter les erreurs coûteuses.
- Zéro formation en design. Sait ce qu'il aime, pas pourquoi.
- Disponibilité : 3–5 h/semaine, en soirée, souvent sur mobile puis desktop pour
  les phases de conception.
- **Objectif** : concevoir lui-même chaque pièce, dialoguer d'égal à égal avec
  artisans et cuisinistes, et ne pas se faire vendre n'importe quoi.
- **Critère de succès** : « j'ai fini ma maison et je suis fier du résultat ».

### 2.2 Personas secondaires

| Persona | Besoin dominant | Impact sur le produit |
|---------|-----------------|-----------------------|
| **Camille, en reconversion** | Structurer un savoir professionnel, constituer un portfolio | Niveau 15 (projet pro) + export PDF de dossier |
| **Sam, locataire créatif** | Améliorer sans travaux lourds | Filtrage « sans travaux » sur la bibliothèque et les exercices |
| **Dominique, curieux** | Culture générale, plaisir d'apprendre | Parcours libre non bloquant, mode « exploration » |

### 2.3 Contraintes utilisateur qui dirigent la conception

- **Sessions courtes et fragmentées** → toute leçon doit être terminable en
  5–12 minutes et reprise exactement où on l'a laissée.
- **Mobile d'abord pour apprendre, desktop pour concevoir** → le simulateur est
  desktop/tablette ; les leçons, quiz et cartes mémoire sont pleinement mobiles.
- **Motivation fragile** → série (streak), objectifs hebdomadaires, badges,
  rappel du « pourquoi » (le projet personnel visible en permanence).

---

## 3. Besoins fonctionnels

Notation de priorité **MoSCoW** : `M` Must (V1), `S` Should (V1 si possible),
`C` Could (V2), `W` Won't (hors périmètre).

### 3.1 Compte & profil (`AUTH`)

| ID | Besoin | Prio |
|----|--------|------|
| AUTH-01 | Inscription/connexion e-mail + mot de passe, et OAuth Google | M |
| AUTH-02 | Onboarding : niveau estimé, objectif (maison entière / une pièce / culture), disponibilité hebdo, type de logement | M |
| AUTH-03 | Profil : thème clair/sombre/système, langue (FR seul en V1), unités (métrique) | M |
| AUTH-04 | Export de toutes ses données (RGPD) et suppression de compte | M |
| AUTH-05 | Réinitialisation de mot de passe par e-mail | M |

### 3.2 Parcours d'apprentissage (`LEARN`)

| ID | Besoin | Prio |
|----|--------|------|
| LEARN-01 | Carte de parcours visuelle des 15 niveaux, avec état (verrouillé / en cours / terminé) et progression | M |
| LEARN-02 | Un niveau = plusieurs chapitres ; un chapitre = plusieurs leçons | M |
| LEARN-03 | Une leçon = suite de blocs typés (texte, image annotée, schéma, comparatif avant/après, encadré « erreur fréquente », « conseil de pro », citation d'intérieur célèbre, emplacement vidéo) | M |
| LEARN-04 | Progression **explication simple → approfondissement** dans chaque leçon (blocs repliables « aller plus loin ») | M |
| LEARN-05 | Quiz : QCM, vrai/faux, association, ordonnancement, « repérer l'erreur sur l'image » (points cliquables) | M |
| LEARN-06 | Exercices interactifs : glisser-déposer de mobilier, sélection de palette, choix de matériau selon contrainte | M |
| LEARN-07 | Cas pratiques : énoncé + contraintes → l'utilisateur produit une réponse (texte + planche) corrigée par l'IA selon un barème | M |
| LEARN-08 | Défis hebdomadaires (contrainte imposée : budget serré, pièce sans fenêtre, 9 m²…) | S |
| LEARN-09 | Évaluation de fin de niveau, seuil de réussite paramétrable (défaut 70 %) déverrouillant le niveau suivant | M |
| LEARN-10 | Projet complet en fin de phase (4 projets jalons : pièce simple → pièce technique → étage → habitation) | M |
| LEARN-11 | Cartes mémoire avec répétition espacée (FSRS), file de révision quotidienne | M |
| LEARN-12 | Étude d'intérieurs célèbres : fiche analytique (Villa Savoye, Farnsworth, Barragán…) avec grille de lecture | S |
| LEARN-13 | Mode « exploration » : consulter n'importe quel niveau sans validation, sans gagner d'XP | S |

### 3.3 Simulateur / Atelier (`SIM`)

| ID | Besoin | Prio |
|----|--------|------|
| SIM-01 | Créer un logement, y créer des pièces (rectangulaires puis polygonales) | M |
| SIM-02 | Éditer les dimensions au clavier (cotation numérique) et à la souris | M |
| SIM-03 | Murs : épaisseur, cloison/porteur (déclaratif), hauteur sous plafond | M |
| SIM-04 | Ouvertures : portes (battante, coulissante, galandage) et fenêtres (position, largeur, allège) posées sur un mur | M |
| SIM-05 | Mobilier : placement, rotation, redimensionnement, alignement, magnétisme, empreinte au sol | M |
| SIM-06 | Couleurs & matériaux : appliquer sur murs, sol, plafond, meuble | M |
| SIM-07 | Application d'un style complet en un clic (« tester le style japandi ») | S |
| SIM-08 | Zones de circulation : calcul et affichage des passages < 60/90 cm, contrôle d'ouverture des portes | M |
| SIM-09 | Versions : enregistrer, nommer, dupliquer, restaurer | M |
| SIM-10 | Comparateur **avant/après** : deux versions côte à côte ou en volet glissant | M |
| SIM-11 | Vue 2D (plan) obligatoire ; vue 3D isométrique simple | S |
| SIM-12 | Vue 3D navigable et perspective réaliste | C |
| SIM-13 | Export : plan PDF coté, image PNG, liste de mobilier CSV | S |

### 3.4 Assistant IA (`AI`)

| ID | Besoin | Prio |
|----|--------|------|
| AI-01 | Chat contextuel : l'assistant connaît la leçon en cours et le projet ouvert | M |
| AI-02 | Réponses pédagogiques avec le *pourquoi* (règle invoquée) et 2–3 alternatives | M |
| AI-03 | Correction d'exercices ouverts selon barème, avec note, points forts, axes d'amélioration | M |
| AI-04 | Analyse de photo d'intérieur : style détecté, proportions, circulation, lumière, problèmes classés par gravité, améliorations chiffrées en effort/budget | M |
| AI-05 | Critique du projet du simulateur (à partir du JSON de scène, pas d'une image) | S |
| AI-06 | Générateurs : palette de couleurs, moodboard, liste mobilier, matériaux compatibles, plan d'éclairage, accessoires, végétaux | M |
| AI-07 | Mode « architecte accompagnateur » : suivi longitudinal du projet personnel, mémoire des décisions et des contraintes | S |
| AI-08 | Réponses en streaming, avec citations des fiches bibliothèque utilisées | M |
| AI-09 | Garde-fous : refus de conseil structurel/électrique/gaz engageant la sécurité, renvoi vers professionnel | M |
| AI-10 | Quota par utilisateur, compteur de coût, dégradation gracieuse si quota atteint | M |

### 3.5 Bibliothèque (`LIB`)

| ID | Besoin | Prio |
|----|--------|------|
| LIB-01 | Catalogue par catégorie : styles, matériaux, couleurs, essences de bois, pierres, revêtements, luminaires, canapés, tables, chaises, cuisines, salles de bain, escaliers, textiles, végétaux | M |
| LIB-02 | Fiche type : description, avantages, inconvénients, fourchette de budget, entretien, associations recommandées, incompatibilités, erreurs à éviter | M |
| LIB-03 | Recherche plein texte + filtres à facettes (budget, pièce, style, entretien, « sans travaux ») | M |
| LIB-04 | Relations entre fiches : « s'associe bien avec », « à éviter avec », « alternative moins chère » | M |
| LIB-05 | Favoris et collections personnelles | S |
| LIB-06 | Injection d'une fiche dans un moodboard ou dans le simulateur en un clic | S |
| LIB-07 | Volumétrie cible V1 : **≥ 300 fiches** dont 25 styles, 60 matériaux, 40 couleurs/palettes | M |

### 3.6 Progression & motivation (`PROG`)

| ID | Besoin | Prio |
|----|--------|------|
| PROG-01 | XP par action (leçon, quiz, exercice, révision, projet), niveaux d'utilisateur | M |
| PROG-02 | Badges (jalons, régularité, exploration, maîtrise thématique) | M |
| PROG-03 | Série de jours consécutifs + « gel de série » (1/semaine) | S |
| PROG-04 | Objectif hebdomadaire réglable (minutes ou leçons), barre de progression | M |
| PROG-05 | Temps passé mesuré par heartbeat (pas par onglet ouvert) | M |
| PROG-06 | Tableau de bord : prochaine action recommandée, révisions dues, avancement par niveau, points faibles par thème | M |
| PROG-07 | Recommandations personnalisées : réviser un thème faible, reprendre un projet abandonné | S |

### 3.7 Projet personnel (`PROJ`)

| ID | Besoin | Prio |
|----|--------|------|
| PROJ-01 | Créer un projet lié à son logement réel, distinct des projets d'exercice | M |
| PROJ-02 | Importer un plan (image ou PDF), le mettre à l'échelle par calibrage sur une cote connue, le tracer par-dessus | M |
| PROJ-03 | Importer des photos par pièce, avec notes | M |
| PROJ-04 | Saisir les dimensions relevées, pièce par pièce | M |
| PROJ-05 | Travailler pièce par pièce, chacune avec son état d'avancement | M |
| PROJ-06 | Plusieurs versions par pièce et comparaison de propositions | M |
| PROJ-07 | Journal de projet : décisions, budget estimé, questions ouvertes | S |
| PROJ-08 | Export dossier PDF (plans, moodboards, listes, budget) | S |
| PROJ-09 | Suivi de chantier : phases, ordre d'intervention, checklists | C |

---

## 4. Exigences non fonctionnelles

| Domaine | Exigence | Mesure |
|---------|----------|--------|
| **Performance** | LCP < 2,5 s et INP < 200 ms sur 4G/mobile milieu de gamme, pages leçon et tableau de bord | Lighthouse CI en PR, budget bloquant |
| | Simulateur fluide à 60 fps jusqu'à 150 objets | Test manuel + profil React |
| | Première réponse IA (premier token) < 2 s | Log applicatif p95 |
| **Disponibilité** | 99 % ; une panne de l'IA ne doit jamais bloquer l'apprentissage | Dégradation gracieuse testée |
| **Accessibilité** | WCAG 2.2 niveau AA | axe-core en CI + audit clavier manuel |
| | Contrastes vérifiés en clair **et** sombre ; les fiches couleur affichent le ratio | Tokens testés |
| **Sécurité** | Argon2id pour les mots de passe, sessions httpOnly/SameSite, CSRF sur mutations | Revue + `pnpm audit` en CI |
| | Uploads : type MIME vérifié côté serveur, taille max 15 Mo, EXIF strippé, antivirus si stockage public | Test d'intégration |
| | Aucune clé d'API exposée au client ; tout appel IA passe par le serveur | Revue de code |
| **Confidentialité** | Photos d'intérieur = données personnelles sensibles (domicile). Stockage privé, URL présignées à durée courte, jamais indexables | ADR-0008 |
| **Coût IA** | Plafond configurable par utilisateur et global, alerte à 80 % | Table `AiUsage` |
| **Qualité** | Couverture ≥ 80 % sur la logique métier (FSRS, XP, géométrie, quiz) | `vitest --coverage` bloquant |
| **i18n** | Textes externalisés dès M0 même si FR seul en V1 | `next-intl` |
| **Offline** | Consultation des leçons déjà vues et révisions en cache | PWA, V2 |

---

## 5. Parcours utilisateur clés

### 5.1 Première session (objectif : valeur perçue en < 10 minutes)

```
Inscription → Onboarding (3 écrans : objectif, logement, disponibilité)
  → Diagnostic express (5 questions, positionne le niveau de départ)
  → Tableau de bord personnalisé
  → Leçon 1.1 « Qu'est-ce qu'un espace réussi ? » (7 min)
  → Premier quiz réussi → première XP → premier badge
  → Invitation : « ajoute ta première pièce » (30 s, largeur/longueur)
```

### 5.2 Session type de retour (10–20 minutes)

```
Tableau de bord → « 12 révisions dues » (4 min, cartes mémoire)
  → Leçon suivante recommandée (8 min)
  → Exercice appliqué sur SA pièce, pas sur un exemple abstrait
  → Progression mise à jour, prochaine action proposée
```

### 5.3 Boucle projet (le cœur de la valeur)

```
Prendre une photo de la pièce → Analyse IA (style, problèmes, améliorations)
  → Ouvrir la pièce dans l'atelier → appliquer 2 des suggestions
  → Enregistrer la version « proposition B »
  → Comparer avant/après → demander une critique à l'IA
  → Itérer / valider → ajouter au dossier projet
```

---

## 6. Périmètre par version

### V1 — « Apprendre et concevoir » (objectif de cette itération)

Tous les besoins notés **M**, plus les **S** si le planning le permet.
Concrètement : les 15 niveaux avec au minimum 6 leçons chacun, l'atelier 2D
complet, l'assistant IA (chat + analyse photo + correction + générateurs), la
bibliothèque à 300 fiches, la progression gamifiée, le projet personnel.

### V2 — « Approfondir »

3D navigable, PWA hors-ligne, suivi de chantier, partage de projets, export
dossier professionnel enrichi, mode collaboratif (partager son projet avec un
artisan en lecture seule).

### Hors périmètre (Won't)

Marketplace, devis en ligne, mise en relation artisans, application native,
génération d'images photoréalistes par IA (coût et incertitude juridique —
réévalué en V2), plans d'exécution opposables.

---

## 7. Critères de succès

| Type | Indicateur | Cible V1 |
|------|-----------|----------|
| Apprentissage | Taux de complétion du niveau 1 | > 70 % des inscrits |
| Apprentissage | Score moyen aux évaluations de fin de niveau | > 75 % |
| Rétention | Retour en semaine 2 | > 40 % |
| Engagement | Sessions/semaine par utilisateur actif | ≥ 3 |
| Valeur | % d'utilisateurs ayant créé un projet personnel | > 50 % |
| Valeur | % ayant lancé au moins une analyse photo | > 60 % |
| Technique | p95 de la page leçon | < 1 s (serveur) |
| Coût | Coût IA moyen/utilisateur actif/mois | < 1,50 € |

---

## 8. Risques et parades

| Risque | Impact | Probabilité | Parade |
|--------|--------|-------------|--------|
| **Le contenu pédagogique est le vrai goulot** (15 niveaux × 6 leçons = 90+ leçons à rédiger) | Élevé | Élevée | Format MDX versionné, gabarit de leçon strict, moteur livré avant le contenu ; le niveau 1 sert de référence qualité ([voir 06](06-curriculum-pedagogique.md)) |
| Le simulateur dérive vers une CAO complète | Élevé | Élevée | Périmètre géométrique gelé dans [ADR-0006](adr/0006-simulateur-2d-avant-3d.md) : 2D, murs droits, pas de courbes, pas de multi-étage en V1 |
| Coût IA non maîtrisé (analyse photo = vision, coûteuse) | Moyen | Moyenne | Quotas, cache d'analyse par hash d'image, images redimensionnées avant envoi, mesure du coût par appel |
| Hallucination de l'IA sur données techniques (normes, prix) | Élevé | Moyenne | RAG sur la bibliothèque interne + citation obligatoire des sources ; mention « ordre de grandeur » sur tout budget |
| Dépendance à un fournisseur d'IA | Moyen | Faible | Couche port/adaptateur ([ADR-0005](adr/0005-couche-ia-interchangeable.md)) |
| Conseil dangereux (mur porteur, électricité) | Critique | Faible | Liste de sujets bloqués côté serveur, message de renvoi vers professionnel, avertissement permanent |
| Sous-estimation du volume bibliothèque | Moyen | Élevée | Fiches en MDX + frontmatter, générables par lot, revues manuellement par catégorie |

---

## 9. Conformité juridique

- **RGPD** — base légale : exécution du contrat (compte, progression) et intérêt
  légitime (mesure d'audience anonymisée). Export et suppression natifs
  (AUTH-04). Durée de conservation : compte inactif 24 mois → notification puis
  purge.
- **Photos d'intérieur** — traitées comme données personnelles. Non utilisées
  pour entraîner un modèle. Envoi au fournisseur IA mentionné explicitement dans
  la politique de confidentialité, avec consentement au premier usage.
- **Contenu** — toutes les leçons sont rédigées pour ce projet. Les intérieurs
  célèbres sont **décrits et analysés** (texte original), jamais illustrés par
  des photographies sous droits : on utilise des schémas redessinés.
- **Responsabilité** — mentions claires : outil pédagogique, ne remplace pas un
  maître d'œuvre, un bureau d'études ou un diagnostic technique. Toute
  intervention structurelle, électrique ou gaz relève d'un professionnel
  qualifié.
- **Accessibilité** — déclaration d'accessibilité publiée (WCAG 2.2 AA visé).

---

## 10. Questions ouvertes (à trancher avant M1)

| # | Question | Options | Recommandation |
|---|----------|---------|----------------|
| Q1 | Mono-utilisateur ou multi-utilisateurs dès V1 ? | (a) usage personnel, (b) SaaS multi-comptes | **(b)** — le modèle de données le supporte nativement, le surcoût est marginal, et ça n'engage à rien |
| Q2 | Fournisseur IA par défaut | Anthropic / OpenAI / Mistral / local | **Anthropic `claude-opus-5`** — vision + long contexte + qualité pédagogique ; l'adaptateur permet d'en changer |
| Q3 | Hébergement | Vercel + Neon / VPS Docker / Fly.io | **Vercel + Neon** en V1 (mise en route immédiate), image Docker maintenue en parallèle pour ne pas s'enfermer |
| Q4 | Vidéos en V1 | tournées / structure vide / externes | **Structure prévue, contenu vide** — le modèle de données et le lecteur existent, les vidéos arrivent après |
| Q5 | Monétisation | aucune / abonnement | **Aucune en V1** — mais séparer proprement `Plan`/quotas pour ne pas refactoriser plus tard |

> Ces cinq points sont les seuls qui bloquent réellement M1. Le reste du
> cahier des charges est actionnable en l'état.
