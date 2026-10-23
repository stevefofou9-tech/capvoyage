# SDD — Phase 1 : Discovery (chantier « Recommandations de l'audit »)

**Date :** 23/10/2026 · **Entrée :** [`docs/audit_2026-10-23.md`](../audit_2026-10-23.md) · **Statut :** en attente de validation (jalon phases 1–4)

---

## 1. Pourquoi ce chantier

L'audit du 23/10 montre que CapVoyage tient sa promesse fonctionnelle (planification progressive, budget bimonétaire, formalités). En revanche, il ne tient **pas** trois promesses du `PRODUCT.md` :

| Promesse produit (`PRODUCT.md`) | Réalité constatée | Constats audit |
|---|---|---|
| « Un seul point **fiable** » | N'importe qui peut écraser n'importe quel voyage, un lien « lecture seule » permet d'écrire, et les visiteurs de la démo écrasent les données des autres | S1, S2, S3 |
| « Fiabilité nomade absolue » / « 100 % hors-ligne » | Une modification faite hors-ligne est **perdue** au retour du réseau, et deux appareils s'écrasent mutuellement | A4, A5 |
| « Mobile, d'une main » | À 375 px, la page déborde horizontalement et l'en-tête occupe 45 % de l'écran | U2, U5 |

Ces écarts n'ont pas été détectés parce qu'il n'existait **aucun test HTTP ni navigateur** (T2, T3) et que la CI n'était pas branchée (P3).

## 2. Problèmes, du point de vue de l'utilisateur

| ID | Problème vécu | Qui | Gravité |
|---|---|---|---|
| P-U1 | « Mon planning a été modifié par quelqu'un d'autre » | Tout utilisateur dont l'id de voyage a fuité (par exemple via un lien de partage) | 🔴 |
| P-U2 | « J'ai partagé mon programme avec ma tante, elle voit aussi mon budget et les téléphones de mes contacts, et je ne peux pas couper le lien » | Utilisateur qui partage | 🔴 |
| P-U3 | « J'ai ajouté trois activités dans le taxi sans réseau, elles ont disparu le soir » | Voyageur en mobilité | 🔴 |
| P-U4 | « En démo, je vois des activités bizarres ajoutées par d'autres » | Prospect en démo | 🟠 |
| P-U5 | « Sur mon téléphone, il faut faire défiler la page sur le côté, et l'en-tête prend la moitié de l'écran » | Usage mobile (cas principal) | 🟠 |
| P-U6 | « Je me connecte sur mon PC et mon téléphone me déconnecte » | Utilisateur multi-appareils | 🟠 |
| P-U7 | « Le bouton "actualiser les taux" ne marche jamais » | Utilisateur budget | 🟡 |

## 3. Dettes techniques (sans effet visible direct)

| ID | Dette | Constat |
|---|---|---|
| D-T1 | Double source de vérité SQLite et fichiers JSON miroirs | A3 |
| D-T2 | Réécriture de **tous** les comptes à chaque requête : courses critiques et coût O(n) | S8 |
| D-T3 | `server.js` démarre l'écoute dès l'import, ce qui empêche de le tester | A6 |
| D-T4 | Seed démo avec un id aléatoire, d'où des lignes orphelines | A8 |
| D-T5 | Code mort lié à des fonctionnalités retirées (voir §5) | U4 |
| D-T6 | Codes et jetons générés par `Math.random`, IP lue depuis `X-Forwarded-For`, absence de CSP | S4, S6, S9 |
| D-T7 | Documentation périmée et compteurs de tests contradictoires (58, 72, 75, 82, 89 ; il y en a 94) | D2–D5 |
| D-T8 | Pas de sauvegarde applicative de la base SQLite | P4 |

## 4. Nouveau besoin exprimé (23/10)

> « Faut pouvoir personnaliser les sections du lien de partage et pouvoir le on/off. »

Il en découle **REQ-SHARE-1** : partage activable ou désactivable, avec un choix des sections (Programme, Préparatifs, Budget, Contacts) et un filtrage fait côté serveur. Ce besoin répond directement à P-U2.

