---
name: CapVoyage
description: Compagnon nomade pour séjours exigeants — design system « Soleil » (neutres chauds, un seul accent cuivre, quatre familles de forme)
colors:
  paper: "#f8f5f0"
  surface: "#fffdfa"
  sunken: "#f0ebe2"
  line: "#e7e0d4"
  line-strong: "#c9bfae"
  ink: "#1f1a15"
  ink-2: "#51483d"
  ink-3: "#6a5f52"
  accent: "#b93807"
  accent-press: "#94290a"
  accent-soft: "#fbece1"
  accent-ink: "#8a2c07"
  pos: "#1d6b3a"
  pos-soft: "#e4f1e7"
  pos-ink: "#14502b"
  warn: "#855400"
  warn-soft: "#fdf0d0"
  warn-ink: "#5c3a00"
  neg: "#b3261e"
  neg-soft: "#fbe7e4"
  focus: "#1a4fd6"
typography:
  display:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontWeight: 800
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Atkinson Hyperlegible, Public Sans, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  md: "14px"
  lg: "22px"
  pill: "9999px"
spacing:
  grid: "4px"
  control-dense: "44px"
  control-default: "48px"
  control-large: "56px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "{spacing.control-default}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "{spacing.control-default}"
---

# Design System : CapVoyage « Soleil »

Décision : [ADR-010](docs/adr/ADR-010-design-system-soleil.md). Prototypes de référence : `prototypes/` (page `design-system.html`, banc de test `qa-garde-fous.html`). Plan d'intégration : [docs/sdd/03_plan_integration_design_system_soleil.md](docs/sdd/03_plan_integration_design_system_soleil.md).

## Overview

CapVoyage accompagne des séjours de 2 à 4 semaines à l'étranger, d'une main, au soleil, avec un réseau incertain. L'interface répond à quatre contraintes :

1. **Lisibilité en plein soleil.** Fond mat chaud (`paper`), encre brune profonde (`ink`, 15,9:1), contrastes calculés et testés, texte jamais sous 13 px.
2. **Une main.** Navigation basse sur téléphone, cibles de 44 px au minimum (48 par défaut), actions rattrapables (toast « Annuler »).
3. **Aucun débordement.** De 320 à 430 px et sur grand écran, avec des noms, des titres et des montants très longs : test `TC-LAY`.
4. **Hors ligne.** Aucune ressource tierce : polices et icônes sont servies par l'application et précachées.

## Colors

- **Neutres chauds** : `paper` (fond d'écran), `surface` (cartes, listes, feuilles), `sunken` (champs, pistes), `line` (filet 1 px), `line-strong` (contour de contrôle 1,5 px).
- **Texte** : `ink` (principal), `ink-2` (secondaire, 8,4:1), `ink-3` (discret, 5,7:1, jamais pour une information critique).
- **Accent unique** : `accent` (cuivre) réservé à l'action principale, au jour sélectionné et à l'état actif. `accent-soft` / `accent-ink` pour les fonds d'accentuation (prochaine activité, puce active, icônes de section).
- **Sémantiques** : `pos` (fait, WhatsApp, solde sain), `warn` (hors ligne, échéance), `neg` (bloquant, erreur, conflit), `focus` (anneau de focus bleu, distinct de l'accent).
- Un rôle = une couleur. Aucune couleur décorative.

## Typography

Échelle fixe de rapport 1,2 : `caption` 13 · `small` 14 · `body` 16 · `title-s` 18 · `title` 22 · `headline` 28 · `large` 34 (titres d'écran) · `display` 44. Trois graisses (400, 700, 800). Public Sans pour les titres et les chiffres clés, Atkinson Hyperlegible pour le reste. Chiffres tabulaires. Titres d'activités limités à 2 lignes.

## Layout

- **Téléphone (≤ 768 px)** : en-tête d'une ligne (boussole, titre discret, synchro en icône, menu « ⋯ »), barre basse à 4 libellés courts (Programme, À faire, Budget, Contacts), colonne unique, grille de 4 px, gouttière de 16 px.
- **Ordinateur (> 768 px)** : barre latérale de 256 px (marque, titre, onglets, compte et actions), contenu centré de 760 px.
- **Programme** : prochaine activité en carte, semaine défilante de jours (jour courant cerclé), titre « Aujourd'hui » ou date longue, filtres en puces défilantes, saisie rapide (champ + « Avec qui », « Idée », « Ajouter »), quatre blocs (À caler seulement s'il y a quelque chose à caler, Matin, Après-midi, Soirée), idées en bas.

## Elevation & Depth

Trois niveaux d'ombres neutres chaudes : `e1` (cartes, listes), `e2` (menus, toasts), `e3` (feuilles basses). Une ligne dans une liste n'a jamais d'ombre ni de rayon : la surface arrondit, un filet inséré (qui démarre après l'icône) sépare les lignes.

## Shapes

Quatre familles, pas une de plus :
- **cercle** : avatars, coches, actions icône ;
- **pilule** (`--r-pill`) : puces, statuts, indicateur de navigation ;
- **`--r-md` 14 px** : boutons, champs ;
- **`--r-lg` 22 px** : surfaces (listes, cartes, feuilles).

Trois hauteurs de contrôle : 44 (dense), 48 (par défaut), 56 (principal).

## Components

- **Ligne de liste** (activité, tâche, contact, dépense, idée) : zone de tête (coche ronde, avatar ou icône), titre (2 lignes max), infos par morceaux entiers (`.frags` / `.frag`), action de fin. Toucher la ligne ouvre la fiche.
- **Feuille basse** (`<dialog>` natif) : poignée de fermeture ronde, actions collantes en bas, erreurs sous le champ.
- **Synchro** : icône seule à trois états (`Enregistré`, `En attente`, `Conflit`), libellé pour lecteurs d'écran (`#sync-indicator`, `data-status`).
- **Icônes** : `src/ui/icons.js`, SVG à trait unique ; le HTML statique les déclare par `<span data-icon="nom">`.
- **Montants** : devise locale d'abord, repère en euros, jamais coupés (`.kpi-value` s'adapte à la largeur de sa carte).

