import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TripService } from '../../src/domain/TripService.js';
import { ReminderService } from '../../src/domain/ReminderService.js';
import { ContactService } from '../../src/domain/ContactService.js';
import { ActivityService } from '../../src/domain/ActivityService.js';
import { TodoService } from '../../src/domain/TodoService.js';

describe('Suite 8 : Wizard Express, Alertes & Cercles Relationnels V2 (TC-V2)', () => {

  test('TC-WIZ-001 : Initialisation express via les 4 immanquables (< 3 min)', () => {
    const trip = TripService.createTripFromWizard({
      country: 'Cameroun',
      mainCity: 'Douala',
      startDate: '2026-11-01',
      endDate: '2026-11-21',
      totalBudget: 2500,
      baseCurrency: 'EUR',
      activityPurposes: ['Famille', 'Sorties']
    });

    assert.equal(trip.country, 'Cameroun');
    assert.equal(trip.days.length, 21);
    assert.equal(trip.days[0].city, 'Douala');
    assert.equal(trip.totalBudget, 2500);
    assert.deepEqual(trip.activityPurposes, ['Famille', 'Sorties']);
  });

  test('TC-WIZ-002 : Rejet si l\'un des 4 immanquables est manquant', () => {
    // Manque pays
    assert.throws(() => {
      TripService.createTripFromWizard({
        country: '',
        mainCity: 'Douala',
        startDate: '2026-11-01',
        endDate: '2026-11-21',
        totalBudget: 2000
      });
    }, /Le pays de destination est obligatoire/);

    // Manque ville principale
    assert.throws(() => {
      TripService.createTripFromWizard({
        country: 'Cameroun',
        mainCity: '',
        startDate: '2026-11-01',
        endDate: '2026-11-21',
        totalBudget: 2000
      });
    }, /La ville principale est obligatoire/);

    // Budget invalide
    assert.throws(() => {
      TripService.createTripFromWizard({
        country: 'Cameroun',
        mainCity: 'Douala',
        startDate: '2026-11-01',
        endDate: '2026-11-21',
        totalBudget: 0
      });
    }, /Le budget prévisionnel est obligatoire/);
  });

  test('TC-BUD-008 : Modification dynamique du budget total et de la devise', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21',
      totalBudget: 2000,
      baseCurrency: 'EUR'
    });

    TripService.updateTripBudget(trip, { totalBudget: 3200, baseCurrency: 'USD' });
    assert.equal(trip.totalBudget, 3200);
    assert.equal(trip.baseCurrency, 'USD');

    assert.throws(() => {
      TripService.updateTripBudget(trip, { totalBudget: -50 });
    }, /Le budget doit être un nombre strictement positif/);
  });

  test('TC-REM-001 : Détection automatique des alertes d\'urgence sanitaires (Fièvre Jaune, Visa)', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21'
    });
    trip.todos = TodoService.createDefaultTodos('Cameroun');

    // Référence à 8 jours avant départ
    const alerts = ReminderService.getUrgentAlerts(trip, '2026-10-24');
    assert.ok(alerts.length >= 2, 'Doit détecter au moins 2 alertes critiques');

    const yellowFeverAlert = alerts.find(a => a.title.includes('Fièvre Jaune'));
    assert.ok(yellowFeverAlert);
    assert.equal(yellowFeverAlert.level, 'URGENT');

    const visaAlert = alerts.find(a => a.title.includes('Visa'));
    assert.ok(visaAlert);
  });

  test('TC-REM-002 : Génération du briefing matinal des activités du jour', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21'
    });
    trip.days[0].city = 'Douala';
    ActivityService.addActivity(trip, { dayId: 'day-1', title: 'Arrivée aéroport', time: '18:00' });

    const brief = ReminderService.getMorningBrief(trip, 1);
    assert.equal(brief.dayNumber, 1);
    assert.equal(brief.city, 'Douala');
    assert.equal(brief.activitiesCount, 1);
    assert.ok(brief.text.includes('Arrivée aéroport'));
  });

  test('TC-CIRC-001 : Priorisation des contacts par cercle relationnel selon la catégorie d\'activité', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21'
    });
    const cPro = ContactService.addContact(trip, { name: 'M. Dupont Collègue', relationship: 'Pro / Affaires' });
    const cFamille = ContactService.addContact(trip, { name: 'Oncle Paul', relationship: 'Famille' });
    const cAmi = ContactService.addContact(trip, { name: 'Sophie', relationship: 'Amie' });

    // Pour une activité de catégorie Famille, Oncle Paul doit être en 1er
    const familySorted = ContactService.getContactsForActivityCategory(trip, 'Famille');
    assert.equal(familySorted[0].name, 'Oncle Paul');

    // Pour une activité de catégorie Travail/Pro, Dupont doit être en 1er
    const proSorted = ContactService.getContactsForActivityCategory(trip, 'Travail');
    assert.equal(proSorted[0].name, 'M. Dupont Collègue');
  });

  test('TC-ACT-009 : Filtrage des activités par catégorie', () => {
    const acts = [
      { id: '1', title: 'Réunion pro', category: 'Travail' },
      { id: '2', title: 'Dîner famille', category: 'Famille' },
      { id: '3', title: 'Sortie bar', category: 'Sorties' }
    ];

    const all = ActivityService.filterActivitiesByCategory(acts, 'Tous');
    assert.equal(all.length, 3);

    const pro = ActivityService.filterActivitiesByCategory(acts, 'Travail');
    assert.equal(pro.length, 1);
    assert.equal(pro[0].title, 'Réunion pro');
  });
});

