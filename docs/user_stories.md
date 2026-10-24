# 📋 Backlog des User Stories (Spec-Driven Development)
## Projet : Planning Voyage PAYS (Travel Planner)
**Méthodologie :** SDD / MoSCoW (Must, Should, Could, Won't)  
**Version :** 2.1.0 (23/10/2026, alignée sur le PRD v2.1 ; ajouts v2.1 marqués 🆕)

---

## Synthèse des Epics

| Epic | Intitulé | Priorité Globale |
|---|---|---|
| **EPIC-1** | To-Do Pré-Voyage & Formalités Sanitaires/Administratives | 🔴 MUST HAVE |
| **EPIC-2** | Configuration du Voyage & Calendrier des Jours | 🔴 MUST HAVE |
| **EPIC-3** | Enregistrement Progressif & Gestion des Activités | 🔴 MUST HAVE |
| **EPIC-4** | Carnet de Contacts & Réseau Local ("Avec qui") | 🔴 MUST HAVE |
| **EPIC-5** | Suivi du Budget & Gestion Multi-Devises (EUR/XAF) | 🔴 MUST HAVE |
| **EPIC-6** | Hors-Ligne & Synchronisation | 🔴 MUST HAVE |
| **EPIC-7** | Partage Paramétrable | 🔴 MUST HAVE |
| **EPIC-8** | Sécurité, Comptes & Démo | 🔴 MUST HAVE |
| **EPIC-9** 🆕 | Ergonomie mobile & Aujourd'hui d'abord (premiers retours) | 🔴 MUST HAVE |

> **Amendements v2.1 (retours d'usage)** : US-1.3 (statut en un tap), US-3.1 révisée, US-3.4 (idées), US-3.5 (✓ activité), US-4.3 (sélecteur de contacts), US-4.4 (import du répertoire), EPIC-9 (US-9.1 à 9.3). Discovery : [`sdd/02_discovery_retours_utilisateurs.md`](sdd/02_discovery_retours_utilisateurs.md).

> **Hors périmètre (v2.0) :** export/import JSON, impression/PDF, réordonnancement manuel des activités, suppression de voyage (voir PRD §7). L'ancienne US-6.2 est retirée.

---

## EPIC 1 : To-Do Pré-Voyage & Formalités

### US-1.1 : Initialisation automatique des formalités indispensables
> **En tant que** voyageur préparant un séjour au Cameroun,  
> **Je veux** que l'application me propose dès l'ouverture une liste pré-remplie des formalités obligatoires (Visa, Vaccin fièvre jaune, traitement antipaludique, etc.),  
> **Afin de** ne pas risquer d'oublier une démarche légale ou médicale critique avant mon départ.

**Critères d'acceptation (Gherkin) :**
```gherkin
Scénario: Chargement du pack formalités Cameroun
  Étant donné un voyage ciblant le "Cameroun"
  Quand j'accède pour la première fois à la section "To-Do Pré-Voyage"
  Alors je vois apparaître les catégories "Formalités", "Santé", "Bagages", "Finances"
  Et la tâche "Vaccin Fièvre Jaune (carnet jaune obligatoire)" est présente avec priorité "Haute"
  Et la tâche "Demande et obtention du Visa" est présente avec priorité "Haute"
  Et la tâche "Traitement préventif Paludisme (Malarone)" est présente
```

### US-1.2 : Suivi et mise à jour de l'état des préparatifs
> **En tant que** voyageur,  
> **Je veux** pouvoir cocher, modifier et ajouter de nouvelles tâches personnalisées avec une date limite,  
> **Afin de** visualiser clairement ce qui est déjà réglé et ce qui reste à faire avant le décollage.

**Critères d'acceptation (Gherkin) :**
```gherkin
Scénario: Ajout et complétion d'une tâche personnalisée
  Étant donné la liste des tâches pré-voyage
  Quand j'ajoute une tâche "Acheter adaptateur et répulsif moustiques" avec échéance à J-5
  Alors la tâche apparaît avec le statut "À faire"
  Quand je clique pour la passer à "Fait"
  Alors le pourcentage d'avancement global de la checklist augmente automatiquement
```

---

### US-1.3 🆕 : Valider une tâche sans l'ouvrir (REQ-2.5)
> **En tant que** voyageur qui coche ses préparatifs en marchant,
> **Je veux** passer une tâche à « Fait » d'un seul tap sur la liste,
> **Afin de** ne pas ouvrir une fiche pour un simple geste.

```gherkin
Scénario: Bascule rapide
  Étant donné la tâche "Visa" à l'état "À faire"
  Quand je touche sa pastille de statut
  Alors elle passe à "Fait", la progression augmente et la fiche ne s'ouvre pas
  Et un toast "Annuler" reste disponible 5 secondes
Scénario: Ouverture de la fiche conservée
  Quand je touche le reste de la tuile
  Alors la fiche d'édition s'ouvre (le statut "En cours" y reste disponible)
```

---

## EPIC 2 : Configuration du Voyage & Calendrier des Jours

### US-2.1 : Création du voyage avec génération automatique des journées
> **En tant que** voyageur,  
> **Je veux** saisir le pays de destination et mes dates de début et de fin (ex: 21 jours),  
> **Afin que** l'application génère automatiquement toute la frise chronologique des journées sans que j'aie à les créer une par une.

**Critères d'acceptation (Gherkin) :**
```gherkin
Scénario: Génération automatique d'un séjour de 21 jours
  Étant donné une date de début "01/11/2026" et une date de fin "21/11/2026"
  Quand je valide la création du séjour au Cameroun
  Alors 21 journées sont créées de "Jour 1 (01/11/2026)" à "Jour 21 (21/11/2026)"
  Et chaque journée possède un statut initial vide prêt à accueillir des activités
```

### US-2.2 : Attribution des étapes / villes par journée
> **En tant que** voyageur en itinérance,  
> **Je veux** associer une ville ou étape à chaque journée (ex: J1-J7 Douala, J8-J14 Yaoundé, J15-J20 Kribi),  
> **Afin de** situer géographiquement le déroulement de mon voyage.

**Critères d'acceptation (Gherkin) :**
```gherkin
Scénario: Définition des villes étapes
  Étant donné la liste des 21 journées générées
  Quand j'assigne "Douala" aux Jours 1 à 7 et "Kribi" aux Jours 15 à 20
  Alors l'en-tête de chaque journée affiche la ville étape correspondante
```

---

## EPIC 3 : Enregistrement Progressif & Activités

### US-3.1 : Saisie ultra-rapide sans friction (Enregistrement minimal) — *révisée v2.1 : le jour est optionnel (voir US-3.4)*
> **En tant que** voyageur en situation de mobilité,  
> **Je veux** pouvoir enregistrer une activité en tapant seulement son nom sur une journée sans aucun autre champ requis,  
> **Afin de** capturer instantanément une idée ou une opportunité avant de l'oublier.

**Critères d'acceptation (Gherkin) :**
```gherkin
Scénario: Création minimale en 2 secondes
  Étant donné que je suis sur la vue du "Jour 4"
  Quand je saisis "Déjeuner chez tante Marie" dans le champ d'ajout rapide
  Alors l'activité est immédiatement créée sous le Jour 4
  Et son statut est automatiquement défini sur "À planifier"
  Et elle n'exige ni heure, ni lieu, ni contact à ce stade
```

### US-3.2 : Enrichissement graduel de l'activité
> **En tant que** voyageur au repos le soir,  
> **Je veux** rouvrir une activité existante pour lui ajouter une heure, un lieu précis, une catégorie et des participants,  
> **Afin de** structurer le programme au fur et à mesure que les détails se confirment.

**Critères d'acceptation (Gherkin) :**
```gherkin
Scénario: Enrichissement progressif
  Étant donné l'activité "Déjeuner chez tante Marie"
  Quand j'ajoute:
    | Heure | 13:00 |
    | Lieu | Quartier Akwa, Douala |
    | Catégorie | Famille |
    | Contacts | ["Tante Marie", "Oncle Paul"] |
    | Statut | Confirmé |
  Alors l'activité est sauvegardée avec l'intégralité de ces détails
  Et l'activité affiche le badge "Famille" et le statut "Confirmé"
```

### US-3.3 : Déplacement d'activités entre journées
> **En tant que** voyageur soumis aux aléas du voyage,  
> **Je veux** déplacer une activité d'une journée à une autre (ex: de J4 à J6),  
> **Afin d'**adapter mon planning sans avoir à tout ressaisir.

**Critères d'acceptation (Gherkin) :**
```gherkin
Scénario: Replanification d'une activité
  Étant donné une activité enregistrée sur le Jour 4
  Quand je change son jour d'affectation vers le Jour 6
  Alors l'activité disparaît du Jour 4 et apparaît sur le Jour 6
  Et tous ses détails (lieu, heure, contacts, notes) restent strictement préservés
```

### US-3.4 🆕 : Garder des idées sans choisir de jour (REQ-2.1, REQ-2.4)
> **En tant que** voyageur qui collecte des envies avant de connaître son planning,
> **Je veux** ajouter une activité sans lui affecter de jour, puis la placer plus tard,
> **Afin de** ne pas inventer une date pour ne rien oublier.

```gherkin
Scénario: Ajouter aux idées
  Quand je saisis "Restaurant de poisson à Kribi" et choisis "Ajouter aux idées"
  Alors l'activité apparaît dans la section repliable "Idées" avec son compteur
  Et elle n'est dans aucun jour, ni dans l'export .ics, ni dans le briefing du jour
Scénario: Placer une idée
  Quand j'utilise "Placer" et choisis le Jour 6
  Alors elle quitte les idées et apparaît sur le Jour 6 avec tous ses détails
  Et "Remettre aux idées" depuis sa fiche la détache de nouveau du jour
Scénario: Confidentialité
  Étant donné un lien de partage actif
  Alors le lecteur ne reçoit aucune idée
```

### US-3.5 🆕 : Marquer une activité comme effectuée d'un tap (REQ-2.5)
> **En tant que** voyageur en déplacement,
> **Je veux** valider une activité terminée sans ouvrir sa fiche,
> **Afin de** garder le programme à jour en une seconde.

```gherkin
Scénario: Activité du jour
  Étant donné une activité du jour courant
  Quand je touche son bouton ✓
  Alors son statut devient "Effectué" et un toast "Annuler" est proposé 5 secondes
Scénario: Activité future
  Étant donné une activité d'un jour à venir
  Alors aucun bouton ✓ n'est affiché
```

---

## EPIC 4 : Carnet de Contacts & Réseau Local ("Avec qui")

### US-4.1 : Gestion du carnet de personnes
> **En tant que** voyageur,  
> **Je veux** enregistrer les personnes avec lesquelles je voyage ou que je vais rencontrer (nom, relation, téléphone, ville),  
> **Afin de** centraliser mon carnet d'adresses lié au voyage.

**Critères d'acceptation (Gherkin) :**
```gherkin
Scénario: Création d'un contact
  Quand j'ajoute le contact:
    | Nom | Emmanuel Guide Kribi |
    | Relation | Guide / Prestataire |
    | Téléphone | +237 6 70 00 00 00 |
    | Ville | Kribi |
  Alors le contact est accessible dans la liste de mes contacts de voyage
```

### US-4.2 : Association multi-contacts et historique des rencontres
> **En tant que** voyageur,  
> **Je veux** associer un ou plusieurs contacts à une activité et pouvoir filtrer pour voir tout ce qui est prévu avec une personne,  
> **Afin de** savoir exactement quand et où je retrouve chacun de mes proches.

**Critères d'acceptation (Gherkin) :**
```gherkin
Scénario: Consultation des activités liées à un contact
  Étant donné le contact "Oncle Paul" lié aux activités du Jour 2 et du Jour 12
  Quand je filtre par le contact "Oncle Paul"
  Alors seules les activités impliquant "Oncle Paul" sont mises en surbrillance ou filtrées
```

### US-4.3 🆕 : Choisir les participants d'une activité en un geste (REQ-3.5)
> **En tant que** voyageur,
> **Je veux** retrouver et ajouter des contacts à une activité depuis un sélecteur avec recherche,
> **Afin de** ne pas parcourir une longue liste de cases.

```gherkin
Scénario: Sélection par recherche
  Quand j'ouvre "Avec qui" et tape "pa"
  Alors seuls les contacts correspondants s'affichent, les récents en premier
  Et un tap sur "Oncle Paul" l'ajoute en pastille sans fermer le sélecteur
  Et "+ Nouveau" en bas crée un contact et le coche aussitôt
```

### US-4.4 🆕 : Charger mon répertoire dès la configuration (REQ-3.6)
> **En tant que** voyageur qui crée un voyage,
> **Je veux** importer mes contacts existants et leur donner une catégorie tout de suite,
> **Afin de** ne pas les ressaisir un par un.

```gherkin
Scénario: Import vCard puis tri
  Étant donné l'étape "contacts" de l'assistant
  Quand je charge un fichier .vcf de 12 contacts
  Alors un écran de tri les liste avec une relation à choisir en un tap
  Quand j'ignore 2 contacts, applique "Tout en Ami" et passe "Oncle Paul" en "Famille"
  Alors 10 contacts sont créés et rien n'est enregistré avant ma validation
Scénario: Navigateur sans sélecteur natif
  Étant donné un iPhone ou un ordinateur
  Alors l'import vCard et la saisie en lot (un nom par ligne) sont proposés, avec le même écran de tri
```

---

## EPIC 5 : Budget & Multi-Devises Temps Réel

### US-5.1 : Configuration de la parité de change (EUR / XAF)
> **En tant que** voyageur au Cameroun,  
> **Je veux** configurer ma devise de base (EUR) et la devise locale (XAF) avec son taux de parité (1 EUR = 655,957 XAF),  
> **Afin d'**obtenir des conversions exactes automatiques dans les deux sens.

**Critères d'acceptation (Gherkin) :**
```gherkin
Scénario: Configuration du taux de change
  Étant donné une devise de base "EUR" et une devise secondaire "XAF" avec taux "655.957"
  Quand je consulte le convertisseur ou que j'enregistre une dépense
  Alors toute somme en XAF est convertie en EUR au centime près
```

### US-5.2 : Enregistrement de dépense en direct & décompte du solde
> **En tant que** voyageur faisant un achat sur place en espèces,  
> **Je veux** saisir immédiatement le montant en FCFA avec sa catégorie (Transport, Resto, etc.),  
> **Afin de** voir instantanément l'équivalent en Euros et le solde restant de mon budget.

**Critères d'acceptation (Gherkin) :**
```gherkin
Scénario: Saisie de dépense en FCFA
  Étant donné un budget total de 2000 EUR
  Quand je saisis une dépense de 65596 XAF pour "Billet train Camrail"
  Alors la dépense est enregistrée comme valant exactement 100.00 EUR
  Et le total dépensé passe à 100.00 EUR
  Et le solde disponible devient 1900.00 EUR (soit 1 246 318 XAF)
```

---

## EPIC 6 : Hors-Ligne & Synchronisation

### US-6.1 : Utilisation complète sans réseau, sans perte
> **En tant que** voyageur en zone de faible connectivité (route, campagne, plage),
> **Je veux** consulter, créer et modifier des activités ou des dépenses hors-ligne et les retrouver au retour du réseau,
> **Afin de** ne jamais être bloqué ni perdre ce que j'ai saisi.

**Critères d'acceptation (Gherkin) :**
```gherkin
Scénario: Saisie hors-ligne puis synchronisation
  Étant donné que la connexion réseau est coupée
  Quand j'ajoute une activité et une dépense
  Alors elles sont enregistrées immédiatement sur l'appareil
  Et l'indicateur affiche "En attente de synchro"
  Quand le réseau revient
  Alors elles sont envoyées au serveur et l'indicateur affiche "Enregistré"
  Et après rechargement elles sont toujours présentes
```

### US-6.2 : *Retirée en v2.0* (export JSON et impression/PDF hors périmètre)

### US-6.3 : Travailler sur deux appareils sans s'écraser
> **En tant que** voyageur utilisant téléphone et ordinateur,
> **Je veux** être prévenu quand une modification d'un appareil entre en conflit avec l'autre,
> **Afin de** ne jamais écraser silencieusement mon travail.

```gherkin
Scénario: Conflit de version
  Étant donné mes deux appareils sur la même version du voyage
  Quand l'ordinateur enregistre puis le téléphone enregistre sur l'ancienne version
  Alors le téléphone affiche la version serveur, l'indicateur "Conflit"
  Et l'action "Restaurer ma version" est proposée
```

---

## EPIC 7 : Partage Paramétrable

### US-7.1 : Choisir ce que je partage
> **En tant que** voyageur,
> **Je veux** choisir les sections partagées (Programme, À faire, Budget, Contacts),
> **Afin de** montrer mon programme à ma famille sans dévoiler mon budget ni les numéros de mes contacts.

```gherkin
Scénario: Partage du programme seul (réglage par défaut)
  Quand j'active le partage sans modifier les sections
  Alors seule la section "Programme" est cochée
  Et le lecteur du lien ne reçoit ni préparatifs, ni budget, ni contacts, ni participants
```

### US-7.2 : Couper ou renouveler le lien
> **En tant que** voyageur,
> **Je veux** désactiver mon lien de partage ou en générer un nouveau,
> **Afin de** reprendre le contrôle si le lien a circulé trop loin.

```gherkin
Scénario: Désactivation
  Quand je désactive le partage
  Alors l'ancien lien affiche "Ce lien de partage n'est plus actif"
Scénario: Régénération
  Quand je régénère le lien
  Alors l'ancien lien n'est plus actif et le nouveau fonctionne
```

### US-7.3 : Consulter un voyage partagé
> **En tant que** proche du voyageur,
> **Je veux** ouvrir le lien sans compte et voir les sections partagées,
> **Afin de** savoir quand et où le retrouver.

```gherkin
Scénario: Lecture seule
  Quand j'ouvre un lien actif
  Alors un bandeau "Lecture seule" est affiché
  Et aucun bouton de modification n'est disponible
  Et toute tentative d'écriture est refusée par le serveur
```

---

## EPIC 8 : Sécurité, Comptes & Démo

### US-8.1 : Mes voyages ne sont qu'à moi
> **En tant que** voyageur,
> **Je veux** être le seul à pouvoir lire et modifier mes voyages,
> **Afin de** faire confiance à l'application.

```gherkin
Scénario: Écriture refusée sur le voyage d'un autre compte
  Étant donné Bob connecté
  Quand Bob envoie une modification portant l'identifiant du voyage d'Alice
  Alors elle est refusée et le voyage d'Alice est inchangé
```

### US-8.2 : Rester connecté sur plusieurs appareils
> **En tant que** voyageur,
> **Je veux** rester connecté sur mon téléphone quand je me connecte sur mon ordinateur,
> **Afin de** passer de l'un à l'autre sans ressaisir de code.

```gherkin
Scénario: Deux sessions simultanées
  Quand je me connecte sur deux appareils
  Alors les deux sessions restent valides
  Et une session inutilisée depuis 30 jours expire
```

### US-8.3 : Une démo rien qu'à moi
> **En tant que** prospect,
> **Je veux** manipuler librement la démo Cameroun,
> **Afin de** découvrir l'application sans être perturbé par d'autres visiteurs.

```gherkin
Scénario: Démo isolée
  Quand j'ajoute une activité en démo
  Alors elle n'est visible que sur mon appareil
  Et les données du serveur sont inchangées
  Et un bouton "Créer mon compte" me permet de quitter la démo
```

---

## EPIC 9 🆕 : Ergonomie mobile & Aujourd'hui d'abord

### US-9.1 : Un écran mobile clair et sobre (REQ-UX-1 à 4)
> **En tant que** voyageur sur téléphone,
> **Je veux** un en-tête sobre et des écrans sans encombrement,
> **Afin de** lire et agir d'une main sans que rien ne se chevauche.

```gherkin
Scénario: En-tête mobile
  Étant donné un écran de 375 px
  Alors l'en-tête affiche le titre du voyage, les dates sur une ligne, l'indicateur de synchro et un menu "⋯"
  Et Partager, Nouveau voyage, Profil et Déconnexion sont dans ce menu
  Et les onglets n'apparaissent que dans la barre basse
  Et l'en-tête occupe au plus 15 % de la hauteur, sans texte coupé ni chevauché
Scénario: Ordinateur
  Étant donné un écran de 1280 px
  Alors la barre d'onglets haute est conservée
Scénario: Une action primaire
  Alors chaque écran et chaque modale n'a qu'un seul bouton primaire
```

### US-9.2 : S'ouvrir sur aujourd'hui (REQ-7.5)
> **En tant que** voyageur en séjour,
> **Je veux** voir d'abord la journée en cours,
> **Afin de** ne pas chercher le bon jour à chaque ouverture.

```gherkin
Scénario: Pendant, avant, après
  Étant donné un séjour du 01/11 au 21/11
  Quand la date locale du lieu est le 08/11 Alors le Jour 8 est affiché
  Quand elle est avant le 01/11 Alors le Jour 1 est affiché avec un compte à rebours
  Quand elle est après le 21/11 Alors le dernier jour est affiché
```

### US-9.3 : Savoir ce qui vient (REQ-7.6, REQ-7.7)
> **En tant que** voyageur,
> **Je veux** voir la prochaine activité et être alerté par mon calendrier,
> **Afin de** ne pas rater un rendez-vous, même sans réseau.

```gherkin
Scénario: Prochaine activité
  Étant donné une activité à 13:00 et l'heure locale 11:30
  Alors le jour courant affiche "Prochaine : <titre> dans 1 h 30"
  Et les idées n'y figurent jamais
Scénario: Alarmes calendrier
  Quand j'exporte le .ics
  Alors chaque activité horodatée contient une alarme 1 h avant
```
