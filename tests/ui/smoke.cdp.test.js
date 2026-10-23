import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { findChrome, launchBrowser } from './cdp.js';
import { startTestServer } from '../api/helpers.js';

const chromePath = findChrome();
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Parcours navigateur réels (TC-UI-004 à 009). Ignorés si aucun Chrome n'est disponible ;
// la CI installe Chrome et définit CHROME_PATH.
describe('Suite Parcours Navigateur (TC-UI, Chrome headless via CDP)', { skip: chromePath ? false : 'Chrome introuvable (définir CHROME_PATH)' }, () => {
  let server;
  let browser;

  before(async () => {
    server = await startTestServer();
    browser = await launchBrowser(chromePath);
  });

  after(async () => {
    await browser?.close();
    await server?.stop();
  });

  test('TC-UI-004 : landing → clic « Commencer » ouvre la connexion, sans erreur JS', async () => {
    const page = await browser.newPage();
    await page.goto(server.base + '/');
    await page.waitFor(`document.getElementById('btn-hero-start')?.onclick`);
    await page.evaluate(`document.getElementById('btn-hero-start').click()`);
    await page.waitFor(`document.getElementById('dialog-login').open`);
    assert.deepEqual(page.errors, []);
  });

  test('TC-UI-005 : démo → ajout d\'activité local, aucune écriture serveur', async () => {
    const page = await browser.newPage();
    await page.goto(server.base + '/');
    await page.evaluate(`localStorage.clear(); true`);
    await page.goto(server.base + '/');
    await page.evaluate(`(() => {
      window.__writes = [];
      const original = window.fetch;
      window.fetch = (url, opts = {}) => {
        if ((opts.method || 'GET') !== 'GET') window.__writes.push(String(url));
        return original(url, opts);
      };
      document.getElementById('btn-hero-demo').click();
      return true;
    })()`);
    await page.waitFor(`document.getElementById('view-app').classList.contains('active') && document.querySelector('.day-pill')`);
    await page.evaluate(`(() => {
      document.getElementById('input-quick-activity-title').value = 'Marché de Mboppi';
      document.getElementById('form-quick-add-activity').requestSubmit();
      return true;
    })()`);
    await page.waitFor(`(localStorage.getItem('capvoyage_demo_trip') || '').includes('Marché de Mboppi')`);
    assert.deepEqual(await page.evaluate(`window.__writes`), []);
    assert.equal((await server.api('GET', '/api/trip')).data.days.some(d => d.activities.some(a => a.title === 'Marché de Mboppi')), false);
    assert.deepEqual(page.errors, []);
  });

  test('TC-UI-006 & 007 : 375 px → pas de débordement, en-tête ≤ 25 %, cibles ≥ 44 px', async () => {
    const page = await browser.newPage();
    await page.setViewport(375, 812, true);
    await page.goto(server.base + '/');
    await page.evaluate(`document.getElementById('btn-hero-demo').click(); true`);
    await page.waitFor(`document.getElementById('view-app').classList.contains('active') && document.querySelector('.activity-card')`);
    await sleep(300);

    const metrics = await page.evaluate(`(() => {
      const de = document.documentElement;
      const widths = {};
      for (const tab of ['tab-planning', 'tab-todos', 'tab-budget', 'tab-contacts']) {
        document.querySelector('.mobile-nav-btn[data-tab="' + tab + '"]').click();
        widths[tab] = de.scrollWidth;
      }
      document.querySelector('.mobile-nav-btn[data-tab="tab-planning"]').click();
      const small = [...document.querySelectorAll('#view-app button, #view-app a[href], #view-app input, #view-app select')]
        .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 44 && !el.closest('dialog'); })
        .map(el => (el.id || el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().height));
      return {
        clientWidth: de.clientWidth,
        widths,
        headerRatio: document.querySelector('.app-header').getBoundingClientRect().height / window.innerHeight,
        bottomNav: getComputedStyle(document.querySelector('.mobile-bottom-nav')).display,
        small
      };
    })()`);

    for (const [tab, width] of Object.entries(metrics.widths)) {
      assert.ok(width <= metrics.clientWidth, `${tab} déborde : ${width}px > ${metrics.clientWidth}px`);
    }
    assert.ok(metrics.headerRatio <= 0.25, `en-tête trop haut : ${Math.round(metrics.headerRatio * 100)} %`);
    assert.equal(metrics.bottomNav, 'flex');
    assert.deepEqual(metrics.small, []);
  });

  test('TC-UI-008 : lien partagé « Programme seul » → lecture seule, onglets masqués', async () => {
    const token = await server.login('lecteur.ui@example.com');
    await server.createTrip(token);
    const { data } = await server.api('PUT', '/api/trip/sharing', { token, body: { enabled: true } });

    const page = await browser.newPage();
    await page.goto(`${server.base}/?share=${data.sharing.token}`);
    await page.waitFor(`document.querySelector('.day-pill')`);
    const view = await page.evaluate(`(() => ({
      banner: getComputedStyle(document.getElementById('readonly-banner')).display,
      tabs: [...document.querySelectorAll('.tab-btn')].filter(b => !b.hidden).map(b => b.dataset.tab),
      quickAdd: getComputedStyle(document.querySelector('.quick-add-bar-wrapper')).display
    }))()`);
    assert.equal(view.banner, 'flex');
    assert.deepEqual(view.tabs, ['tab-planning']);
    assert.equal(view.quickAdd, 'none');
  });

  test('TC-UI-009 : hors-ligne → « En attente de synchro » puis « Enregistré » au retour du réseau', async () => {
    const token = await server.login('nomade.ui@example.com');
    await server.createTrip(token);

    const page = await browser.newPage();
    await page.goto(server.base + '/');
    await page.evaluate(`localStorage.clear(); localStorage.setItem('capvoyage_session', JSON.stringify({ token: ${JSON.stringify(token)}, email: 'nomade.ui@example.com', isDemo: false })); true`);
    await page.goto(server.base + '/');
    await page.waitFor(`document.getElementById('sync-indicator') && !document.getElementById('sync-indicator').hidden`);

    await page.evaluate(`(() => {
      window.__realFetch = window.fetch;
      window.fetch = (url, opts = {}) => (String(url).startsWith('/api/trip') && opts.method === 'POST')
        ? Promise.reject(new TypeError('Failed to fetch'))
        : window.__realFetch(url, opts);
      document.getElementById('input-quick-activity-title').value = 'Taxi-moto hors-ligne';
      document.getElementById('form-quick-add-activity').requestSubmit();
      return true;
    })()`);
    await page.waitFor(`document.getElementById('sync-indicator').dataset.status === 'pending'`);

    await page.evaluate(`window.fetch = window.__realFetch; window.dispatchEvent(new Event('online')); true`);
    await page.waitFor(`document.getElementById('sync-indicator').dataset.status === 'saved'`);

    const serverTrip = (await server.api('GET', '/api/trip', { token })).data;
    assert.ok(JSON.stringify(serverTrip).includes('Taxi-moto hors-ligne'));
  });
});
