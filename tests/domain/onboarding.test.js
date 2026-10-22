import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TripService } from '../../src/domain/TripService.js';
import { ContactService } from '../../src/domain/ContactService.js';

describe('Suite Onboarding Express & Configuration Dynamique (Onboarding & Wizard)', () => {

  test('ONB-01 : Validation des 4 immanquables lors du Wizard (< 3 min)', () => {
    // Cas nominal
    const trip = TripService.createTripFromWizard({
      country: 'Sénégal',
      mainCity: 'Dakar',
      startDate: '2026-12-01',
      endDate: '2026-12-10',
      totalBudget: 1800,
      baseCurrency: 'EUR',
      activityPurposes: ['Pro / Affaires', 'Loisirs / Découverte']
    });

    assert.equal(trip.country, 'Sénégal');
    assert.equal(trip.days.length, 10);
    assert.equal(trip.totalBudget, 1800);
    assert.equal(trip.days[0].city, 'Dakar');
    assert.equal(trip.days[9].city, 'Dakar');
    assert.deepEqual(trip.activityPurposes, ['Pro / Affaires', 'Loisirs / Découverte']);
  });

  test('ONB-02 : Rejet si l\'un des 4 immanquables est manquant', () => {
    // Manque pays
    assert.throws(() => {
      TripService.createTripFromWizard({
        country: '',
        mainCity: 'Dakar',
        startDate: '2026-12-01',
        endDate: '2026-12-10',
        totalBudget: 1500
      });
    }, /Le pays de destination est obligatoire/);

    // Manque ville
    assert.throws(() => {
      TripService.createTripFromWizard({
        country: 'Sénégal',
        mainCity: '',
        startDate: '2026-12-01',
        endDate: '2026-12-10',
        totalBudget: 1500
      });
    }, /La ville principale est obligatoire/);

    // Budget négatif ou nul
    assert.throws(() => {
      TripService.createTripFromWizard({
        country: 'Sénégal',
        mainCity: 'Dakar',
        startDate: '2026-12-01',
        endDate: '2026-12-10',
        totalBudget: 0
      });
    }, /Le budget prévisionnel est obligatoire/);
  });

  test('ONB-03 : Modification dynamique du budget global (updateTripBudget)', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21',
      totalBudget: 2000
    });

    TripService.updateTripBudget(trip, { totalBudget: 3200 });
    assert.equal(trip.totalBudget, 3200);

    // Rejet montant invalide
    assert.throws(() => {
      TripService.updateTripBudget(trip, { totalBudget: -100 });
    }, /Le budget doit être un nombre strictement positif/);
  });

  test('ONB-04 : Priorisation automatique des contacts selon la catégorie d\'activité', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21'
    });

    const cPro = ContactService.addContact(trip, { name: 'M. Dubois', relationship: 'Pro / Affaires' });
    const cFamille = ContactService.addContact(trip, { name: 'Oncle Paul', relationship: 'Famille' });
    const cAmi = ContactService.addContact(trip, { name: 'Sophie', relationship: 'Amis' });

    // Pour une activité de catégorie Famille, les contacts de relation Famille sont placés en tête
    const sortedForFamille = ContactService.getContactsForActivityCategory(trip, 'Famille');
    assert.equal(sortedForFamille[0].name, 'Oncle Paul');

    // Pour une activité de catégorie Travail / Pro, le contact Pro est placé en tête
    const sortedForPro = ContactService.getContactsForActivityCategory(trip, 'Travail');
    assert.equal(sortedForPro[0].name, 'M. Dubois');
  });
});

