import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TripService } from '../../src/domain/TripService.js';
import { ActivityService } from '../../src/domain/ActivityService.js';
import { ContactService } from '../../src/domain/ContactService.js';
import { BudgetEngine } from '../../src/domain/BudgetEngine.js';
import { TodoService } from '../../src/domain/TodoService.js';

describe('Suite Intégration : Cycle de Vie Complet d\'un Voyage au Cameroun', () => {

  test('Scénario E2E : De la préparation au bilan des 21 jours', () => {
    // 1. Initialisation du voyage Cameroun (21 jours)
    const trip = TripService.createTrip({
      country: 'Cameroun',
      title: 'Grand Tour Cameroun 2026',
      startDate: '2026-11-01',
      endDate: '2026-11-21',
      baseCurrency: 'EUR',
      totalBudget: 2500
    });

    assert.equal(trip.days.length, 21);

    // 2. Définition des villes étapes
    TripService.assignCityToRange(trip, 1, 7, 'Douala');
    TripService.assignCityToRange(trip, 8, 14, 'Yaoundé');
    TripService.assignCityToRange(trip, 15, 20, 'Kribi');
    TripService.assignCityToDay(trip, 21, 'Douala');

    // 3. To-Do Pré-Voyage
    trip.todos = TodoService.createDefaultTodos('Cameroun');
    assert.ok(trip.todos.length > 0);

    // Valider les 2 formalités obligatoires (Visa et Fièvre Jaune)
    const yellowFever = trip.todos.find(t => t.title.includes('Fièvre Jaune'));
    TodoService.updateTodoStatus(trip.todos, yellowFever.id, 'Fait');

    const visa = trip.todos.find(t => t.title.includes('Visa'));
    TodoService.updateTodoStatus(trip.todos, visa.id, 'Fait');

    const progress = TodoService.calculateProgress(trip.todos);
    assert.ok(progress.percentage > 0);

    // 4. Carnet de contacts
    const paul = ContactService.addContact(trip, {
      name: 'Oncle Paul',
      relationship: 'Famille',
      phone: '+237 6 99 00 11 22',
      city: 'Douala'
    });
    const emmanuel = ContactService.addContact(trip, {
      name: 'Emmanuel Guide',
      relationship: 'Guide',
      phone: '+237 6 70 00 11 22',
      city: 'Kribi'
    });
    assert.equal(trip.contacts.length, 2);

    // 5. Enregistrement progressif d'activités
    // J1 : Arrivée à Douala
    const actJ1 = ActivityService.addActivity(trip, {
      dayId: 'day-1',
      title: 'Arrivée vol à Douala et installation'
    });
    ActivityService.updateActivity(trip, actJ1.id, {
      time: '18:30',
      category: 'Logistique',
      status: 'Confirmé'
    });

    // J4 : Saisie rapide d'une idée, puis enrichissement le soir
    const actJ4 = ActivityService.addActivity(trip, {
      dayId: 'day-4',
      title: 'Dîner poissons braisés à Bonapriso'
    });
    ActivityService.updateActivity(trip, actJ4.id, {
      time: '20:00',
      location: 'Quartier Bonapriso, Douala',
      category: 'Sorties',
      contactIds: [paul.id],
      status: 'Confirmé'
    });

    // J16 : Visite chutes de la Lobé avec le guide
    const actJ16 = ActivityService.addActivity(trip, {
      dayId: 'day-16',
      title: 'Excursion chutes de la Lobé et pirogue',
      time: '10:00',
      location: 'Chutes de la Lobé, Kribi',
      category: 'Découverte',
      contactIds: [emmanuel.id],
      status: 'Confirmé'
    });

    assert.equal(trip.days[0].activities.length, 1);
    assert.equal(trip.days[3].activities.length, 1);
    assert.equal(trip.days[15].activities.length, 1);

    // 6. Gestion du budget multi-devises
    // Dépense 1 : Visa (en Euros)
    BudgetEngine.addExpense(trip, {
      label: 'Frais de visa',
      amount: 100,
      currency: 'EUR',
      category: 'Santé/Formalités'
    });

    // Dépense 2 : Repas à Douala (en FCFA)
    BudgetEngine.addExpense(trip, {
      label: 'Dîner poissons braisés Bonapriso',
      amount: 20000, // ~30.49 EUR
      currency: 'XAF',
      category: 'Nourriture/Resto',
      activityId: actJ4.id
    });

    // Dépense 3 : Trajet Camrail Douala-Yaoundé (en FCFA)
    BudgetEngine.addExpense(trip, {
      label: 'Billets train Camrail première classe',
      amount: 40000, // ~60.98 EUR
      currency: 'XAF',
      category: 'Transport'
    });

    const budgetSummary = BudgetEngine.calculateSummary(trip);
    assert.equal(budgetSummary.totalBudgetBase, 2500);
    assert.ok(budgetSummary.totalSpentBase > 190 && budgetSummary.totalSpentBase < 192);
    assert.ok(budgetSummary.remainingBudgetBase > 2300);
    assert.equal(budgetSummary.isOverBudget, false);
  });
});
