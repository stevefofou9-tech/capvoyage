# ADR-010 : Design system « Soleil » (direction A2)

**Statut :** Accepté, phase 1 implémentée (24/10/2026) · **Date :** 24/10/2026

## Contexte
Les premiers retours d'usage signalaient une interface encombrée sur mobile. L'audit a montré que la direction visuelle de l'époque débordait sous 381 px de large (téléphones à 320 et 360 px), utilisait 8 rayons et 4 hauteurs de contrôle différents, des emojis comme icônes, et chargeait ses polices depuis Google Fonts (contraire à « zéro dépendance tierce » et cassé hors ligne).

Trois directions ont été prototypées (`prototypes/`). La direction A (« Aujourd'hui d'abord ») a été retenue, reconstruite en A2 sur un vrai système de jetons, puis complétée (filtre par type, états de synchro, fiche d'activité, assistant de création) et vérifiée par un banc de test de mise en page : 0 problème sur 72 combinaisons écran × largeur.

## Décision
1. **Jetons d'abord, avec alias.** `:root` de `style.css` définit les jetons Soleil (couleurs, échelle de texte, espacement, formes, hauteurs, ombres). Les anciens noms (`--primary`, `--bg-main`, `--radius-md`…) pointent vers eux : l'interface adopte les neutres chauds et les rayons sans toucher au balisage, puis les alias sont retirés écran par écran.
2. **Quatre familles de forme** (cercle, pilule, `--r-md` 14 px, `--r-lg` 22 px) et **trois hauteurs de contrôle** (44, 48, 56 px).
3. **Polices hébergées** (`src/ui/fonts/`, woff2 latin, SIL OFL). Le nom du fichier porte la version : cache `immutable` d'un an côté serveur. CSP resserrée (`style-src` et `font-src` en `'self'`).
4. **Icônes** : module `src/ui/icons.js` (SVG dessinés, un seul trait), en remplacement progressif des emojis.
5. **Garde-fous testés** : jetons obligatoires, aucun `var()` orphelin, contrastes calculés, aucun `border-radius` en dur, cliquet sur le texte sous 13 px (`TC-UX-009`) ; assets précachés et sans service tiers (`TC-UI-011 à 014`).
6. Service Worker `capvoyage-cache-v10` (ADR-009 : le changement de nom de cache déclenche la mise à jour des clients installés).

## Alternatives écartées
- **B « Cap »** (tableau de bord) et **C « Journal »** (saisie unique en bas) : plus de rupture avec les habitudes, jugées moins sûres. Leurs idées restent disponibles (accueil de B pour l'avant-départ, bascule FCFA/€ de C).
- **Réécriture complète du CSS d'un coup** : trop risquée pour les 190 tests existants et pour une application déjà installée chez des utilisateurs.

## Conséquences
- ➕ Une seule source de vérité visuelle, vérifiable par les tests, et l'application fonctionne identiquement hors ligne (polices comprises).
- ➕ Le test de mise en page du prototype peut être porté en CI (phase 5 du plan).
- ➖ Pendant la migration, les alias et les jetons coexistent ; la dette (27 tailles de texte sous 13 px, couleurs en dur hors `:root`) n'est plafonnée que par des cliquets, à résorber en phases 2 à 4.

Plan détaillé : `docs/sdd/03_plan_integration_design_system_soleil.md`.
