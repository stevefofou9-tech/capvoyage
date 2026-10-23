# ADR-008 : Import de contacts multi-sources avec écran de tri

**Statut :** Accepté (23/10/2026), à implémenter · **Date :** 23/10/2026

## Contexte
Retour R3 : charger le répertoire dès la configuration et choisir la catégorie (relation) de chaque contact. Le sélecteur natif `navigator.contacts.select` n'existe que sur Chrome Android (ni iOS Safari, ni ordinateur). Le code actuel (`app.js`, import natif) force la relation « Amis » et ne propose rien ailleurs.

## Décision

### Sources (adaptateurs) → un format commun
Chaque source produit une liste `[{ name, phone, city? }]` :
1. **Natif** : `navigator.contacts.select(['name','tel'], { multiple: true })`, proposé seulement si `'contacts' in navigator && 'ContactsManager' in window`.
2. **vCard** : `<input type="file" accept=".vcf,text/vcard">` ; lecture locale par `FileReader`, analyse par une fonction pure `ContactImport.parseVCard(text)` (lignes `FN`, `N`, `TEL`, `CITY` via `ADR`, gestion du pliage de ligne RFC 6350 et des encodages `QUOTED-PRINTABLE` courants).
3. **Saisie en lot** : un nom par ligne, éventuellement `Nom, téléphone`, via `ContactImport.parseBulk(text)`.

### Écran de tri unique
- Liste des contacts importés, chacun avec sélecteur de relation en pastilles (Famille, Ami, Guide, Chauffeur, Collègue, Autre) et case « Ignorer ».
- Actions globales : « Tout en Ami », « Ignorer les sans-téléphone ».
- Validation unique : `ContactImport.toContacts(sorted)` → `ContactService.addContact` pour chaque contact conservé.
- Utilisé dans l'assistant (étape 3, en plus de la saisie unitaire) **et** dans l'onglet Contacts.

### Confidentialité
- Tout est traité **dans le navigateur** ; le fichier `.vcf` et le répertoire ne sont jamais envoyés au serveur.
- Seuls les contacts **conservés après tri** entrent dans le voyage (donc dans la synchro).
- Dédoublonnage : à l'import, un contact dont le nom normalisé (insensible casse/accents) ou le téléphone existe déjà est marqué « Déjà présent » et décoché par défaut ; pas de fusion automatique.

### Code
- Nouveau module de domaine `src/domain/ContactImport.js` (fonctions pures, testables sans navigateur) ; l'écran de tri est écrit comme composant UI isolé pour ne pas alourdir `app.js` (dette A7).

## Alternatives rejetées
- Contact Picker seul : exclut iOS et ordinateur.
- Synchronisation continue du répertoire : hors périmètre (PRD §7), problème de confidentialité.
- Dédoublonnage/fusion automatique : risque de fusionner deux personnes distinctes.

## Conséquences
- Tests : `TC-CTX-001` à `008` (parseurs, tri, dédoublonnage, conversion) + parcours CDP de l'assistant.
- Aucune dépendance npm.
