import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers.js';

describe('Suite API : Propriété des voyages, versions et démo (TC-API)', () => {
  let t;
  let alice;
  let bob;
  let aliceTrip;

  before(async () => {
    t = await startTestServer();
    alice = await t.login('alice@example.com');
    bob = await t.login('bob@example.com');
    aliceTrip = await t.createTrip(alice);
  });

  after(async () => {
    await t.stop();
  });

  test('TC-API-001 : POST /api/trip sans session est refusé (401)', async () => {
    const res = await t.api('POST', '/api/trip', { body: { trip: aliceTrip, baseVersion: 1 } });
    assert.equal(res.status, 401);
    assert.equal(t.dbService.getTripById(aliceTrip.id).title, aliceTrip.title);
  });

  test('TC-API-002 : Bob ne peut pas écrire le voyage d\'Alice (403)', async () => {
    const forged = { ...aliceTrip, title: 'Piraté par Bob' };
    const res = await t.api('POST', '/api/trip', { token: bob, body: { trip: forged, baseVersion: 1 } });
    assert.equal(res.status, 403);
    const stored = t.dbService.getTripById(aliceTrip.id);
    assert.equal(stored.title, aliceTrip.title);
    assert.equal(stored.userId, aliceTrip.userId);
  });

  test('TC-API-003 : userId et sharing envoyés par le client sont ignorés', async () => {
    const current = (await t.api('GET', '/api/trip', { token: alice })).data;
    const forged = {
      ...current,
      title: 'Voyage Alice v2',
      userId: 'usr-pirate',
      sharing: { enabled: true, token: 'share-forge', sections: { planning: true, todos: true, budget: true, contacts: true } }
    };
    const res = await t.api('POST', '/api/trip', { token: alice, body: { trip: forged, baseVersion: current.version } });
    assert.equal(res.status, 200);
    const stored = t.dbService.getTripById(aliceTrip.id);
    assert.equal(stored.title, 'Voyage Alice v2');
    assert.notEqual(stored.userId, 'usr-pirate');
    assert.equal(stored.sharing.enabled, false);
    assert.equal(t.dbService.getTripByShareToken('share-forge'), null);
  });

  test('TC-API-004 : POST /api/trip sur un id inconnu (404)', async () => {
    const res = await t.api('POST', '/api/trip', { token: alice, body: { trip: { ...aliceTrip, id: 'trip-inexistant' }, baseVersion: 1 } });
    assert.equal(res.status, 404);
  });

  test('TC-API-005 & 006 : version incrémentée, version périmée refusée (409)', async () => {
    const current = (await t.api('GET', '/api/trip', { token: alice })).data;
    const ok = await t.api('POST', '/api/trip', { token: alice, body: { trip: { ...current, title: 'Version suivante' }, baseVersion: current.version } });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.trip.version, current.version + 1);

    const stale = await t.api('POST', '/api/trip', { token: alice, body: { trip: { ...current, title: 'Écrasement' }, baseVersion: current.version } });
    assert.equal(stale.status, 409);
    assert.equal(stale.data.trip.title, 'Version suivante');
    assert.equal(t.dbService.getTripById(aliceTrip.id).title, 'Version suivante');
  });

  test('TC-API-013 : la démo est servie sans session, et identique entre deux appels', async () => {
    const a = await t.api('GET', '/api/trip');
    const b = await t.api('GET', '/api/trip');
    assert.equal(a.status, 200);
    assert.equal(a.data.id, 'trip-cameroun-seed');
    assert.equal(a.data.isDemo, true);
    assert.equal(a.data.userId, undefined);
    assert.deepEqual(a.data, b.data);
  });

  test('TC-API-013b : un jeton démo ne permet pas d\'écrire la démo', async () => {
    const demo = (await t.api('GET', '/api/trip')).data;
    const res = await t.api('POST', '/api/trip', { token: 'demo-token-123', body: { trip: { ...demo, title: 'Démo modifiée' }, baseVersion: 1 } });
    assert.equal(res.status, 401);
    assert.equal(t.dbService.getTripById('trip-cameroun-seed').title, demo.title);
  });

  test('TC-API-014 : /api/reset et /api/trip/budget n\'existent plus (404)', async () => {
    assert.equal((await t.api('POST', '/api/reset', { body: {} })).status, 404);
    assert.equal((await t.api('POST', '/api/trip/budget', { token: alice, body: { totalBudget: 1 } })).status, 404);
  });

  test('TC-API-002b : Bob ne peut pas basculer sur le voyage d\'Alice', async () => {
    const res = await t.api('POST', '/api/user/trips/switch', { token: bob, body: { tripId: aliceTrip.id } });
    assert.equal(res.status, 403);
  });
});
