# 🧪 Cahier de Tests & Recette (Test Plan Specification)
## Projet : Planning Voyage PAYS (Travel Planner)
**Méthodologie :** Spec-Driven Development (SDD) & Validation par Scénarios  
**Référence PRD :** `docs/PRD.md` (v1.0.0) | `docs/user_stories.md`  
**Cas pilote de test :** Voyage de 21 jours au Cameroun (Douala -> Yaoundé -> Kribi)  
**Date :** 18/10/2026  
**Statut :** Spécifié (Prêt pour exécution automatisée & manuelle)

---

## 1. Cadre & Stratégie de Test

### 1.1 Objectifs
Ce cahier de tests définit l'ensemble des cas d'essais nécessaires pour valider **100% des exigences fonctionnelles et des critères d'acceptation** du projet avant la livraison de l'interface utilisateur.

### 1.2 Niveaux de Test
1. **Tests Automatisés Métier (Unitaires & Intégration) :** Exécutés par le moteur de test Node.js (`npm test`), validant les calculs, la logique métier, la machine à états et les validations de données.
2. **Tests de Recette Utilisateur (Scénarios Manuels) :** Protocoles guidés pas-à-pas pour la vérification ergonomique et visuelle par l'utilisateur (Phase 4).

### 1.3 Matrice de Traçabilité Globale

| Module PRD | Epic User Stories | Préfixe Tests | Nombre de Scénarios |
|---|---|---|---|
| Module 4 : Préparation & Formalités | EPIC-1 : To-Do Pré-Voyage | `TC-TODO-xxx` | 6 scénarios |
| Module 1 : Voyage & Calendrier | EPIC-2 : Configuration & Jours | `TC-TRIP-xxx` | 6 scénarios |
| Module 2 : Activités Progressives | EPIC-3 : Enregistrement & Blocs | `TC-ACT-xxx` | 8 scénarios |
| Module 3 : Contacts ("Avec qui") | EPIC-4 : Répertoire & Liaisons | `TC-CNT-xxx` | 5 scénarios |
| Module 5 : Budget & Devises | EPIC-5 : Multi-Devises & Solde | `TC-BUD-xxx` | 7 scénarios |
| Module 6 : Hors-Ligne & Persistance | EPIC-6 : Persistance & Fichiers | `TC-STO-xxx` | 4 scénarios |
| Module 7 : Authentification & Comptes | EPIC-7 : Passwordless & Démo | `AUT-xxx` | 6 scénarios |
| Module 8 : Wizard Express, Alertes & V2 | EPIC-8 : V2 Améliorations UX | `TC-V2-xxx` | 7 scénarios |
| Module 9 : Onboarding & Dynamic Config | EPIC-9 : Wizard & Cercles | `ONB-xxx` | 4 scénarios |
| Module 10 : Rappels & Échéances | EPIC-10 : Alertes & Briefing | `REM-xxx` | 4 scénarios |
| Module 11 : Géographie & Villes de Référence | EPIC-11 : Formulaires Intelligents | `GEO-xxx` | 4 scénarios |
| Module 12 : Modèles & Templates d'Activités | EPIC-12 : Saisie Assistée | `TPL-xxx` | 4 scénarios |
| Module 13 : Multi-Voyages & Profil Utilisateur | EPIC-13 : Gestion Multi-Séjours | `MUT-xxx` | 3 scénarios |
| Module 14 : Contacts Wizard & Ergonomie Directe | EPIC-14 : Direct UX & Devises V3 | `V3-xxx` | 3 scénarios |
| Module 15 : Cycle de Vie Intégration E2E | EPIC-15 : E2E 21 Jours Cameroun | `E2E-xxx` | 1 scénario complet |
| **Total Automatisé** | | | **72 cas de test (100% Green)** |

---

## 2. Cahier Détaillé des Cas de Test

---

### MODULE 1 : TO-DO PRÉ-VOYAGE & FORMALITÉS (Préfixe : TC-TODO)

#### `TC-TODO-001` : Initialisation automatique des formalités indispensables (Cameroun)
- **Exigence source :** REQ-4.1, US-1.1
- **Priorité :** 🔴 Bloquante (Must Have)
- **Pré-conditions :** Nouveau voyage créé avec destination "Cameroun".
- **Étapes de test :**
  1. Charger les données par défaut du voyage Cameroun.
  2. Inspecter la liste des tâches dans `todos`.
