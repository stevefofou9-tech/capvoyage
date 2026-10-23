# 🧪 Cahier de Tests & Recette (Test Plan Specification)
## Projet : Planning Voyage PAYS (Travel Planner)
**Méthodologie :** Spec-Driven Development (SDD) & Validation par Scénarios  
**Référence PRD :** `docs/PRD.md` (v2.1.0) | `docs/user_stories.md` (v2.1.0) | `docs/adr/`  
**Cas pilote de test :** Voyage de 21 jours au Cameroun (Douala -> Yaoundé -> Kribi)  
**Date :** 18/10/2026 · **Révision v2.0 :** 23/10/2026  
**Statut :** v2.0 exécutée. Les modules 16 à 19 passent tous (voir la CI). **Modules 20 à 24 (🆕 v2.1) : implémentés et verts le 23/10/2026** (`tests/domain/{ideas,todo_toggle,contact_import,now}.test.js`, `tests/api/ideas.test.js`, `tests/ui/{v21.cdp,design_rules,sw_precache}.test.js`). Le sélecteur de contacts en feuille basse et l'import testés sur écran réel ; l'import via l'assistant (étape 3) partage le même composant et n'a pas de parcours CDP dédié.

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
| Module 6 : Hors-Ligne & Persistance | EPIC-6 : Hors-Ligne & Synchronisation | `TC-STO-xxx` | 3 scénarios (export, import et impression retirés en v2.0) |
| Module 7 : Authentification & Comptes | EPIC-7 : Passwordless & Démo | `AUT-xxx` | 6 scénarios |
| Module 8 : Wizard Express, Alertes & V2 | EPIC-8 : V2 Améliorations UX | `TC-V2-xxx` | 7 scénarios |
| Module 9 : Onboarding & Dynamic Config | EPIC-9 : Wizard & Cercles | `ONB-xxx` | 4 scénarios |
| Module 10 : Rappels & Échéances | EPIC-10 : Alertes & Briefing | `REM-xxx` | 4 scénarios |
| Module 11 : Géographie & Villes de Référence | EPIC-11 : Formulaires Intelligents | `GEO-xxx` | 4 scénarios |
| Module 12 : Modèles & Templates d'Activités | EPIC-12 : Saisie Assistée | `TPL-xxx` | 4 scénarios |
| Module 13 : Multi-Voyages & Profil Utilisateur | EPIC-13 : Gestion Multi-Séjours | `MUT-xxx` | 3 scénarios |
| Module 14 : Contacts Wizard & Ergonomie Directe | EPIC-14 : Direct UX & Devises V3 | `V3-xxx` | 3 scénarios |
| Module 15 : Cycle de Vie Intégration E2E | EPIC-15 : E2E 21 Jours Cameroun | `E2E-xxx` | 1 scénario complet |
| REQ-6.1, NFR-3 : Synchronisation hors-ligne 🆕 | EPIC-6 (US-6.1, US-6.3) | `TC-SYNC-xxx` | 8 scénarios |
| REQ-SHARE-1 : Partage paramétrable 🆕 | EPIC-7 (US-7.1 à 7.3) | `TC-SHARE-xxx` (domaine) + `TC-API-008` à `012` | 7 + 5 scénarios |
| Module 8 : Sécurité (REQ-SEC-1 à 5) 🆕 | EPIC-8 (US-8.1 à 8.3) | `TC-API-xxx` | 24 scénarios (dont partage) |
| NFR-1, REQ-6.4 : Parcours navigateur 🆕 | EPIC-6/7/8 | `TC-UI-xxx` | 9 scénarios |
| REQ-UX-1 à 4, NFR-1 : Ergonomie 🆕 v2.1 | EPIC-9 (US-9.1) | `TC-UX-xxx` | 8 scénarios |
| REQ-2.1, REQ-2.4 : Idées 🆕 v2.1 | EPIC-3 (US-3.4) | `TC-IDEA-xxx` | 10 scénarios |
| REQ-2.5 : Statut en un tap 🆕 v2.1 | EPIC-1 (US-1.3), EPIC-3 (US-3.5) | `TC-QS-xxx` | 8 scénarios |
| REQ-3.5, REQ-3.6 : Sélecteur et import 🆕 v2.1 | EPIC-4 (US-4.3, US-4.4) | `TC-CTX-xxx` | 11 scénarios |
| REQ-7.5 à 7.7 : Jour courant et rappel 🆕 v2.1 | EPIC-9 (US-9.2, US-9.3) | `TC-NOW-xxx` | 9 scénarios |
| **Total automatisé** | | | **Calculé par la CI** (`npm test` affiche `ℹ tests N`) ; aucun chiffre n'est écrit en dur dans la documentation |

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

