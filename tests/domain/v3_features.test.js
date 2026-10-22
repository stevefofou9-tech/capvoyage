import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TripService } from '../../src/domain/TripService.js';
import { BudgetEngine } from '../../src/domain/BudgetEngine.js';

describe('Suite V3 : Contacts Wizard, Déplacement Direct & Devises CAD/CNY', () => {

  test('V3-01 : Intégration des contacts initiaux dans le voyage via le Wizard', () => {
    const payload = {
      country: 'Cameroun',
      mainCity: 'Douala',
      startDate: '2026-11-01',
      endDate: '2026-11-15',
      totalBudget: 2000,
      baseCurrency: 'EUR',
      initialContacts: [
        { name: 'Oncle Paul', relationship: 'Famille', city: 'Douala' },
        { name: 'Sophie M.', relationship: 'Amis', city: 'Douala' }
      ]
    };

    const trip = TripService.createTripFromWizard(payload);
    assert.equal(trip.contacts.length, 2);
    assert.equal(trip.contacts[0].name, 'Oncle Paul');
    assert.equal(trip.contacts[0].relationship, 'Famille');
    assert.equal(trip.contacts[1].name, 'Sophie M.');
    assert.ok(trip.contacts[0].id);
  });

  test('V3-02 : Déplacement direct d’activité d’un jour à un autre sans sous-menu', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      baseCurrency: 'EUR',
      totalBudget: 1500
    });

    const day1 = trip.days[0];
    const activity = {
      id: 'act-123',
      dayId: day1.id,
      title: 'Visite guidée'
    };
    day1.activities = [activity];

    // Déplacer vers le Jour 3
    const moveRes = TripService.moveActivityToDay(trip, 'act-123', 3);
    assert.equal(moveRes.targetDay.dayNumber, 3);
    assert.equal(trip.days[0].activities.length, 0);
    assert.equal(trip.days[2].activities.length, 1);
    assert.equal(trip.days[2].activities[0].id, 'act-123');
    assert.equal(trip.days[2].activities[0].dayId, trip.days[2].id);
  });

  test('V3-03 : Devises étendues - Conversions CAD et CNY', () => {
    const currencies = [
      { code: 'EUR', rateToBase: 1.0 },
      { code: 'CAD', rateToBase: 1.48 },
      { code: 'CNY', rateToBase: 7.75 },
      { code: 'XAF', rateToBase: 655.957 }
    ];

    // 100 EUR -> CAD
    const cadAmount = BudgetEngine.convert({
      amount: 100,
      fromCode: 'EUR',
      toCode: 'CAD',
      currencies
    });
    assert.equal(cadAmount, 148.00);

    // 100 EUR -> CNY
    const cnyAmount = BudgetEngine.convert({
      amount: 100,
      fromCode: 'EUR',
      toCode: 'CNY',
      currencies
    });
    assert.equal(cnyAmount, 775.00);

    // 148 CAD -> EUR
    const eurFromCad = BudgetEngine.convert({
      amount: 148,
      fromCode: 'CAD',
      toCode: 'EUR',
      currencies
    });
    assert.equal(eurFromCad, 100.00);
  });
});

