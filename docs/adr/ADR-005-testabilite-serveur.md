# ADR-005 : Serveur testable (`createServer`)

**Statut :** Accepté et implémenté (23/10/2026) · **Date :** 23/10/2026

## Contexte
`src/server.js` ouvre la base et appelle `listen()` dès son import. Impossible donc de tester l'API en HTTP sans effet de bord (A6, T2).

## Décision
- `src/server.js` exporte `createServer({ dbPath, isProduction, emailService, dataDir })`, qui renvoie `{ server, dbService }` **sans écouter**.
- Le démarrage (`listen(PORT)`, migration, gestion des signaux) ne s'exécute que si le fichier est lancé directement (`import.meta.url === pathToFileURL(process.argv[1]).href`).
- Les tests `tests/api/*.test.js` créent un serveur sur une base `:memory:`, écoutent sur le port `0` et l'appellent avec `fetch`. Aucune dépendance n'est ajoutée.
- Le découpage de `src/ui/app.js` en modules (A7) est **reporté** après la recette de ce chantier.

## Conséquences
- ➕ La sécurité et la synchronisation sont couvertes par de vrais tests HTTP en CI.
- ➖ Aucun changement visible : `npm start` fonctionne comme avant.
