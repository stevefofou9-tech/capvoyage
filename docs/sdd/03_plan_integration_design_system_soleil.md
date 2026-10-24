# Plan d'intégration : design system « Soleil » (direction A2)

Statut : plan validé sur prototype, aucune ligne de l'application modifiée.
Référence visuelle : `prototypes/A2-soleil.html`, `prototypes/design-system.html`, banc de test `prototypes/qa-garde-fous.html`.

## 1. Objectif et critères de réussite

Remplacer l'interface actuelle par A2 sans toucher au domaine métier (`src/domain/*`), aux API ni aux données.

| Critère | Mesure |
|---|---|
| Aucun débordement de 320 à 430 px | Banc de test porté en CI : 0 problème sur l'application réelle avec textes et montants extrêmes |
| Formes et tailles cohérentes | 4 familles de forme, 3 rayons, 3 hauteurs ; aucune valeur en dur dans les nouveaux blocs CSS |
| Lisibilité plein soleil | Contrastes ≥ 4,5:1, texte ≥ 13 px, cibles ≥ 44 px, vérifiés par le banc |
| Aucune régression fonctionnelle | `npm test` vert à chaque étape, parcours navigateur (`tests/ui/*.cdp.test.js`) inclus |
| Hors ligne intact | Service Worker à jour, polices et icônes précachées |

## 2. Écarts entre le prototype et l'application

