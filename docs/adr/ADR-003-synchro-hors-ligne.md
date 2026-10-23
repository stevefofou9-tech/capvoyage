# ADR-003 : Synchronisation hors-ligne versionnée

**Statut :** Proposé (jalon SDD du 23/10/2026) · **Date :** 23/10/2026

## Contexte
`saveTripData()` écrit le cache local puis appelle `fetch` sans vérifier la réponse ni garder trace d'un échec. Au chargement suivant, `loadTripData()` remplace le cache local par la version serveur : **une modification faite hors-ligne est perdue** (A4). Deux appareils s'écrasent sans prévenir (A5).

## Décision
- **Granularité : le voyage complet**, comme aujourd'hui, avec un **numéro de version** (`trip.version`). C'est un entier géré par le serveur, initialisé à 1 pour les voyages existants.
- **Protocole :** `POST /api/trip` reçoit `{ trip, baseVersion }`.
  - Si `baseVersion` égale la version serveur : le voyage est enregistré, la version passe à `version + 1`, et la réponse est `200 { trip }`.
  - Sinon : réponse `409 { trip: <version serveur> }`, sans rien enregistrer.
- **Côté client, un module pur `src/domain/SyncQueue.js`** (testable sous Node), persisté dans `localStorage['capvoyage_sync_v1']` :
  - `pending[tripId] = { trip, baseVersion, queuedAt }`. Une nouvelle modification **remplace** l'instantané en attente pour ce voyage (coalescence) et garde la `baseVersion` d'origine.
  - **Un seul envoi à la fois** (single-flight). Une modification faite pendant un envoi part juste après, avec la nouvelle version reçue. Un appareil n'entre donc jamais en conflit avec lui-même.
  - **Échec réseau :** l'instantané reste en attente et l'indicateur affiche « En attente de synchro ». Le client réessaie sur l'événement `online`, au chargement, et toutes les 30 s tant qu'il reste un envoi en attente.
  - **Réponse `409` :** la copie locale est rangée dans `conflicts[tripId]`, la version serveur est adoptée et l'indicateur affiche « Conflit ». Un toast propose « Restaurer ma version », qui renvoie la copie locale avec `baseVersion` égale à la version serveur courante (écrasement volontaire).
  - `loadTripData()` **vide d'abord la file**, puis lit le serveur.
- **Démo :** le voyage démo vit dans `localStorage['capvoyage_demo_trip']` et ne passe jamais par la file.
- **Indicateur de synchro** dans l'en-tête : `Enregistré`, `En attente de synchro` ou `Conflit`, dans une zone `aria-live="polite"`.

## Alternatives écartées
- **Fusion champ par champ** (CRDT, journal d'opérations) : trop complexe pour un usage mono-utilisateur sur deux appareils.
- **Le dernier qui écrit gagne** : c'est le fonctionnement actuel, et il perd des données.

## Conséquences
- ➕ NFR-3 (zéro perte) devient vrai et vérifiable : `tests/domain/sync_queue.test.js` pour la logique, `tests/api` pour le `409`.
- ➖ En cas de vrai conflit, l'utilisateur choisit entre deux versions complètes, sans fusion fine. C'est acceptable vu la rareté du cas.
