---
name: CapVoyage
description: Compagnon nomade pour séjours exigeants — Surface Mobile Ergonomique & Carte Solaire
colors:
  primary: "#b93807"
  primary-hover: "#9a2c04"
  primary-light: "#ffedd5"
  primary-surface: "#fff7ed"
  neutral-bg: "#f8fafc"
  neutral-subtle: "#f1f5f9"
  card-bg: "#ffffff"
  text-main: "#0f172a"
  text-muted: "#334155"
  text-light: "#475569"
  border: "#cbd5e1"
  border-light: "#e2e8f0"
  whatsapp: "#15803d"
  whatsapp-light: "#dcfce7"
  danger: "#b91c1c"
  danger-light: "#fee2e2"
  warning: "#b45309"
  warning-light: "#fef3c7"
  info: "#1d4ed8"
  info-light: "#dbeafe"
typography:
  display:
    fontFamily: "Public Sans, system-ui, -apple-system, sans-serif"
    fontWeight: 800
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Atkinson Hyperlegible, Public Sans, system-ui, -apple-system, sans-serif"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  sm: "8px"
  md: "14px"
  lg: "18px"
  xl: "24px"
  full: "9999px"
spacing:
  touch-min: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.65rem 1.35rem"
    height: "{spacing.touch-min}"
  button-secondary:
    backgroundColor: "{colors.card-bg}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.md}"
    padding: "0.65rem 1.35rem"
    height: "{spacing.touch-min}"
---

# Design System : CapVoyage (Direction Carte Solaire)

## Overview

CapVoyage est un compagnon de voyage nomade et déconnecté conçu pour les séjours de 2 à 4 semaines à l'étranger (notamment en Afrique centrale et de l'Ouest : Cameroun, Sénégal, Côte d'Ivoire).

