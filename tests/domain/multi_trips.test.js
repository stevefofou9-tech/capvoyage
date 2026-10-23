import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../../src/domain/AuthService.js';

describe('Suite Multi-Voyages & Profil Utilisateur (AuthService)', () => {

  test('MUT-01 : Association et bascule de voyages pour un utilisateur', () => {
    const users = [
      {
        id: 'u-1',
        email: 'steve@capvoyage.com',
        sessionToken: 'tok-steve',
        currentTripId: 'trip-cameroun',
        trips: ['trip-cameroun']
      }
    ];

    // Ajouter un 2e voyage
    AuthService.addTripToUser(users, 'tok-steve', 'trip-japon');
    const user = AuthService.getUser(users, 'tok-steve');
    assert.deepEqual(user.trips, ['trip-cameroun', 'trip-japon']);
    assert.equal(user.currentTripId, 'trip-japon');

    // Basculer vers le voyage Cameroun
    const switchRes = AuthService.switchCurrentTrip(users, 'tok-steve', 'trip-cameroun');
    assert.equal(switchRes.success, true);
    assert.equal(user.currentTripId, 'trip-cameroun');

    // Tentative de bascule vers un voyage non possédé
    assert.throws(() => {
      AuthService.switchCurrentTrip(users, 'tok-steve', 'trip-inconnu');
    }, /Voyage introuvable ou non associé à ce compte/);
  });

  // MUT-02 (suppression de voyage) retiré : fonctionnalité hors périmètre (PRD v2.0 §7)

  test('MUT-03 : Carnet de contacts global rattaché au compte', () => {
    const users = [
      {
        id: 'u-1',
        email: 'steve@capvoyage.com',
        sessionToken: 'tok-steve',
        globalContacts: []
      }
    ];

    AuthService.addGlobalContact(users, 'tok-steve', {
      name: 'Oncle Paul',
      relationship: 'Famille',
      city: 'Douala',
      phone: '+237 6 99 00 11 22'
    });

    const contacts = AuthService.getGlobalContacts(users, 'tok-steve');
    assert.equal(contacts.length, 1);
    assert.equal(contacts[0].name, 'Oncle Paul');
    assert.equal(contacts[0].relationship, 'Famille');
  });
});

