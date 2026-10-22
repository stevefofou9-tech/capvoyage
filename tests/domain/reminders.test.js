import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ReminderService } from '../../src/domain/ReminderService.js';
import { TripService } from '../../src/domain/TripService.js';
import { TodoService } from '../../src/domain/TodoService.js';
import { ActivityService } from '../../src/domain/ActivityService.js';

describe('Suite Rappels & Échéances (ReminderService)', () => {

  test('REM-01 : Calcul de la différence de jours', () => {
    assert.equal(ReminderService.getDaysDifference('2026-11-01', '2026-10-25'), 7);
    assert.equal(ReminderService.getDaysDifference('2026-11-01', '2026-11-01'), 0);
    assert.equal(ReminderService.getDaysDifference('2026-10-20', '2026-10-25'), -5);
  });

  test('REM-02 : Détection d\'alerte urgente pour vaccin fièvre jaune et visa à J-12', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21'
    });
    trip.todos = TodoService.createDefaultTodos('Cameroun');

    // Date de référence : 20 octobre 2026 (J-12 avant le départ du 1er novembre)
    const alerts = ReminderService.getPreTripReminders(trip, '2026-10-20');

    assert.ok(alerts.length >= 2, 'Doit contenir les alertes visa et fièvre jaune');
    const yellowFeverAlert = alerts.find(a => a.id === 'rem-vaccin');
    assert.ok(yellowFeverAlert, 'Alerte vaccin requise');
    assert.equal(yellowFeverAlert.priority, 'urgent');

    const visaAlert = alerts.find(a => a.id === 'rem-visa');
    assert.ok(visaAlert, 'Alerte visa requise');
  });

  test('REM-03 : Les alertes disparaissent dès que la formalité est complétée (Fait)', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21'
    });
    trip.todos = TodoService.createDefaultTodos('Cameroun');

    // Marquer le vaccin fièvre jaune et le visa comme "Fait"
    const vf = trip.todos.find(t => t.title.toLowerCase().includes('fièvre jaune'));
    TodoService.updateTodoStatus(trip.todos, vf.id, 'Fait');

    const visa = trip.todos.find(t => t.title.toLowerCase().includes('visa'));
    TodoService.updateTodoStatus(trip.todos, visa.id, 'Fait');

    const alerts = ReminderService.getPreTripReminders(trip, '2026-10-20');
    assert.equal(alerts.find(a => a.id === 'rem-vaccin'), undefined);
    assert.equal(alerts.find(a => a.id === 'rem-visa'), undefined);
  });

  test('REM-04 : Rappel des activités du jour avec horaire', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21'
    });

    const act1 = ActivityService.addActivity(trip, {
      dayId: 'day-1',
      title: 'Transfert aéroport et hôtel',
      time: '18:30',
      location: 'Douala Bonapriso'
    });
    ActivityService.updateActivity(trip, act1.id, { status: 'Confirmé' });

    const reminders = ReminderService.getDailyActivityReminders(trip, '2026-11-01');
    assert.equal(reminders.length, 1);
    assert.equal(reminders[0].title, 'À 18:30 : Transfert aéroport et hôtel');
    assert.equal(reminders[0].location, 'Douala Bonapriso');
  });
});

