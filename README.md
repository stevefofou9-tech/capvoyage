# 🧭 CapVoyage

[![CI](https://github.com/stevefofou9-tech/capvoyage/actions/workflows/ci.yml/badge.svg)](https://github.com/stevefofou9-tech/capvoyage/actions/workflows/ci.yml)
[![Methodology](https://img.shields.io/badge/Methodology-Spec--Driven%20Development-blue.svg)](docs/sdd/01_discovery.md)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A5%2022-green.svg)](https://nodejs.org)

> **Planification jour par jour & préparation sereine de vos séjours à l'étranger.**
> CapVoyage structure vos séjours avec l'**enregistrement progressif d'activités**, un **carnet de contacts relationnel**, un **budget multi-devises** (EUR, FCFA XAF/XOF, CAD, CNY, USD), les **formalités pré-voyage**, le **multi-voyages**, le **partage paramétrable en lecture seule** et la **synchronisation hors-ligne sans perte**.
> *Cas de référence : voyage de 21 jours au Cameroun (Douala, Yaoundé, Kribi).*

---

## 🌟 Fonctionnalités

1. **Assistant de création** en 3 étapes : catalogue de 11 pays avec villes et devise, dates et budget, contacts initiaux.
2. **Programme jour par jour** en 4 blocs (À caler aujourd'hui, Matin, Après-midi, Soirée), ajout d'une idée en 2 secondes, modèles d'activités, mention `@Contact`, déplacement d'une activité vers un autre jour depuis sa fiche.
3. **Carnet de contacts** avec lien WhatsApp direct et vue des activités par personne.
4. **Budget multi-devises** : conversion instantanée, solde, taux modifiable, actualisation des cours via le serveur (FCFA à parité fixe 655,957).
5. **Préparatifs** : formalités, santé, valise, finances, avec rappels d'échéance.
6. **Comptes sans mot de passe** (code par e-mail), plusieurs appareils connectés, plusieurs voyages par compte.
7. **Partage paramétrable** : lien activable ou désactivable, choix des sections partagées (Programme, Préparatifs, Budget, Contacts ; Programme seul par défaut), régénération du lien.
8. **Hors-ligne sans perte** : PWA, file de synchronisation versionnée, indicateur « Enregistré / En attente de synchro / Conflit » et « Restaurer ma version » en cas de conflit.
9. **Mode démo** isolé : chaque visiteur manipule sa propre copie, sans rien écrire sur le serveur.
10. **Export calendrier** `.ics` (Google / Apple Calendar).

**Hors périmètre** (décision du 23/10/2026, [PRD §7](docs/PRD.md)) : export/import JSON, impression/PDF, réordonnancement manuel des activités, suppression de voyage.

---

## 📚 Documentation

| Document | Rôle |
|---|---|
| [`docs/sdd/01_discovery.md`](docs/sdd/01_discovery.md) | Discovery du chantier « recommandations de l'audit » |
| [`docs/PRD.md`](docs/PRD.md) | Exigences (v2.0), critères Gherkin, hors périmètre |
| [`docs/user_stories.md`](docs/user_stories.md) | Backlog des user stories (EPIC 1 à 8) |
| [`docs/architecture_technique.md`](docs/architecture_technique.md) | Architecture, modèle de données, API |
| [`docs/adr/`](docs/adr/) | Décisions d'architecture (ADR-001 à 006) |
| [`docs/cahier_de_test.md`](docs/cahier_de_test.md) | Cas de test automatisés et recette manuelle |
| [`docs/guide_utilisateur.md`](docs/guide_utilisateur.md) | Manuel utilisateur |
| [`docs/user_journey.md`](docs/user_journey.md) | Parcours utilisateur |
| [`docs/guide_mise_en_production.md`](docs/guide_mise_en_production.md) | Déploiement, secrets, sauvegardes |
| [`docs/audit_2026-10-23.md`](docs/audit_2026-10-23.md) | Audit complet et suivi des recommandations |
| [`PRODUCT.md`](PRODUCT.md) · [`DESIGN.md`](DESIGN.md) · [`GEMINI.md`](GEMINI.md) | Produit, charte visuelle, règles de développement |
| [`TASKS_PROGRESS.md`](TASKS_PROGRESS.md) | Journal d'avancement |
| Historique | [`specifications_v2_affinages.md`](docs/specifications_v2_affinages.md), [`incoherences_et_affinages.md`](docs/incoherences_et_affinages.md), [`rapport_revue_code_et_tests.md`](docs/rapport_revue_code_et_tests.md) |

---

## 🧪 Tests

Moteur de test natif de Node.js (`node:test`), sans dépendance :

```bash
npm test
```

| Dossier | Contenu |
|---|---|
| `tests/domain/` | Règles métier pures (budget, jours, activités, todos, partage, file de synchro…) |
| `tests/integration/` | Scénario complet « Cameroun 21 jours » |
| `tests/api/` | API HTTP réelle sur `createServer()` + SQLite en mémoire : propriété des voyages, partage, versions, sessions, anti-abus, en-têtes |
| `tests/ui/` | Intégrité du front et parcours Chrome headless via CDP (ignoré si Chrome est absent ; définir `CHROME_PATH`) |

Le nombre de tests est celui qu'affiche `npm test` (`ℹ tests N`) ; la CI l'exécute à chaque push sur Node 22 et 24.

---

## 🚀 Lancement local

```bash
npm start
```

Ouvrez **[http://localhost:3000](http://localhost:3000)**. En développement, le code de connexion est affiché à l'écran (`devCode`) et dans la console du serveur.

---

## 🐳 Déploiement

- **Fly.io** : `fly deploy` (ou automatiquement par GitHub Actions après les tests, si le secret `FLY_API_TOKEN` est configuré).
- **Docker** : `docker compose up -d --build`.
- **Sauvegardes** : `node scripts/backup-db.js` (copie SQLite cohérente avec rotation).

Voir le [guide de mise en production](docs/guide_mise_en_production.md) (secrets e-mail, volume, sauvegardes).
