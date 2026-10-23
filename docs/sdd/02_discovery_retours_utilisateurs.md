# SDD — Phase 1 : Discovery (chantier « Premiers retours utilisateurs »)

**Date :** 23/10/2026 · **Entrée :** premiers retours d'usage réel (verbatim §2) · **Statut :** ✅ **validée le 23/10/2026** (Q1 à Q6 : recommandations retenues telles quelles). Spécifications livrées : [PRD v2.1](../PRD.md), [user stories](../user_stories.md), [ADR-007](../adr/ADR-007-activites-sans-jour-idees.md), [ADR-008](../adr/ADR-008-import-contacts-multi-sources.md), [cahier de test modules 20 à 24](../cahier_de_test.md). Développement : livré le 23/10/2026 (voir TASKS_PROGRESS, phase 16).
**Précédent chantier :** [`01_discovery.md`](01_discovery.md) (audit, sécurité, synchro, partage, mobile)

---

## 1. Pourquoi ce chantier

Le chantier précédent a rendu CapVoyage **fiable** (sécurité, hors-ligne, partage). Les premiers retours d'usage montrent qu'il reste **pénible à utiliser sur téléphone** : le produit tient sa promesse technique mais pas encore sa promesse d'ergonomie (« Mobile, d'une main », `PRODUCT.md`).

Constat structurant : **4 des 6 retours sont le même défaut** — trop d'étapes (ouvrir, choisir, valider) pour une action simple. Le chantier de référence est donc la **réduction de friction**, pas l'ajout de fonctions.

## 2. Retours bruts et reformulation en problèmes

| ID | Verbatim | Problème utilisateur reformulé | Cause constatée dans le code | Gravité |
|---|---|---|---|---|
| **R1** | « Beaucoup d'erreurs ou d'approximation sur les formes et textes de l'UI sur mobile, plein d'encombrement ; le design system et les règles de design sont à revoir (l'entête est dégueulasse) » | « Sur mon téléphone, l'écran est chargé, les éléments se marchent dessus et l'en-tête est laid » | En-tête `index.html:283-334` : logo, pays, titre, dates, **4 onglets**, pastille e-mail, indicateur de synchro et **3 boutons** (Partager, Configurer Voyage, Déconnexion) tous au même niveau ; la barre basse double déjà la navigation. `DESIGN.md` décrit des intentions, pas des règles de composition (hiérarchie, densité, nombre max d'actions par écran). Le chantier précédent a corrigé la **mesure** (zéro débordement, ≤ 25 %), pas la **conception**. | 🔴 |
| **R2** | « Choix des contacts dans activité : menu déroulant » | « Associer quelqu'un à une activité devrait se faire en un geste, pas dans une longue liste de cases à cocher ou un menu » | Fiche d'activité : nuage de cases (`edit-activity-contacts-list`) + création express ; ajout rapide : menu `@Contact` | 🟠 |
| **R3** | « Charger les contacts du répertoire dès la configuration, et choisir leur catégorie à ce moment » | « À la création du voyage, je dois ressaisir un par un des gens que j'ai déjà dans mon téléphone » | Étape 3 de l'assistant : saisie **unitaire** (nom, relation, ville). Import répertoire disponible **seulement** dans l'onglet Contacts, avec relation forcée à « Amis » (`app.js:2416-2425`) | 🟠 |
| **R4** | « Valider des tâches (statut) sans ouvrir — pour les activités aussi, peut-être » | « Cocher "Fait" doit se faire d'un tap sur la liste, sans ouvrir la fiche » | Tuile de tâche 100 % cliquable → ouvre `dialog-edit-todo` ; le statut n'est modifiable que dans la fiche. Idem pour le statut d'activité (`Effectué`) | 🔴 |
| **R5** | « Il faut pouvoir créer un "répertoire d'activités" pour les activités à planifier (sans leur affecter un jour à la création) » | « J'ai des idées (restaurant, visite) mais je ne sais pas encore quel jour : je ne veux pas devoir choisir » | **Contradiction avec la spec** : `REQ-2.1` impose « un titre **et un jour associé** » ; `ActivityService.addActivity` lève une erreur sans `dayId`. Le statut `À planifier` existe mais l'activité est quand même rattachée à un jour | 🔴 |
| **R6** | « Ouverture dynamique selon le jour + reminder activité à venir ? À challenger » | « À l'ouverture, je veux voir *aujourd'hui*, pas le Jour 1. Et être prévenu de ce qui arrive » | `state.activeDayNumber = 1` en dur (`app.js:26`). `ReminderService` produit un briefing du matin mais n'est affiché que dans l'appli ouverte | 🟠 |