> **v2.0 :** les anciens cas d'export JSON (`TC-STO-003`), d'import de sauvegarde (`TC-STO-004`) et d'impression/PDF (`TC-STO-005`) sont **supprimés** (PRD §7). Les numéros ci-dessous sont réalignés sur `tests/domain/storage.test.js`. Le cas hors-ligne (ancien `TC-STO-002`) est remplacé par le module 16 (`TC-SYNC`).

#### `TC-STO-001` : Sérialisation et désérialisation intégrale (JSON)
- **Exigence source :** REQ-6.1
- **Étapes :** générer un voyage complet (jours, activités, contacts, dépenses, tâches), le sérialiser (`JSON.stringify`) puis le relire avec `StorageService.parseAndValidate`.
- **Résultat attendu :** tous les objets, identifiants, relations et montants sont identiques.

#### `TC-STO-002` : Validation de schéma à la lecture
- **Exigence source :** REQ-6.1
- **Données de test :** chaîne JSON invalide, puis objet sans champs obligatoires.
- **Résultat attendu :** rejet avec un message explicite, sans effet de bord.

#### `TC-STO-003` : Sauvegarde et rechargement fichier (migration)
- **Exigence source :** ADR-001 (import unique des anciens fichiers JSON vers SQLite)
- **Résultat attendu :** un voyage écrit puis relu dans un **dossier temporaire** (`os.tmpdir()`, jamais `data/`) est identique.

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

### MODULE 16 : SYNCHRONISATION HORS-LIGNE (Préfixe : TC-SYNC) 🆕 — `tests/domain/sync_queue.test.js`
Exigences : REQ-6.1, NFR-3, US-6.1, US-6.3, ADR-003. Fonctions pures de `src/domain/SyncQueue.js`, avec un faux transport injecté.

| ID | Scénario | Résultat attendu |
|---|---|---|
| `TC-SYNC-001` | Mise en file d'une modification hors-ligne | `pending[tripId]` contient l'instantané et la `baseVersion` ; statut `pending` |
| `TC-SYNC-002` | Deux modifications successives avant l'envoi | Un seul instantané (le dernier), avec la `baseVersion` **d'origine** |
| `TC-SYNC-003` | Envoi réussi (`200`, version 6) | File vide, statut `saved`, version locale = 6 |
| `TC-SYNC-004` | Échec réseau (rejet du transport) | Instantané conservé, statut `pending`, aucune exception remontée |
| `TC-SYNC-005` | Modification pendant un envoi en cours | Pas d'envoi parallèle ; deuxième envoi après le premier, avec la nouvelle version (pas de `409` contre soi-même) |
| `TC-SYNC-006` | Réponse `409` avec la version serveur | Copie locale dans `conflicts[tripId]`, version serveur adoptée, statut `conflict` |
| `TC-SYNC-007` | « Restaurer ma version » après conflit | Renvoi de la copie locale avec `baseVersion` = version serveur ; conflit effacé |
| `TC-SYNC-008` | Persistance de l'état | Sérialisé puis relu (simulation d'un rechargement de page), l'état est identique |

### MODULE 17 : PARTAGE PARAMÉTRABLE — DOMAINE (Préfixe : TC-SHARE) 🆕 — `tests/domain/sharing.test.js`
Exigences : REQ-SHARE-1, REQ-SEC-2, US-7.1 à 7.3, ADR-006.