- **Résultat attendu :**
  - Les 4 catégories existent : `Formalités`, `Santé`, `Bagages`, `Finances`.
  - La tâche *"Vaccin Fièvre Jaune (carnet jaune obligatoire)"* est présente avec priorité `Haute`.
  - La tâche *"Demande et obtention du Visa"* est présente avec priorité `Haute`.
  - La tâche *"Traitement préventif Paludisme (Malarone/Doxycycline)"* est présente.

#### `TC-TODO-002` : Machine à états des tâches pré-voyage
- **Exigence source :** REQ-4.2, US-1.2
- **Priorité :** 🔴 Bloquante
- **Pré-conditions :** Une tâche existante avec statut initial `"À faire"`.
- **Étapes de test :**
  1. Modifier le statut de la tâche vers `"En cours"`.
  2. Vérifier la persistance de l'état.
  3. Modifier le statut vers `"Fait"`.
  4. Réouvrir la tâche vers `"À faire"`.
- **Résultat attendu :**
  - Les transitions d'états sont acceptées et reflétées immédiatement.
  - Les statuts non autorisés (ex: `"Invalide"`) sont rejetés.

#### `TC-TODO-003` : Calcul dynamique du taux de complétion des préparatifs
- **Exigence source :** REQ-4.2, US-1.2
- **Priorité :** 🟡 Majeure
- **Pré-conditions :** 4 tâches au total dans la liste (3 `"À faire"`, 1 `"Fait"`).
- **Étapes de test :**
  1. Calculer le pourcentage de progression : $1 / 4 = 25\%$.
  2. Passer une deuxième tâche à `"Fait"`.
  3. Recalculer le pourcentage : $2 / 4 = 50\%$.
- **Résultat attendu :**
  - Le calcul retourne exactement `25%` puis `50%`.
  - Si toutes les tâches sont complétées, le score affiche `100%`.

#### `TC-TODO-004` : Ajout d'une tâche personnalisée avec deadline
- **Exigence source :** REQ-4.2, US-1.2
- **Priorité :** 🟢 Normale
- **Données de test :** Titre : *"Acheter répulsif moustiques zone tropicale 50% DEET"*, Catégorie : `"Santé"`, Échéance : `"2026-10-25"`, Priorité : `"Haute"`.
- **Résultat attendu :**
  - La tâche est insérée avec un identifiant unique, les attributs fournis et le statut par défaut `"À faire"`.

#### `TC-TODO-005` : Suppression d'une tâche de la checklist
- **Exigence source :** REQ-4.2
- **Priorité :** 🟢 Normale
- **Résultat attendu :** La tâche est retirée de la liste sans altérer les autres éléments ni corrompre les calculs de progression.

#### `TC-TODO-006` : Filtrage des tâches par catégorie
- **Exigence source :** REQ-4.1
- **Priorité :** 🟢 Normale
- **Résultat attendu :** Filtrer par `"Santé"` ne retourne que les tâches sanitaires ; filtrer par `"Formalités"` ne retourne que les démarches administratives.

---

### MODULE 2 : VOYAGE & CALENDRIER (Préfixe : TC-TRIP)

#### `TC-TRIP-001` : Génération automatique des journées à partir des dates
- **Exigence source :** REQ-1.1, REQ-1.2, US-2.1
- **Priorité :** 🔴 Bloquante
- **Données de test :** Date début : `"2026-11-01"`, Date fin : `"2026-11-21"` (21 jours).
- **Étapes de test :**
  1. Initialiser le voyage avec cet intervalle de dates.
  2. Vérifier le nombre d'objets `Day` créés.
  3. Vérifier les dates calendaires du premier et dernier jour.
- **Résultat attendu :**
  - Exactement 21 journées générées (`dayNumber` de 1 à 21).
  - Jour 1 = `2026-11-01`, Jour 21 = `2026-11-21`.

