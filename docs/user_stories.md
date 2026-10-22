# 📋 Backlog des User Stories (Spec-Driven Development)
## Projet : Planning Voyage PAYS (Travel Planner)
**Méthodologie :** SDD / MoSCoW (Must, Should, Could, Won't)  
**Version :** 1.0.0

---

## Synthèse des Epics

| Epic | Intitulé | Priorité Globale |
|---|---|---|
| **EPIC-1** | To-Do Pré-Voyage & Formalités Sanitaires/Administratives | 🔴 MUST HAVE |
| **EPIC-2** | Configuration du Voyage & Calendrier des Jours | 🔴 MUST HAVE |
| **EPIC-3** | Enregistrement Progressif & Gestion des Activités | 🔴 MUST HAVE |
| **EPIC-4** | Carnet de Contacts & Réseau Local ("Avec qui") | 🔴 MUST HAVE |
| **EPIC-5** | Suivi du Budget & Gestion Multi-Devises (EUR/XAF) | 🔴 MUST HAVE |
| **EPIC-6** | Mode Hors-Ligne, Export & Sauvegarde | 🟡 SHOULD HAVE |

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

### US-3.1 : Saisie ultra-rapide sans friction (Enregistrement minimal)
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

## EPIC 6 : Mode Hors-Ligne, Sauvegarde & Export

### US-6.1 : Utilisation complète sans réseau
> **En tant que** voyageur en zone de faible connectivité (route, campagne, plage),  
> **Je veux** pouvoir consulter, créer et modifier des activités ou des dépenses hors-ligne,  
> **Afin de** ne jamais être bloqué par une coupure internet.

**Critères d'acceptation (Gherkin) :**
```gherkin
Scénario: Fonctionnement hors-ligne
  Étant donné que la connexion réseau est coupée (offline)
  Quand j'ajoute une nouvelle activité et une dépense
  Alors les données sont enregistrées immédiatement dans le stockage local du navigateur
  Et aucune alerte d'erreur bloquante n'apparaît
```

### US-6.2 : Export JSON et impression / PDF
> **En tant que** voyageur,  
> **Je veux** télécharger une sauvegarde JSON de l'intégralité de mon voyage et générer un récapitulatif imprimable du planning,  
> **Afin de** conserver mes données en sécurité ou les partager avec un proche.

**Critères d'acceptation (Gherkin) :**
```gherkin
Scénario: Export complet
  Quand je clique sur "Exporter les données du voyage"
  Alors un fichier JSON contenant le voyage, les journées, les activités, les contacts, les dépenses et les tâches est téléchargé
```