Mise à jour : E1, E2 et la fiche d'activité et l'assistant de création de E3 sont désormais prototypés dans `prototypes/A2-soleil.html` (menu « … » > Nouveau voyage, puces de filtre, icône de synchro, bouton Modifier d'une activité) et testés par le banc `qa-garde-fous.html`. Restent à traiter à l'implémentation : landing, connexion, profil, partage, taux de change, budget, contacts (formulaires), bandeau de mise à jour PWA, mode lecture seule.

| # | Écart | Risque | Proposition |
|---|---|---|---|
| E1 | **Filtre par type d'activité** : absent de la première version d'A2. | Régression d'une fonction du PRD. | **Prototypé** : bouton « Filtrer » à côté de « Voir les 21 jours », feuille de puces avec compteurs du jour, puce d'état avec croix, état vide « Afficher tous les types ». |
| E2 | **États de synchronisation** : la première version d'A2 n'avait que « enregistré » et « hors ligne ». Le produit promet *Enregistré / En attente / Conflit* (`#sync-indicator`, ADR-003). | Un conflit passerait inaperçu en icône seule. | **Prototypé** : trois états d'icône (nuage, nuage + compteur ambre, triangle rouge) ; le conflit ajoute un bandeau en tête d'écran ; la feuille Synchronisation reprend ADR-003 (« Restaurer ma version » ou « Garder celle du serveur », « Réessayer maintenant »). |
| E3 | **Écrans absents** (fiche d'activité et assistant de création : prototypés) : accueil/landing, assistant de création (3 étapes), connexion, profil, partage, taux de change, budget, fiche d'activité complète, contacts, tâches, bandeau de mise à jour PWA, mode lecture seule. | Incohérence visuelle. | Les traiter avec les composants Soleil (voir phase 4). Une passe de prototypage rapide de la fiche d'activité et de l'assistant est recommandée avant la phase 4. |

Décisions produit à confirmer (valeur par défaut entre parenthèses) :

1. Libellé de navigation « Préparatifs » devient « À faire » (oui, mis à jour dans PRD, guide utilisateur et tests).
2. Polices hébergées par nous (oui : aujourd'hui elles viennent de Google Fonts, ce qui contredit « zéro dépendance tierce » et casse l'hors-ligne).
3. En-tête de bureau avec onglets remplacé par le rail latéral dès 800 px (oui).
4. Export `.ics`, Partager, Réglages déplacés dans le menu « … » (oui, comme dans A2).
5. Le dossier `prototypes/` est conservé comme référence sous `docs/design/` (oui) ou supprimé après intégration.

## 3. Principes d'exécution

- **Restyler avant de restructurer.** On garde les identifiants et classes dont dépendent les tests (`.day-pill`, `.activity-card`, `.btn-done-act`, `.mobile-bottom-nav`, `.mobile-nav-btn[data-tab]`, `#btn-header-menu`, `#sync-indicator`, `#input-quick-activity-title`, `#form-quick-add-activity`, `<dialog>`). Le design change, les crochets restent.
- **Une étape = un commit livrable**, `npm test` vert, déployable seul.
- **Les `<dialog>` natifs sont conservés** et stylés en feuille basse (`::backdrop`, `showModal`) : accessibilité et tests `dialog[open]` préservés.
- **Jetons d'abord, avec alias.** Les noms actuels (`--primary`, `--bg-main`, `--radius-md`…) pointent vers les jetons Soleil : toute l'interface adopte les neutres chauds et les rayons d'un coup, sans toucher au balisage.

## 4. Phases

### Phase 1 · Fondations (taille M, aucun changement de structure) — réalisée le 24/10/2026

Résultat : `npm test` 197/197. Jetons Soleil et alias dans `src/ui/style.css`, 4 polices woff2 dans `src/ui/fonts/` (96 Ko), `src/ui/icons.js` (46 icônes, pas encore utilisé), Service Worker `v10`, CSP sans hôte tiers, cache long `immutable` pour les polices, tests `TC-UX-009` et `TC-UI-011 à 014`. Cliquets : 27 tailles de texte sous 13 px à ramener à 0 au fil des écrans ; aucun `border-radius` en dur.

1. **Jetons.** Remplacer le `:root` de `src/ui/style.css` par les jetons de `prototypes/shared/ds.css` (couleurs, échelle de texte 13 à 44, espacement, rayons, hauteurs, ombres), en gardant les anciens noms en alias. Rayons ramenés à 14, 22 et pilule.
2. **Polices hébergées.** Ajouter les fichiers woff2 de Public Sans et Atkinson Hyperlegible dans `src/ui/fonts/`, `@font-face`, retirer les liens Google Fonts de `index.html`.
3. **Icônes.** Créer `src/ui/icons.js` (module ES, jeu d'icônes de `prototypes/shared/icons.js`) et une fonction `icon(name, size)` ; aucune utilisation encore.
4. **Service Worker et build.** Ajouter polices et `icons.js` à la liste de préchargement de `sw.js`, incrémenter le nom de cache ; vérifier que le remplacement `?v=` du serveur couvre les nouveaux fichiers.
5. **Garde-fous.** Étendre `tests/ui/design_rules.test.js` : aucune couleur en dur ni `border-radius` en px dans les nouveaux blocs, aucun `font-size` sous 13 px ; ajouter un test « tout module UI importé est précaché » (équivalent du TC-UI-010 pour `src/ui`).

Vérification : `npm test`, parcours visuel desktop et mobile, contrastes des jetons.

### Phase 2 · Composants partagés (taille M)

Restyler les classes existantes pour qu'elles se comportent comme `ds.css` :

| Composant Soleil | Classe(s) actuelle(s) à restyler |
|---|---|
| Boutons (primaire, secondaire, WhatsApp, dense, large) | `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-sm` et les boutons WhatsApp (sélecteur à confirmer à la lecture du CSS) |
| Puces et statuts | `.cat-pill`, `.badge-category`, `.contact-pill-tag`, `.sync-status-badge` |
| Surface, liste groupée, ligne | `.card`, `.activity-card`, `.todo-item-card`, `.idea-card`, `.contact-card` |
| Coche ronde | `.btn-done-act`, `.todo-status-btn` |
| Champs et erreurs | `input`, `select`, `.form-group`, nouveau `.err` |
| Feuille basse | `.app-dialog` |
| Toast avec Annuler | `.toast`, `.toast-undo-btn` |

Règles de débordement appliquées d'office : `min-width: 0` sur les boîtes flex/grid, titres limités à 2 lignes, infos découpées par morceaux entiers, montants qui réduisent avec leur carte.

### Phase 3 · Coque et écran Programme (taille L, plus forte valeur)

1. **Barre haute et navigation** : titre du voyage discret, `#sync-indicator` en icône seule à 3 états (E2), menu « … » (Partager, Exporter .ics, Réglages, Déconnexion), barre basse à 4 libellés courts, rail latéral dès 800 px à la place de `.nav-tabs`.
2. **En-tête du jour** : grand titre « Aujourd'hui », semaine de 7 jours (les boutons gardent la classe `.day-pill`), grille des 21 jours en feuille, bouton Filtrer (E1).
3. **Carte « Ensuite »** : prolonge `#next-activity-banner` (heure restante, écrire au contact, « C'est fait »).
4. **Blocs du jour** : `renderTemporalBlock` produit des lignes groupées, les blocs vides deviennent une ligne « Ajouter ».
5. **Ajout rapide** : bouton flottant et feuille « Nouvelle activité » ; le formulaire garde `#form-quick-add-activity` et `#input-quick-activity-title`. Moment de la journée et contact déduits du texte (logique déjà dans le domaine : à confirmer, sinon petite fonction dans `ActivityService`).
6. **Idées** : lignes avec chevron et feuille « Placer l'idée » à la place de `<details id="ideas-panel">` ; `#ideas-count` conservé.
7. **Avant le départ** : en-tête « Départ dans N jours » avec carte de préparation, alimenté par `ReminderService`.

Tests à adapter : `v21.cdp.test.js` clique aujourd'hui un `.day-pill` « Jour 12 » ; avec la semaine de 7 jours il faut passer par la grille des 21 jours. Les assertions sur `.nav-tabs` et le nombre d'onglets visibles suivent le nouveau rail.

### Phase 4 · Autres écrans (taille L, découpable en 4 commits)

| Commit | Contenu |
|---|---|
| 4a À faire et Budget | Liste groupée, bandeau « plus rien ne bloque », grand titre et « + » rond, carte du solde, catégories à icônes, convertisseur en champs alignés, journal par jour |
| 4b Contacts | Ligne avec une action rapide (WhatsApp), détail au toucher, recherche, état vide avec « Ajouter ce contact » |
| 4c Fiches et dialogues | Fiche d'activité, dépense, contact, tâche, taux, budget, partage, profil, import de contacts, sélecteur « Avec qui » : feuilles basses, erreurs sous le champ avec la marche à suivre |
| 4d Entrée dans l'app | Landing, assistant de création en 3 étapes, connexion, mode lecture seule, bandeau de mise à jour |

### Phase 5 · Garde-fous en CI (taille M, peut démarrer dès la phase 2)

Porter `qa-garde-fous.html` en test navigateur (`tests/ui/layout.cdp.test.js`, via `tests/ui/cdp.js`) : voyage de démo enrichi de textes extrêmes, 4 largeurs (320, 360, 390, 430), tous les onglets et toutes les feuilles ; échec si débordement, texte coupé sans ellipse, cible sous 44 px, texte sous 13 px ou contraste insuffisant. Objectif : 0 problème.

### Phase 6 · Documentation et livraison (taille S)

- Regénérer `DESIGN.md` (jetons, composants, règles de composition) et mettre à jour `PRODUCT.md` si le libellé change.
- Écrire `docs/adr/ADR-010-design-system-soleil.md` (décision, alternatives écartées A/B/C, conséquences).
- PRD : version suivante, exigences REQ-UX mises à jour ; guide utilisateur et captures (`take_screenshots.js`).
- Déploiement : nouveau build, nom de cache du Service Worker incrémenté, vérification post-déploiement en production et sur une installation PWA existante (mise à jour fiable, ADR-009).

## 5. Ordre recommandé et livraisons

1. Compléter le prototype (E1, E2, fiche d'activité, assistant) : petit, évite des allers-retours en phase 4.
2. Phase 1 puis phase 2 : l'interface entière change déjà de peau, sans risque structurel.
3. Phase 5 en parallèle de la phase 3 : le filet de sécurité est en place avant les gros remaniements.
4. Phase 3, puis phase 4a à 4d.
5. Phase 6.

Chaque ligne est un déploiement possible : l'utilisateur voit une amélioration continue plutôt qu'un big bang.

## 6. Risques

| Risque | Parade |
|---|---|
| Tests navigateur liés aux anciens sélecteurs | Garder les crochets listés au § 3 ; adapter explicitement les 3 assertions du § phase 3 |
| 67 emojis et 77 `innerHTML` dans `app.js` (3 500 lignes) | Remplacement par `icon()` écran par écran, jamais en bloc ; l'échappement `escapeHtml` reste obligatoire |
| Cache navigateur ou Service Worker périmé après déploiement | Suivre ADR-009 : cache incrémenté, URLs versionnées, contrôle sur installation existante |
| Régression hors ligne (polices, icônes non précachées) | Test de précache des modules UI (phase 1) et vérification en mode avion |
| Le bandeau de conflit de synchro devient invisible | E2 : l'icône seule n'est jamais le seul signal d'un conflit |
| Texte réel plus long que prévu en production | Le banc de test injecte des valeurs extrêmes ; règles de coupe dans les composants |
