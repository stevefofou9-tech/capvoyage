import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TripService } from '../../src/domain/TripService.js';
import { ActivityService } from '../../src/domain/ActivityService.js';

describe('Suite 3 : Activités & Enregistrement Progressif (TC-ACT)', () => {

  const createSampleTrip = () => {
    return TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21'
    });
  };

  test('TC-ACT-001 : Création ultra-rapide minimale (Titre seul)', () => {
    const trip = createSampleTrip();
    const act = ActivityService.addActivity(trip, {
      dayId: 'day-3',
      title: 'Passer voir la famille à Bonapriso'
    });

    assert.ok(act.id, 'Identifiant UUID généré');
    assert.equal(act.title, 'Passer voir la famille à Bonapriso');
    assert.equal(act.dayId, 'day-3');
    assert.equal(act.status, 'À planifier');
    assert.equal(act.category, 'Autre');
    assert.equal(act.time, '');
    assert.equal(act.location, '');
    assert.deepEqual(act.contactIds, []);
    assert.equal(trip.days[2].activities.length, 1);
  });

  test('TC-ACT-002 : Rejet de la création sans titre', () => {
    const trip = createSampleTrip();

    assert.throws(() => {
      ActivityService.addActivity(trip, { dayId: 'day-1', title: '' });
    }, /Le titre de l'activité est obligatoire/);

    assert.throws(() => {
      ActivityService.addActivity(trip, { dayId: 'day-1', title: '   ' });
    }, /Le titre de l'activité est obligatoire/);
  });

  test('TC-ACT-003 : Enrichissement progressif complet', () => {
    const trip = createSampleTrip();
    const act = ActivityService.addActivity(trip, {
      dayId: 'day-3',
      title: 'Passer voir la famille à Bonapriso'
    });

    // Enrichissement ultérieur le soir
    const updated = ActivityService.updateActivity(trip, act.id, {
      time: '15:30',
      location: 'Quartier Bonapriso, Douala',
      category: 'Famille',
      contactIds: ['contact-1', 'contact-2'],
      status: 'Confirmé',
      notes: 'Apporter les photos de famille'
    });

    assert.equal(updated.id, act.id, 'L\'id ne doit pas changer');
    assert.equal(updated.time, '15:30');
    assert.equal(updated.location, 'Quartier Bonapriso, Douala');
    assert.equal(updated.category, 'Famille');
    assert.deepEqual(updated.contactIds, ['contact-1', 'contact-2']);
    assert.equal(updated.status, 'Confirmé');
    assert.equal(updated.notes, 'Apporter les photos de famille');
  });

  test('TC-ACT-004 : Classement automatique dans les 4 blocs temporels', () => {
    const actNoTime = { title: 'Idée sans heure', time: '' };
    const actMorning = { title: 'Visite marché', time: '09:00' };
    const actAfternoon = { title: 'Plage', time: '14:30' };
    const actEvening = { title: 'Dîner', time: '20:15' };

    assert.equal(ActivityService.determineTemporalBlock(actNoTime), "À caler aujourd'hui");
    assert.equal(ActivityService.determineTemporalBlock(actMorning), 'Matin');
    assert.equal(ActivityService.determineTemporalBlock(actAfternoon), 'Après-midi');
    assert.equal(ActivityService.determineTemporalBlock(actEvening), 'Soirée');

    const grouped = ActivityService.groupActivitiesByTemporalBlocks([
      actNoTime, actMorning, actAfternoon, actEvening
    ]);

    assert.equal(grouped.unassigned.length, 1);
    assert.equal(grouped.morning.length, 1);
    assert.equal(grouped.afternoon.length, 1);
    assert.equal(grouped.evening.length, 1);
  });

  test('TC-ACT-005 : Assignation manuelle par créneau sans heure précise', () => {
    const act = { title: 'Baignade chutes de la Lobé', time: 'Après-midi' };
    assert.equal(ActivityService.determineTemporalBlock(act), 'Après-midi');

    const actMatin = { title: 'Petit-déjeuner beignets haricots', time: 'Matin' };
    assert.equal(ActivityService.determineTemporalBlock(actMatin), 'Matin');
  });

  test('TC-ACT-006 : Déplacement d\'activité entre journées', () => {
    const trip = createSampleTrip();
    const act = ActivityService.addActivity(trip, {
      dayId: 'day-4',
      title: 'Excursion mangrove',
      time: '10:00',
      location: 'Douala',
      category: 'Loisir'
    });

    assert.equal(trip.days[3].activities.length, 1);
    assert.equal(trip.days[5].activities.length, 0);

    // Déplacement de Day 4 vers Day 6
    ActivityService.moveActivity(trip, act.id, 'day-6');

    assert.equal(trip.days[3].activities.length, 0, 'Retiré du jour source');
    assert.equal(trip.days[5].activities.length, 1, 'Ajouté au jour cible');
    assert.equal(trip.days[5].activities[0].title, 'Excursion mangrove');
    assert.equal(trip.days[5].activities[0].time, '10:00');
    assert.equal(trip.days[5].activities[0].dayId, 'day-6');
  });

  test('TC-ACT-007 : Cycle de vie des statuts de l\'activité', () => {
    const trip = createSampleTrip();
    const act = ActivityService.addActivity(trip, { dayId: 'day-1', title: 'Test Statut' });

    ActivityService.updateActivity(trip, act.id, { status: 'Confirmé' });
    assert.equal(act.status, 'Confirmé');

    ActivityService.updateActivity(trip, act.id, { status: 'Effectué' });
    assert.equal(act.status, 'Effectué');

    ActivityService.updateActivity(trip, act.id, { status: 'Annulé' });
    assert.equal(act.status, 'Annulé');

    assert.throws(() => {
      ActivityService.updateActivity(trip, act.id, { status: 'Inconnu' });
    }, /Statut d'activité invalide/);
  });

  test('TC-ACT-008 : Suppression d\'une activité', () => {
    const trip = createSampleTrip();
    const act1 = ActivityService.addActivity(trip, { dayId: 'day-1', title: 'Activité 1' });
    const act2 = ActivityService.addActivity(trip, { dayId: 'day-1', title: 'Activité 2' });

    assert.equal(trip.days[0].activities.length, 2);

    ActivityService.deleteActivity(trip, act1.id);
    assert.equal(trip.days[0].activities.length, 1);
    assert.equal(trip.days[0].activities[0].id, act2.id);
  });
});

