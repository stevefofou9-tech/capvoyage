const generateId = () => globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : 'exp-' + Math.random().toString(36).substring(2, 9);

export const VALID_EXPENSE_CATEGORIES = [
  'Transport',
  'Hébergement',
  'Nourriture/Resto',
  'Activités/Sorties',
  'Achats/Cadeaux',
  'Santé/Formalités',
  'Frais bancaires & Change',
  'Autre'
];

export const SUPPORTED_CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: '€', rateToBase: 1.0, flag: '🇪🇺' },
  { code: 'XAF', name: 'Franc CFA (BEAC)', symbol: 'FCFA', rateToBase: 655.957, flag: '🇨🇲' },
  { code: 'XOF', name: 'Franc CFA (BCEAO)', symbol: 'FCFA', rateToBase: 655.957, flag: '🇸🇳' },
  { code: 'CAD', name: 'Dollar Canadien', symbol: '$ CA', rateToBase: 1.48, flag: '🇨🇦' },
  { code: 'CNY', name: 'Yuan Chinois (RMB)', symbol: '¥', rateToBase: 7.75, flag: '🇨🇳' },
  { code: 'USD', name: 'Dollar US', symbol: '$', rateToBase: 1.08, flag: '🇺🇸' }
];

export class BudgetEngine {
  /**
   * Retourne la liste des devises supportées
   */
  static getSupportedCurrencies() {
    return SUPPORTED_CURRENCIES;
  }

  /**
   * Recherche les paramètres d'une devise par son code
   */
  static findCurrency(code) {
    if (!code) return null;
    const clean = code.trim().toUpperCase();
    return SUPPORTED_CURRENCIES.find(c => c.code === clean) || null;
  }
  /**
   * Convertit un montant d'une devise source vers une devise cible
   */
  static convert({ amount, fromCode, toCode, currencies, baseCurrency = 'EUR' }) {
    if (amount === 0) return 0;
    if (fromCode === toCode) return Number(amount.toFixed(2));

    const fromCurr = currencies.find(c => c.code.toUpperCase() === fromCode.toUpperCase());
    const toCurr = currencies.find(c => c.code.toUpperCase() === toCode.toUpperCase());

    if (!fromCurr) {
      throw new Error(`Devise source introuvable : ${fromCode}`);
    }
    if (!toCurr) {
      throw new Error(`Devise cible introuvable : ${toCode}`);
    }

    // Conversion d'abord en monnaie de base (ex: EUR)
    // baseAmount = amount / fromCurr.rateToBase
    const amountInBase = fromCurr.rateToBase === 1.0 ? amount : amount / fromCurr.rateToBase;

    // Conversion depuis la monnaie de base vers la devise cible
    // targetAmount = amountInBase * toCurr.rateToBase
    const targetAmount = toCurr.rateToBase === 1.0 ? amountInBase : amountInBase * toCurr.rateToBase;

    // Arrondi à 2 décimales pour les devises à centimes, ou entier si XAF
    return Number(targetAmount.toFixed(2));
  }

  /**
   * Enregistre une nouvelle dépense
   */
  static addExpense(trip, {
    label,
    amount,
    currency = 'XAF',
    category = 'Autre',
    date,
    activityId = null
  }) {
    if (!label || !label.trim()) {
      throw new Error('Le libellé de la dépense est obligatoire');
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Le montant de la dépense doit être strictement positif');
    }

    if (!trip.currencies) {
      trip.currencies = [
        { code: 'EUR', name: 'Euro', symbol: '€', rateToBase: 1.0 },
        { code: 'XAF', name: 'Franc CFA (BEAC)', symbol: 'FCFA', rateToBase: 655.957 }
      ];
    }

    const currCode = currency.toUpperCase();
    const convertedBaseAmount = BudgetEngine.convert({
      amount: numericAmount,
      fromCode: currCode,
      toCode: trip.baseCurrency || 'EUR',
      currencies: trip.currencies,
      baseCurrency: trip.baseCurrency || 'EUR'
    });

    if (!trip.expenses) trip.expenses = [];

    const newExpense = {
      id: generateId(),
      label: label.trim(),
      amount: numericAmount,
      currency: currCode,
      convertedBaseAmount,
      category: VALID_EXPENSE_CATEGORIES.includes(category) ? category : 'Autre',
      date: date || new Date().toISOString().split('T')[0],
      activityId: activityId || null,
      createdAt: new Date().toISOString()
    };

    trip.expenses.push(newExpense);
    trip.updatedAt = new Date().toISOString();
    return newExpense;
  }

  /**
   * Met à jour une dépense existante
   */
  static updateExpense(trip, expenseId, updates) {
    const expense = trip.expenses.find(e => e.id === expenseId);
    if (!expense) {
      throw new Error(`Dépense introuvable avec l'id : ${expenseId}`);
    }

    if (updates.label !== undefined) {
      if (!updates.label || !updates.label.trim()) {
        throw new Error('Le libellé de la dépense ne peut pas être vide');
      }
      expense.label = updates.label.trim();
    }

    if (updates.amount !== undefined) {
      const num = Number(updates.amount);
      if (isNaN(num) || num <= 0) {
        throw new Error('Le montant de la dépense doit être strictement positif');
      }
      expense.amount = num;
    }

    if (updates.currency !== undefined) {
      expense.currency = updates.currency.toUpperCase();
    }

    if (updates.category !== undefined) {
      expense.category = VALID_EXPENSE_CATEGORIES.includes(updates.category) ? updates.category : 'Autre';
    }

    if (updates.date !== undefined) {
      expense.date = updates.date;
    }

    if (updates.activityId !== undefined) {
      expense.activityId = updates.activityId || null;
    }

    // Recalcul du montant converti
    expense.convertedBaseAmount = BudgetEngine.convert({
      amount: expense.amount,
      fromCode: expense.currency,
      toCode: trip.baseCurrency || 'EUR',
      currencies: trip.currencies,
      baseCurrency: trip.baseCurrency || 'EUR'
    });

    trip.updatedAt = new Date().toISOString();
    return expense;
  }

