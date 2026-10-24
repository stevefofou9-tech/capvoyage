# ADR-009 : Mise à jour fiable de l'application installée (PWA)

**Statut :** Accepté et implémenté (23/10/2026) · **Date :** 23/10/2026

## Contexte
Après le déploiement de la v2.1, des utilisateurs sont restés sur l'ancienne version. Le serveur n'était pas en cause (`Cache-Control: no-cache` + `ETag` sur tous les fichiers). Quatre mécanismes côté appareil :

| # | Cas | Cause |
|---|---|---|
| 1 | Appareil resté sur un Service Worker ≤ v5 (cache-first) | L'ancien `app.js` n'écoute pas `controllerchange` : la page ouverte garde l'ancien code, seule la 2ᵉ ouverture est à jour |
| 2 | PWA installée laissée en arrière-plan | Le navigateur ne revérifie `sw.js` qu'à une navigation : le code d'hier tourne indéfiniment |
| 3 | Réseau instable à l'installation | `cache.addAll` est atomique : un fichier en échec empêche l'installation, l'ancien SW reste actif |
| 4 | Mise à jour pendant une saisie | `location.reload()` immédiat, sans prévenir |

## Décision

1. **Identifiant de build** : `GET /api/version` → `{ build }`, empreinte SHA-1 (10 caractères) du contenu de `src/ui` et `src/domain`, recalculée seulement si la taille ou la date d'un fichier change. `Cache-Control: no-store`.
2. **Détection côté page** (`app.js`) : vérification au démarrage, au retour au premier plan (`visibilitychange`), à `online` et toutes les 30 min, avec `registration.update()`. Un changement d'identifiant ou un `controllerchange` affiche la barre « ✨ Nouvelle version disponible — Actualiser ». **Plus aucun rechargement surprise.**
3. **Rechargement discret** : au retour sur l'application, si rien n'est ouvert (aucun `dialog[open]`), aucune saisie en cours et aucune synchro en attente, la page se recharge seule. Sinon la barre reste affichée. Dans tous les cas, `flushSync()` (3 s au plus) précède le rechargement.
4. **Précache tolérant** (`sw.js`) : chaque fichier est mis en cache isolément (`Promise.allSettled`) ; l'installation réussit toujours. Cache `capvoyage-cache-v9` (passé à `v10` le 24/10/2026 avec les polices et icônes hébergées, ADR-010).
5. **Rattrapage des anciens clients** : à l'activation d'une mise à jour (un ancien cache `capvoyage-cache-*` existait), le SW envoie un `PING` (MessageChannel) à chaque fenêtre. Une fenêtre qui répond `PONG` (code récent, gère la barre) est laissée tranquille ; une fenêtre muette (ancien code) est rechargée **une fois** par `client.navigate()`.
   - **Piège corrigé pendant la recette** : ne jamais attendre `navigate()` dans `waitUntil()` de l'activation. Une navigation n'est servie qu'une fois le SW activé : on obtient un interblocage et la page ne se charge plus. Le rattrapage est donc lancé sans être attendu.
6. **Secours sans DevTools** : page `/reset` (`reset.html` + `reset.js`, compatible CSP) : vérifie la connexion, désinscrit les SW, supprime **uniquement** les caches `capvoyage-cache-*`, ne touche **jamais** au `localStorage` (voyage, session, file de synchro), puis redirige vers `/` (`?noredirect=1` pour rester sur la page). Hors connexion, elle n'efface rien (le cache est alors la seule copie utilisable).
7. **Entrée « 🔄 Actualiser l'app »** dans le menu « ⋯ » et dans la fenêtre Profil, avec l'affichage « Version 2.1 · build xxxxxxxxxx » pour le support. Même logique que `/reset`, avec synchro terminée avant.

## Addendum : cause réelle observée sur un Chrome bloqué (23/10, 21 h)

Le test sur le Chrome de Steve a montré un cinquième mécanisme, **le plus répandu** : le **cache HTTP du navigateur** contenait `style.css` et `app.js` datés du **22/10 21:10 GMT** avec l'ancienne politique `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`. Le navigateur les jugeait « frais » 24 h (puis servait la copie périmée jusqu'à 7 jours en revalidant en arrière-plan) **sans contacter le serveur**. L'`index.html` (no-cache) était neuf, mais chargeait l'ancien `style.css` (palette verte, police Inter) et l'ancien `app.js`, qui n'enregistrait donc jamais le nouveau Service Worker : aucun mécanisme du SW ne pouvait corriger cela. Le correctif de cache serveur du 23/10 n'agit que sur les réponses *futures*, pas sur les copies déjà stockées.

Décisions complémentaires :
8. **URLs versionnées** : le serveur réécrit `index.html` et `reset.html` pour référencer `app.js?v=<build>`, `style.css?v=<build>` et `reset.js?v=<build>`. Chaque publication a des URLs neuves, qu'aucun cache ne peut contenir : **le correctif agit dès la première visite**, sans aucune action.
9. **Purge du cache HTTP** : `Clear-Site-Data: "cache"` est envoyé avec la première page HTML d'un navigateur (cookie technique `cv_cache=<époque>`, un an, `HttpOnly`) et à chaque visite de `/reset`. Jamais la directive `storage` : le `localStorage` est conservé. Cela nettoie aussi les copies périmées des autres fichiers.
10. « Actualiser l'app » passe par `/reset` (donc purge le cache HTTP en plus des caches du SW).

Remarque de test : dans un même onglet, Chrome garde aussi un cache mémoire qui respecte `max-age` ; la purge seule demande donc parfois une 2ᵉ ouverture, d'où l'intérêt des URLs versionnées (`TC-PWA-006`).

## Alternatives rejetées
- `Clear-Site-Data` : efface aussi `localStorage`, donc des modifications non synchronisées.
- Fichiers versionnés par empreinte (build) : chantier de build disproportionné pour le besoin.
- Rechargement forcé à chaque nouvelle version : perte de saisie (cas 4).

## Conséquences
- Tests `TC-PWA-001` à `005` (`tests/ui/pwa_update.cdp.test.js`) avec de vrais Service Workers dans Chrome headless, dont la reproduction du bug avec un front « ancien » (fixture `tests/ui/fixtures/legacy/`, SW v5 cache-first d'origine).
- `createServer` accepte `uiDir` et `domainDir` pour tester une publication en cours de session.
- Le numéro `APP_VERSION` (`app.js`) est à faire évoluer à chaque version fonctionnelle ; l'identifiant de build, lui, est automatique.
- Les appareils déjà sur la v8 (avec `controllerchange` mais sans `PONG`) seront rechargés une fois à l'arrivée de la v9, puis gérés par la barre.