#### `TC-TRIP-002` : Rejet des plages de dates invalides
- **Exigence source :** REQ-1.1
- **Priorité :** 🔴 Bloquante
- **Données de test :** Date début : `"2026-11-15"`, Date fin : `"2026-11-05"` (fin antérieure au début).
- **Résultat attendu :** Déclenchement d'une exception explicite `"La date de fin ne peut pas être antérieure à la date de début"`.

#### `TC-TRIP-003` : Affectation et mise à jour des villes étapes par jour
- **Exigence source :** REQ-1.3, US-2.2
- **Données de test :** Jours 1 à 7 : `"Douala"`, Jours 8 à 14 : `"Yaoundé"`, Jours 15 à 20 : `"Kribi"`, Jour 21 : `"Douala"`.
- **Résultat attendu :** Chaque objet `Day` contient l'étape assignée correspondante.

#### `TC-TRIP-004` : Extension de la durée d'un voyage existant
- **Exigence source :** Incohérence 6, PRD §3
- **Données de test :** Prolongation de 21 à 23 jours (date fin `"2026-11-23"`).
- **Résultat attendu :**
  - Les 21 journées initiales et leurs activités restent 100% intactes.
  - Deux nouvelles journées (`Jour 22` le 22/11/2026 et `Jour 23` le 23/11/2026) sont créées proprement.

#### `TC-TRIP-005` : Réduction de la durée avec garde-fou anti-perte
- **Exigence source :** Incohérence 6
- **Données de test :** Tentative de réduire de 21 à 18 jours alors que le Jour 20 contient une activité *"Dîner d'adieu"*.
- **Résultat attendu :**
  - L'opération est refusée avec le message d'avertissement et la liste des activités orphelines.
  - La structure du voyage n'est pas altérée tant que les activités ne sont pas déplacées.

#### `TC-TRIP-006` : Consultation du récapitulatif synthétique du voyage
- **Exigence source :** REQ-1.2
- **Résultat attendu :** Calcul correct du nombre total d'activités programmées, du nombre de jours couverts et des villes traversées.

---

### MODULE 3 : ACTIVITÉS & ENREGISTREMENT PROGRESSIF (Préfixe : TC-ACT)

#### `TC-ACT-001` : Création ultra-rapide minimale (Titre seul)
- **Exigence source :** REQ-2.1, US-3.1
- **Priorité :** 🔴 Bloquante
- **Données de test :** `dayId`: `"day-3"`, `title`: `"Passer voir la famille à Bonapriso"`.
- **Étapes de test :**
  1. Invoquer la création de l'activité avec uniquement `dayId` et `title`.
- **Résultat attendu :**
  - L'activité est créée avec succès.
  - L'identifiant unique `id` est généré.
  - Le statut par défaut est `"À planifier"`.
  - La catégorie par défaut est `"Autre"`.
  - Les champs `time`, `location`, `notes` sont `null` ou vides sans provoquer d'erreur.
  - La liste `contactIds` est un tableau vide `[]`.

#### `TC-ACT-002` : Rejet de la création sans titre
- **Exigence source :** REQ-2.1
- **Priorité :** 🟡 Majeure
- **Données de test :** Titre vide ou composé uniquement d'espaces (`""`, `"   "`).
- **Résultat attendu :** Levée d'une erreur de validation `"Le titre de l'activité est obligatoire"`.

#### `TC-ACT-003` : Enrichissement progressif complet
- **Exigence source :** REQ-2.2, US-3.2
- **Données de test :** Activité existante TC-ACT-001 enrichie avec :
  - `time`: `"15:30"`
  - `location`: `"Quartier Bonapriso, Douala"`
  - `category`: `"Famille"`
  - `contactIds`: `["contact-paul-id", "contact-sophie-id"]`
  - `status`: `"Confirmé"`
  - `notes`: `"Apporter les photos de famille"`
- **Résultat attendu :** L'activité est mise à jour avec l'ensemble des données, sans écraser son `id` ou sa date de création.

#### `TC-ACT-004` : Classement automatique dans les 4 blocs temporels
- **Exigence source :** Incohérence 1, PRD §3
- **Données de test :** 4 activités sur la même journée :
  1. Activité A : sans heure (`time: undefined`)
  2. Activité B : heure `"09:00"` (Matin)
  3. Activité C : heure `"14:30"` (Après-midi)
  4. Activité D : heure `"20:00"` (Soirée)
