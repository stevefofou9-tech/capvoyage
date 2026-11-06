import { GeographyData } from './GeographyData.js';

const generateId = () => globalThis.crypto.randomUUID();

export const VALID_EXPENSE_CATEGORIES = [
  'Transport',
  'Hébergement',
  'Nourriture/Resto',
  'Activités/Sorties',
  'Achats/Cadeaux',
  'Santé/Formalités',
  'Connexion internet',
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
   * Symbole d'affichage d'une devise (repli : son code)
   */
  static symbolOf(trip, code) {
    const inTrip = (trip.currencies || []).find(c => c.code === code);
    const known = BudgetEngine.findCurrency(code);
    const symbol = (known && known.symbol) || (inTrip && inTrip.symbol);
    return symbol && symbol !== code ? symbol : code;
  }

  static roundFor(code, value) {
    const zeroDecimals = ['XAF', 'XOF'].includes(code);
    return zeroDecimals ? Math.round(value) : Number(value.toFixed(2));
  }

  /**
   * Remet la liste des devises dans le modèle unique : tous les taux sont exprimés pour 1 EUR (pivot),
   * EUR vaut 1, la devise du budget est présente, et les montants convertis sont recalculés.
   * Corrige aussi les voyages créés avec une base non-EUR dont le taux valait 1 (ancien format).
   */
  static normalize(trip) {
    trip.baseCurrency = (trip.baseCurrency || 'EUR').toUpperCase();
    if (!Array.isArray(trip.currencies)) trip.currencies = [];
    BudgetEngine.ensureCurrency(trip, 'EUR').rateToBase = 1.0;
    try {
      const base = BudgetEngine.ensureCurrency(trip, trip.baseCurrency);
      const known = BudgetEngine.findCurrency(trip.baseCurrency);
      if (trip.baseCurrency !== 'EUR' && base.rateToBase === 1 && known) base.rateToBase = known.rateToBase;
    } catch { /* devise de base inconnue : conservée telle quelle */ }
    (trip.expenses || []).forEach(e => {
      try {
        BudgetEngine.ensureCurrency(trip, e.currency);
        e.convertedBaseAmount = BudgetEngine.convert({
          amount: e.amount, fromCode: e.currency, toCode: trip.baseCurrency, currencies: trip.currencies
        });
      } catch { /* dépense dans une devise inconnue : montant converti conservé */ }
    });
    return trip;
  }

  /**
   * Définit le budget et la devise dans laquelle il est exprimé ; les dépenses sont reconverties.
   */
  static setBudget(trip, { amount, currency }) {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) throw new Error('Le budget doit être un nombre strictement positif');
    const code = String(currency || trip.baseCurrency || 'EUR').toUpperCase();
    BudgetEngine.ensureCurrency(trip, code);
    trip.totalBudget = num;
    trip.baseCurrency = code;
    BudgetEngine.normalize(trip);
    trip.updatedAt = new Date().toISOString();
    return trip;
  }

  /**
   * Garantit que la devise figure dans trip.currencies (ajoutée avec son taux par défaut sinon).
   * Sans cela, une dépense en CAD/CNY/USD sur un voyage créé pour le FCFA échouait ou était ignorée.
   */
  static ensureCurrency(trip, code) {
    const clean = String(code || '').trim().toUpperCase();
    if (!trip.currencies) trip.currencies = [];
    const existing = trip.currencies.find(c => c.code.toUpperCase() === clean);
    if (existing) return existing;
    const known = BudgetEngine.findCurrency(clean);
    if (!known) throw new Error(`Devise non supportée : ${code}`);
    const added = { ...known };
    trip.currencies.push(added);
    return added;
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
    BudgetEngine.ensureCurrency(trip, currCode);
    BudgetEngine.normalize(trip);
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
      BudgetEngine.ensureCurrency(trip, expense.currency);
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
    BudgetEngine.ensureCurrency(trip, expense.currency);
    BudgetEngine.normalize(trip);
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

    // Recalcul de toutes les dépenses existantes
    BudgetEngine.normalize(trip);

    trip.updatedAt = new Date().toISOString();
    return curr;
  }

  /**
   * Paire de taux affichée et modifiable. Quand l'euro est l'une des deux devises, il est toujours
   * du côté « 1 EUR = … » (ex. « 1 EUR = 655,957 XAF » même si le budget est en XAF).
   */
  static getRatePair(trip) {
    const local = BudgetEngine.getLocalCurrency(trip);
    const base = trip.currencies.find(c => c.code === trip.baseCurrency);
    if (local.code === 'EUR') return { from: 'EUR', to: base.code, value: base.rateToBase };
    return { from: base.code, to: local.code, value: local.rateToBase / base.rateToBase };
  }

  /**
   * Fixe le taux de la paire affichée (voir getRatePair) : 1 `from` = `value` `to`.
   */
  static setPairRate(trip, value) {
    const r = Number(value);
    if (isNaN(r) || r <= 0) throw new Error('Le taux de change doit être strictement positif');
    BudgetEngine.normalize(trip);
    const pair = BudgetEngine.getRatePair(trip);
    if (pair.from === 'EUR') {
      BudgetEngine.setCurrencyRate(trip, pair.to, r);
    } else {
      const base = trip.currencies.find(c => c.code === pair.from);
      BudgetEngine.setCurrencyRate(trip, pair.to, r * base.rateToBase);
    }
  }

  /**
   * Devise dans laquelle on dépense le plus probablement : celle de la destination (repli : la base).
   */
  static getDestinationCurrency(trip) {
    const dest = trip.country ? GeographyData.getDefaultCurrencyForCountry(trip.country) : null;
    return dest && BudgetEngine.findCurrency(dest) ? dest : (trip.baseCurrency || 'EUR');
  }

  /**
   * Devise « secondaire » affichée à côté du budget : celle de la destination si elle diffère de la base,
   * sinon l'euro ; pour un voyage en euros vers un pays de la zone euro, la première autre devise du voyage.
   */
  static getLocalCurrency(trip) {
    const baseCode = (trip.baseCurrency || 'EUR').toUpperCase();
    const currencies = trip.currencies || [];
    const dest = trip.country ? GeographyData.getDefaultCurrencyForCountry(trip.country) : null;
    let code = null;
    if (dest && dest !== baseCode) code = dest;
    else if (baseCode !== 'EUR') code = 'EUR';
    else code = (currencies.find(c => c.code !== 'EUR') || {}).code || 'XAF';
    return BudgetEngine.ensureCurrency(trip, code);
  }

  /**
   * Calcule le bilan synthétique du budget (totaux, soldes, répartition)
   */
  static calculateSummary(trip) {
    BudgetEngine.normalize(trip);
    const totalBudget = Number(trip.totalBudget) || 0;
    const baseCode = trip.baseCurrency;
    const baseCurr = trip.currencies.find(c => c.code === baseCode);
    const localCurr = BudgetEngine.getLocalCurrency(trip);
    // Combien de devise locale pour 1 unité de devise de base (les taux sont exprimés pour 1 EUR)
    const pairRate = baseCurr && baseCurr.rateToBase ? localCurr.rateToBase / baseCurr.rateToBase : localCurr.rateToBase;
    const toLocal = amount => BudgetEngine.roundFor(localCurr.code, amount * pairRate);

    let totalSpentBase = 0;
    let totalSpentLocalExact = 0;
    const categoryTotals = {};
    const categoryTotalsLocal = {};

    VALID_EXPENSE_CATEGORIES.forEach(cat => {
      categoryTotals[cat] = 0;
    });

    (trip.expenses || []).forEach(e => {
      totalSpentBase += e.convertedBaseAmount;
      const cat = e.category || 'Autre';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + e.convertedBaseAmount;
      // Montant local calculé depuis la dépense d'origine (évite la perte due à l'arrondi de la base)
      const local = e.currency === localCurr.code
        ? e.amount
        : BudgetEngine.convert({ amount: e.amount, fromCode: e.currency, toCode: localCurr.code, currencies: trip.currencies });
      totalSpentLocalExact += local;
      categoryTotalsLocal[cat] = (categoryTotalsLocal[cat] || 0) + local;
    });

    totalSpentBase = Number(totalSpentBase.toFixed(2));
    const remainingBudgetBase = Number((totalBudget - totalSpentBase).toFixed(2));

    // Pourcentages de répartition par catégorie
    const breakdown = Object.entries(categoryTotals)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amountBase]) => ({
        category,
        amountBase: Number(amountBase.toFixed(2)),
        amountLocal: BudgetEngine.roundFor(localCurr.code, categoryTotalsLocal[category] || 0),
        percentage: totalSpentBase > 0 ? Math.round((amountBase / totalSpentBase) * 100) : 0
      }))
      .sort((a, b) => b.amountBase - a.amountBase);

    return {
      baseCurrency: baseCode,
      baseSymbol: BudgetEngine.symbolOf(trip, baseCode),
      localCurrency: localCurr.code,
      localSymbol: BudgetEngine.symbolOf(trip, localCurr.code),
      localRate: Number(pairRate.toFixed(6)),
      ratePair: BudgetEngine.getRatePair(trip),
      totalBudgetBase: totalBudget,
      totalBudgetLocal: toLocal(totalBudget),
      totalSpentBase,
      totalSpentLocal: BudgetEngine.roundFor(localCurr.code, totalSpentLocalExact),
      remainingBudgetBase,
      remainingBudgetLocal: BudgetEngine.roundFor(localCurr.code, totalBudget * pairRate - totalSpentLocalExact),
      isOverBudget: remainingBudgetBase < 0,
      breakdown
    };
  }

  /**
   * Actualise les taux de devises en ligne avec cache local et repli hors-ligne
   */
  static async syncExchangeRates(trip, { fetchFn = globalThis.fetch, url = '/api/rates' } = {}) {
    if (!trip.currencies) {
      trip.currencies = JSON.parse(JSON.stringify(SUPPORTED_CURRENCIES));
    }

    try {
      if (typeof fetchFn !== 'function') {
        throw new Error('fetchFn indisponible');
      }

      const res = await fetchFn(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const rates = data.rates || {};

      let updatedCount = 0;
      trip.currencies.forEach(curr => {
        if (curr.code !== 'EUR' && rates[curr.code]) {
          curr.rateToBase = Number(rates[curr.code]);
          updatedCount++;
        }
      });

      BudgetEngine.normalize(trip);
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