## Règles de composition (v2.1, vérifiées par `tests/ui/`)

Elles répondent au premier retour d'usage : « beaucoup d'encombrement sur mobile, l'en-tête est à revoir ».

- **REQ-UX-1 · Une action primaire par écran.** Chaque écran et chaque modale n'a qu'un bouton `btn-primary` ; le reste est secondaire ou dans un menu.
- **REQ-UX-2 · En-tête mobile sobre (< 768 px).** Une ligne : marque, titre du voyage (ellipse), indicateur de synchro en icône, menu « ⋯ » (Partager, Nouveau voyage, Profil, Actualiser, Déconnexion). Les onglets n'existent que dans la barre basse. Sur ordinateur, les onglets sont dans la barre latérale. Hauteur maximale de l'en-tête : 15 % de l'écran.
- **REQ-UX-3 · Densité et texte.** Au plus 4 contrôles interactifs visibles dans l'en-tête ; libellés de 1 à 2 mots ; aucun texte coupé ou chevauché (ellipse). Toute cible tactile ≥ 44 px.
- **REQ-UX-4 · Jetons uniquement.** Couleurs, rayons, ombres et tailles viennent des variables `:root`. Le bloc CSS « Soleil » n'a aucune valeur en dur (test) ; les valeurs historiques sont plafonnées par un cliquet à résorber.
- **REQ-UX-5 · Aucun débordement (v2.2).** À 320, 360, 390, 430 et 1280 px, avec des textes et montants extrêmes, aucune page plus large que l'écran, aucun élément hors cadre, aucune cible sous 44 px (`TC-LAY`).
- **Listes d'actions.** Statut = un tap sur la coche avec annulation par toast ; sélection de personnes = feuille basse à recherche ; une longue liste se filtre, elle ne se parcourt pas.

## Do's and Don'ts

### Do's
- Garder les cibles tactiles à 44 px au minimum, 48 pour les boutons principaux.
- Afficher la monnaie locale en premier avec un repère d'origine.
- Permettre la fermeture des feuilles par le fond ou la touche Échap sans perte de données.
- Servir toute ressource (polices, icônes) depuis l'application : zéro dépendance tierce à l'exécution.
- Dire le problème et la marche à suivre dans les messages d'erreur.

### Don'ts
- Pas de couleur, de rayon ni d'ombre en dur dans le CSS nouveau.
- Pas d'emoji en guise d'icône : utiliser `icon()`.
- Pas de texte sous 13 px, pas d'information critique en `ink-3`.
- Pas de modale quand une action en ligne suffit.
- Pas de conflit de synchro signalé par la seule icône : l'icône est complétée par le message de l'application.
