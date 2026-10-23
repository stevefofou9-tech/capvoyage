# ADR-006 : Partage paramétrable et activable

**Statut :** Proposé (jalon SDD du 23/10/2026) · **Date :** 23/10/2026

## Contexte
Demande de Steve (23/10) : « personnaliser les sections du lien de partage et pouvoir le on/off ».
Aujourd'hui, `trip.shareToken` est créé au premier clic sur « Partager » et ne peut être ni coupé ni restreint. Le lien expose **tout** le voyage : budget, téléphones et identifiant interne. C'est ce qui rend possible l'écriture S2.

## Décision

### Modèle de données
- `trip.sharing = { enabled: boolean, token: string|null, sections: { planning, todos, budget, contacts }, updatedAt }` remplace `trip.shareToken`.
- Valeur par défaut à l'activation : `sections = { planning: true, todos: false, budget: false, contacts: false }`.
- **Migration à la lecture** (`TripService.normalizeSharing`) : un ancien `shareToken` devient `{ enabled: true, token: shareToken, sections: { planning: true, todos: false, budget: false, contacts: false } }`. Les liens existants continuent de fonctionner, mais ne montrent plus que le Programme (choix le plus protecteur).

### Écriture
- **Seul le serveur écrit `sharing`**, via `PUT /api/trip/sharing`, réservé au propriétaire.
  - Corps : `{ tripId, enabled?, sections?, regenerate? }`. Réponse : `{ sharing }`.
- `POST /api/trip` réimpose toujours la valeur de `sharing` stockée en base.

### Accès au lien
- La colonne `trips.share_token` contient `sharing.token` si le partage est activé, sinon `NULL`.
- Un lien désactivé ou régénéré ne trouve donc plus rien : réponse `404 { error: "Ce lien de partage n'est plus actif" }`.

### Vue partagée
Fonction pure `TripService.buildSharedView(trip)`, renvoyée par `GET /api/trip?share=`.

| Section | Données transmises |
|---|---|
| Toujours | `title`, `country`, `startDate`, `endDate`, `isReadOnly: true`, `sharedSections` |
| `planning` | `days` avec leurs activités ; `contactIds` vidés si `contacts` est désactivé |
| `todos` | `todos` |
| `budget` | `totalBudget`, `baseCurrency`, `currencies`, `expenses` |
| `contacts` | `contacts` |
| Jamais | `id`, `userId`, `sharing`, `shareToken`, `version` |

### Interface
- Le bouton « Partager » ouvre une modale avec :
  - un interrupteur Activer/Désactiver ;
  - quatre cases pour les sections ;
  - le lien et un bouton « Copier » ;
  - un bouton « Régénérer le lien », avec confirmation.
- Côté lecteur, les onglets des sections absentes de `sharedSections` sont masqués (barre du haut et barre basse mobile), et le bandeau « Lecture seule » est affiché.

## Conséquences
- ➕ Le partage devient sûr par défaut et contrôlable. La vue partagée ne contient aucun identifiant exploitable.
- ➖ Les liens déjà partagés perdent l'accès au budget, aux préparatifs et aux contacts, jusqu'à ce que le propriétaire les réactive dans la modale.
