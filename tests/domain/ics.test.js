import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { IcsService } from '../../src/domain/IcsService.js';
import { TripService } from '../../src/domain/TripService.js';
import { ActivityService } from '../../src/domain/ActivityService.js';
import { ContactService } from '../../src/domain/ContactService.js';

describe('Suite Export Calendrier iCalendar RFC 5545 (IcsService)', () => {

  test('ICS-01 : Rejet si aucun voyage fourni', () => {
    assert.throws(() => {
      IcsService.generateIcs(null);
    }, /L'objet voyage est requis/);
  });

  test('ICS-02 : Génération complète du fichier .ics avec en-têtes valides', () => {
    const trip = TripService.createTrip({
      country: 'Cameroun',
      title: 'Voyage Cameroun 2026',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      totalBudget: 2500
    });

    const contact = ContactService.addContact(trip, {
      name: 'Oncle Paul',
      relationship: 'Famille'
    });

    const day1 = trip.days[0];
    ActivityService.addActivity(trip, {
      dayId: day1.id,
      title: 'Dîner avec Oncle Paul',
      category: 'Famille',
      time: '19:30',
      location: 'Restaurant Youpwé, Douala',
      contactIds: [contact.id],
      notes: 'Commander du poisson braisé'
    });

    const day2 = trip.days[1];
    ActivityService.addActivity(trip, {
      dayId: day2.id,
      title: 'Journée Plage à Kribi',
      category: 'Loisir',
      location: 'Plage de Grand Batanga',
      notes: 'Baignade et détente'
    });

    const icsContent = IcsService.generateIcs(trip);

    // Vérification de la structure du calendrier
    assert.ok(icsContent.includes('BEGIN:VCALENDAR'));
    assert.ok(icsContent.includes('VERSION:2.0'));
    assert.ok(icsContent.includes('PRODID:-//CapVoyage//Trip Calendar//FR'));
    assert.ok(icsContent.includes('X-WR-CALNAME:Voyage Cameroun 2026'));
    assert.ok(icsContent.includes('END:VCALENDAR'));

    // Vérification du premier événement (avec horaire)
    assert.ok(icsContent.includes('SUMMARY:Dîner avec Oncle Paul'));
    assert.ok(icsContent.includes('DTSTART:20261101T193000'));
    assert.ok(icsContent.includes('DTEND:20261101T203000'));
    assert.ok(icsContent.includes('LOCATION:Restaurant Youpwé\\, Douala'));
    assert.ok(icsContent.includes('Avec : Oncle Paul'));
    assert.ok(icsContent.includes('Notes : Commander du poisson braisé'));

    // Vérification du second événement (journée entière sans heure précise)
    assert.ok(icsContent.includes('SUMMARY:Journée Plage à Kribi'));
    assert.ok(icsContent.includes('DTSTART;VALUE=DATE:20261102'));
    assert.ok(icsContent.includes('DTEND;VALUE=DATE:20261103'));
    assert.ok(icsContent.includes('LOCATION:Plage de Grand Batanga'));
  });

  test('ICS-03 : Statut annulé génère STATUS:CANCELLED', () => {
    const trip = TripService.createTrip({
      country: 'Sénégal',
      title: 'Séjour Dakar',
      startDate: '2026-12-01',
      endDate: '2026-12-03'
    });

    const day1 = trip.days[0];
    const act = ActivityService.addActivity(trip, {
      dayId: day1.id,
      title: 'Excursion annulée',
      time: '10:00'
    });
    ActivityService.updateActivity(trip, act.id, { status: 'Annulé' });

    const ics = IcsService.generateIcs(trip);
    assert.ok(ics.includes('STATUS:CANCELLED'));
  });
});

