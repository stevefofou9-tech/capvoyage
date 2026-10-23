# ADR-001 : SQLite, source de vérité unique

**Statut :** Accepté et implémenté (23/10/2026) · **Date :** 23/10/2026

## Contexte
Chaque écriture part aujourd'hui à la fois dans SQLite (`DbService`) **et** dans des fichiers JSON miroirs (`data/users.json`, `data/trips/trip_<id>.json`, `data/trips/trip_<userId>.json`). Les lectures se replient d'une source sur l'autre (`loadUsers`, `GET /api/trip`, `?share=`). Le voyage démo est lu **et réécrit** dans `data/trip_cameroun.json`, un fichier suivi par git (audit A3, A8, S3).

## Décision
1. **SQLite est l'unique source de vérité.** Le serveur n'écrit plus aucun fichier JSON.
2. `DbService.autoMigrateFromJson(DATA_DIR)` reste exécutée au démarrage pour importer une seule fois les anciens fichiers. Les replis de lecture vers JSON sont supprimés.
3. **Démo :** le seed est produit par le code (`createInitialSeedTrip()` dans `src/seed.js`) avec l'id stable `trip-cameroun-seed`. Il est inséré en base au démarrage s'il est absent, puis **n'est plus jamais réécrit** par l'API.
4. `data/trip_cameroun.json` n'est plus utilisé : il sort du suivi git et rejoint le `.gitignore`. Son contenu actuel, modifié par des visiteurs, n'a pas de valeur de référence.
5. Les routes lisent un utilisateur précis (`getUserBySessionToken`, `getUserByEmail`) au lieu de charger puis réécrire **tous** les comptes. Cela supprime les courses critiques et le coût O(n) à chaque requête (S8).

## Conséquences
- ➕ Une seule vérité, des écritures atomiques (transaction SQLite) et un dépôt git qui ne se salit plus.
- ➖ Après migration, les fichiers JSON présents en production ne sont plus mis à jour ; ils restent sur le volume comme archive.
- La sauvegarde est assurée par `scripts/backup-db.js` (`VACUUM INTO`), décrit dans le guide de mise en production.
