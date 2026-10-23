import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TripService } from '../../src/domain/TripService.js';
import { ContactService } from '../../src/domain/ContactService.js';
import { TodoService } from '../../src/domain/TodoService.js';
import { BudgetEngine } from '../../src/domain/BudgetEngine.js';

describe('Suite Fonctionnalités V4 (Mise à jour Contact, Todo, Taux en ligne & Partage)', () => {

  test('V4-01 : ContactService.updateContact modifie tous les champs et valide le nom', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-05'
    });

    const contact = ContactService.addContact(trip, {
      name: 'Mamadou',
      relationship: 'Amis',
      city: 'Douala',
      phone: '+237 600000000',
      notes: 'Ami collège'
    });

    // Modification complète
    const updated = ContactService.updateContact(trip, contact.id, {
      name: 'Mamadou Diallo',
      relationship: 'Pro / Affaires',
      city: 'Yaoundé',
      phone: '+237 699999999',
      notes: 'Partenaire business'
    });

    assert.equal(updated.name, 'Mamadou Diallo');
    assert.equal(updated.relationship, 'Pro / Affaires');
    assert.equal(updated.city, 'Yaoundé');
    assert.equal(updated.phone, '+237 699999999');
    assert.equal(updated.notes, 'Partenaire business');

    // Rejet nom vide
    assert.throws(() => {
      ContactService.updateContact(trip, contact.id, { name: '   ' });
    }, /Le nom du contact ne peut pas être vide/);
  });

  test('V4-02 : TodoService.updateTodo modifie statut, priorité, catégorie et notes', () => {
    const todos = TodoService.createDefaultTodos('Cameroun');
    const first = todos[0];

    const updated = TodoService.updateTodo(todos, first.id, {
      title: 'Vérifier passeport biométrique',
      category: 'Formalités',
      priority: 'Basse',
      status: 'En cours',
      notes: 'Rendez-vous mairie pris'
    });

    assert.equal(updated.title, 'Vérifier passeport biométrique');
    assert.equal(updated.priority, 'Basse');
    assert.equal(updated.status, 'En cours');
    assert.equal(updated.notes, 'Rendez-vous mairie pris');

    // Rejet statut invalide
    assert.throws(() => {
      TodoService.updateTodo(todos, first.id, { status: 'TerminéInconnu' });
    }, /Statut invalide/);

    // Rejet titre vide
    assert.throws(() => {
      TodoService.updateTodo(todos, first.id, { title: '' });
    }, /Le titre de la tâche ne peut pas être vide/);
  });

  test('V4-03 : BudgetEngine.syncExchangeRates actualise les taux et repli hors-ligne', async () => {
    const trip = TripService.createTrip({
      country: 'Canada',
      startDate: '2026-11-01',
      endDate: '2026-11-10'
    });

    // 1. Mock réseau réussi
    const mockFetchSuccess = async () => ({
      ok: true,
      json: async () => ({
        rates: {
          CAD: 1.52,
          USD: 1.10,
          CNY: 7.82
        }
      })
    });

    const res = await BudgetEngine.syncExchangeRates(trip, { fetchFn: mockFetchSuccess });
    assert.equal(res.success, true);
    assert.equal(res.offline, false);
    assert.ok(trip.ratesLastUpdated);

    const cadCurr = trip.currencies.find(c => c.code === 'CAD');
    assert.equal(cadCurr.rateToBase, 1.52);

    // 2. Mock réseau hors-ligne / erreur
    const mockFetchOffline = async () => {
      throw new Error('Network failure (hors-ligne)');
    };

    const resOffline = await BudgetEngine.syncExchangeRates(trip, { fetchFn: mockFetchOffline });
    assert.equal(resOffline.success, false);
    assert.equal(resOffline.offline, true);
    // Les taux précédents restent préservés
    assert.equal(trip.currencies.find(c => c.code === 'CAD').rateToBase, 1.52);
  });

  // V4-04 (jeton de partage unique) est remplacé par le partage paramétrable : tests/domain/sharing.test.js
});

