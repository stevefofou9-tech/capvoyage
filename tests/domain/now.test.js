import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TripService } from '../../src/domain/TripService.js';
import { ActivityService } from '../../src/domain/ActivityService.js';
import { NowService } from '../../src/domain/NowService.js';
import { IcsService } from '../../src/domain/IcsService.js';

const trip = () => TripService.createTrip({ country: 'Cameroun', startDate: '2026-11-01', endDate: '2026-11-21' });

describe('Suite 24 : Jour courant et rappel (TC-NOW)', () => {
  test('TC-NOW-001 : pendant le séjour -> Jour 8', () => {
    const r = NowService.getCurrentDay(trip(), new Date('2026-11-08T10:00:00Z'));
    assert.deepEqual([r.phase, r.dayNumber], ['during', 8]);
  });
  test('TC-NOW-002 : avant le départ -> Jour 1 + J-7', () => {
    const r = NowService.getCurrentDay(trip(), new Date('2026-10-25T10:00:00Z'));
    assert.deepEqual([r.phase, r.dayNumber, r.daysUntilStart], ['before', 1, 7]);
  });
  test('TC-NOW-003 : après le retour -> dernier jour', () => {
    const r = NowService.getCurrentDay(trip(), new Date('2026-11-30T10:00:00Z'));
    assert.deepEqual([r.phase, r.dayNumber], ['after', 21]);
  });
  test('TC-NOW-004 : fuseau du lieu (Douala UTC+1)', () => {
    const r = NowService.getCurrentDay(trip(), new Date('2026-11-07T23:30:00Z'));
    assert.equal(r.dayNumber, 8);
  });
  test('TC-NOW-005 : prochaine activité dans 1 h 30', () => {
    const t = trip();
    ActivityService.addActivity(t, { dayId: 8, title: 'Déjeuner', time: '13:00' });
    ActivityService.addActivity(t, { dayId: 8, title: 'Plus tard', time: '19:00' });
    const n = NowService.getNextActivity(t, new Date('2026-11-08T10:30:00Z'));
    assert.equal(n.activity.title, 'Déjeuner');
    assert.equal(n.inMinutes, 90);
    assert.equal(NowService.formatDuration(n.inMinutes), '1 h 30');
  });
  test('TC-NOW-006 : rien de prévu -> pas de rappel', () => {
    const t = trip();
    ActivityService.addActivity(t, { dayId: 8, title: 'Sans heure' });
    ActivityService.addActivity(t, { dayId: 8, title: 'Passé', time: '08:00' });
    assert.equal(NowService.getNextActivity(t, new Date('2026-11-08T10:30:00Z')), null);
  });
  test('TC-NOW-007 : les idées sont ignorées', () => {
    const t = trip();
    ActivityService.addActivity(t, { title: 'Idée', time: '13:00' });
    assert.equal(NowService.getNextActivity(t, new Date('2026-11-08T10:30:00Z')), null);
  });
  test('TC-NOW-008 : alarme 1 h dans le .ics pour les activités horodatées', () => {
    const t = trip();
    ActivityService.addActivity(t, { dayId: 1, title: 'A', time: '13:00' });
    ActivityService.addActivity(t, { dayId: 1, title: 'B' });
    const ics = IcsService.generateIcs(t);
    assert.equal((ics.match(/BEGIN:VALARM/g) || []).length, 1);
    assert.ok(ics.includes('TRIGGER:-PT1H'));
  });
});
