# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Voyageurs internationaux, membres de la diaspora, familles et nomades préparant et vivant des séjours de moyenne à longue durée (2 à 4 semaines) à l'étranger, particulièrement dans des destinations exigeantes ou hors zone euro (ex: Cameroun avec circuit Douala, Yaoundé, Kribi ; Sénégal ; Côte d'Ivoire ; etc.).
Situation : En mobilité, souvent sur smartphone, sous fort ensoleillement, avec une connectivité intermittente, des environnements à cash dominant (FCFA, etc.) et une coordination logistique forte via WhatsApp.
Le "Job" : Libérer l'esprit de l'angoisse administrative (visas, vaccins obligatoires), structurer le rythme quotidien sans rigidité, et garder la maîtrise du budget et des contacts locaux en un seul point fiable 100% hors-ligne.

## Product Purpose

Fournir un compagnon de voyage fluide, progressif et rassurant qui remplace les tableurs Excel rigides et les notes WhatsApp éparpillées.
Le succès signifie : le voyageur sait chaque matin en 3 secondes ce qu'il a à faire, avec qui et où, sans jamais se soucier d'une heure stricte, maîtrise ses devises locales et décolle l'esprit serein sans oubli administratif bloquant.

## Positioning

Contrairement aux outils de gestion de projet d'entreprise (Notion, Trello) ou aux agendas horaires rigides (Google Calendar, TripIt), CapVoyage refuse la planification à la minute près et adopte une **temporalité lâche et progressive** (les 4 blocs : *À caler aujourd'hui, Matin, Après-midi, Soirée*) combinée à la **gestion bimonétaire temps réel (EUR <-> monnaie locale)** et au **carnet relationnel direct WhatsApp**.

## Operating Context

- **Avant départ (J-30 à J-1) :** Préparation sur PC ou mobile, vérification des alertes sanitaires (vaccin fièvre jaune obligatoire à J-10), to-dos valise/visas, estimation budgétaire.
- **Pendant le voyage (J1 à J21) :** Consultation nomade sur smartphone dans la rue, taxis, marchés ou hôtels. Accès rapide hors-ligne impératif. Saisie d'une idée en 2 secondes au repos, enrichissement le soir.

## Capabilities and Constraints

- **Fonctionnalités :**
  - Assistant de création express de voyage en 3 étapes (catalogue pays en 1 clic, dates, budget, contacts initiaux).
  - Calendrier jour par jour avec étapes/villes associées.
  - Saisie express en 2 secondes avec autocomplétion intelligente de modèles d'activités et déclencheur `@Contact`.
  - 4 Blocs temporels : À caler aujourd'hui, Matin, Après-midi, Soirée.
  - Carnet de contacts avec bouton direct WhatsApp (`https://wa.me/...`) et liaison multi-contacts aux activités.
  - Budget multi-devises en temps réel (EUR, XAF/XOF, CAD, CNY, USD) avec convertisseur de poche et actualisation des cours.
  - Formalités et rappels automatiques (Fièvre jaune, Visas).
  - Partage de planning en lecture seule par lien magique (`?share=...`).
  - Fonctionnement 100% hors-ligne (PWA, Service Worker, cache local).
- **Contraintes techniques :**
  - Architecture vanilla zéro framework (HTML5, CSS moderne, ES6 modules) pour une légèreté et réactivité absolues.
  - Zéro dépendance tierce à l'exécution.
  - Aucune modification des fonctionnalités métier existantes (stabilité du domaine et des tests).

## Brand Commitments

- Nom : **CapVoyage**
- Emblème : La boussole 🧭
- Tonalité : Rassurante, nomade, claire, chaleureuse, sans jargon technologique ni gadgets superflus.

## Evidence on Hand

- Spécifications complètes dans `docs/PRD.md`, `docs/architecture_technique.md`, `docs/guide_utilisateur.md`.
- Cas concret de référence validé : Voyage de 21 jours au Cameroun (Douala, Yaoundé, Kribi).
- 89 tests automatisés couvrant 19 suites fonctionnelles (`node --test`).

## Product Principles

1. **La temporalité lâche bat la grille horaire :** En voyage, les imprévus font partie de l'expérience ; planifier par blocs naturels plutôt qu'en quarts d'heure.
2. **L'enregistrement progressif sans friction :** Laisser noter une intention brute en 2 secondes, enrichir les détails plus tard.
3. **Le temps et l'argent sont locaux :** Afficher toujours les coûts et montants dans la monnaie locale réelle avec repère instantané en devise d'origine.
4. **La fiabilité nomade absolue :** Zéro écran blanc sans réseau, zéro blocage par pop-up intrusif, zéro mot de passe à retenir.

## Accessibility & Inclusion

- Conformité WCAG 2.1 AA & AAA sur les contrastes des textes critiques.
- Cibles tactiles adaptées à la manipulation nomade d'une main ($\ge 44\text{px}$).
- Clarté typographique pour lecture sous forte luminosité extérieure.