- **Résultat attendu :**
  - Activité A est assignée au bloc `📌 À caler aujourd'hui`.
  - Activité B est assignée au bloc `🌅 Matin`.
  - Activité C est assignée au bloc `☀️ Après-midi`.
  - Activité D est assignée au bloc `🌙 Soirée`.

#### `TC-ACT-005` : Assignation manuelle par créneau sans heure précise
- **Exigence source :** Incohérence 1, US-3.2
- **Données de test :** Activité avec `time: "Après-midi"` (sans heure chiffrée).
- **Résultat attendu :** L'activité est positionnée dans le bloc `☀️ Après-midi`.

#### `TC-ACT-006` : Déplacement d'activité entre journées
- **Exigence source :** REQ-2.3, US-3.3
- **Étapes de test :**
  1. Déplacer l'activité du `day-4` vers le `day-6`.
- **Résultat attendu :**
  - L'activité n'apparaît plus dans `day-4.activities`.
  - L'activité est présente dans `day-6.activities`.
  - Son `dayId` est actualisé à `"day-6"`.
  - Tous les autres attributs (titre, contacts, heure, notes) sont conservés à l'identique.

#### `TC-ACT-007` : Cycle de vie des statuts de l'activité
- **Exigence source :** REQ-2.2
- **Étapes de test :**
  - Transition : `"À planifier"` ➔ `"Confirmé"` ➔ `"Effectué"` ➔ `"Annulé"`.
- **Résultat attendu :** Chaque transition est validée. Les statuts inconnus sont rejetés.

#### `TC-ACT-008` : Suppression d'une activité
- **Exigence source :** REQ-2.2
- **Résultat attendu :** L'activité est supprimée de la journée sans impact sur les activités voisines.

---

### MODULE 4 : CONTACTS DÉDIÉS ("AVEC QUI") (Préfixe : TC-CNT)

#### `TC-CNT-001` : Création d'un contact de voyage
- **Exigence source :** REQ-3.1, REQ-3.2, US-4.1
- **Données de test :**
  - `name`: `"Oncle Paul"`
  - `relationship`: `"Famille"`
  - `phone`: `"+237 6 99 00 11 22"`
  - `city`: `"Douala"`
  - `notes`: `"Habite à Bonapriso"`
- **Résultat attendu :** Le contact est créé avec un UUID et ajouté au répertoire du voyage.

#### `TC-CNT-002` : Validation de l'unicité et complétude des contacts
- **Exigence source :** REQ-3.2
- **Données de test :** Création sans nom ou avec nom vide.
- **Résultat attendu :** Erreur de validation `"Le nom du contact est obligatoire"`.

#### `TC-CNT-003` : Association multi-contacts à une activité
- **Exigence source :** REQ-3.3, US-4.2
- **Données de test :** Activité liée simultanément à `["Oncle Paul", "Sophie", "Emmanuel Guide"]`.
- **Résultat attendu :** Les 3 identifiants sont stockés dans `contactIds` et résolus correctement lors de la consultation.

#### `TC-CNT-004` : Filtrage et historique par contact
- **Exigence source :** US-4.2
- **Données de test :** Rechercher toutes les activités impliquant `"Oncle Paul"`.
- **Résultat attendu :** Retourne exactement les activités des jours correspondants où le contact apparaît.

#### `TC-CNT-005` : Gestion de la suppression / archivage d'un contact lié
- **Exigence source :** Incohérence 2
- **Données de test :** Suppression du contact `"Sophie"` déjà lié au `Jour 2` et `Jour 5`.
- **Résultat attendu :**
  - Détection de la liaison existante : le système propose l'archivage.
  - En mode archivage : le contact passe `archived: true`, n'est plus proposé pour les nouvelles activités, mais reste affiché sur les activités passées.

---

### MODULE 5 : BUDGET & DEVISES (Préfixe : TC-BUD)

