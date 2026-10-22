import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TripService } from '../../src/domain/TripService.js';
import { ContactService } from '../../src/domain/ContactService.js';
import { ActivityService } from '../../src/domain/ActivityService.js';

describe('Suite 4 : Carnet de Contacts & Liaisons (TC-CNT)', () => {

  const createSampleTrip = () => {
    return TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21'
    });
  };

  test('TC-CNT-001 : Création d\'un contact de voyage', () => {
    const trip = createSampleTrip();
    const contact = ContactService.addContact(trip, {
      name: 'Oncle Paul',
      relationship: 'Famille',
      phone: '+237 6 99 00 11 22',
      city: 'Douala',
      notes: 'Habite à Bonapriso'
    });

    assert.ok(contact.id);
    assert.equal(contact.name, 'Oncle Paul');
    assert.equal(contact.relationship, 'Famille');
    assert.equal(contact.phone, '+237 6 99 00 11 22');
    assert.equal(contact.city, 'Douala');
    assert.equal(contact.archived, false);
    assert.equal(trip.contacts.length, 1);
  });

  test('TC-CNT-002 : Validation de l\'obligation du nom', () => {
    const trip = createSampleTrip();

    assert.throws(() => {
      ContactService.addContact(trip, { name: '' });
    }, /Le nom du contact est obligatoire/);

    assert.throws(() => {
      ContactService.addContact(trip, { name: '   ' });
    }, /Le nom du contact est obligatoire/);
  });

  test('TC-CNT-003 : Association multi-contacts à une activité', () => {
    const trip = createSampleTrip();
    const c1 = ContactService.addContact(trip, { name: 'Oncle Paul' });
    const c2 = ContactService.addContact(trip, { name: 'Sophie' });
    const c3 = ContactService.addContact(trip, { name: 'Emmanuel Guide' });

    const act = ActivityService.addActivity(trip, {
      dayId: 'day-2',
      title: 'Dîner familial'
    });

    ActivityService.updateActivity(trip, act.id, {
      contactIds: [c1.id, c2.id, c3.id]
    });

    assert.equal(act.contactIds.length, 3);
    assert.ok(act.contactIds.includes(c1.id));
    assert.ok(act.contactIds.includes(c2.id));
    assert.ok(act.contactIds.includes(c3.id));
  });

  test('TC-CNT-004 : Filtrage et historique par contact', () => {
    const trip = createSampleTrip();
    const paul = ContactService.addContact(trip, { name: 'Oncle Paul' });
    const sophie = ContactService.addContact(trip, { name: 'Sophie' });

    const act1 = ActivityService.addActivity(trip, { dayId: 'day-2', title: 'Déjeuner Paul', contactIds: [paul.id] });
    const act2 = ActivityService.addActivity(trip, { dayId: 'day-5', title: 'Plage Sophie', contactIds: [sophie.id] });
    const act3 = ActivityService.addActivity(trip, { dayId: 'day-10', title: 'Sortie Paul et Sophie', contactIds: [paul.id, sophie.id] });

    const paulActivities = ContactService.getContactActivities(trip, paul.id);
    assert.equal(paulActivities.length, 2, 'Paul doit être associé à 2 activités');
    assert.equal(paulActivities[0].activity.title, 'Déjeuner Paul');
    assert.equal(paulActivities[1].activity.title, 'Sortie Paul et Sophie');

    const sophieActivities = ContactService.getContactActivities(trip, sophie.id);
    assert.equal(sophieActivities.length, 2);
  });

  test('TC-CNT-005 : Gestion de la suppression / archivage d\'un contact lié (Incohérence 2)', () => {
    const trip = createSampleTrip();
    const contact = ContactService.addContact(trip, { name: 'Sophie' });
    const act = ActivityService.addActivity(trip, { dayId: 'day-2', title: 'Sortie', contactIds: [contact.id] });

    // Tentative de suppression sans force -> archivage sécurisé pour préserver l'historique
    const res = ContactService.deleteOrArchiveContact(trip, contact.id, { forceDelete: false });
    assert.equal(res.action, 'archived');
    assert.equal(contact.archived, true);
    assert.equal(act.contactIds.includes(contact.id), true, 'L\'activité passée conserve la liaison');

    // Suppression définitive forcée
    const resForced = ContactService.deleteOrArchiveContact(trip, contact.id, { forceDelete: true });
    assert.equal(resForced.action, 'deleted');
    assert.equal(trip.contacts.length, 0);
    assert.equal(act.contactIds.length, 0, 'Délié proprement de l\'activité');
  });
});

