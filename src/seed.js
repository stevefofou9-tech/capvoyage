import { TripService } from './domain/TripService.js';
import { TodoService } from './domain/TodoService.js';
import { ContactService } from './domain/ContactService.js';
import { ActivityService } from './domain/ActivityService.js';
import { BudgetEngine } from './domain/BudgetEngine.js';

export const DEMO_TRIP_ID = 'trip-cameroun-seed';

/**
 * Voyage démo « Cameroun 21 jours ». Pur : aucun effet de bord, id stable (ADR-001).
 */
export function createInitialSeedTrip() {
  // 1. Création du séjour 21 jours
  const trip = TripService.createTrip({
    country: 'Cameroun',
    title: 'Mon Voyage au Cameroun 2026',
    startDate: '2026-11-01',
    endDate: '2026-11-21',
    baseCurrency: 'EUR',
    totalBudget: 2500
  });

  // 2. Villes étapes
  TripService.assignCityToRange(trip, 1, 7, 'Douala');
  TripService.assignCityToRange(trip, 8, 14, 'Yaoundé');
  TripService.assignCityToRange(trip, 15, 20, 'Kribi');
  TripService.assignCityToDay(trip, 21, 'Douala');

  // 3. To-Do Pré-Voyage
  trip.todos = TodoService.createDefaultTodos('Cameroun');

  // Marquer quelques tâches comme déjà validées
  const yellowFever = trip.todos.find(t => t.title.includes('Fièvre Jaune'));
  if (yellowFever) TodoService.updateTodoStatus(trip.todos, yellowFever.id, 'Fait');

  const passeport = trip.todos.find(t => t.title.includes('passeport'));
  if (passeport) TodoService.updateTodoStatus(trip.todos, passeport.id, 'Fait');

  const visa = trip.todos.find(t => t.title.includes('Visa'));
  if (visa) TodoService.updateTodoStatus(trip.todos, visa.id, 'En cours');

  // 4. Contacts sur place
  const paul = ContactService.addContact(trip, {
    name: 'Oncle Paul',
    relationship: 'Famille',
    phone: '+237 6 99 12 34 56',
    city: 'Douala',
    notes: 'Quartier Bonapriso, toujours joignable sur WhatsApp'
  });

  const sophie = ContactService.addContact(trip, {
    name: 'Sophie M.',
    relationship: 'Amie',
    phone: '+237 6 77 98 76 54',
    city: 'Douala',
    notes: 'Collègue promo, habite à Akwa'
  });

  const emmanuel = ContactService.addContact(trip, {
    name: 'Emmanuel Guide Kribi',
    relationship: 'Guide / Prestataire',
    phone: '+237 6 70 55 44 33',
    city: 'Kribi',
    notes: 'Spécialiste pirogue et chutes de la Lobé'
  });

  const jean = ContactService.addContact(trip, {
    name: 'Jean Chauffeur',
    relationship: 'Autre',
    phone: '+237 6 95 11 22 33',
    city: 'Douala',
    notes: 'Chauffeur fiable pour les trajets aéroport et inter-villes'
  });

  // 5. Activités progressives
  // Jour 1 : Arrivée
  const aJ1 = ActivityService.addActivity(trip, {
    dayId: 'day-1',
    title: 'Arrivée vol à Douala Nsimalen/Douala et installation à l’hôtel'
  });
  ActivityService.updateActivity(trip, aJ1.id, {
    time: '18:30',
    location: 'Aéroport International de Douala',
    category: 'Logistique',
    contactIds: [jean.id],
    status: 'Confirmé',
    notes: 'Jean vient me chercher à la sortie du terminal avec pancarte'
  });

  // Jour 2 : Famille
  const aJ2 = ActivityService.addActivity(trip, {
    dayId: 'day-2',
    title: 'Visite famille et retrouvailles chez Oncle Paul'
  });
  ActivityService.updateActivity(trip, aJ2.id, {
    time: '15:30',
    location: 'Quartier Bonapriso, Douala',
    category: 'Famille',
    contactIds: [paul.id],
    status: 'Confirmé',
    notes: 'Remettre les cadeaux et chocolats'
  });

  // Jour 3 : Marché
  const aJ3 = ActivityService.addActivity(trip, {
    dayId: 'day-3',
    title: 'Balade au marché aux fleurs et artisanat'
  });
  ActivityService.updateActivity(trip, aJ3.id, {
    time: '10:00',
    location: 'Douala Bonanjo',
    category: 'Loisir',
    status: 'À planifier'
  });

  // Jour 4 : Dîner poissons braisés
  const aJ4 = ActivityService.addActivity(trip, {
    dayId: 'day-4',
    title: 'Dîner poissons braisés au bord de l’eau'
  });
  ActivityService.updateActivity(trip, aJ4.id, {
    time: '20:00',
    location: 'Bonapriso / Youpwé',
    category: 'Sorties',
    contactIds: [paul.id, sophie.id],
    status: 'Confirmé'
  });

  // Jour 8 : Train Camrail vers Yaoundé
  const aJ8 = ActivityService.addActivity(trip, {
    dayId: 'day-8',
    title: 'Départ en train Camrail Douala -> Yaoundé'
  });
  ActivityService.updateActivity(trip, aJ8.id, {
    time: '08:30',
    location: 'Gare de Bessengue, Douala',
    category: 'Logistique',
    status: 'Confirmé',
    notes: 'Arriver 45 minutes avant le départ du train'
  });

  // Jour 16 : Chutes de la Lobé
  const aJ16 = ActivityService.addActivity(trip, {
    dayId: 'day-16',
    title: 'Excursion chutes de la Lobé & remontée en pirogue'
  });
  ActivityService.updateActivity(trip, aJ16.id, {
    time: '10:00',
    location: 'Chutes de la Lobé, Kribi',
    category: 'Découverte',
    contactIds: [emmanuel.id],
    status: 'Confirmé',
    notes: 'Prévoir maillot, chapeau et appareil photo étanche'
  });

  // 6. Dépenses réelles
  BudgetEngine.addExpense(trip, {
    label: 'Demande officielle de Visa Cameroun',
    amount: 100,
    currency: 'EUR',
    category: 'Santé/Formalités',
    date: '2026-10-15'
  });

  BudgetEngine.addExpense(trip, {
    label: 'Vaccin Fièvre Jaune + Malarone pharmacie',
    amount: 75,
    currency: 'EUR',
    category: 'Santé/Formalités',
    date: '2026-10-18'
  });

  BudgetEngine.addExpense(trip, {
    label: 'Billets train Camrail première classe aller-retour',
    amount: 40000,
    currency: 'XAF',
    category: 'Transport',
    date: '2026-11-02'
  });

  BudgetEngine.addExpense(trip, {
    label: 'Acompte réservation hôtel Kribi bord de mer',
    amount: 60000,
    currency: 'XAF',
    category: 'Hébergement',
    date: '2026-11-03'
  });

  BudgetEngine.addExpense(trip, {
    label: 'Dîner poissons braisés Youpwé avec proches',
    amount: 22000,
    currency: 'XAF',
    category: 'Nourriture/Resto',
    date: '2026-11-04',
    activityId: aJ4.id
  });

  trip.id = DEMO_TRIP_ID;
  return trip;
}
