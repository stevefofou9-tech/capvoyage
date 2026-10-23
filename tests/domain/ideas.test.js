import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TripService } from '../../src/domain/TripService.js';
import { ActivityService } from '../../src/domain/ActivityService.js';
import { IcsService } from '../../src/domain/IcsService.js';
import { ReminderService } from '../../src/domain/ReminderService.js';
import { StorageService } from '../../src/domain/StorageService.js';

const makeTrip = () => TripService.createTrip({ country: 'Cameroun', startDate: '2026-11-01', endDate: '2026-11-21' });

describe('Suite 21 : Idées, activités sans jour (TC-IDEA)', () => {
  test('TC-IDEA-001 : ajout sans dayId -> dans trip.ideas', () => {
    const trip = makeTrip();
    const a = ActivityService.addActivity(trip, { title: 'Restaurant de poisson à Kribi' });
    assert.equal(trip.ideas.length, 1);
    assert.equal(a.dayId, undefined);
    assert.equal(a.status, 'À planifier');
    assert.ok(trip.days.every(d => !(d.activities || []).length));
  });

  test('TC-IDEA-002 : le titre reste obligatoire', () => {
    assert.throws(() => ActivityService.addActivity(makeTrip(), { title: '  ' }), /titre/);
  });

  test('TC-IDEA-003 : placeIdea conserve tous les champs', () => {
    const trip = makeTrip();
    const a = ActivityService.addActivity(trip, { title: 'Plage', location: 'Londji', notes: 'Maillot', category: 'Loisir' });
    ActivityService.updateActivity(trip, a.id, { status: 'Confirmé' });
    ActivityService.placeIdea(trip, a.id, 6);
    assert.equal(trip.ideas.length, 0);
    const day6 = trip.days.find(d => d.dayNumber === 6);
    assert.equal(day6.activities.length, 1);
    assert.equal(day6.activities[0].dayId, day6.id);
    assert.equal(day6.activities[0].location, 'Londji');
    assert.equal(day6.activities[0].status, 'Confirmé');
  });

  test('TC-IDEA-004 : unplaceActivity remet aux idées', () => {
    const trip = makeTrip();
    const a = ActivityService.addActivity(trip, { dayId: 2, title: 'Marché', location: 'Mboppi' });
    ActivityService.unplaceActivity(trip, a.id);
    assert.equal(trip.days[1].activities.length, 0);
    assert.equal(trip.ideas.length, 1);
    assert.equal(trip.ideas[0].dayId, undefined);
    assert.equal(trip.ideas[0].location, 'Mboppi');
  });

  test('TC-IDEA-005 : voyage ancien sans ideas, validation du schéma', () => {
    const trip = makeTrip();
    assert.equal(trip.ideas, undefined);
    assert.ok(StorageService.validateTripSchema(trip));
    assert.throws(() => StorageService.validateTripSchema({ ...trip, ideas: 'x' }), /ideas/);
    ActivityService.addActivity(trip, { title: 'Idée' });
    assert.equal(trip.ideas.length, 1);
  });

  test('TC-IDEA-006 : suppression et mise à jour d une idée', () => {
    const trip = makeTrip();
    const a = ActivityService.addActivity(trip, { title: 'Idée' });
    ActivityService.updateActivity(trip, a.id, { title: 'Idée 2' });
    assert.equal(trip.ideas[0].title, 'Idée 2');
    ActivityService.deleteActivity(trip, a.id);
    assert.equal(trip.ideas.length, 0);
  });

  test('TC-IDEA-007 : les idées sont absentes du .ics et du briefing', () => {
    const trip = makeTrip();
    ActivityService.addActivity(trip, { title: 'IDEE-SECRETE' });
    ActivityService.addActivity(trip, { dayId: 1, title: 'Daté', time: '13:00' });
    const ics = IcsService.generateIcs(trip);
    assert.ok(!ics.includes('IDEE-SECRETE'));
    assert.ok(ics.includes('SUMMARY:Daté'));
    const brief = ReminderService.getMorningBrief(trip, 1);
    assert.ok(!brief.text.includes('IDEE-SECRETE'));
  });

  test('TC-IDEA-008 : réduire le séjour conserve les idées', () => {
    const trip = makeTrip();
    ActivityService.addActivity(trip, { title: 'Idée' });
    TripService.reduceTrip(trip, '2026-11-10');
    assert.equal(trip.ideas.length, 1);
  });

  test('TC-IDEA-009 : TripService.moveActivityToDay accepte une idée', () => {
    const trip = makeTrip();
    const a = ActivityService.addActivity(trip, { title: 'Idée' });
    TripService.moveActivityToDay(trip, a.id, 3);
    assert.equal(trip.ideas.length, 0);
    assert.equal(trip.days[2].activities.length, 1);
  });

  test('TC-SHARE-IDEA : la vue partagée ne contient jamais d idée', () => {
    const trip = makeTrip();
    ActivityService.addActivity(trip, { title: 'IDEE-SECRETE' });
    TripService.updateSharing(trip, { enabled: true, sections: { planning: true, todos: true, budget: true, contacts: true } });
    const view = TripService.buildSharedView(trip);
    assert.ok(!JSON.stringify(view).includes('IDEE-SECRETE'));
    assert.equal(view.ideas, undefined);
  });
});

describe('Suite 22 : Statut en un tap, activités (TC-QS)', () => {
  test('TC-QS-003 : isCheckable, jour courant et passé seulement', () => {
    const trip = makeTrip();
    const a = ActivityService.addActivity(trip, { dayId: 8, title: 'Déj' });
    const day8 = trip.days[7];
    assert.equal(ActivityService.isCheckable(a, day8, '2026-11-08'), true);
    assert.equal(ActivityService.isCheckable(a, day8, '2026-11-09'), true);
    assert.equal(ActivityService.isCheckable(a, day8, '2026-11-07'), false);
    const idea = ActivityService.addActivity(trip, { title: 'Idée' });
    assert.equal(ActivityService.isCheckable(idea, null, '2026-11-08'), false);
    ActivityService.updateActivity(trip, a.id, { status: 'Effectué' });
    assert.equal(ActivityService.isCheckable(a, day8, '2026-11-08'), false);
  });

  test('TC-QS-004 : marquer Effectué ne change pas les autres champs', () => {
    const trip = makeTrip();
    const a = ActivityService.addActivity(trip, { dayId: 1, title: 'Déj', location: 'Akwa' });
    ActivityService.updateActivity(trip, a.id, { status: 'Effectué' });
    assert.equal(a.location, 'Akwa');
    assert.equal(a.status, 'Effectué');
  });
});