#### `TC-BUD-001` : Exactitude mathématique du taux officiel EUR / XAF
- **Exigence source :** REQ-5.2, US-5.1
- **Données de test :** Taux de parité CEMAC : $1 \text{ EUR} = 655.957 \text{ XAF}$.
- **Calculs à vérifier :**
  - $65\,596 \text{ XAF} \rightarrow 100.00 \text{ EUR}$
  - $32\,798 \text{ XAF} \rightarrow 50.00 \text{ EUR}$
  - $15\,000 \text{ XAF} \rightarrow 22.87 \text{ EUR}$
  - $100 \text{ EUR} \rightarrow 65\,596 \text{ XAF}$
- **Résultat attendu :** Exactitude au centime d'euro près avec règle d'arrondi bancaire standard.

#### `TC-BUD-002` : Saisie d'une dépense locale en FCFA avec conversion instantanée
- **Exigence source :** REQ-5.3, US-5.2
- **Données de test :** Dépense `"Dîner poissons braisés"`, montant `15000`, devise `"XAF"`, catégorie `"Nourriture/Resto"`.
- **Résultat attendu :**
  - Dépense enregistrée avec `amount: 15000`, `currency: "XAF"`.
  - `convertedBaseAmount` calculé et stocké à `22.87`.

#### `TC-BUD-003` : Calcul du solde disponible et du total dépensé
- **Exigence source :** REQ-5.4, US-5.2
- **Données de test :** Budget total configuré : `2000.00 EUR`.
  - Dépense 1 : `65596 XAF` (soit `100.00 EUR`).
  - Dépense 2 : `150.00 EUR`.
- **Résultat attendu :**
  - Total dépensé = `250.00 EUR`.
  - Solde restant = $2000.00 - 250.00 = 1750.00 \text{ EUR}$ (soit $1\,147\,925 \text{ XAF}$).

#### `TC-BUD-004` : Découplage de la date de dépense et date de l'activité
- **Exigence source :** Incohérence 3
- **Données de test :**
  - Acompte hôtel payé le `"2026-11-03"` (`Jour 3`) pour une activité prévue au `"2026-11-16"` (`Jour 16`).
  - Déplacement ultérieur de l'activité au `"2026-11-17"`.
- **Résultat attendu :**
  - La date de la dépense reste immuable au `"2026-11-03"`.
  - La liaison vers l'activité pointe toujours vers l'activité déplacée.

#### `TC-BUD-005` : Répartition des dépenses par catégorie
- **Exigence source :** REQ-5.4
- **Données de test :** Saisie de plusieurs dépenses réparties en Transport, Hébergement et Nourriture.
- **Résultat attendu :** Calcul des totaux et pourcentages exacts par catégorie (ex: `Transport: 40%`, `Hébergement: 35%`, `Nourriture: 25%`).

#### `TC-BUD-006` : Configuration d'un taux de change personnalisé
- **Exigence source :** Incohérence 4
- **Données de test :** Ajustement du taux effectif de change à `1 EUR = 650.00 XAF` (au lieu de 655.957).
- **Résultat attendu :** Une dépense de `65000 XAF` est désormais convertie en exactement `100.00 EUR`.

#### `TC-BUD-007` : Dépense avec montant nul ou négatif
- **Exigence source :** REQ-5.3
- **Données de test :** Saisie d'un montant de `0` ou `-500`.
- **Résultat attendu :** Rejet avec message d'erreur `"Le montant de la dépense doit être strictement positif"`.

---

### MODULE 6 : PERSISTANCE & MODE HORS-LIGNE (Préfixe : TC-STO)

#### `TC-STO-001` : Sérialisation et désérialisation intégrale (JSON)
- **Exigence source :** REQ-6.1, REQ-6.2
- **Étapes de test :**
  1. Générer un voyage complet avec jours, activités progressives, contacts, dépenses et to-do.
  2. Sérialiser en chaîne JSON.
  3. Recharger et désérialiser dans une nouvelle instance.
- **Résultat attendu :** 100% des objets, identifiants, relations et montants sont identiques bit-à-bit.

#### `TC-STO-002` : Résilience hors-ligne (Simulation Offline)
- **Exigence source :** REQ-6.1, US-6.1
- **Étapes de test :**
  1. Simuler l'absence de réseau (`navigator.onLine = false`).
  2. Créer une activité et saisir une dépense.
  3. Vérifier la sauvegarde dans le stockage local.
