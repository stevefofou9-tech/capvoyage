import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, readdirSync, readFileSync, appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { findChrome, launchBrowser } from './cdp.js';
import { startTestServer } from '../api/helpers.js';

const chromePath = findChrome();
const REAL_UI = fileURLToPath(new URL('../../src/ui/', import.meta.url));
const REAL_DOMAIN = fileURLToPath(new URL('../../src/domain/', import.meta.url));
const LEGACY = fileURLToPath(new URL('./fixtures/legacy/', import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));

function emptyDir(dir) {
  for (const name of readdirSync(dir)) rmSync(path.join(dir, name), { recursive: true, force: true });
}

// Mises à jour de l'application (TC-PWA, ADR-009) : Service Worker réels dans Chrome headless.
describe('Suite Mises à jour PWA (TC-PWA, Chrome headless via CDP)', { skip: chromePath ? false : 'Chrome introuvable (définir CHROME_PATH)' }, () => {
  let browser;
  const cleanups = [];

  before(async () => {
    browser = await launchBrowser(chromePath);
  });

  after(async () => {
    await browser?.close();
    for (const fn of cleanups) await fn();
  });

  // Serveur dont les fichiers du front peuvent être « redéployés » pendant le test
  async function startDeployable(initial) {
    const root = mkdtempSync(path.join(os.tmpdir(), 'capvoyage-deploy-'));
    const uiDir = path.join(root, 'ui');
    const domainDir = path.join(root, 'domain');
    mkdirSync(uiDir);
    mkdirSync(domainDir);
    const deploy = (kind) => {
      emptyDir(uiDir);
      emptyDir(domainDir);
      cpSync(kind === 'legacy' ? LEGACY : REAL_UI, uiDir, { recursive: true, filter: src => kind === 'legacy' || !src.includes('fixtures') });
      cpSync(REAL_DOMAIN, domainDir, { recursive: true });
    };
    deploy(initial);
    const server = await startTestServer({ uiDir, domainDir });
    cleanups.push(async () => {
      await server.stop();
      try { rmSync(root, { recursive: true, force: true }); } catch (e) { /* verrouillé sous Windows */ }
    });
    return { server, uiDir, domainDir, deploy };
  }

  test('TC-PWA-001 : un ancien client (SW v5 cache-first) passe à la nouvelle version sans action manuelle', async () => {
    const { server, deploy } = await startDeployable('legacy');
    const page = await browser.newPage();
    await page.goto(server.base + '/');
    await page.until(`navigator.serviceWorker.getRegistration().then(r => r && r.active && r.active.state === 'activated')`);
    await page.waitFor(`document.body.dataset.front === 'legacy'`);
    await sleep(500);

    // « Déploiement » : le serveur sert désormais la version actuelle ; le navigateur revérifie sw.js
    deploy('current');
    await page.evaluate(`navigator.serviceWorker.getRegistration().then(r => r.update()); true`);

    // Le nouveau SW s'active, constate que la page ne répond pas au PING et la recharge une fois
    await page.waitFor(`document.getElementById('update-banner') !== null`, 20000);
    assert.equal(await page.evaluate(`document.body.dataset.front === 'legacy'`), false);
    assert.ok(await page.evaluate(`caches.keys().then(k => k.includes('capvoyage-cache-v9') && !k.includes('capvoyage-cache-v5'))`));
  });

  test('TC-PWA-002 : nouvelle version détectée → barre « Actualiser », jamais de rechargement pendant une saisie', async () => {
    const { server, uiDir } = await startDeployable('current');
    const page = await browser.newPage();
    await page.setViewport(1280, 800);
    await page.goto(server.base + '/');
    await page.evaluate(`localStorage.clear(); true`);
    await page.goto(server.base + '/');
    await page.evaluate(`document.getElementById('btn-hero-demo').click(); true`);
    await page.waitFor(`document.getElementById('view-app').classList.contains('active') && /build/.test(document.getElementById('profile-version-label').textContent)`);
    assert.equal(await page.evaluate(`document.getElementById('update-banner').hidden`), true);

    // Nouvelle publication côté serveur
    appendFileSync(path.join(uiDir, 'style.css'), '\n/* publication */\n');
    await page.evaluate(`window.__marker = 'avant'; document.getElementById('user-display-pill').click(); true`);
    await page.waitFor(`document.getElementById('dialog-user-profile').open`);
    await page.evaluate(`document.dispatchEvent(new Event('visibilitychange')); true`);
    await page.waitFor(`document.getElementById('update-banner').hidden === false`);
    await sleep(800);
    assert.equal(await page.evaluate(`window.__marker`), 'avant', 'la page ne doit pas se recharger pendant qu\'une fenêtre est ouverte');

    // Fenêtre fermée : retour au premier plan → rechargement discret
    await page.evaluate(`document.getElementById('dialog-user-profile').close(); document.activeElement.blur(); document.dispatchEvent(new Event('visibilitychange')); true`);
    await page.waitFor(`window.__marker === undefined`, 15000);
    await page.waitFor(`document.getElementById('view-app').classList.contains('active')`);
    assert.equal(await page.evaluate(`document.getElementById('update-banner').hidden`), true);

    // Clic explicite sur « Actualiser » (une fenêtre ouverte empêche le rechargement silencieux)
    appendFileSync(path.join(uiDir, 'style.css'), '\n/* publication 2 */\n');
    await page.evaluate(`window.__marker = 'avant2'; document.getElementById('user-display-pill').click(); true`);
    await page.waitFor(`document.getElementById('dialog-user-profile').open`);
    await page.evaluate(`document.dispatchEvent(new Event('visibilitychange')); true`);
    await page.waitFor(`document.getElementById('update-banner').hidden === false`);
    await page.evaluate(`document.getElementById('btn-update-now').click(); true`);
    await page.waitFor(`window.__marker === undefined`, 15000);
  });

  test('TC-PWA-003 : un fichier du précache en 404 n\'empêche pas l\'installation du Service Worker', async () => {
    const { server, domainDir } = await startDeployable('current');
    rmSync(path.join(domainDir, 'IcsService.js'));
    const swSource = readFileSync(path.join(REAL_UI, 'sw.js'), 'utf-8');
    const assetCount = (swSource.match(/^\s+'\/[^']*',?$/gm) || []).length;
    const page = await browser.newPage();
    await page.goto(server.base + '/health');
    await page.evaluate(`navigator.serviceWorker.register('/sw.js').then(() => true)`);
    await page.until(`navigator.serviceWorker.getRegistration().then(r => r && r.active && r.active.state === 'activated')`, 15000);
    const cached = await page.evaluate(`caches.open('capvoyage-cache-v9').then(c => c.keys()).then(k => k.length)`);
    assert.equal(cached, assetCount - 1, `précache : ${cached} fichiers sur ${assetCount - 1} attendus`);
  });

  test('TC-PWA-004 : /reset supprime le Service Worker et les caches de l\'app mais conserve les données locales', async () => {
    const { server } = await startDeployable('current');
    const page = await browser.newPage();
    await page.goto(server.base + '/');
    await page.evaluate(`localStorage.clear(); true`);
    await page.goto(server.base + '/');
    await page.evaluate(`document.getElementById('btn-hero-demo').click(); true`);
    await page.waitFor(`document.getElementById('view-app').classList.contains('active') && document.querySelector('.day-pill')`);
    await page.until(`navigator.serviceWorker.getRegistration().then(r => r && r.active)`);
    await page.evaluate(`localStorage.setItem('capvoyage_pending_test', 'modification en attente'); true`);
    const before = await page.evaluate(`Object.keys(localStorage).sort()`);

    await page.goto(server.base + '/reset?noredirect=1');
    await page.waitFor(`document.getElementById('reset-status').textContent.includes('Terminé')`);
    assert.equal(await page.evaluate(`navigator.serviceWorker.getRegistrations().then(r => r.length)`), 0);
    assert.deepEqual(await page.evaluate(`caches.keys().then(k => k.filter(x => x.startsWith('capvoyage-cache-')))`), []);
    assert.deepEqual(await page.evaluate(`Object.keys(localStorage).sort()`), before);
    assert.equal(await page.evaluate(`localStorage.getItem('capvoyage_pending_test')`), 'modification en attente');
  });

  test('TC-PWA-005 : /api/version change quand le front change ; /reset est servi', async () => {
    const { server, uiDir } = await startDeployable('current');
    const first = await server.api('GET', '/api/version');
    assert.equal(first.status, 200);
    assert.match(first.data.build, /^[0-9a-f]{10}$/);
    assert.equal(first.headers.get('cache-control'), 'no-store');
    assert.equal((await server.api('GET', '/api/version')).data.build, first.data.build);
    appendFileSync(path.join(uiDir, 'app.js'), '\n// publication\n');
    assert.notEqual((await server.api('GET', '/api/version')).data.build, first.data.build);
    const reset = await fetch(server.base + '/reset');
    assert.equal(reset.status, 200);
    assert.match(await reset.text(), /Actualisation de CapVoyage/);
  });

  test('TC-PWA-006 : cache HTTP empoisonné par l ancienne politique (max-age) → purgé en une visite, données locales conservées', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'capvoyage-poison-'));
    const uiDir = path.join(root, 'ui');
    mkdirSync(uiDir);
    cpSync(REAL_DOMAIN, path.join(root, 'domain'), { recursive: true });
    writeFileSync(path.join(uiDir, 'index.html'), '<!DOCTYPE html><html><body><script src="app.js"></script></body></html>');
    writeFileSync(path.join(uiDir, 'reset.html'), '<!DOCTYPE html><html><body>reset</body></html>');
    const writeApp = (v) => writeFileSync(path.join(uiDir, 'app.js'), `document.documentElement.dataset.v = '${v}';`);
    let legacy = true;
    writeApp('ancien');
    const server = await startTestServer({ uiDir, domainDir: path.join(root, 'domain'), legacyStaticCaching: () => legacy });
    cleanups.push(async () => {
      await server.stop();
      try { rmSync(root, { recursive: true, force: true }); } catch (e) { /* verrouillé sous Windows */ }
    });

    const page = await browser.newPage();
    await page.goto(server.base + '/');
    await page.waitFor(`document.documentElement.dataset.v === 'ancien'`);
    await page.evaluate(`localStorage.setItem('capvoyage_sentinelle', 'mes données'); true`);

    // L'ancien serveur a fait mettre app.js en cache 24 h : une nouvelle version n'est pas vue (le bug)
    writeApp('nouveau');
    await page.goto(server.base + '/');
    await page.waitFor(`document.documentElement.dataset.v`);
    assert.equal(await page.evaluate(`document.documentElement.dataset.v`), 'ancien', 'le cache HTTP empoisonné doit être reproduit');

    // Nouveau serveur : la première page HTML demande la purge du cache HTTP
    legacy = false;
    await page.goto(server.base + '/');
    await page.waitFor(`document.documentElement.dataset.v === 'nouveau'`, 10000);
    assert.equal(await page.evaluate(`localStorage.getItem('capvoyage_sentinelle')`), 'mes données');

    // Une seule fois par navigateur : avec le cookie, plus de purge (pas de coût à chaque page)
    const withCookie = await fetch(server.base + '/', { headers: { cookie: 'cv_cache=2026-10-23' } });
    const withoutCookie = await fetch(server.base + '/');
    assert.equal(withCookie.headers.get('clear-site-data'), null);
    assert.equal(withoutCookie.headers.get('clear-site-data'), '"cache"');
    assert.match(withoutCookie.headers.get('set-cookie'), /cv_cache=2026-10-23/);
    // jamais de directive « storage » : le localStorage ne doit pas être effacé
    assert.ok(!/storage/.test(withoutCookie.headers.get('clear-site-data')));
    // /reset purge toujours, même avec le cookie
    const reset = await fetch(server.base + '/reset', { headers: { cookie: 'cv_cache=2026-10-23' } });
    assert.equal(reset.headers.get('clear-site-data'), '"cache"');
  });
});
