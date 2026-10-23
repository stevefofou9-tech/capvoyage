# ADR-004 : Sessions multiples avec expiration

**Statut :** Proposé (jalon SDD du 23/10/2026) · **Date :** 23/10/2026

## Contexte
`users.session_token` ne stocke **qu'un seul** jeton par compte, sans expiration. Se connecter sur un deuxième appareil déconnecte le premier, et un jeton volé reste valable indéfiniment (S5).

## Décision
- Nouvelle table `sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT, last_seen_at TEXT, expires_at TEXT)`, indexée sur `user_id`.
- `verify-code` crée une ligne de session valable **30 jours**. Chaque requête authentifiée repousse l'expiration (glissement), au plus une fois par heure pour limiter les écritures.
- `logout` ne supprime que la session courante.
- **Migration idempotente au démarrage :** tout `users.session_token` non nul est copié dans `sessions` avec une expiration à 30 jours, puis remis à `NULL`. Les utilisateurs déjà connectés le restent.
- `AuthService` garde ses fonctions pures (`requestLoginCode`, `verifyCode`). Le serveur leur passe `[user]`, chargé par `getUserByEmail`, au lieu de la liste complète des comptes.
- Les sessions expirées sont purgées au démarrage et à chaque création de session.

## Conséquences
- ➕ Plusieurs appareils peuvent rester connectés en même temps, et les jetons expirent.
- ➖ Une table de plus à maintenir.