  /**
   * Supprime une dépense
   */
  static deleteExpense(trip, expenseId) {
    const index = trip.expenses.findIndex(e => e.id === expenseId);
    if (index === -1) {
      throw new Error(`Dépense introuvable avec l'id : ${expenseId}`);
    }
    const [deleted] = trip.expenses.splice(index, 1);
    trip.updatedAt = new Date().toISOString();
    return deleted;
  }

  /**
   * Configure ou ajuste le taux de change d'une devise (Incohérence 4)
   */
  static setCurrencyRate(trip, currencyCode, rateToBase) {
    const rate = Number(rateToBase);
    if (isNaN(rate) || rate <= 0) {
      throw new Error('Le taux de change doit être strictement positif');
    }

    const curr = trip.currencies.find(c => c.code.toUpperCase() === currencyCode.toUpperCase());
    if (!curr) {
      throw new Error(`Devise introuvable : ${currencyCode}`);
    }

    curr.rateToBase = rate;

    // Recalcul de toutes les dépenses existantes dans cette devise
    if (trip.expenses) {
      trip.expenses.forEach(e => {
        e.convertedBaseAmount = BudgetEngine.convert({
          amount: e.amount,
          fromCode: e.currency,
          toCode: trip.baseCurrency || 'EUR',
          currencies: trip.currencies,
          baseCurrency: trip.baseCurrency || 'EUR'
        });
      });
    }

    trip.updatedAt = new Date().toISOString();
    return curr;
  }

  /**
   * Calcule le bilan synthétique du budget (totaux, soldes, répartition)
   */
  static calculateSummary(trip) {
    const totalBudget = Number(trip.totalBudget) || 0;
    const baseCode = trip.baseCurrency || 'EUR';
    const localCurr = (trip.currencies || []).find(c => c.code !== baseCode) || {
      code: 'XAF',
      rateToBase: 655.957
    };

    let totalSpentBase = 0;
    const categoryTotals = {};

    VALID_EXPENSE_CATEGORIES.forEach(cat => {
      categoryTotals[cat] = 0;
    });

    (trip.expenses || []).forEach(e => {
      totalSpentBase += e.convertedBaseAmount;
      const cat = e.category || 'Autre';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + e.convertedBaseAmount;
    });

    totalSpentBase = Number(totalSpentBase.toFixed(2));
    const remainingBudgetBase = Number((totalBudget - totalSpentBase).toFixed(2));

    // Conversion des soldes dans la devise locale
    const totalSpentLocal = Math.round(totalSpentBase * localCurr.rateToBase);
    const remainingBudgetLocal = Math.round(remainingBudgetBase * localCurr.rateToBase);
    const totalBudgetLocal = Math.round(totalBudget * localCurr.rateToBase);

    // Pourcentages de répartition par catégorie
    const breakdown = Object.entries(categoryTotals)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amountBase]) => ({
        category,
        amountBase: Number(amountBase.toFixed(2)),
        amountLocal: Math.round(amountBase * localCurr.rateToBase),
        percentage: totalSpentBase > 0 ? Math.round((amountBase / totalSpentBase) * 100) : 0
      }))
      .sort((a, b) => b.amountBase - a.amountBase);

    return {
      baseCurrency: baseCode,
      localCurrency: localCurr.code,
      localRate: localCurr.rateToBase,
      totalBudgetBase: totalBudget,
      totalBudgetLocal,
      totalSpentBase,
      totalSpentLocal,
      remainingBudgetBase,
      remainingBudgetLocal,
      isOverBudget: remainingBudgetBase < 0,
      breakdown
    };
  }

  /**
   * Actualise les taux de devises en ligne avec cache local et repli hors-ligne
   */
  static async syncExchangeRates(trip, { fetchFn = globalThis.fetch } = {}) {
    if (!trip.currencies) {
      trip.currencies = JSON.parse(JSON.stringify(SUPPORTED_CURRENCIES));
    }

    try {
      if (typeof fetchFn !== 'function') {
        throw new Error('fetchFn indisponible');
      }

      const res = await fetchFn('https://api.frankfurter.app/latest?from=EUR');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const rates = data.rates || {};

      let updatedCount = 0;
      trip.currencies.forEach(curr => {
        if (rates[curr.code]) {
          curr.rateToBase = Number(rates[curr.code]);
          updatedCount++;
        }
      });

      trip.ratesLastUpdated = new Date().toISOString();
      trip.updatedAt = new Date().toISOString();

      return {
        success: true,
        offline: false,
        updatedCount,
        ratesLastUpdated: trip.ratesLastUpdated,
        currencies: trip.currencies
      };
    } catch (err) {
      return {
        success: false,
        offline: true,
        error: err.message,
        ratesLastUpdated: trip.ratesLastUpdated || null,
        currencies: trip.currencies
      };
    }
  }
}
