import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers.js';

describe('Suite API : Partage paramétrable (TC-API-007 à 012)', () => {
  let t;
  let alice;
  let bob;
  let trip;

  before(async () => {
    t = await startTestServer();
    alice = await t.login('alice.share@example.com');
    bob = await t.login('bob.share@example.com');
    trip = await t.createTrip(alice, {
      initialContacts: [{ name: 'Oncle Paul', phone: '+237 600 000 000', relationship: 'Famille' }]
    });
  });

  after(async () => {
    await t.stop();
  });

  test('TC-API-008 : Bob ne peut pas modifier le partage du voyage d\'Alice (403)', async () => {
    const res = await t.api('PUT', '/api/trip/sharing', { token: bob, body: { tripId: trip.id, enabled: true } });
    assert.equal(res.status, 403);
  });

  test('TC-API-009 : activation par défaut = Programme seul, sans identifiants', async () => {
    const res = await t.api('PUT', '/api/trip/sharing', { token: alice, body: { tripId: trip.id, enabled: true } });
    assert.equal(res.status, 200);
    assert.equal(res.data.sharing.enabled, true);
    assert.deepEqual(res.data.sharing.sections, { planning: true, todos: false, budget: false, contacts: false });

    const view = await t.api('GET', `/api/trip?share=${res.data.sharing.token}`);
    assert.equal(view.status, 200);
    assert.equal(view.data.isReadOnly, true);
    assert.deepEqual(view.data.sharedSections, ['planning']);
    assert.ok(Array.isArray(view.data.days));
    for (const key of ['id', 'userId', 'sharing', 'version', 'contacts', 'expenses', 'todos', 'currencies']) {
      assert.equal(view.data[key], undefined, `${key} ne doit pas être exposé`);
    }
  });

  test('TC-API-007 : le jeton de partage ne permet pas d\'écrire (401)', async () => {
    const { sharing } = (await t.api('PUT', '/api/trip/sharing', { token: alice, body: { tripId: trip.id } })).data;
    const res = await t.api('POST', '/api/trip', { token: sharing.token, body: { trip: { ...trip, title: 'via partage' }, baseVersion: 1 } });
    assert.equal(res.status, 401);
  });

  test('TC-API-010 : cocher Budget et Contacts les ajoute à la vue', async () => {
    const res = await t.api('PUT', '/api/trip/sharing', { token: alice, body: { tripId: trip.id, sections: { budget: true, contacts: true } } });
    const view = await t.api('GET', `/api/trip?share=${res.data.sharing.token}`);
    assert.deepEqual(view.data.sharedSections, ['planning', 'budget', 'contacts']);
    assert.ok(Array.isArray(view.data.expenses));
    assert.equal(view.data.contacts[0].name, 'Oncle Paul');
  });

  test('TC-API-011 : désactiver le partage coupe le lien (404)', async () => {
    const on = await t.api('PUT', '/api/trip/sharing', { token: alice, body: { tripId: trip.id, enabled: true } });
    const off = await t.api('PUT', '/api/trip/sharing', { token: alice, body: { tripId: trip.id, enabled: false } });
    assert.equal(off.data.sharing.enabled, false);
    const view = await t.api('GET', `/api/trip?share=${on.data.sharing.token}`);
    assert.equal(view.status, 404);
    assert.equal(view.data.error, "Ce lien de partage n'est plus actif");
  });

  test('TC-API-012 : régénérer le lien invalide l\'ancien', async () => {
    const before = await t.api('PUT', '/api/trip/sharing', { token: alice, body: { tripId: trip.id, enabled: true } });
    const regen = await t.api('PUT', '/api/trip/sharing', { token: alice, body: { tripId: trip.id, regenerate: true } });
    assert.notEqual(regen.data.sharing.token, before.data.sharing.token);
    assert.equal((await t.api('GET', `/api/trip?share=${before.data.sharing.token}`)).status, 404);
    assert.equal((await t.api('GET', `/api/trip?share=${regen.data.sharing.token}`)).status, 200);
  });

  test('TC-API-012b : un enregistrement du voyage conserve le partage serveur', async () => {
    const current = (await t.api('GET', '/api/trip', { token: alice })).data;
    const saved = await t.api('POST', '/api/trip', {
      token: alice,
      body: { trip: { ...current, sharing: { enabled: false } }, baseVersion: current.version }
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.data.trip.sharing.enabled, true);
    assert.equal((await t.api('GET', `/api/trip?share=${current.sharing.token}`)).status, 200);
  });
});
