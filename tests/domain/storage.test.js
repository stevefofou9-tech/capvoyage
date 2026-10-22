import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TripService } from '../../src/domain/TripService.js';
import { ActivityService } from '../../src/domain/ActivityService.js';
import { ContactService } from '../../src/domain/ContactService.js';
import { BudgetEngine } from '../../src/domain/BudgetEngine.js';
import { TodoService } from '../../src/domain/TodoService.js';
import { StorageService } from '../../src/domain/StorageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Suite 6 : Persistance & Mode Hors-Ligne (TC-STO)', () => {

  const createFullTrip = () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      title: 'Voyage au Cameroun 2026',
      startDate: '2026-11-01',
      endDate: '2026-11-21',
      totalBudget: 2500
    });
    TripService.assignCityToRange(trip, 1, 7, 'Douala');
    trip.todos = TodoService.createDefaultTodos('Cameroun');
    const paul = ContactService.addContact(trip, { name: 'Oncle Paul', phone: '+237 6 99 00 11 22' });
    const act = ActivityService.addActivity(trip, { dayId: 'day-3', title: 'Dîner famille' });
    ActivityService.updateActivity(trip, act.id, { contactIds: [paul.id], category: 'Famille' });
    BudgetEngine.addExpense(trip, { label: 'Billet de train', amount: 65595.7, currency: 'XAF', category: 'Transport' });
    return trip;
  };

  test('TC-STO-001 : Sérialisation et désérialisation intégrale (JSON)', () => {
    const originalTrip = createFullTrip();
    const jsonStr = StorageService.exportToJson(originalTrip);

    assert.ok(typeof jsonStr === 'string');
    const reimported = StorageService.parseAndValidate(jsonStr);

    assert.equal(reimported.id, originalTrip.id);
    assert.equal(reimported.country, 'Cameroun');
    assert.equal(reimported.days.length, 21);
    assert.equal(reimported.contacts.length, 1);
    assert.equal(reimported.expenses.length, 1);
    assert.equal(reimported.todos.length, originalTrip.todos.length);
  });

  test('TC-STO-002 : Validation de schéma lors de l\'importation', () => {
    // Cas JSON invalide / manquant
    assert.throws(() => {
      StorageService.parseAndValidate('invalid json string');
    }, /Erreur de syntaxe JSON/);

    // Cas objet sans champs obligatoires
    assert.throws(() => {
      StorageService.parseAndValidate(JSON.stringify({ title: 'Manque les champs obligatoires' }));
    }, /Champ obligatoire manquant/);
  });

  test('TC-STO-003 : Préparation de l\'export d\'impression (Print/PDF)', () => {
    const trip = createFullTrip();
    const printable = StorageService.generatePrintableSummary(trip);

    assert.ok(printable.includes('PLANNING VOYAGE : VOYAGE AU CAMEROUN 2026'));
    assert.ok(printable.includes('Destination : Cameroun'));
    assert.ok(printable.includes('[Jour 1 - 2026-11-01] Étape : Douala'));
    assert.ok(printable.includes('Dîner famille'));
    assert.ok(printable.includes('Oncle Paul'));
    assert.ok(printable.includes('Fièvre Jaune'));
  });

  test('TC-STO-004 : Sauvegarde et rechargement fichier (File Persistence)', async () => {
    const trip = createFullTrip();
    const tempFile = path.join(__dirname, '..', '..', 'data', 'test_trip.json');

    await StorageService.saveToFile(trip, tempFile);
    const loaded = await StorageService.loadFromFile(tempFile);

    assert.equal(loaded.id, trip.id);
    assert.equal(loaded.days.length, 21);
  });
});