L'interface adopte la Direction Artistique **"Surface Mobile Ergonomique & Carte Solaire"** (Warm Touch Surface), calibrée pour :
1. **La manipulation nomade d'une main** : cibles tactiles $\ge 48\text{px}$, barre de navigation persistante au pouce sur smartphone, tuiles d'activités généreuses.
2. **La lisibilité en plein soleil (Outdoor WCAG AAA)** : fonds mats anti-reflets (`#f8fafc`), cartes blanches nettes (`#ffffff`), encre ardoise profonde (`#0f172a`, ratio 14:1) et chiffres tabulaires renforcés.
3. **La temporalité lâche en 4 blocs** (*À caler aujourd'hui, Matin, Après-midi, Soirée*) sans contrainte horaire rigide.
4. **La bimonnaie en direct** : affichage systématique des montants en monnaie locale (FCFA XAF/XOF, etc.) avec repère instantané en Euros.
5. **Le carnet relationnel WhatsApp** : boutons d'action rapide dédiés pour échanger avec les contacts locaux (famille, chauffeurs, guides).

## Colors

- **Primary (Orange Solaire Cuivré) - `#b93807`** : Couleur d'action unique réservée strictement aux éléments interactifs principaux (CTA, jour actif, boutons d'ajout). Offre un ratio de contraste supérieur à 5.5:1 sur blanc (WCAG AA pour le texte, AAA pour les composants d'interface).
- **Primary Hover (`#9a2c04`) & Active (`#7c2202`)** : États d'interaction francs au toucher.
- **Primary Light (`#ffedd5`) & Surface (`#fff7ed`)** : Voiles d'accentuation chaleureux pour les conteneurs d'activités de l'après-midi et badges sélectionnés.
- **Neutral Canvas (`#f8fafc`)** : Fond mat daylight anti-éblouissement supprimant les reflets agressifs du plein soleil sans tomber dans le piège du crème artificiel.
- **Neutral Subtle (`#f1f5f9`)** : Puits pour entrées de formulaire, rubans secondaires et barres d'onglets.
- **Card Background (`#ffffff`)** : Blanc pur mat pour une séparation optique nette des informations.
- **Borders (`#cbd5e1`)** : Liséré solide de 1.5px assurant des contours tranchés sous forte luminosité.
- **WhatsApp Leaf Green (`#15803d` / `#dcfce7`)** : Vert végétal direct pour la communication WhatsApp et les indicateurs de succès budgétaire.
- **Emergency Crimson (`#b91c1c` / `#fee2e2`)** : Alertes sanitaires obligatoires (vaccin fièvre jaune, visas).
- **Logistics Cobalt (`#1d4ed8` / `#dbeafe`)** : Billets, vols et transferts.
- **Currency Gold (`#b45309` / `#fef3c7`)** : Taux de change et convertisseur de devises.

## Typography

- **Display Face** : `Public Sans`, `system-ui`, `-apple-system`, `sans-serif` (graisses 700 et 800). Typographie robuste, géométrique et d'autorité utilitaire.
- **Body Face** : `Atkinson Hyperlegible`, `Public Sans`, `sans-serif` (graisses 400 et 700). Développée spécifiquement pour la lisibilité sous fort éblouissement et pour les utilisateurs à vision réduite.
- **Numerics** : `font-variant-numeric: tabular-nums;` imposé sur toutes les données chiffrées (FCFA, EUR, dates, ratios).

## Layout

- **Mobile First ($\le 768\text{px}$)** :
  - Barre de navigation basse persistante (68px) adaptée au balayage par le pouce avec dégagement sécurisé (`env(safe-area-inset-bottom)`).
  - Défilement horizontal des 21 journées sous forme de ruban de tuiles tactiles de 60px de hauteur.
  - Modales converties en "Bottom Sheets" tactiles s'ouvrant depuis le bas de l'écran.
- **Desktop & Tablettes ($> 768\text{px}$)** :
  - En-tête supérieur compact avec menu d'onglets pilule et sélecteur de devises.
  - Grille responsive pour les 4 blocs temporels (min 290px par colonne).
  - Disposition fractionnée pour le budget (répartition par catégorie à gauche, journal des dépenses à droite).

## Elevation & Depth

- **Ombres neutres ambiantes** : Refus des halos ou néons colorés. Utilisation exclusive d'élévations d'ardoise naturelle à faible rayon :
  - Petite tuile : `0 1px 2px 0 rgba(15, 23, 42, 0.05)`
  - Carte active : `0 4px 6px -1px rgba(15, 23, 42, 0.07)`
  - Modale / Dialogue : `0 10px 15px -3px rgba(15, 23, 42, 0.09)`

## Shapes

- Formes arrondies douces et ergonomiques :
  - Boutons et inputs : `radius-md: 14px`
  - Tuiles d'activités et cartes de blocs : `radius-xl: 18px` à `24px`
  - Badges d'état et filtres : `radius-full: 9999px`

## Components

- **Barre d'ajout 2 secondes** : Conteneur tactile réactif avec bordure orange solaire, autocomplétion instantanée des templates de voyage et bouton `@Contact`.
- **Tuiles d'activités cliquables** : Zone tactile complète avec indication discrète au survol, badge de catégorie coloré, affichage double monnaie et raccourci WhatsApp direct.
- **Convertisseur de poche** : Deux champs synchronisés en temps réel avec bouton d'inversion franc `⇄`.
- **Rappels prioritaires** : Puces horizontales en tête de planning pour les démarches critiques.

## Do's and Don'ts

### Do's
- Conserver systématiquement les cibles tactiles $\ge 48\text{px}$ pour tous les boutons principaux.
- Garantir le double affichage de devises (monnaie locale prioritaire + repère d'origine).
- Permettre la fermeture des modales par clic sur le backdrop ou touche Echap sans perte de données.
- Maintenir la compatibilité 100% hors-ligne (zéro dépendance CDN obligatoire à l'exécution).

### Don'ts
- Ne jamais forcer de grille horaire stricte par quart d'heure : préserver les 4 blocs temporels naturels.
- Ne pas utiliser de modales intrusives bloquantes (`confirm`, `prompt`, `alert` natifs proscrits).
- Ne pas réduire le contraste des textes secondaires en dessous de 4.5:1.
- Ne pas surcharger l'interface d'illustrations décoratives superflues : la clarté opérationnelle prime.