- **Résultat attendu :** L'opération réussit sans erreur, sans blocage réseau.

#### `TC-STO-003` : Export de fichier `.json` horodaté
- **Exigence source :** REQ-6.2, US-6.2
- **Résultat attendu :** Fichier généré avec nommage conventionnel `planning_voyage_cameroun_YYYYMMDD.json` contenant la structure complète.

#### `TC-STO-004` : Importation d'une sauvegarde et validation de schéma
- **Exigence source :** REQ-6.2
- **Données de test :** Import d'un JSON valide vs import d'un JSON corrompu ou mal formé.
- **Résultat attendu :**
  - JSON valide : voyage restauré intégralement.
  - JSON corrompu : rejet avec alerte claire sans écraser le voyage en cours.

#### `TC-STO-005` : Préparation de l'export d'impression (Print/PDF)
- **Exigence source :** REQ-6.3
- **Résultat attendu :** Génération d'un état récapitulatif chronologique propre exempt d'éléments d'interface interactifs (formulaires, boutons d'édition).

---

### MODULE 7 : AUTHENTIFICATION PASSWORDLESS & MODE DÉMO (Préfixe : TC-AUTH)

#### `TC-AUTH-001` : Création de session locale passwordless (email valide)
- **Exigence source :** Spécifications V2 §5.1
- **Données de test :** Email `"steve@example.com"`.
- **Résultat attendu :** Session créée avec `sessionId`, `token`, `email`, `isDemo: false` et persistance sans mot de passe.

#### `TC-AUTH-002` : Rejet d'un email invalide
- **Résultat attendu :** Erreur levée si l'email ne contient pas `@` ou de domaine valide.

#### `TC-AUTH-003` : Validation de session hors-ligne et session Démo
- **Résultat attendu :** Une session démo ou une session locale existante est déclarée valide sans nécessiter d'appel réseau.

---

### MODULE 8 : WIZARD EXPRESS, ALERTES & CERCLES RELATIONNELS V2 (Préfixe : TC-V2)

#### `TC-WIZ-001` : Initialisation express via les 4 immanquables (< 3 min)
- **Exigence source :** Spécifications V2 §5.2
- **Données de test :** Pays `"Cameroun"`, Ville `"Douala"`, Dates `"01/11 au 21/11"`, Budget `2500 €`.
- **Résultat attendu :** Le voyage est généré avec les 21 journées assignées à Douala et les catégories d'activités initialisées.

#### `TC-WIZ-002` : Rejet si l'un des 4 immanquables est manquant
- **Résultat attendu :** Erreur explicite si le pays, la ville, les dates ou le budget sont absents ou négatifs.

#### `TC-BUD-008` : Modification dynamique du budget total et de la devise
- **Exigence source :** Spécifications V2 §5.6
- **Résultat attendu :** Mise à jour immédiate du montant prévisionnel et de la devise sans réinitialiser le voyage.

#### `TC-REM-001` : Détection automatique des alertes d'urgence sanitaires
- **Exigence source :** Spécifications V2 §5.5
- **Résultat attendu :** Si la Fièvre Jaune ou le Visa ne sont pas validés avant le départ, détection d'alertes au niveau `URGENT`.

#### `TC-REM-002` : Génération du briefing matinal
- **Résultat attendu :** Synthèse textuelle claire des activités du jour et de la ville étape pour notification.

#### `TC-CIRC-001` : Priorisation des contacts par cercle relationnel
- **Exigence source :** Spécifications V2 §5.4
- **Résultat attendu :** Une activité de type "Famille" fait remonter les contacts familiaux en tête de sélection.

#### `TC-ACT-009` : Filtrage des activités par catégorie
- **Exigence source :** Spécifications V2 §5.3
- **Résultat attendu :** Filtrer par "Travail" n'affiche que les activités professionnelles, "Tous" réaffiche tout.

---

## 3. Matrice de Recette pour l'Utilisateur (Phase 4 & V2)

Pour la **Phase 4 (Recette & Tests Utilisateur)**, voici le tableau de validation manuelle que Steve utilisera pour tester directement son voyage au Cameroun :

