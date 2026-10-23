import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers.js';

describe('Suite API : Idées (TC-IDEA, TC-SHARE-IDEA)', () => {
  let t;
  let token;

  before(async () => {
    t = await startTestServer();
    token = await t.login('idees@example.com');
  });

  after(async () => {
    await t.stop();
  });

  test('TC-IDEA-API : les idées sont enregistrées avec le voyage et jamais transmises par un lien partagé', async () => {
    const trip = await t.createTrip(token);
    const current = (await t.api('GET', '/api/trip', { token })).data;
    const updated = { ...current, ideas: [{ id: 'idea-1', title: 'IDEE-SECRETE', category: 'Autre', status: 'À planifier', contactIds: [], time: '', location: '', notes: '', createdAt: '2026-10-23T00:00:00Z' }] };
    const saved = await t.api('POST', '/api/trip', { token, body: { trip: updated, baseVersion: current.version } });
    assert.equal(saved.status, 200);

    const reread = (await t.api('GET', '/api/trip', { token })).data;
    assert.equal(reread.ideas.length, 1);
    assert.equal(reread.ideas[0].title, 'IDEE-SECRETE');

    const sharing = await t.api('PUT', '/api/trip/sharing', {
      token,
      body: { tripId: trip.id, enabled: true, sections: { planning: true, todos: true, budget: true, contacts: true } }
    });
    const view = await t.api('GET', `/api/trip?share=${sharing.data.sharing.token}`);
    assert.equal(view.status, 200);
    assert.ok(!JSON.stringify(view.data).includes('IDEE-SECRETE'));
  });

  test('TC-IDEA-API : un champ ideas invalide est refusé', async () => {
    const current = (await t.api('GET', '/api/trip', { token })).data;
    const res = await t.api('POST', '/api/trip', { token, body: { trip: { ...current, ideas: 'oups' }, baseVersion: current.version } });
    assert.equal(res.status, 400);
  });
});