| ID | Scénario | Résultat attendu |
|---|---|---|
| `TC-SHARE-001` | `normalizeSharing` sur un voyage avec ancien `shareToken` | `sharing = { enabled: true, token: <ancien>, sections: { planning: true, autres: false } }`, `shareToken` supprimé |
| `TC-SHARE-002` | `normalizeSharing` sur un voyage sans partage | `sharing = { enabled: false, token: null, sections: { planning: true, … false } }` |
| `TC-SHARE-003` | `buildSharedView`, section Programme seule | `days` présents ; `contactIds` vides ; pas de `todos`, `expenses`, `currencies`, `contacts` |
| `TC-SHARE-004` | Programme + Contacts | `contactIds` conservés et `contacts` présents |
| `TC-SHARE-005` | Budget seul | `totalBudget`, `baseCurrency`, `currencies`, `expenses` présents ; pas de `days` |
| `TC-SHARE-006` | Toute combinaison | Jamais de `id`, `userId`, `sharing`, `shareToken` ni `version` ; `isReadOnly: true` ; `sharedSections` exact |
| `TC-SHARE-007` | La vue ne modifie pas le voyage source | Le voyage d'origine est inchangé (copie profonde) |

### MODULE 18 : API HTTP & SÉCURITÉ (Préfixe : TC-API) 🆕 — `tests/api/*.test.js`
Exigences : REQ-SEC-1 à 5, REQ-SHARE-1, REQ-6.1, ADR-002 à 006. Serveur réel issu de `createServer()` sur SQLite `:memory:`, port `0`. Comptes « Alice » et « Bob » créés via `request-code` + `verify-code` (le `devCode` est exposé hors production).

| ID | Scénario | Résultat attendu |
|---|---|---|
| `TC-API-001` | `POST /api/trip` sans session | `401` ; base inchangée |
| `TC-API-002` | Bob envoie le voyage d'Alice (même `id`) | `403` ; voyage d'Alice et `user_id` inchangés |
| `TC-API-003` | Alice envoie son voyage avec un `userId` ou un `sharing` falsifiés | `200`, mais `userId` et `sharing` restent ceux de la base |
| `TC-API-004` | `POST /api/trip` avec un `id` inconnu | `404` |
| `TC-API-005` | Écriture avec `baseVersion` correcte | `200`, `version + 1` |
| `TC-API-006` | Écriture avec `baseVersion` périmée | `409` avec la version serveur ; rien n'est enregistré |
| `TC-API-007` | Écriture avec le jeton de partage en `Authorization` | `401` |
| `TC-API-008` | `PUT /api/trip/sharing` par Bob sur le voyage d'Alice | `403` |
| `TC-API-009` | Alice active le partage (réglage par défaut) puis `GET ?share=` | `200` ; vue Programme seule, sans `id` ni `userId` |
| `TC-API-010` | Alice coche Budget | La vue suivante contient `expenses` |
| `TC-API-011` | Alice désactive le partage | `GET ?share=` répond `404` avec « Ce lien de partage n'est plus actif » |
| `TC-API-012` | Alice régénère le lien | Ancien jeton : `404` ; nouveau : `200` |
| `TC-API-013` | `GET /api/trip` sans session (démo) | Seed `trip-cameroun-seed` avec `isDemo: true` ; deux appels identiques |
| `TC-API-014` | `POST /api/reset` et `POST /api/trip/budget` | `404` (routes supprimées) |
| `TC-API-015` | Six demandes de code avec des `X-Forwarded-For` différents | La sixième est refusée (`429`) : l'en-tête est ignoré |
| `TC-API-016` | Six demandes de code pour le même e-mail depuis des IP différentes (`Fly-Client-IP` simulé, `FLY_APP_NAME` défini) | La sixième est refusée (`429`) |
| `TC-API-017` | Connexion d'Alice sur deux « appareils » | Les deux jetons restent valides (`GET /api/auth/me` → `200`) |
| `TC-API-018` | Session expirée (horloge simulée à +31 jours) | `401` |
| `TC-API-019` | `logout` sur l'appareil 1 | Appareil 1 : `401` ; appareil 2 toujours `200` |
| `TC-API-020` | Migration d'un ancien `users.session_token` | Accepté après démarrage, puis colonne remise à `NULL` |
| `TC-API-021` | En-têtes de `GET /` | `Content-Security-Policy` conforme à ADR-002 ; `X-Frame-Options: DENY` |
| `TC-API-022` | Fichiers statiques | `Cache-Control: no-cache`, `ETag`, `304` sur `If-None-Match` |
| `TC-API-023` | `GET /api/rates` avec un transport Frankfurter simulé | Taux renvoyés ; un deuxième appel dans les 6 h n'appelle pas le transport |
| `TC-API-024` | Codes générés | 1 000 codes : tous à 6 chiffres, dans [100000, 999999] |

