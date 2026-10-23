import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SyncQueue, SyncStatus } from '../../src/domain/SyncQueue.js';

function memoryStorage() {
  const map = new Map();
  return { getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), map };
}

// Faux serveur : version courante, et réseau activable/désactivable
function fakeServer(initialVersion = 1) {
  const server = { version: initialVersion, online: true, calls: [], stored: null, delay: null };
  server.transport = async (trip, baseVersion) => {
    server.calls.push({ title: trip.title, baseVersion });
    if (server.delay) await server.delay;
    if (!server.online) throw new Error('Failed to fetch');
    if (baseVersion !== server.version) {
      return { status: 'conflict', trip: { ...(server.stored || trip), version: server.version } };
    }
    server.version += 1;
    server.stored = { ...trip, version: server.version };
    return { status: 'ok', trip: server.stored };
  };
  return server;
}

const trip = (title, version = 1) => ({ id: 'trip-1', title, version });

describe('Suite Synchronisation Hors-Ligne (TC-SYNC)', () => {

  test('TC-SYNC-001 : une modification hors-ligne est mise en file', async () => {
    const server = fakeServer();
    server.online = false;
    const statuses = [];
    const q = new SyncQueue({ storage: memoryStorage(), transport: server.transport, onStatus: s => statuses.push(s) });
    q.enqueue(trip('Marché de Mboppi'), 1);
    assert.equal(q.hasPending('trip-1'), true);
    assert.equal(q.getStatus(), SyncStatus.PENDING);
    assert.equal(statuses.at(-1), SyncStatus.PENDING);
  });

  test('TC-SYNC-002 : deux modifications avant envoi → un seul instantané, base d\'origine', () => {
    const q = new SyncQueue({ storage: memoryStorage(), transport: async () => { throw new Error('offline'); } });
    q.enqueue(trip('A', 3), 3);
    q.enqueue(trip('B', 3), 7);
    assert.equal(Object.keys(q.state.pending).length, 1);
    assert.equal(q.state.pending['trip-1'].trip.title, 'B');
    assert.equal(q.state.pending['trip-1'].baseVersion, 3);
  });

  test('TC-SYNC-003 : envoi réussi → file vide, statut enregistré, version serveur remontée', async () => {
    const server = fakeServer(5);
    let saved = null;
    const q = new SyncQueue({ storage: memoryStorage(), transport: server.transport, onSaved: t => { saved = t; } });
    q.enqueue(trip('Plage de Kribi', 5), 5);
    assert.equal(await q.flush(), true);
    assert.equal(q.getStatus(), SyncStatus.SAVED);
    assert.equal(saved.version, 6);
  });

  test('TC-SYNC-004 : échec réseau → instantané conservé, pas d\'exception', async () => {
    const server = fakeServer();
    server.online = false;
    const q = new SyncQueue({ storage: memoryStorage(), transport: server.transport });
    q.enqueue(trip('Hors-ligne'), 1);
    assert.equal(await q.flush(), false);
    assert.equal(q.hasPending('trip-1'), true);

    server.online = true;
    assert.equal(await q.flush(), true);
    assert.equal(server.stored.title, 'Hors-ligne');
  });

  test('TC-SYNC-005 : modification pendant un envoi → envoi suivant rebasé, sans conflit', async () => {
    const server = fakeServer(1);
    let release;
    server.delay = new Promise(r => { release = r; });
    const q = new SyncQueue({ storage: memoryStorage(), transport: server.transport });

    q.enqueue(trip('Première'), 1);
    const first = q.flush();
    await Promise.resolve();
    q.enqueue(trip('Seconde'), 1);
    const second = q.flush();
    server.delay = null;
    release();
    await Promise.all([first, second]);

    assert.deepEqual(server.calls.map(c => c.baseVersion), [1, 2]);
    assert.equal(server.stored.title, 'Seconde');
    assert.equal(q.getStatus(), SyncStatus.SAVED);
  });

  test('TC-SYNC-006 : réponse 409 → copie locale conservée, version serveur adoptée', async () => {
    const server = fakeServer(4);
    server.stored = { id: 'trip-1', title: 'Version ordinateur', version: 4 };
    let conflictArgs = null;
    const q = new SyncQueue({ storage: memoryStorage(), transport: server.transport, onConflict: (s, l) => { conflictArgs = { s, l }; } });
    q.enqueue(trip('Version téléphone', 3), 3);
    await q.flush();
    assert.equal(q.getStatus(), SyncStatus.CONFLICT);
    assert.equal(conflictArgs.s.title, 'Version ordinateur');
    assert.equal(q.getConflict('trip-1').title, 'Version téléphone');
    assert.equal(q.hasPending('trip-1'), false);
  });

  test('TC-SYNC-007 : « Restaurer ma version » renvoie la copie locale sur la version serveur', async () => {
    const server = fakeServer(4);
    const q = new SyncQueue({ storage: memoryStorage(), transport: server.transport });
    q.enqueue(trip('Version téléphone', 3), 3);
    await q.flush();
    q.restoreConflict('trip-1', 4);
    await q.flush();
    assert.equal(server.stored.title, 'Version téléphone');
    assert.equal(q.getStatus(), SyncStatus.SAVED);
  });

  test('TC-SYNC-008 : l\'état survit à un rechargement de page', () => {
    const storage = memoryStorage();
    const q1 = new SyncQueue({ storage, transport: async () => { throw new Error('offline'); } });
    q1.enqueue(trip('Persistant', 2), 2);
    const q2 = new SyncQueue({ storage, transport: async () => { throw new Error('offline'); } });
    assert.deepEqual(q2.state, q1.state);
    assert.equal(q2.getStatus(), SyncStatus.PENDING);
  });
});
