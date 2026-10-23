# ADR-002 : Autorisation côté serveur

**Statut :** Proposé (jalon SDD du 23/10/2026) · **Date :** 23/10/2026

## Contexte
`POST /api/trip` enregistre le corps reçu tel quel. `saveTrip` fait un upsert sur l'`id` fourni par le client et écrase `user_id`, ce qui permet d'écrire dans le voyage de n'importe qui (S1). Sans session, l'écriture part dans la démo partagée (S3). La « lecture seule » ne repose que sur un champ `isReadOnly` envoyé par le client (S2). `/api/reset` n'est pas authentifié.

## Décision
- **Toute écriture exige une session valide**, sinon `401` : `POST /api/trip`, `POST /api/wizard/trip`, `PUT /api/trip/sharing`, `POST /api/user/trips/switch` et `POST /api/user/contacts`.
- **Contrôle de propriété :** le voyage visé est chargé **depuis la base** par son id. Il doit exister (`404`) et appartenir à l'utilisateur de la session (`403`). Les champs serveur (`id`, `userId`, `sharing`, `createdAt`, `version`) sont **toujours repris de la base**, jamais du corps de la requête.
- **Jeton de partage = lecture seule par construction :** aucune route d'écriture n'accepte un jeton de partage. Le champ `isReadOnly` envoyé par le client est ignoré.
- **Lecture d'un voyage** (`GET /api/trip`) :
  - avec une session, le voyage courant de l'utilisateur ;
  - avec `?share=`, la vue partagée (ADR-006) ;
  - sans session ni jeton, le seed démo (marqué `isDemo: true`).
- **Suppression de `/api/reset` et `/api/trip/budget`.** La démo devient locale (ADR-003). Le budget est modifié côté client par `TripService.updateTripBudget` et `BudgetEngine.setCurrencyRate`, puis enregistré par `POST /api/trip`.
- **Anti-abus (S4) :**
  - L'IP est lue dans `Fly-Client-IP` quand l'app tourne sur Fly (variable `FLY_APP_NAME` présente), sinon dans `req.socket.remoteAddress`. `X-Forwarded-For` est ignoré.
  - Une limite par e-mail s'ajoute à la limite par IP : `checkRateLimit('req_code_email:<email>', 5, 15 min)` et `checkRateLimit('verify_email:<email>', 10, 15 min)`.
- **Aléa cryptographique (S6) :** `crypto.randomInt(100000, 1000000)` pour les codes, `crypto.randomUUID()` (sans repli `Math.random`) pour les identifiants et les jetons.
- **En-têtes (S9) :** CSP envoyée sur toutes les réponses :
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`.
  `'unsafe-inline'` reste nécessaire pour les 21 attributs `style=""` d'`index.html` et les styles posés par `app.js`. Google Fonts est autorisé car la charte `DESIGN.md` l'utilise.

## Conséquences
- ➕ Les failles S1, S2, S3, S4, S6 et S9 sont fermées et verrouillées par des tests HTTP (`tests/api`).
- ➖ En mode démo, l'assistant ne crée plus de voyage côté serveur : il crée le voyage localement avec `TripService.createTripFromWizard`, déjà partagé entre client et serveur.