## 3. Challenge des retours (analyse critique)

### R1 — Le vrai problème n'est pas l'en-tête, c'est l'absence de règles de design
Un correctif d'en-tête ne suffit pas : l'utilisateur dit explicitement que **les règles** sont à revoir. Retenu : enrichir `DESIGN.md` de **règles de composition mesurables** (voir REQ-UX-1 à 4), puis les appliquer partout, et les **tester** (un test peut compter les actions visibles d'un écran).
Proposition de principes (à valider) :
1. **Une action primaire par écran**, tout le reste en secondaire ou dans un menu.
2. **L'en-tête mobile ne porte que l'identité et un menu** : titre du voyage + dates sur une ligne, un bouton « ⋯ » regroupant Partager / Nouveau voyage / Profil / Déconnexion. Les onglets vivent **uniquement** dans la barre basse.
3. **Pas de doublon de navigation** (onglets en-tête **et** barre basse aujourd'hui).
4. **Densité** : pas plus de N éléments interactifs visibles hors contenu, textes tronqués avec ellipse jamais coupés ni chevauchés, vocabulaire court (« Configurer Voyage » → « Nouveau »).

### R2 — « Menu déroulant » : le retour est ambigu, deux lectures
Il peut signifier (a) « je veux **un** menu déroulant à la place des cases » ou (b) « le menu déroulant actuel est pénible ». Les cases à cocher servent le cas **multi-contacts** (REQ-3.3) ; un `<select>` natif ne le fait pas. **Recommandation :** un **sélecteur à recherche** (feuille basse, champ de filtre, contacts récents en tête, tap = ajout d'une pastille, « + Nouveau » en bas) — c'est un « menu déroulant » en usage mais multi-sélection et rapide. **Question ouverte Q1.**

### R3 — Utile, mais l'API navigateur limite la promesse
`navigator.contacts.select` (Contact Picker API) existe **uniquement sur Chrome Android** ; **absente sur iOS Safari et sur ordinateur**. Sans alternative, la fonction serait invisible pour une partie des utilisateurs. Plan en deux niveaux :
- **Chrome Android :** Contact Picker dans l'assistant, puis **écran de tri** : chaque contact importé reçoit sa relation (Famille / Ami / Guide / Chauffeur / Collègue / Autre) en un tap, avec « Tout en Ami » et « Ignorer ».
- **Partout ailleurs :** import d'un fichier **vCard (.vcf)** (export natif de l'app Contacts iOS/Android/PC) et saisie en lot (un nom par ligne). Même écran de tri.
Aucune donnée du répertoire n'est envoyée avant que l'utilisateur ait validé (confidentialité : seuls les contacts conservés sont enregistrés).

### R4 — Retour évident, à généraliser avec prudence
- **Tâches :** case/pastille de statut **sur la tuile**, tap = bascule `À faire → Fait` (le tap sur le reste de la tuile ouvre toujours la fiche ; `stopPropagation`, règle `GEMINI.md`). Le statut intermédiaire `En cours` reste accessible dans la fiche et par appui long. Annulation par toast (déjà en place).
- **Activités :** oui pour « Effectué », mais **pas de case sur la tuile** (encombrement, cf. R1). Proposition : geste ou bouton ✓ discret réservé aux activités **du jour ou passées**. À challenger **Q2**.

### R5 — Plus gros changement : il casse un invariant du modèle
Introduire un « répertoire d'activités » (en pratique un **bac à idées**) change `REQ-2.1` : une activité peut exister **sans jour** (`dayId = null`). Conséquences à traiter explicitement :
| Impact | Décision proposée |
|---|---|
| Modèle | `Activity.dayId` devient optionnel. Une activité sans jour est dite **« à placer »** |
| Statut | « À planifier » = sans jour ; passe à un statut daté dès qu'un jour est affecté (à valider **Q3** : lier ou non statut et jour) |
| Interface | Nouvel espace « Idées » (un onglet n'est **pas** souhaitable vu R1) : section repliable en tête du Programme, ou volet accessible depuis le bouton d'ajout. Action « Placer le… » → choix du jour (et optionnellement du bloc) |
| Ajout rapide | Un second choix à l'ajout : « Ajouter au jour N » **ou** « Ajouter aux idées » |
| Budget | Une dépense peut être rattachée à une idée (`activityId`) sans jour : la date comptable est déjà découplée (`BudgetEngine`) → pas de blocage |
| Export `.ics` | Les idées sans jour sont **exclues** de l'export |
| Partage | Les idées font partie de la section « Programme » ; **à confirmer Q4** : visibles ou non du lecteur |
| Synchro | Aucun impact (voyage complet versionné, ADR-003) |
| Migration | Aucune : les activités existantes ont toutes un jour |

### R6 — Deux sujets de natures différentes à séparer
1. **Ouverture dynamique (jour courant) :** simple, forte valeur, risque faible. Pendant le séjour → ouvrir sur **aujourd'hui** ; avant le départ → Jour 1 avec un compte à rebours ; après le retour → dernier jour. Doit tenir compte du **fuseau du lieu du séjour**, pas seulement de l'appareil (un voyageur à Douala a UTC+1).
2. **« Reminder activité à venir » (challenge demandé) :** trois niveaux très différents.
| Niveau | Principe | Coût / risque | Décision proposée |
|---|---|---|---|
| A. **Dans l'appli** | À l'ouverture : « Prochaine : Déjeuner chez Paul dans 1 h 30 » en tête du jour courant | Faible, 100 % hors-ligne, aucune permission | ✅ **Retenu (Must)** |
| B. **Notification locale** | `Notification` API déclenchée par le Service Worker | Moyen : permission à demander, **déclenchement fiable impossible sans l'appli ouverte** (pas de planification en arrière-plan sans Notification Triggers, non standard) ; iOS limité aux PWA installées | ⏸ **Différé** : promesse non tenable de façon fiable |
| C. **Push serveur (Web Push)** | Le serveur envoie au bon moment | Élevé : clés VAPID, abonnements, rappel serveur, vie privée ; **viole « zéro dépendance d'exécution »** si on ajoute une lib push | ❌ **Hors périmètre** |
| D. **Rappel via calendrier** | Export `.ics` existant, avec alarmes (`VALARM`) 1 h / 1 jour avant | **Quasi nul**, fiable (le calendrier du téléphone notifie, même hors-ligne), déjà sur l'architecture | ✅ **Retenu (Should)** : ajouter des alarmes au `.ics` |

Argument : l'utilisateur voyage avec un téléphone qui a **déjà** un calendrier fiable ; s'appuyer dessus (D) tient la promesse sans construire une infrastructure de notifications. **Question ouverte Q5.**

## 4. Décisions de cadrage proposées

| # | Décision | Statut |
|---|---|---|
| D1 | Chantier orienté **réduction de friction** ; aucune nouvelle dépendance npm | proposé |
| D2 | R1 devient une exigence **transverse** : règles de composition dans `DESIGN.md` (v2) + test automatisé de densité, appliquée en premier car elle conditionne la forme de R2/R4/R5 | proposé |
| D3 | R5 : modèle `dayId` optionnel + espace « Idées » sans nouvel onglet | proposé |
| D4 | R3 : Contact Picker (Android) **+ vCard + saisie en lot** avec écran de tri unique | proposé |
| D5 | R6 : jour courant (Must) + rappel in-app (Must) + alarmes `.ics` (Should) ; pas de push | proposé |
| D6 | R4 : statut en un tap sur les tâches (Must) ; activités limitées à « Effectué » sur jour courant/passé (Should) | proposé |

## 5. Priorisation (MoSCoW) et ordre de réalisation

| Ordre | Lot | Retours | Priorité | Dépend de |
|---|---|---|---|---|
| 1 | **Design system v2 + en-tête mobile** | R1 | Must | — |
| 2 | **Statut en un tap** (tâches, puis activités) | R4 | Must | 1 (place des contrôles) |
| 3 | **Bac à idées** (activités sans jour) | R5 | Must | 1 |
| 4 | **Sélecteur de contacts à recherche** | R2 | Should | 1 |
| 5 | **Jour courant à l'ouverture + prochaine activité** | R6 (A) | Must | 3 (ignorer les idées) |
| 6 | **Import répertoire + tri par catégorie à la configuration** | R3 | Should | 4 (même composant de tri) |
| 7 | **Alarmes dans l'export `.ics`** | R6 (D) | Could | 3 |

## 6. Questions ouvertes (à trancher avant le PRD)

| ID | Question | Recommandation |
|---|---|---|
| **Q1** | R2 : « menu déroulant » = sélecteur à recherche multi-sélection ? | Oui |
| **Q2** | R4 : valider une **activité** d'un tap sur la tuile ? Où (case, geste) ? | Bouton ✓ discret, activités du jour ou passées uniquement |
| **Q3** | R5 : une activité qui reçoit un jour passe-t-elle automatiquement de « À planifier » à « Confirmé » ? | Non : le statut reste manuel ; « sans jour » est un état distinct du statut |
| **Q4** | R5 : le lecteur d'un lien de partage voit-il les idées ? | Non par défaut (brouillon personnel) |
| **Q5** | R6 : accepte-t-on de **ne pas** faire de notification push (alarmes calendrier à la place) ? | Oui |
| **Q6** | R1 : souhaitez-vous conserver la barre d'onglets haute sur ordinateur (≥ 768 px) tout en la retirant sur mobile ? | Oui |

## 7. Contraintes

Identiques à [`01_discovery.md` §6](01_discovery.md) : zéro framework, zéro dépendance d'exécution, temporalité lâche, pas de mot de passe, ton rassurant ; `GEMINI.md` (modales 88vh + CTA sticky, tuiles cliquables avec `stopPropagation`, revue statique **+** écran réel CDP) ; `DESIGN.md` (cibles ≥ 44 px). Compatibilité des données : aucune migration pour R5 (champ ajouté en option).

## 8. Hors sujet pour ce chantier

Notifications push et Web Push · synchronisation du répertoire en continu · fusion/dédoublonnage automatique de contacts · découpage de `app.js` (reporté, mais le composant de sélection de contacts et de tri devra être écrit comme module séparé pour ne pas aggraver A7) · thème sombre.

## 9. Suite SDD prévue (après validation de ce document)

1. **PRD v2.1** : REQ-UX-1 à 4 (règles de design mesurables), REQ-2.1 révisé (jour optionnel), REQ-2.4 (bac à idées), REQ-2.5 (statut rapide), REQ-3.5 (sélecteur), REQ-3.6 (import répertoire + tri), REQ-7.5 (jour courant), REQ-7.6 (rappel in-app) et REQ-7.7 (alarmes `.ics`) ; NFR-1 complété.
2. **User stories** : EPIC 9 (Ergonomie), EPIC 3 amendé (bac à idées), EPIC 4 amendé (import).
3. **ADR-007** : activité sans jour (modèle, partage, export). **ADR-008** : import de contacts multi-sources.
4. **Cahier de test v2.1** : modules TC-UX, TC-IDEA, TC-QS (statut rapide), TC-CTX (contacts), TC-NOW (jour courant) + parcours CDP à 375 px.
5. **Développement** dans l'ordre du §5, un lot = un commit, tests verts avant le lot suivant.