| Réf. Recette | Action Utilisateur | Résultat Observé Attendu | Statut (Pass/Fail) |
|---|---|---|---|
| **REC-01** | Ouvrir l'application et vérifier le voyage "Cameroun 2026" | 21 journées affichées du 01/11 au 21/11 avec Douala, Yaoundé et Kribi | ⚪ À tester |
| **REC-02** | Vérifier l'onglet To-Do Pré-Voyage | Tâches Fièvre Jaune, Visa et Paludisme cochables | ⚪ À tester |
| **REC-03** | Ajouter en 3 secondes l'activité *"Marché des fleurs"* sur Jour 4 | L'activité apparaît immédiatement dans `À caler aujourd'hui` | ⚪ À tester |
| **REC-04** | Éditer l'activité pour ajouter l'heure 15:30 et le lieu | L'activité bascule automatiquement dans la section `Après-midi` | ⚪ À tester |
| **REC-05** | Ajouter le contact *"Oncle Paul"* et le relier à l'activité | Le nom apparaît avec son badge sur la carte de l'activité | ⚪ À tester |
| **REC-06** | Saisir une dépense de 15 000 FCFA | Le montant équivalent ~22,87 € s'affiche et le solde diminue | ⚪ À tester |
| **REC-07** | Déplacer une activité du Jour 4 au Jour 5 | L'activité est sur le Jour 5 avec tous ses détails intacts | ⚪ À tester |
| **REC-08** | Couper le wifi/connexion et ajouter une activité | Tout fonctionne immédiatement en local sans écran d'erreur | ⚪ À tester |
| **REC-09** | Cliquer sur "Explorer la Démo" sur la Landing Page | Accès immédiat au voyage de 21 jours au Cameroun sans friction | ⚪ À tester |
| **REC-10** | Connexion email passwordless avec code 6 chiffres | Demande de code, pré-remplissage dev et session validée localement | ⚪ À tester |
| **REC-11** | Initialiser un nouveau voyage via le Wizard (< 3 min) | 4 immanquables saisis + profil d'activité = voyage créé en moins de 30 secondes | ⚪ À tester |
| **REC-12** | Clic sur le corps entier d'une tuile d'activité | Ouverture instantanée de la modale d'enrichissement et d'édition complète | ⚪ À tester |
| **REC-13** | Clic sur la bannière de la journée active | Pliage / dépliage fluide en accordéon des 4 blocs temporels | ⚪ À tester |
| **REC-14** | Filtrage par catégorie d'activité (ex: "Famille") | Filtrage instantané des tuiles sans rechargement de page | ⚪ À tester |
| **REC-15** | Clic sur la carte du budget prévisionnel global | Ouverture de la modale de modification du montant et mise à jour du solde | ⚪ À tester |
| **REC-16** | Clic sur le logo CapVoyage puis sur le bouton Déconnexion | Retour à la Landing Page puis déconnexion confirmée sur l'appareil | ⚪ À tester |
| **REC-17** | Wizard Étape 1 : Clic sur une carte de destination (ex: Canada 🇨🇦) | Cascade animée des villes étapes et sélection automatique de la devise ($ CAD) | ⚪ À tester |
| **REC-18** | Wizard Étape 3 : Ajout unitaire de 2 contacts avec tags | Affichage des puces sous le formulaire sans quitter l'écran, suppression possible par croix | ⚪ À tester |
| **REC-19** | Planning : Clic sur une puce de modèle rapide (ex: 🍽️ Dîner avec...) | Pré-remplissage automatique dans la barre rapide avec contact réel du voyage | ⚪ À tester |
| **REC-20** | Modale d'activité : Changement direct du jour via le menu déroulant | Déplacement immédiat de l'activité vers la journée choisie sans passer par un sous-menu | ⚪ À tester |
| **REC-21** | Modale d'activité : Clic sur "+ Créer un contact express" | Formulaire inline déplié, ajout du contact et coche automatique sur l'activité en cours | ⚪ À tester |
| **REC-22** | Profil : Clic sur le badge utilisateur puis création d'un 2ème voyage | Les 2 voyages sont listés dans la modale Profil avec bascule en 1 clic | ⚪ À tester |
