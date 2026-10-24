import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { startTestServer } from './helpers.js';
import { DbService } from '../../src/services/DbService.js';
import { AuthService } from '../../src/domain/AuthService.js';

const DAY = 24 * 60 * 60 * 1000;

describe('Suite API : Sessions, anti-abus et en-têtes (TC-API-015 à 024)', () => {

  test('TC-API-015 : X-Forwarded-For est ignoré par la limite par IP', async () => {
    const t = await startTestServer();
    try {
      const statuses = [];
      for (let i = 0; i < 6; i++) {
        const res = await t.api('POST', '/api/auth/request-code', {
          body: { email: `ip${i}@example.com` },
          headers: { 'X-Forwarded-For': `10.0.0.${i}` }
        });
        statuses.push(res.status);
      }
      assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
    } finally {
      await t.stop();
    }
  });

  test('TC-API-016 : limite par e-mail même en changeant d\'IP (Fly-Client-IP)', async () => {
    const t = await startTestServer({ trustFlyClientIp: true });
    try {
      const statuses = [];
      for (let i = 0; i < 6; i++) {
        const res = await t.api('POST', '/api/auth/request-code', {
          body: { email: 'cible@example.com' },
          headers: { 'Fly-Client-IP': `203.0.113.${i}` }
        });
        statuses.push(res.status);
      }
      assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
    } finally {
      await t.stop();
    }
  });

  test('TC-API-017 & 019 : deux appareils connectés, déconnexion d\'un seul', async () => {
    const t = await startTestServer();
    try {
      const device1 = await t.login('multi@example.com');
      const device2 = await t.login('multi@example.com');
      assert.equal((await t.api('GET', '/api/auth/me', { token: device1 })).status, 200);
      assert.equal((await t.api('GET', '/api/auth/me', { token: device2 })).status, 200);

      await t.api('POST', '/api/auth/logout', { token: device1 });
      assert.equal((await t.api('GET', '/api/auth/me', { token: device1 })).status, 401);
      assert.equal((await t.api('GET', '/api/auth/me', { token: device2 })).status, 200);
    } finally {
      await t.stop();
    }
  });

  test('TC-API-018 : session expirée après 30 jours sans activité, prolongée si utilisée', async () => {
    const t = await startTestServer();
    try {
      const active = await t.login('actif@example.com');
      const idle = await t.login('inactif@example.com');

      t.clock.value += 20 * DAY;
      assert.equal((await t.api('GET', '/api/auth/me', { token: active })).status, 200);

      t.clock.value += 11 * DAY;
      assert.equal((await t.api('GET', '/api/auth/me', { token: active })).status, 200, 'la session utilisée a glissé');
      assert.equal((await t.api('GET', '/api/auth/me', { token: idle })).status, 401, 'la session inactive a expiré');
    } finally {
      await t.stop();
    }
  });

  test('TC-API-020 : migration d\'un ancien users.session_token', async () => {
    const dbPath = path.join(os.tmpdir(), `capvoyage_legacy_${Date.now()}.db`);
    const legacy = new DbService(dbPath);
    legacy.saveUser({ id: 'usr-legacy', email: 'legacy@example.com', createdAt: new Date().toISOString(), trips: [] });
    legacy.db.prepare('UPDATE users SET session_token = ? WHERE id = ?').run('jeton-historique', 'usr-legacy');
    legacy.close();

    const t = await startTestServer({ dbPath });
    try {
      assert.equal((await t.api('GET', '/api/auth/me', { token: 'jeton-historique' })).status, 200);
      const row = t.dbService.db.prepare('SELECT session_token FROM users WHERE id = ?').get('usr-legacy');
      assert.equal(row.session_token, null);
    } finally {
      await t.stop();
      for (const suffix of ['', '-wal', '-shm']) await fs.rm(dbPath + suffix, { force: true });
    }
  });

  test('TC-API-021 & 022 : CSP, en-têtes de sécurité, cache des fichiers statiques', async () => {
    const t = await startTestServer();
    try {
      const page = await fetch(t.base + '/');
      const csp = page.headers.get('content-security-policy');
      assert.match(csp, /default-src 'self'/);
      assert.match(csp, /script-src 'self'(;|$)/);
      assert.match(csp, /connect-src 'self'/);
      assert.match(csp, /frame-ancestors 'none'/);
      assert.doesNotMatch(csp, /googleapis|gstatic/, 'plus aucun hôte de polices tiers : elles sont hébergées');
      assert.match(csp, /font-src 'self'(;|$)/);
      assert.equal(page.headers.get('x-frame-options'), 'DENY');

      const js = await fetch(t.base + '/app.js');
      assert.equal(js.headers.get('cache-control'), 'no-cache');
      const etag = js.headers.get('etag');
      assert.ok(etag);
      const revalidated = await fetch(t.base + '/app.js', { headers: { 'If-None-Match': etag } });
      assert.equal(revalidated.status, 304);

      // Polices hébergées (design system Soleil) : type MIME correct, cache long car le nom porte la version
      const font = await fetch(t.base + '/fonts/public-sans-v21-latin.woff2');
      assert.equal(font.status, 200);
      assert.equal(font.headers.get('content-type'), 'font/woff2');
      assert.match(font.headers.get('cache-control'), /max-age=31536000, immutable/);
      assert.equal(Buffer.from(await font.arrayBuffer()).subarray(0, 4).toString(), 'wOF2');
    } finally {
      await t.stop();
    }
  });

  test('TC-API-023 : /api/rates relaie Frankfurter avec un cache de 6 h', async () => {
    let calls = 0;
    const ratesFetch = async () => {
      calls++;
      return { ok: true, json: async () => ({ base: 'EUR', date: '2026-10-23', rates: { USD: 1.09, CAD: 1.5 } }) };
    };
    const t = await startTestServer({ ratesFetch });
    try {
      const first = await t.api('GET', '/api/rates');
      assert.equal(first.status, 200);
      assert.equal(first.data.rates.USD, 1.09);
      await t.api('GET', '/api/rates');
      assert.equal(calls, 1);
      t.clock.value += 7 * 60 * 60 * 1000;
      await t.api('GET', '/api/rates');
      assert.equal(calls, 2);
    } finally {
      await t.stop();
    }
  });

  test('TC-API-024 : codes d\'accès à 6 chiffres, tirés dans [100000, 999999]', () => {
    const codes = new Set();
    for (let i = 0; i < 1000; i++) {
      const code = AuthService.generateCode();
      assert.match(code, /^[1-9]\d{5}$/);
      codes.add(code);
    }
    assert.ok(codes.size > 990, 'les codes doivent être quasi uniques sur 1000 tirages');
  });

  test('TC-API-024b : e-mail invalide refusé proprement (400)', async () => {
    const t = await startTestServer();
    try {
      assert.equal((await t.api('POST', '/api/auth/request-code', { body: { email: 'pas-un-email' } })).status, 400);
    } finally {
      await t.stop();
    }
  });
});