### MODULE 19 : PARCOURS NAVIGATEUR (Préfixe : TC-UI) 🆕 — `tests/ui/`
Exigences : NFR-1, REQ-6.4, REQ-SEC-3, REQ-SHARE-1. `frontend_integrity.test.js` (existant) et `smoke.cdp.test.js` : Chrome headless piloté via CDP avec le `WebSocket` natif. Le test est ignoré (skip) si aucun Chrome n'est trouvé ; la CI fournit Chrome.

| ID | Scénario | Résultat attendu |
|---|---|---|
| `TC-UI-001` | Syntaxe des modules servis (existant `UI-01`) | `node --check` OK |
| `TC-UI-002` | Ids `getElementById` ↔ `index.html` (existant `UI-02`) | Aucun id manquant |
| `TC-UI-003` | Service Worker *network-first* (existant `UI-03`) | Réseau interrogé avant le cache |
| `TC-UI-004` | Landing, clic « Commencer mon Voyage » | `dialog#dialog-login[open]` ; aucune erreur console |
| `TC-UI-005` | Démo : ajout d'une activité | Activité affichée ; **aucune requête `POST`** vers `/api/trip` |
| `TC-UI-006` | Viewport 375 × 812 en démo | `scrollWidth <= clientWidth` ; en-tête ≤ 25 % de la hauteur ; barre basse visible |
| `TC-UI-007` | Cibles tactiles visibles à 375 px | Toutes ≥ 44 px de haut (sauf liste d'exceptions documentée) |
| `TC-UI-008` | Ouverture d'un lien partagé (Programme seul) | Bandeau « Lecture seule » ; onglets Préparatifs, Budget et Contacts masqués |
| `TC-UI-009` | Simulation hors-ligne (`fetch` vers `/api` bloqué), puis ajout d'activité, puis rétablissement | Indicateur « En attente de synchro », puis « Enregistré » |

### MODULE 20 : ERGONOMIE & RÈGLES DE DESIGN (Préfixe : TC-UX) 🆕 v2.1 — `tests/ui/`
Exigences : REQ-UX-1 à 4, NFR-1, US-9.1. Chrome headless (CDP), ignoré si Chrome absent. Mesures faites en démo.

| ID | Scénario | Résultat attendu |
|---|---|---|
| `TC-UX-001` | Viewport 375 × 812, en-tête | Contrôles interactifs de l'en-tête ≤ 4 ; présence du menu « ⋯ » ; hauteur de l'en-tête ≤ 15 % de l'écran |
| `TC-UX-002` | Viewport 375 × 812, onglets | Les onglets haute barre sont masqués ; la barre basse contient les 4 onglets |
| `TC-UX-003` | Menu « ⋯ » ouvert | Contient Partager, Nouveau voyage, Profil, Déconnexion ; chaque entrée ≥ 44 px ; fermeture à Échap et au clic extérieur |
| `TC-UX-004` | Viewport 1280 × 800 | Barre d'onglets haute visible ; barre basse masquée |
| `TC-UX-005` | Aucun chevauchement à 360 et 375 px | Aucune paire d'éléments interactifs de l'en-tête dont les rectangles se recoupent ; `scrollWidth <= clientWidth` |
| `TC-UX-006` | Libellés de boutons | Chaque bouton d'en-tête a un libellé de 1 à 2 mots |
| `TC-UX-007` | Une action primaire | Chaque `dialog` ouvert contient au plus un `.btn-primary` visible |
| `TC-UX-008` | Garde-fou tokens (statique) | `style.css` : pas de couleur hexadécimale ni de rayon hors des variables `:root` (liste d'exceptions documentée) |

### MODULE 21 : IDÉES — ACTIVITÉS SANS JOUR (Préfixe : TC-IDEA) 🆕 v2.1 — `tests/domain/ideas.test.js`
Exigences : REQ-2.1, REQ-2.4, US-3.4, ADR-007.

| ID | Scénario | Résultat attendu |
|---|---|---|
| `TC-IDEA-001` | `addActivity` sans `dayId` | Activité dans `trip.ideas`, sans `dayId`, statut `À planifier` ; aucune erreur |
| `TC-IDEA-002` | `addActivity` sans titre ni jour | Erreur « titre obligatoire » (le titre reste le seul champ requis) |
| `TC-IDEA-003` | `placeIdea` sur le Jour 6 | Retirée de `ideas`, présente dans le jour, `dayId` fixé, tous les champs et le statut conservés |
| `TC-IDEA-004` | `unplaceActivity` | Retirée du jour, ajoutée à `ideas`, `dayId` supprimé, champs conservés |
| `TC-IDEA-005` | Voyage ancien sans `ideas` | Lu comme `ideas: []` ; réécriture sans perte |
| `TC-IDEA-006` | Dépense rattachée à une idée | Acceptée ; le solde est correct |
| `TC-IDEA-007` | Export `.ics` et briefing | Les idées sont absentes ; les activités datées inchangées |
| `TC-IDEA-008` | Réduction du séjour avec des idées | Les idées sont conservées |
| `TC-SHARE-IDEA` | Vue partagée avec idées | `buildSharedView` ne contient aucune idée, quelles que soient les sections |
| `TC-IDEA-UI` | Parcours CDP : ajout « Idées », placement sur un jour | Compteur de la section mis à jour, activité visible dans le jour, aucune erreur console |

### MODULE 22 : STATUT EN UN TAP (Préfixe : TC-QS) 🆕 v2.1 — `tests/domain/` + `tests/ui/`
Exigences : REQ-2.5, US-1.3, US-3.5.

| ID | Scénario | Résultat attendu |
|---|---|---|
| `TC-QS-001` | `TodoService.toggleDone` sur `À faire` | Passe à `Fait` ; taux de complétion recalculé |
| `TC-QS-002` | `toggleDone` sur `Fait` | Revient à `À faire` ; `En cours` devient `Fait` |
| `TC-QS-003` | Règle du ✓ d'activité (`isCheckable`) | Vrai pour le jour courant et les jours passés ; faux pour un jour futur et pour une idée |
| `TC-QS-004` | Marquer `Effectué` | Statut mis à jour ; autres champs inchangés |
| `TC-QS-005` | UI : tap sur la pastille de tâche | Statut changé, **aucune** modale ouverte, toast « Annuler » visible |
| `TC-QS-006` | UI : tap sur le reste de la tuile | La fiche d'édition s'ouvre |
| `TC-QS-007` | UI : « Annuler » dans les 5 s | Statut précédent restauré |
| `TC-QS-008` | Cible tactile de la pastille | ≥ 44 × 44 px à 375 px |

### MODULE 23 : CONTACTS — SÉLECTEUR ET IMPORT (Préfixe : TC-CTX) 🆕 v2.1 — `tests/domain/contact_import.test.js`
Exigences : REQ-3.5, REQ-3.6, US-4.3, US-4.4, ADR-008.

| ID | Scénario | Résultat attendu |
|---|---|---|
| `TC-CTX-001` | `parseVCard` : fichier de 3 fiches (FN, TEL) | 3 contacts `{ name, phone }` |
| `TC-CTX-002` | `parseVCard` : lignes pliées, `N` sans `FN`, accents `QUOTED-PRINTABLE` | Noms corrects, aucune exception |
| `TC-CTX-003` | `parseVCard` : texte non vCard ou vide | Liste vide, aucune exception |
| `TC-CTX-004` | `parseBulk` : `Paul`, `Marie, 6 99 00 00 00`, lignes vides | 2 contacts, vide ignoré, espaces nettoyés |
| `TC-CTX-005` | Détection des doublons (nom normalisé ou téléphone) | Marqués « déjà présent », décochés par défaut |
| `TC-CTX-006` | `toContacts` avec 12 importés, 2 ignorés, 1 en `Famille`, défaut `Ami` | 10 contacts, relations correctes |
| `TC-CTX-007` | Relation invalide | Remplacée par `Autre` |
| `TC-CTX-008` | Filtre du sélecteur : « pa » | Contacts correspondants uniquement, insensible casse/accents, récents d'abord |
| `TC-CTX-UI1` | Assistant : charger un .vcf puis trier | Écran de tri affiché ; après validation, les contacts conservés sont dans le voyage |
| `TC-CTX-UI2` | Sélecteur d'activité : filtrer, taper, « + Nouveau » | Pastilles ajoutées, `contactIds` à jour, sélecteur ouvert entre deux taps |
| `TC-CTX-UI3` | Navigateur sans Contact Picker | Bouton natif absent ; vCard et saisie en lot proposés |

### MODULE 24 : JOUR COURANT ET RAPPEL (Préfixe : TC-NOW) 🆕 v2.1 — `tests/domain/now.test.js`
Exigences : REQ-7.5, REQ-7.6, REQ-7.7, US-9.2, US-9.3. Horloge et fuseau **injectés** (aucun test ne dépend de la date réelle).

| ID | Scénario | Résultat attendu |
|---|---|---|
| `TC-NOW-001` | Séjour 01–21/11, date locale 08/11 | Jour 8 |
| `TC-NOW-002` | Avant le départ (25/10) | Jour 1 + compte à rebours « J-7 » |
| `TC-NOW-003` | Après le retour (30/11) | Dernier jour |
| `TC-NOW-004` | 23:30 UTC le 07/11 pour un séjour à Douala (UTC+1) | Jour 8 (fuseau du lieu), et non Jour 7 |
| `TC-NOW-005` | Prochaine activité à 13:00, il est 11:30 | « dans 1 h 30 » |
| `TC-NOW-006` | Toutes les activités du jour sont passées / sans heure | Aucun rappel |
| `TC-NOW-007` | Idée horodatée | Ignorée par le rappel |
| `TC-NOW-008` | `.ics` | Chaque activité horodatée contient `BEGIN:VALARM` avec `TRIGGER:-PT1H` ; les activités sans heure n'en ont pas |
| `TC-NOW-UI` | CDP : horloge simulée au jour 8 | Le Programme s'ouvre sur le Jour 8 et affiche « Prochaine : … » |

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
| **REC-08** | Couper le wifi/connexion et ajouter une activité, puis rétablir la connexion et recharger | Aucun écran d'erreur ; « En attente de synchro » puis « Enregistré » ; l'activité est toujours là après rechargement | ⚪ À tester |
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
| **REC-23** 🆕 | Partager : activer le lien sans rien changer, l'ouvrir en navigation privée | Seul le Programme est visible, en lecture seule, sans participants | ⚪ À tester |
| **REC-24** 🆕 | Partager : cocher Budget et Contacts, rouvrir le lien | Les onglets Budget et Contacts apparaissent, en lecture seule | ⚪ À tester |
| **REC-25** 🆕 | Partager : désactiver le lien, rouvrir l'onglet privé | Message « Ce lien de partage n'est plus actif » | ⚪ À tester |
| **REC-26** 🆕 | Partager : régénérer le lien | L'ancien lien est inactif, le nouveau fonctionne | ⚪ À tester |
| **REC-27** 🆕 | Se connecter sur le téléphone puis sur l'ordinateur | Les deux restent connectés | ⚪ À tester |
| **REC-28** 🆕 | Modifier le même voyage sur les deux appareils, l'un étant resté hors-ligne | L'appareil en retard affiche « Conflit » et propose « Restaurer ma version » | ⚪ À tester |
| **REC-29** 🆕 | Démo : ajouter une activité, puis ouvrir la démo dans un autre navigateur | L'activité n'apparaît pas dans l'autre navigateur | ⚪ À tester |
| **REC-30** 🆕 | Téléphone (≈ 375 px) : parcourir les 4 onglets | Pas de défilement horizontal, en-tête compact, barre de navigation basse | ⚪ À tester |
