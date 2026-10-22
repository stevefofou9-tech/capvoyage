import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TripService } from '../../src/domain/TripService.js';

describe('Suite 2 : Configuration du Voyage & Calendrier (TC-TRIP)', () => {

  test('TC-TRIP-001 : Génération automatique des 21 journées', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      title: 'Séjour Cameroun 2026',
      startDate: '2026-11-01',
      endDate: '2026-11-21',
      baseCurrency: 'EUR',
      totalBudget: 2500
    });

    assert.equal(trip.country, 'Cameroun');
    assert.equal(trip.days.length, 21, 'Doit générer exactement 21 journées');
    assert.equal(trip.days[0].dayNumber, 1);
    assert.equal(trip.days[0].date, '2026-11-01');
    assert.equal(trip.days[20].dayNumber, 21);
    assert.equal(trip.days[20].date, '2026-11-21');

    // Vérification de la configuration des devises (EUR + XAF)
    assert.equal(trip.baseCurrency, 'EUR');
    const xaf = trip.currencies.find(c => c.code === 'XAF');
    assert.ok(xaf, 'Devise XAF présente');
    assert.equal(xaf.rateToBase, 655.957);
  });

  test('TC-TRIP-002 : Rejet des plages de dates invalides', () => {
    assert.throws(() => {
      TripService.createTrip({
        country: 'Cameroun',
        startDate: '2026-11-21',
        endDate: '2026-11-01'
      });
    }, /La date de fin ne peut pas être antérieure/);
  });

  test('TC-TRIP-003 : Affectation et mise à jour des villes étapes par jour', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21'
    });

    // Affectation par plage
    TripService.assignCityToRange(trip, 1, 7, 'Douala');
    TripService.assignCityToRange(trip, 8, 14, 'Yaoundé');
    TripService.assignCityToRange(trip, 15, 20, 'Kribi');
    TripService.assignCityToDay(trip, 21, 'Douala');

    assert.equal(trip.days[0].city, 'Douala');
    assert.equal(trip.days[6].city, 'Douala');
    assert.equal(trip.days[7].city, 'Yaoundé');
    assert.equal(trip.days[14].city, 'Kribi');
    assert.equal(trip.days[20].city, 'Douala');
  });

  test('TC-TRIP-004 : Extension de la durée d\'un voyage existant', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21'
    });

    // Ajouter une activité sur le Jour 5
    trip.days[4].activities = [{ id: 'a-5', title: 'Visite famille' }];

    // Prolonger jusqu'au 23 novembre (23 jours)
    TripService.extendTrip(trip, '2026-11-23');

    assert.equal(trip.days.length, 23);
    assert.equal(trip.endDate, '2026-11-23');
    assert.equal(trip.days[4].activities[0].title, 'Visite famille', 'L\'activité existante est préservée');
    assert.equal(trip.days[21].dayNumber, 22);
    assert.equal(trip.days[22].dayNumber, 23);
  });

  test('TC-TRIP-005 : Réduction de la durée avec garde-fou anti-perte', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21'
    });

    // Ajouter une activité sur le Jour 20
    trip.days[19].activities = [{ id: 'act-adieu', title: 'Dîner d\'adieu à Kribi' }];

    // Tentative de raccourcir à 18 jours sans force -> doit lever une exception
    assert.throws(() => {
      TripService.reduceTrip(trip, '2026-11-18');
    }, /Impossible de raccourcir le séjour sans confirmation/);

    // Vérifier que le voyage n'a pas été altéré
    assert.equal(trip.days.length, 21);

    // Raccourcissement avec confirmation explicite (force: true)
    TripService.reduceTrip(trip, '2026-11-18', { force: true });
    assert.equal(trip.days.length, 18);
  });

  test('TC-TRIP-006 : Consultation du récapitulatif synthétique du voyage', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21'
    });
    TripService.assignCityToRange(trip, 1, 10, 'Douala');
    TripService.assignCityToRange(trip, 11, 21, 'Kribi');
    trip.days[0].activities = [{ id: '1', title: 'A1' }];
    trip.days[1].activities = [{ id: '2', title: 'A2' }];

    const summary = TripService.getTripSummary(trip);
    assert.equal(summary.country, 'Cameroun');
    assert.equal(summary.totalDays, 21);
    assert.equal(summary.totalActivities, 2);
    assert.ok(summary.cities.includes('Douala'));
    assert.ok(summary.cities.includes('Kribi'));
  });
});

