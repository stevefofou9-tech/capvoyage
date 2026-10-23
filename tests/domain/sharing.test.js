import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TripService } from '../../src/domain/TripService.js';
import { ContactService } from '../../src/domain/ContactService.js';
import { ActivityService } from '../../src/domain/ActivityService.js';
import { BudgetEngine } from '../../src/domain/BudgetEngine.js';
import { TodoService } from '../../src/domain/TodoService.js';

function buildTrip() {
  const trip = TripService.createTrip({ country: 'Cameroun', startDate: '2026-11-01', endDate: '2026-11-03', totalBudget: 1500 });
  trip.userId = 'usr-steve';
  trip.version = 4;
  trip.todos = TodoService.createDefaultTodos('Cameroun');
  const paul = ContactService.addContact(trip, { name: 'Oncle Paul', phone: '+237 600 000 000', relationship: 'Famille' });
  ActivityService.addActivity(trip, { dayId: trip.days[0].id, title: 'Dîner chez Paul', contactIds: [paul.id] });
  BudgetEngine.addExpense(trip, { label: 'Taxi', amount: 5000, currency: 'XAF', category: 'Transport', date: '2026-11-01' });
  return trip;
}

const INTERNAL_KEYS = ['id', 'userId', 'sharing', 'shareToken', 'version'];

describe('Suite Partage Paramétrable — Domaine (TC-SHARE)', () => {

  test('TC-SHARE-001 : migration d\'un ancien shareToken (lien actif, Programme seul)', () => {
    const trip = buildTrip();
    trip.shareToken = 'share-ancien';
    const sharing = TripService.normalizeSharing(trip);
    assert.deepEqual(sharing.sections, { planning: true, todos: false, budget: false, contacts: false });
    assert.equal(sharing.enabled, true);
    assert.equal(sharing.token, 'share-ancien');
    assert.equal(trip.shareToken, undefined);
  });

  test('TC-SHARE-002 : voyage jamais partagé → partage désactivé par défaut', () => {
    const sharing = TripService.normalizeSharing(buildTrip());
    assert.equal(sharing.enabled, false);
    assert.equal(sharing.token, null);
    assert.deepEqual(sharing.sections, { planning: true, todos: false, budget: false, contacts: false });
  });

  test('TC-SHARE-002b : activer génère un jeton ; régénérer le change ; sections inconnues ignorées', () => {
    const trip = buildTrip();
    const on = TripService.updateSharing(trip, { enabled: true, sections: { budget: true, pirate: true } });
    assert.ok(on.token.startsWith('share-'));
    assert.equal(on.sections.budget, true);
    assert.equal(on.sections.pirate, undefined);
    const first = on.token;
    const regen = TripService.updateSharing(trip, { regenerate: true });
    assert.notEqual(regen.token, first);
    const off = TripService.updateSharing(trip, { enabled: false });
    assert.equal(off.enabled, false);
  });

  test('TC-SHARE-003 : Programme seul → jours sans participants, aucune autre section', () => {
    const trip = buildTrip();
    TripService.updateSharing(trip, { enabled: true });
    const view = TripService.buildSharedView(trip);
    assert.deepEqual(view.sharedSections, ['planning']);
    assert.equal(view.days.length, 3);
    assert.equal(view.days[0].activities[0].title, 'Dîner chez Paul');
    assert.deepEqual(view.days[0].activities[0].contactIds, []);
    for (const key of ['todos', 'expenses', 'currencies', 'contacts', 'totalBudget']) {
      assert.equal(view[key], undefined, `${key} ne doit pas être présent`);
    }
  });

  test('TC-SHARE-004 : Programme + Contacts → participants et carnet visibles', () => {
    const trip = buildTrip();
    TripService.updateSharing(trip, { enabled: true, sections: { contacts: true } });
    const view = TripService.buildSharedView(trip);
    assert.equal(view.days[0].activities[0].contactIds.length, 1);
    assert.equal(view.contacts[0].phone, '+237 600 000 000');
  });

  test('TC-SHARE-005 : Budget seul → budget et dépenses, pas de jours', () => {
    const trip = buildTrip();
    TripService.updateSharing(trip, { enabled: true, sections: { planning: false, budget: true } });
    const view = TripService.buildSharedView(trip);
    assert.deepEqual(view.sharedSections, ['budget']);
    assert.equal(view.days, undefined);
    assert.equal(view.totalBudget, 1500);
    assert.equal(view.expenses.length, 1);
    assert.ok(view.currencies.length > 0);
  });

  test('TC-SHARE-006 : jamais d\'identifiant interne, quelle que soit la combinaison', () => {
    const combos = [
      { planning: true, todos: false, budget: false, contacts: false },
      { planning: true, todos: true, budget: true, contacts: true },
      { planning: false, todos: true, budget: false, contacts: false }
    ];
    for (const sections of combos) {
      const trip = buildTrip();
      TripService.updateSharing(trip, { enabled: true, sections });
      const view = TripService.buildSharedView(trip);
      assert.equal(view.isReadOnly, true);
      assert.deepEqual(view.sharedSections, Object.keys(sections).filter(k => sections[k]));
      for (const key of INTERNAL_KEYS) assert.equal(view[key], undefined, `${key} exposé`);
    }
  });

  test('TC-SHARE-007 : la vue ne modifie pas le voyage source', () => {
    const trip = buildTrip();
    TripService.updateSharing(trip, { enabled: true });
    const snapshot = JSON.stringify(trip);
    const view = TripService.buildSharedView(trip);
    view.days[0].activities[0].title = 'modifié';
    assert.equal(JSON.stringify(trip), snapshot);
  });
});