## 5. Décision de périmètre : fonctionnalités retirées

Décision de Steve (23/10), cohérente avec le retour utilisateur déjà consigné dans [`specifications_v2_affinages.md`](../specifications_v2_affinages.md) (« Imprimer ne sert à rien, export et tout ça… »).

| Fonctionnalité | Ancienne référence | Décision | Conséquence code |
|---|---|---|---|
| Export / import JSON (sauvegarde/restauration) | REQ-6.2, US-6.2, TC-STO-003/004 | ❌ Retirée | Suppression de `StorageService.exportToJson` ; `parseAndValidate` est conservé (utilisé par `loadFromFile`) |
| Impression / récapitulatif PDF | REQ-6.3, US-6.2, TC-STO-005 | ❌ Retirée | Suppression de `StorageService.generatePrintableSummary` |
| Réordonner les activités dans une journée | REQ-2.3 (partie « changer l'ordre ») | ❌ Retirée | Rien à supprimer (jamais implémenté). L'ordre d'affichage reste fixé par les blocs temporels et l'heure |
| Supprimer un voyage | (non spécifié, code orphelin) | ❌ Retirée | Suppression de `AuthService.deleteTripFromUser` et `DbService.deleteTrip` |
| Déplacer une activité vers un autre jour | REQ-2.3, US-3.3, TC-ACT-006 | ✅ **Conservée** | Via le sélecteur de jour de la modale d'édition. La modale « Déplacer » séparée, inatteignable, est supprimée |

La sauvegarde **opérationnelle** de la base (backup SQLite côté serveur, P4) n'est pas concernée : c'est de l'exploitation, pas une fonctionnalité utilisateur.

## 6. Contraintes à respecter

- **`PRODUCT.md`** : zéro framework, zéro dépendance d'exécution, temporalité lâche, pas de mot de passe, ton rassurant.
- **`GEMINI.md`** : modales `max-height: 88vh` avec CTA sticky ; pas de `required` sur un champ caché ; tuiles entièrement cliquables avec `stopPropagation` ; revue combinée statique + écran réel (CDP).
- **`DESIGN.md`** (nouvelle charte « Carte Solaire ») : tokens de couleur et typographie (Public Sans, Atkinson Hyperlegible), cibles ≥ 44 px.
- **Pas de nouvelle dépendance npm**, y compris pour les tests (`node:test`, `http`, CDP via le `WebSocket` natif de Node ≥ 22).
- **Compatibilité des données** : les comptes et voyages en production doivent migrer automatiquement (sessions, `shareToken` vers `sharing`), sans intervention manuelle.

## 7. Existant réutilisable

| Besoin | Existant | Fichier |
|---|---|---|
| Lecture ciblée d'un utilisateur | `getUserBySessionToken`, `getUserByEmail`, `getUserById` | `src/services/DbService.js` |
| Lecture d'un voyage | `getTripById`, `getTripByShareToken` | `src/services/DbService.js` |
| Rate limiting persistant | `checkRateLimit(key, …)` (accepte n'importe quelle clé, donc aussi l'email) | `src/services/DbService.js` |
| Jeton de partage | `TripService.getOrCreateShareToken`, `validateShareToken` | `src/domain/TripService.js` |
| Validation de schéma | `StorageService.validateTripSchema`, `parseAndValidate` | `src/domain/StorageService.js` |
| Taux de change injectables | `BudgetEngine.syncExchangeRates({ fetchFn })` | `src/domain/BudgetEngine.js` |
| UI | `showToast` (avec annulation), `openAccessibleDialog` / `closeAccessibleDialog` | `src/ui/app.js` |
| Garde-fou front | `tests/ui/frontend_integrity.test.js` | — |

## 8. Hors sujet pour ce chantier

- Découpage de `src/ui/app.js` en modules (A7) : reporté, à réévaluer après la recette.
- Journalisation structurée et remontée des erreurs front (P6) : reportées.
- Synchronisation fine, champ par champ (CRDT) : non retenue. On garde un voyage complet avec contrôle de version (voir ADR-003).
