# ADR-007 : Activités sans jour (« Idées »)

**Statut :** Accepté (23/10/2026), à implémenter · **Date :** 23/10/2026

## Contexte
Retour utilisateur R5 : pouvoir créer des activités à planifier sans les affecter à un jour. Aujourd'hui `REQ-2.1` exige un jour, et `ActivityService.addActivity` lève une erreur sans `dayId`. Les activités sont stockées **dans** les jours (`trip.days[].activities`), et plusieurs fonctions parcourent uniquement les jours (réduction de séjour, `.ics`, briefing, budget, rappels).

## Décision

### Modèle
- Les idées vivent dans un tableau séparé `trip.ideas[]` (même forme qu'une activité, **sans** `dayId`). Un voyage sans `ideas` est lu comme `ideas: []` (normalisation à la lecture, **aucune migration**).
- Pas de `dayId: null` dans `days[]` : toutes les fonctions qui parcourent `days[].activities` restent correctes sans modification (alternative rejetée : un « jour fictif 0 », qui fausserait les compteurs et la réduction de séjour).
- Le statut est indépendant : « sans jour » = présence dans `ideas`. Une idée garde le statut `À planifier`, et un placement ne change **pas** le statut (Q3).

### Domaine (`ActivityService`)
- `addActivity(trip, { dayId?, ... })` : sans `dayId`, ajoute à `trip.ideas`.
- `placeIdea(trip, activityId, dayId)` : retire de `ideas`, pousse dans le jour, fixe `dayId`.
- `unplaceActivity(trip, activityId)` : inverse (« Remettre aux idées »), supprime `dayId`.
- `findActivity` et `deleteActivity` cherchent aussi dans `ideas`.
- `addExpense` accepte un `activityId` d'idée.

### Exclusions explicites
| Consommateur | Comportement |
|---|---|
| `IcsService` | N'exporte que `days[].activities` : idées exclues sans changement |
| `ReminderService` (briefing, prochaine activité) | Idées ignorées |
| `TripService.buildSharedView` | `ideas` **jamais transmis** (brouillon personnel, Q4) |
| Réduction de séjour (`TripService`, garde-fou) | N'est pas affectée ; les idées n'appartiennent à aucun jour |
| `StorageService.validateTripSchema` | Accepte `ideas` facultatif (tableau) |
| `POST /api/trip` / synchro | Aucun changement : voyage complet versionné (ADR-003) |

### Interface
- Section repliable « Idées (N) » en tête du Programme (pas d'onglet, cf. REQ-UX-2), fermée par défaut si vide.
- Ajout rapide : le bouton d'ajout propose « Jour N » (par défaut) et « Idées ».
- Tuile d'idée : action unique « Placer » (sélecteur de jour + créneau facultatif).

## Conséquences
- Un nouveau champ facultatif : compatible avec toutes les données existantes et les anciens clients (qui ignorent `ideas` mais ne le détruisent pas, le voyage étant écrit en entier).
- Tests : `TC-IDEA-001` à `008`, plus `TC-SHARE` (idées absentes de la vue partagée).
- Reporte à plus tard : glisser-déposer d'une idée vers un jour.
