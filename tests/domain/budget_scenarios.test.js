import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TripService } from '../../src/domain/TripService.js';
import { BudgetEngine, VALID_EXPENSE_CATEGORIES } from '../../src/domain/BudgetEngine.js';

// Scénarios budget de bout en bout : devise du budget, devise de la dépense, taux, modification, reconversion.
const trip = (baseCurrency, totalBudget, country = 'Cameroun') =>
  TripService.createTrip({ country, startDate: '2026-12-01', endDate: '2026-12-10', baseCurrency, totalBudget });
const near = (a, b, eps = 0.02) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

describe('Budget de bout en bout (TC-BUD-E2E)', () => {
  test('budget en XAF : une dépense de 30 000 XAF retire 30 000 XAF, pas 30 000 €', () => {
    const t = trip('XAF', 300000);
    BudgetEngine.addExpense(t, { label: 'Hôtel', amount: 30000, currency: 'XAF' });
    const s = BudgetEngine.calculateSummary(t);
    assert.equal(s.baseCurrency, 'XAF');
    assert.equal(s.totalSpentBase, 30000);
    assert.equal(s.remainingBudgetBase, 270000);
    assert.equal(s.localCurrency, 'EUR');
    near(s.totalSpentLocal, 45.73);
  });

  test('budget en XAF, dépense en EUR : convertie en XAF', () => {
    const t = trip('XAF', 300000);
    const e = BudgetEngine.addExpense(t, { label: 'Vol', amount: 100, currency: 'EUR' });
    near(e.convertedBaseAmount, 65595.7);
    near(BudgetEngine.calculateSummary(t).remainingBudgetBase, 300000 - 65595.7);
  });

  test('budget en EUR, dépense en XAF : convertie en EUR, devise locale XAF', () => {
    const t = trip('EUR', 2500);
    BudgetEngine.addExpense(t, { label: 'Taxi', amount: 30000, currency: 'XAF' });
    const s = BudgetEngine.calculateSummary(t);
    near(s.totalSpentBase, 45.73);
    assert.equal(s.localCurrency, 'XAF');
    assert.equal(s.totalSpentLocal, 30000);
    assert.equal(s.totalBudgetLocal, Math.round(2500 * 655.957));
  });

  test('budget en CAD, dépenses en USD, CNY et XAF', () => {
    const t = trip('CAD', 5000);
    for (const [currency, amount] of [['USD', 100], ['CNY', 775], ['XAF', 65595.7]]) {
      BudgetEngine.addExpense(t, { label: currency, amount, currency });
    }
    const s = BudgetEngine.calculateSummary(t);
    near(s.totalSpentBase, 100 / 1.08 * 1.48 + 148 + 148, 0.1);
  });

  test('changer la devise du budget reconvertit les dépenses', () => {
    const t = trip('EUR', 1000);
    BudgetEngine.addExpense(t, { label: 'Resto', amount: 65595.7, currency: 'XAF' });
    near(BudgetEngine.calculateSummary(t).totalSpentBase, 100);
    BudgetEngine.setBudget(t, { amount: 600000, currency: 'XAF' });
    const s = BudgetEngine.calculateSummary(t);
    assert.equal(s.baseCurrency, 'XAF');
    near(s.totalSpentBase, 65595.7, 0.1);
    near(s.remainingBudgetBase, 600000 - 65595.7, 0.1);
  });

  test('modifier le taux de la paire met à jour les dépenses (base EUR et base XAF)', () => {
    const eur = trip('EUR', 1000);
    BudgetEngine.addExpense(eur, { label: 'a', amount: 60000, currency: 'XAF' });
    BudgetEngine.setPairRate(eur, 600);
    near(BudgetEngine.calculateSummary(eur).totalSpentBase, 100);
    assert.equal(BudgetEngine.calculateSummary(eur).localRate, 600);

    const xaf = trip('XAF', 600000);
    BudgetEngine.addExpense(xaf, { label: 'b', amount: 100, currency: 'EUR' });
    BudgetEngine.setPairRate(xaf, 625);   // paire affichée « 1 EUR = 625 XAF » même avec un budget en XAF
    assert.deepEqual(BudgetEngine.getRatePair(xaf), { from: 'EUR', to: 'XAF', value: 625 });
    near(BudgetEngine.calculateSummary(xaf).totalSpentBase, 62500, 1);
  });

  test('dépense modifiée (montant + devise) : totaux et catégories cohérents', () => {
    const t = trip('XAF', 100000);
    const e = BudgetEngine.addExpense(t, { label: 'Data', amount: 10000, currency: 'XAF', category: 'Connexion internet' });
    BudgetEngine.updateExpense(t, e.id, { amount: 20, currency: 'EUR', category: 'Transport' });
    const s = BudgetEngine.calculateSummary(t);
    near(s.totalSpentBase, 13119.14, 0.1);
    assert.deepEqual(s.breakdown.map(b => b.category), ['Transport']);
  });

  test('suppression : le solde revient au budget', () => {
    const t = trip('XAF', 100000);
    const e = BudgetEngine.addExpense(t, { label: 'x', amount: 5000, currency: 'XAF' });
    BudgetEngine.deleteExpense(t, e.id);
    const s = BudgetEngine.calculateSummary(t);
    assert.equal(s.totalSpentBase, 0);
    assert.equal(s.remainingBudgetBase, 100000);
    assert.equal(s.isOverBudget, false);
  });

  test('dépassement de budget signalé', () => {
    const t = trip('XAF', 10000);
    BudgetEngine.addExpense(t, { label: 'x', amount: 15000, currency: 'XAF' });
    const s = BudgetEngine.calculateSummary(t);
    assert.equal(s.isOverBudget, true);
    assert.equal(s.remainingBudgetBase, -5000);
  });

  test('catégorie « Connexion internet » acceptée et ventilée', () => {
    assert.ok(VALID_EXPENSE_CATEGORIES.includes('Connexion internet'));
    const t = trip('EUR', 500);
    BudgetEngine.addExpense(t, { label: 'eSIM', amount: 15, currency: 'EUR', category: 'Connexion internet' });
    assert.equal(BudgetEngine.calculateSummary(t).breakdown[0].category, 'Connexion internet');
  });

  test('ancien voyage XAF créé avec base à 1 : réparé et montants recalculés', () => {
    const legacy = {
      country: 'Cameroun', baseCurrency: 'XAF', totalBudget: 300000,
      currencies: [{ code: 'XAF', name: 'XAF', symbol: 'XAF', rateToBase: 1 }, { code: 'EUR', rateToBase: 1 }],
      expenses: [{ id: '1', label: 'x', amount: 100, currency: 'EUR', category: 'Autre', date: '2026-12-01', convertedBaseAmount: 100 }]
    };
    const s = BudgetEngine.calculateSummary(legacy);
    near(s.totalSpentBase, 65595.7, 0.1);
    assert.equal(s.baseSymbol, 'FCFA');
  });

  test('synchronisation des taux : dépenses reconverties, EUR reste à 1', async () => {
    const t = trip('XAF', 300000);
    BudgetEngine.addExpense(t, { label: 'x', amount: 100, currency: 'USD' });
    const before = BudgetEngine.calculateSummary(t).totalSpentBase;
    await BudgetEngine.syncExchangeRates(t, { fetchFn: async () => ({ ok: true, json: async () => ({ rates: { USD: 1.2, EUR: 5 } }) }) });
    assert.equal(t.currencies.find(c => c.code === 'EUR').rateToBase, 1);
    const after = BudgetEngine.calculateSummary(t).totalSpentBase;
    assert.notEqual(before, after);
    near(after, 100 / 1.2 * 655.957, 0.1);
  });

  test('voyage en zone euro avec budget en euros : une devise secondaire existe', () => {
    const t = trip('EUR', 1000, 'France');
    assert.notEqual(BudgetEngine.calculateSummary(t).localCurrency, 'EUR');
  });
});
