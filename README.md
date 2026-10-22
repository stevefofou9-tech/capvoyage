# 🧭 CapVoyage

[![Methodology](https://img.shields.io/badge/Methodology-Spec--Driven%20Development%20(SDD)-blue.svg)](#m%C3%A9thodologie)
[![Node.js](https://img.shields.io/badge/Node.js-v24.20.0-green.svg)](https://nodejs.org)
[![Offline](https://img.shields.io/badge/Offline-100%25%20First-orange.svg)](#persistance)
[![Tests](https://img.shields.io/badge/Tests-89%2F89%20Passing-brightgreen.svg)](#tests)
[![Database](https://img.shields.io/badge/Database-SQLite%20WAL%20(Native)-blueviolet.svg)](#architecture)
[![Docker](https://img.shields.io/badge/Docker-Production%20Ready-2496ED.svg)](#d%C3%A9ploiement-en-production)

> **Planification jour par jour & préparation sereine de vos séjours à l'étranger.**  
> Fini les tableurs rigides et les notes éparpillées : CapVoyage structure vos séjours avec l'**enregistrement progressif d'activités**, un **carnet de contacts relationnel**, la gestion de **budget multi-devises en temps réel** (EUR, FCFA XAF, CAD, CNY, USD) et la gestion de **multi-voyages avec bascule instantanée**.  
> *Cas concret de référence : Voyage au Cameroun (21 jours : Douala, Yaoundé, Kribi).*

---

## 🌟 Parcours Utilisateur & Nouveautés V3

1. 🌍 **Formulaires Intelligents & Cascade Pays -> Villes :**
   - **Destinations Populaires en 1 clic :** 11 pays avec drapeaux, devises natives et villes majeures (Cameroun, Sénégal, Côte d'Ivoire, Canada, Chine, Japon, France, Italie, Espagne, USA, Maroc).
   - **Cascade animée des villes :** Un clic sur un pays fait jaillir instantanément les villes étapes avec pré-sélection automatique de la monnaie.
   - **Mode Saisie Libre :** Pour n'importe quelle destination hors catalogue.

2. 👥 **Contacts Unitaires & Validation Pas-à-Pas (Wizard Étape 3) :**
   - Saisie unitaire de chaque contact avec nom, relation et ville suggérée.
   - Puces dynamiques (chips) avec bouton de suppression immédiat.
   - Garantie de persistance dès la fin de l'assistant dans le voyage actif.

3. ⚡ **Modèles d'Activités & Autocomplete Dynamique :**
   - **Ruban de templates au repos :** *Dîner entre amis*, *Repas de famille*, *Rdv professionnel*, *Plage*, *Marché artisanal*, *Trajet*.
   - **Autocomplete en direct :** Suggestions filtrées au fil de la frappe au clavier avec injection automatique du prénom du contact le plus pertinent.

4. 🎯 **Ergonomie Directe dans la Modale d'Activité :**
   - **Déplacement direct de jour :** Menu déroulant `Jour X • Date (Ville)` pour réassigner l'activité en 1 clic sans sous-menu.
   - **Créneaux horaires rapides :** Boutons prédéterminés (08:00, 10:00, 12:30, 15:30, 19:30, 21:00).
   - **Création express de contact inline :** Mini-formulaire intégré directement dans l'activité pour ajouter et cocher un nouveau contact en direct.

5. 👤 **Profil Utilisateur & Multi-Voyages :**
   - Modale Profil accessible en 1 clic depuis le badge utilisateur.
   - Liste synthétique des séjours planifiés avec statut du budget et nombre d'activités.
   - Bascule instantanée entre séjours (`POST /api/user/trips/switch`).
   - Bouton `+ Nouveau Voyage` pour lancer l'assistant à tout moment.

6. 💰 **Devises Mondiales Prises en Charge :**
   - Euros (`EUR`), Franc CFA (`XAF`/`XOF` à 655.957), Dollar Canadien (`CAD` à 1.48), Yuan Chinois (`CNY` à 7.75), Dollar Américain (`USD` à 1.08).
   - Taux modifiable à la volée avec conversion bidirectionnelle en direct.

---

## 📚 Documentation Spec-Driven Development

| Document | Emplacement | Rôle |
|---|---|---|
| **Spécifications Produit (PRD)** | [`docs/PRD.md`](docs/PRD.md) | Spécifications fonctionnelles, entités, règles de gestion et scénarios d'acceptation Gherkin |
| **Architecture Technique** | [`docs/architecture_technique.md`](docs/architecture_technique.md) | Architecture modulaire, modèle de données, machine à états et persistance |
| **Guide Utilisateur** | [`docs/guide_utilisateur.md`](docs/guide_utilisateur.md) | Manuel pas-à-pas illustré avec le voyage au Cameroun (Douala, Yaoundé, Kribi) |
| **Cahier de Recette & Tests** | [`docs/cahier_de_test.md`](docs/cahier_de_test.md) | 58 cas de test automatisés couvrant les 8 suites fonctionnelles |
| **Registre des Tâches** | [`TASKS_PROGRESS.md`](TASKS_PROGRESS.md) | Suivi d'avancement des phases et jalons validés |

---

## 🧪 Tests Automatisés

## 🧪 Tests Automatisés

Le projet s'appuie sur le moteur de test natif de Node.js (`node:test`) sans dépendance tierce :

```bash
# Exécution des 89 tests de règles métier, intégration et production
npm test
```

### Résultats de la suite :
```text
✔ Suite 1 : To-Do Pré-Voyage & Formalités (TC-TODO) (6 tests)
✔ Suite 2 : Configuration du Voyage & Calendrier (TC-TRIP) (6 tests)
✔ Suite 3 : Activités & Enregistrement Progressif (TC-ACT) (8 tests)
✔ Suite 4 : Carnet de Contacts & Liaisons (TC-CNT) (5 tests)
✔ Suite 5 : Budget & Multi-Devises (TC-BUD) (7 tests)
✔ Suite 6 : Persistance & Mode Hors-Ligne (TC-STO) (4 tests)
✔ Suite 7 : Authentification & Comptes Sécurisés (AuthService) (6 tests)
✔ Suite 8 : Wizard Express, Alertes & Cercles Relationnels V2 (TC-V2) (7 tests)
✔ Suite 9 : Onboarding Express & Configuration Dynamique (4 tests)
✔ Suite 10 : Rappels & Échéances (ReminderService) (4 tests)
✔ Suite 11 : Géographie & Villes de Référence (GeographyData) (4 tests)
✔ Suite 12 : Modèles & Templates d'Activités (ActivityTemplates) (4 tests)
✔ Suite 13 : Multi-Voyages & Profil Utilisateur (AuthService) (3 tests)
✔ Suite 14 : Contacts Wizard, Déplacement Direct & Devises CAD/CNY (3 tests)
✔ Suite 15 : Robustesse, Sécurité & Fuseaux Horaires UTC (ROB-SEC) (3 tests)
✔ Suite 16 : Export Calendrier RFC 5545 .ics (IcsService) (3 tests)
✔ Suite 17 : Recommandations d'Audit V4 (Mise à jour Contact, Todo, Taux, Partage) (4 tests)
✔ Suite 18 : Intégration Cycle de Vie Voyage Cameroun (1 test E2E)
✔ Suite 19 : Préparation Production & Persistance SQLite Option B (7 tests)

Total : 89 tests passés avec succès (0 échec).
```

---

## 🚀 Lancement & Utilisation Locale

### Démarrer le serveur CapVoyage :
```bash
node src/server.js
```
Ouvrez votre navigateur sur : **[http://localhost:3000](http://localhost:3000)**.

---

## 🐳 Déploiement en Production

### 1. Déploiement Continu Automatique vers Fly.io (GitHub Actions) :
Chaque commit poussé sur `main` ou `master` déclenche automatiquement l'exécution des 89 tests et le déploiement sur [Fly.io](https://fly.io) avec volume NVMe persistant (`capvoyage_data` monté sur `/app/data`).

**Les 3 commandes CLI uniques préalables :**
```bash
# 1. Créer l'application Fly.io
flyctl apps create capvoyage

# 2. Créer le volume persistant SQLite (région Paris / cdg)
flyctl volumes create capvoyage_data --region cdg --size 1 --app capvoyage

# 3. Générer le jeton de déploiement à enregistrer dans GitHub Secrets sous FLY_API_TOKEN
flyctl tokens create deploy -x 999999h --app capvoyage
```

### 2. Déploiement Local ou VPS (Docker Compose) :
```bash
docker compose up -d --build
```

Consultez le guide complet de déploiement en production : [`docs/guide_mise_en_production.md`](docs/guide_mise_en_production.md).
