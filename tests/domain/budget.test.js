import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TripService } from '../../src/domain/TripService.js';
import { BudgetEngine } from '../../src/domain/BudgetEngine.js';

describe('Suite 5 : Budget & Multi-Devises (TC-BUD)', () => {

  const createSampleTrip = () => {
    return TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21',
      baseCurrency: 'EUR',
      totalBudget: 2000
    });
  };

  test('TC-BUD-001 : Exactitude mathématique du taux officiel EUR / XAF (655.957)', () => {
    const currencies = [
      { code: 'EUR', rateToBase: 1.0 },
      { code: 'XAF', rateToBase: 655.957 }
    ];

    // 65596 XAF -> 100.00 EUR
    const eur100 = BudgetEngine.convert({
      amount: 65595.7,
      fromCode: 'XAF',
      toCode: 'EUR',
      currencies
    });
    assert.equal(eur100, 100.00);

    // 32798 XAF -> 50.00 EUR
    const eur50 = BudgetEngine.convert({
      amount: 32797.85,
      fromCode: 'XAF',
      toCode: 'EUR',
      currencies
    });
    assert.equal(eur50, 50.00);

    // 15000 XAF -> 22.87 EUR
    const eur15k = BudgetEngine.convert({
      amount: 15000,
      fromCode: 'XAF',
      toCode: 'EUR',
      currencies
    });
    assert.equal(eur15k, 22.87);

    // 100 EUR -> 65595.7 XAF
    const xaf100 = BudgetEngine.convert({
      amount: 100,
      fromCode: 'EUR',
      toCode: 'XAF',
      currencies
    });
    assert.equal(xaf100, 65595.7);
  });

  test('TC-BUD-002 : Saisie d\'une dépense locale en FCFA avec conversion instantanée', () => {
    const trip = createSampleTrip();
    const expense = BudgetEngine.addExpense(trip, {
      label: 'Dîner poissons braisés',
      amount: 15000,
      currency: 'XAF',
      category: 'Nourriture/Resto',
      date: '2026-11-04'
    });

    assert.ok(expense.id);
    assert.equal(expense.amount, 15000);
    assert.equal(expense.currency, 'XAF');
    assert.equal(expense.convertedBaseAmount, 22.87);
    assert.equal(expense.category, 'Nourriture/Resto');
    assert.equal(trip.expenses.length, 1);
  });

  test('TC-BUD-003 : Calcul du solde disponible et du total dépensé', () => {
    const trip = createSampleTrip(); // Budget = 2000 EUR
    BudgetEngine.addExpense(trip, {
      label: 'Billet train Camrail',
      amount: 65595.7,
      currency: 'XAF',
      category: 'Transport'
    }); // 100.00 EUR
    BudgetEngine.addExpense(trip, {
      label: 'Hôtel Douala',
      amount: 150,
      currency: 'EUR',
      category: 'Hébergement'
    }); // 150.00 EUR

    const summary = BudgetEngine.calculateSummary(trip);
    assert.equal(summary.totalBudgetBase, 2000);
    assert.equal(summary.totalSpentBase, 250.00);
    assert.equal(summary.remainingBudgetBase, 1750.00);
    assert.equal(summary.isOverBudget, false);

    // Équivalents en monnaie locale
    assert.equal(summary.localCurrency, 'XAF');
    assert.ok(summary.totalSpentLocal > 0);
  });

  test('TC-BUD-004 : Découplage de la date de dépense et date de l\'activité (Incohérence 3)', () => {
    const trip = createSampleTrip();
    // Acompte payé le 3 novembre pour une activité du 16 novembre
    const expense = BudgetEngine.addExpense(trip, {
      label: 'Acompte hôtel Kribi',
      amount: 50000,
      currency: 'XAF',
      date: '2026-11-03',
      activityId: 'activity-kribi-hotel'
    });

    assert.equal(expense.date, '2026-11-03', 'La date de paiement réelle reste le 3 novembre');
    assert.equal(expense.activityId, 'activity-kribi-hotel');

    // Mise à jour éventuelle
    BudgetEngine.updateExpense(trip, expense.id, { label: 'Acompte hôtel Kribi plage' });
    assert.equal(expense.date, '2026-11-03', 'La date de paiement n\'est jamais altérée');
  });

  test('TC-BUD-005 : Répartition des dépenses par catégorie', () => {
    const trip = createSampleTrip();
    BudgetEngine.addExpense(trip, { label: 'Vol', amount: 500, currency: 'EUR', category: 'Transport' });
    BudgetEngine.addExpense(trip, { label: 'Chambre', amount: 300, currency: 'EUR', category: 'Hébergement' });
    BudgetEngine.addExpense(trip, { label: 'Repas', amount: 200, currency: 'EUR', category: 'Nourriture/Resto' });

    const summary = BudgetEngine.calculateSummary(trip);
    assert.equal(summary.totalSpentBase, 1000);
    assert.equal(summary.breakdown.length, 3);

    const transport = summary.breakdown.find(b => b.category === 'Transport');
    assert.equal(transport.amountBase, 500);
    assert.equal(transport.percentage, 50);

    const heberg = summary.breakdown.find(b => b.category === 'Hébergement');
    assert.equal(heberg.amountBase, 300);
    assert.equal(heberg.percentage, 30);
  });

  test('TC-BUD-006 : Configuration d\'un taux de change personnalisé (Incohérence 4)', () => {
    const trip = createSampleTrip();
    // Changer le taux effectif à 650.00 (commission locale)
    BudgetEngine.setCurrencyRate(trip, 'XAF', 650.00);

    const exp = BudgetEngine.addExpense(trip, {
      label: 'Dépense change local',
      amount: 65000,
      currency: 'XAF'
    });

    assert.equal(exp.convertedBaseAmount, 100.00);
  });

  test('TC-BUD-007 : Rejet des montants nuls ou négatifs', () => {
    const trip = createSampleTrip();

    assert.throws(() => {
      BudgetEngine.addExpense(trip, { label: 'Erreur', amount: 0, currency: 'XAF' });
    }, /Le montant de la dépense doit être strictement positif/);

    assert.throws(() => {
      BudgetEngine.addExpense(trip, { label: 'Erreur négatif', amount: -250, currency: 'XAF' });
    }, /Le montant de la dépense doit être strictement positif/);
  });
});

