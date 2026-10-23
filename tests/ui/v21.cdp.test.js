import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { findChrome, launchBrowser } from './cdp.js';
import { startTestServer } from '../api/helpers.js';

const chromePath = findChrome();
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Horloge figée : 8 novembre 2026, 10:30 UTC = 11:30 à Douala (jour 8 du séjour démo)
const FROZEN_CLOCK = `(() => {
  const FIXED = new Date('2026-11-08T10:30:00Z').getTime();
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...args) { if (args.length) super(...args); else super(FIXED); }
    static now() { return FIXED; }
  }
  window.Date = FakeDate;
})();`;

describe('Suite Ergonomie v2.1 (TC-UX, TC-IDEA, TC-QS, TC-CTX, TC-NOW, Chrome headless)', { skip: chromePath ? false : 'Chrome introuvable (définir CHROME_PATH)' }, () => {
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

  async function openDemo({ width = 375, height = 812, clock = false } = {}) {
    const page = await browser.newPage();
    if (clock) await page.addInitScript(FROZEN_CLOCK);
    await page.setViewport(width, height, width < 768);
    await page.goto(server.base + '/');
    await page.evaluate(`localStorage.clear(); true`);
    await page.goto(server.base + '/');
    await page.evaluate(`document.getElementById('btn-hero-demo').click(); true`);
    await page.waitFor(`document.getElementById('view-app').classList.contains('active') && document.querySelector('.day-pill')`);
    await sleep(250);
    return page;
  }

  test('TC-UX-001/002/003/005/006 : 375 px → en-tête sobre, menu « ⋯ », pas de doublon de navigation', async () => {
    const page = await openDemo();
    const m = await page.evaluate(`(() => {
      const header = document.querySelector('.app-header');
      const visible = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'; };
      const controls = [...header.querySelectorAll('button, a[href], input, select, #btn-header-home')].filter(visible);
      const rects = controls.map(el => el.getBoundingClientRect());
      let overlap = false;
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlap = true;
      }
      const textOverflow = [...header.querySelectorAll('h1, .trip-meta')].some(el => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis');
      return {
        ratio: header.getBoundingClientRect().height / innerHeight,
        count: controls.length,
        ids: controls.map(el => el.id || el.className),
        overlap,
        textOverflow,
        topTabs: getComputedStyle(document.querySelector('.nav-tabs')).display,
        bottomTabs: [...document.querySelectorAll('.mobile-nav-btn')].filter(visible).length,
        scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
        labelWords: controls.filter(el => el.tagName === 'BUTTON').map(el => el.textContent.replace(/[^\\p{L}\\p{N} ]/gu, ' ').trim().split(/\\s+/).filter(Boolean).length)
      };
    })()`);
    assert.ok(m.ratio <= 0.15, `en-tête ${Math.round(m.ratio * 100)} % de l'écran`);
    assert.ok(m.count <= 4, `${m.count} contrôles dans l'en-tête : ${m.ids.join(', ')}`);
    assert.equal(m.overlap, false, 'éléments de l\'en-tête qui se chevauchent');
    assert.equal(m.textOverflow, false);
    assert.equal(m.topTabs, 'none');
    assert.equal(m.bottomTabs, 4);
    assert.ok(m.scrollW <= m.clientW);
    assert.ok(m.labelWords.every(n => n <= 2), `libellés trop longs : ${m.labelWords}`);

    // Menu « ⋯ »
    await page.evaluate(`document.getElementById('btn-header-menu').click(); true`);
    const menu = await page.evaluate(`(() => {
      const items = [...document.querySelectorAll('#header-menu [role="menuitem"]')];
      return { hidden: document.getElementById('header-menu').hidden, labels: items.map(i => i.textContent.trim()), minH: Math.min(...items.map(i => i.getBoundingClientRect().height)), expanded: document.getElementById('btn-header-menu').getAttribute('aria-expanded') };
    })()`);
    assert.equal(menu.hidden, false);
    assert.equal(menu.expanded, 'true');
    assert.equal(menu.labels.length, 5);
    assert.ok(menu.minH >= 44);
    for (const word of ['Partager', 'Nouveau', 'Profil', 'Déconnexion']) {
      assert.ok(menu.labels.some(l => l.includes(word)), `${word} absent du menu`);
    }
    await page.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); true`);
    assert.equal(await page.evaluate(`document.getElementById('header-menu').hidden`), true);
    await page.evaluate(`document.getElementById('btn-header-menu').click(); document.body.click(); true`);
    assert.equal(await page.evaluate(`document.getElementById('header-menu').hidden`), true);

    // « Partager » ouvre la fenêtre de partage depuis le menu
    await page.evaluate(`document.getElementById('btn-header-menu').click(); document.querySelector('[data-menu-action="profile"]').click(); true`);
    await page.waitFor(`document.getElementById('dialog-user-profile').open`);
    assert.deepEqual(page.errors, []);
  });

  test('TC-UX-004 : 1280 px → barre d\'onglets haute conservée, pas de menu « ⋯ »', async () => {
    const page = await openDemo({ width: 1280, height: 800 });
    const m = await page.evaluate(`(() => ({
      top: getComputedStyle(document.querySelector('.nav-tabs')).display,
      bottom: getComputedStyle(document.querySelector('.mobile-bottom-nav')).display,
      menu: getComputedStyle(document.querySelector('.header-menu-wrap')).display,
      share: getComputedStyle(document.getElementById('btn-header-share')).display
    }))()`);
    assert.notEqual(m.top, 'none');
    assert.equal(m.bottom, 'none');
    assert.equal(m.menu, 'none');
    assert.notEqual(m.share, 'none');
  });

  test('TC-UX-007 : au plus un bouton primaire par fenêtre de dialogue', async () => {
    const page = await openDemo({ width: 1280, height: 800 });
    // Un formulaire = un écran : on compte les boutons primaires par formulaire (ou par dialogue sans formulaire)
    const offenders = await page.evaluate(`(() => {
      const groups = new Map();
      document.querySelectorAll('dialog .btn-primary').forEach(b => {
        const scope = b.closest('form') || b.closest('dialog');
        groups.set(scope, (groups.get(scope) || 0) + 1);
      });
      return [...groups].filter(([, n]) => n > 1).map(([el, n]) => [el.id || el.className, n]);
    })()`);
    assert.deepEqual(offenders, []);
  });

  test('TC-IDEA-UI : ajouter aux idées puis placer sur un jour', async () => {
    const page = await openDemo();
    await page.evaluate(`(() => {
      document.getElementById('input-quick-activity-title').value = 'Restaurant de poisson à Kribi';
      document.getElementById('btn-quick-add-idea').click();
      return true;
    })()`);
    await page.waitFor(`document.getElementById('ideas-count').textContent === '1'`);
    const before = await page.evaluate(`JSON.parse(localStorage.getItem('capvoyage_demo_trip'))`);
    assert.equal(before.ideas.length, 1);
    assert.ok(before.days.every(d => !(d.activities || []).some(a => a.title === 'Restaurant de poisson à Kribi')));
    assert.equal(await page.evaluate(`document.getElementById('ideas-panel').open`), true);

    await page.evaluate(`document.querySelector('.btn-place-idea').click(); true`);
    await page.waitFor(`document.getElementById('dialog-place-idea').open`);
    await page.evaluate(`(() => { document.getElementById('place-idea-day').value = '6'; document.getElementById('form-place-idea').requestSubmit(); return true; })()`);
    await page.waitFor(`document.getElementById('ideas-count').textContent === '0'`);
    const after = await page.evaluate(`JSON.parse(localStorage.getItem('capvoyage_demo_trip'))`);
    assert.equal(after.ideas.length, 0);
    assert.ok(after.days.find(d => d.dayNumber === 6).activities.some(a => a.title === 'Restaurant de poisson à Kribi'));
    assert.ok(await page.evaluate(`[...document.querySelectorAll('.activity-card')].some(c => c.textContent.includes('Restaurant de poisson'))`));
    assert.deepEqual(page.errors, []);
  });

  test('TC-QS-005/006/007/008 : tâche cochée en un tap, sans ouvrir la fiche, annulable', async () => {
    const page = await openDemo();
    await page.evaluate(`document.querySelector('.mobile-nav-btn[data-tab="tab-todos"]').click(); true`);
    await page.waitFor(`document.querySelector('.todo-status-btn')`);
    const first = await page.evaluate(`(() => {
      const btn = document.querySelector('.todo-item-card:not(.is-done) .todo-status-btn');
      const r = btn.getBoundingClientRect();
      return { w: r.width, h: r.height, title: btn.closest('.todo-item-card').querySelector('.todo-title').textContent };
    })()`);
    assert.ok(first.h >= 44 && first.w >= 44, `cible ${first.w}x${first.h}`);

    await page.evaluate(`document.querySelector('.todo-item-card:not(.is-done) .todo-status-btn').click(); true`);
    await page.waitFor(`(JSON.parse(localStorage.getItem('capvoyage_demo_trip')).todos || []).some(t => t.status === 'Fait')`);
    assert.equal(await page.evaluate(`!!document.querySelector('dialog[open]')`), false, 'la fiche ne doit pas s\'ouvrir');
    assert.ok(await page.evaluate(`!!document.querySelector('.toast-undo-btn')`));
    const doneBefore = await page.evaluate(`JSON.parse(localStorage.getItem('capvoyage_demo_trip')).todos.filter(t => t.status === 'Fait').length`);

    await page.evaluate(`document.querySelector('.toast-undo-btn').click(); true`);
    await page.waitFor(`JSON.parse(localStorage.getItem('capvoyage_demo_trip')).todos.filter(t => t.status === 'Fait').length === ${doneBefore - 1}`);

    // Le reste de la tuile ouvre toujours la fiche
    await page.evaluate(`document.querySelector('.todo-item-card .todo-title').click(); true`);
    await page.waitFor(`document.getElementById('dialog-edit-todo').open`);
    assert.deepEqual(page.errors, []);
  });

  test('TC-QS-003 + TC-NOW-UI : horloge au jour 8 → ouverture sur le jour 8, ✓ jour courant seulement, rappel', async () => {
    const page = await openDemo({ clock: true });
    assert.equal(await page.evaluate(`document.querySelector('.day-pill.active .day-pill-number').textContent`), 'Jour 8');

    // Une activité à 13:00 aujourd'hui (11:30 à Douala) -> « Prochaine : … dans 1 h 30 »
    await page.evaluate(`(() => {
      const trip = JSON.parse(localStorage.getItem('capvoyage_demo_trip'));
      const day8 = trip.days.find(d => d.dayNumber === 8);
      day8.activities = [{ id: 'act-nowtest', dayId: day8.id, title: 'Déjeuner chez Paul', category: 'Famille', time: '13:00', location: '', contactIds: [], status: 'À planifier', notes: '', createdAt: '2026-11-01T00:00:00Z' }];
      const day12 = trip.days.find(d => d.dayNumber === 12);
      day12.activities = [{ id: 'act-futur', dayId: day12.id, title: 'Activité future', category: 'Autre', time: '', location: '', contactIds: [], status: 'À planifier', notes: '', createdAt: '2026-11-01T00:00:00Z' }];
      localStorage.setItem('capvoyage_demo_trip', JSON.stringify(trip));
      return true;
    })()`);
    await page.goto(server.base + '/');
    await page.waitFor(`document.querySelector('.activity-card')`);
    const banner = await page.evaluate(`document.getElementById('next-activity-banner').textContent`);
    assert.match(banner, /Prochaine : Déjeuner chez Paul dans 1 h 30/);

    assert.equal(await page.evaluate(`!!document.querySelector('.activity-card .btn-done-act')`), true);
    await page.evaluate(`document.querySelector('.activity-card .btn-done-act').click(); true`);
    await page.waitFor(`JSON.parse(localStorage.getItem('capvoyage_demo_trip')).days.find(d => d.dayNumber === 8).activities[0].status === 'Effectué'`);

    // Jour futur : aucun bouton ✓
    await page.evaluate(`[...document.querySelectorAll('.day-pill')].find(p => p.textContent.includes('Jour 12')).click(); true`);
    await page.waitFor(`[...document.querySelectorAll('.activity-card')].some(c => c.textContent.includes('Activité future'))`);
    assert.equal(await page.evaluate(`!!document.querySelector('.activity-card .btn-done-act')`), false);
    assert.deepEqual(page.errors, []);
  });

  test('TC-CTX-UI2 : sélecteur de contacts avec recherche et création', async () => {
    const page = await openDemo();
    await page.waitFor(`document.querySelector('.activity-card')`);
    await page.evaluate(`document.querySelector('.activity-card').click(); true`);
    await page.waitFor(`document.getElementById('dialog-activity-enrich').open`);
    assert.equal(await page.evaluate(`document.querySelectorAll('#edit-activity-contacts-list input[type="checkbox"]').length`), 0);
    await page.evaluate(`document.querySelector('.contact-chip-add').click(); true`);
    await page.waitFor(`document.getElementById('dialog-contact-picker').open`);
    await page.evaluate(`(() => { const s = document.getElementById('contact-picker-search'); s.value = 'Zébulon Nouveau'; s.dispatchEvent(new Event('input')); return true; })()`);
    await page.waitFor(`document.querySelector('.picker-create')`);
    await page.evaluate(`document.querySelector('.picker-create').click(); true`);
    await page.waitFor(`[...document.querySelectorAll('.picker-item[aria-pressed="true"]')].some(el => el.textContent.includes('Zébulon'))`);
    await page.evaluate(`document.getElementById('btn-contact-picker-done').click(); true`);
    await page.waitFor(`!document.getElementById('dialog-contact-picker').open`);
    assert.ok(await page.evaluate(`document.getElementById('edit-activity-contacts-list').textContent.includes('Zébulon Nouveau')`));
    await page.evaluate(`document.getElementById('form-enrich-activity').requestSubmit(); true`);
    await page.waitFor(`JSON.parse(localStorage.getItem('capvoyage_demo_trip')).contacts.some(c => c.name === 'Zébulon Nouveau')`);
    assert.deepEqual(page.errors, []);
  });

  test('TC-CTX-UI1/3 : import vCard puis tri (Famille, Ignorer), saisie en lot, pas de bouton natif', async () => {
    const page = await openDemo();
    await page.evaluate(`document.querySelector('.mobile-nav-btn[data-tab="tab-contacts"]').click(); true`);
    const countBefore = await page.evaluate(`JSON.parse(localStorage.getItem('capvoyage_demo_trip')).contacts.length`);
    await page.evaluate(`document.getElementById('btn-import-native-contacts').click(); true`);
    await page.waitFor(`document.getElementById('dialog-import-contacts').open`);
    assert.equal(await page.evaluate(`document.getElementById('btn-import-native').hidden`), true, 'le sélecteur natif n\'existe pas sur Chrome headless');

    await page.evaluate(`(() => {
      const vcf = ['Tante Alice', 'Cousine Brigitte', 'Chauffeur Jean'].map((n, i) => 'BEGIN:VCARD\\nVERSION:3.0\\nFN:' + n + '\\nTEL:+23760000000' + i + '\\nEND:VCARD').join('\\n');
      const input = document.getElementById('import-vcf-file');
      const dt = new DataTransfer();
      dt.items.add(new File([vcf], 'contacts.vcf', { type: 'text/vcard' }));
      input.files = dt.files;
      input.dispatchEvent(new Event('change'));
      return true;
    })()`);
    await page.waitFor(`document.querySelectorAll('#import-sort-list .import-row').length === 3`);
    await page.evaluate(`(() => {
      const rows = document.querySelectorAll('#import-sort-list .import-row');
      rows[1].querySelector('.rel-chip[data-rel="Famille"]').click();
      return true;
    })()`);
    await page.evaluate(`document.querySelectorAll('#import-sort-list .import-row')[2].querySelector('.btn-ignore-row').click(); true`);
    assert.equal(await page.evaluate(`document.getElementById('btn-import-confirm').textContent`), 'Ajouter 2 contacts');
    await page.evaluate(`document.getElementById('btn-import-confirm').click(); true`);
    await page.waitFor(`JSON.parse(localStorage.getItem('capvoyage_demo_trip')).contacts.length === ${countBefore + 2}`);
    const added = await page.evaluate(`JSON.parse(localStorage.getItem('capvoyage_demo_trip')).contacts.slice(-2).map(c => [c.name, c.relationship])`);
    assert.deepEqual(added, [['Tante Alice', 'Amis'], ['Cousine Brigitte', 'Famille']]);

    // Saisie en lot
    await page.evaluate(`document.getElementById('btn-import-native-contacts').click(); true`);
    await page.waitFor(`document.getElementById('dialog-import-contacts').open && !document.getElementById('import-sources').hidden`);
    await page.evaluate(`(() => { document.getElementById('import-bulk-text').value = 'Marie, 699001122\\nTante Alice'; document.getElementById('btn-import-bulk').click(); return true; })()`);
    await page.waitFor(`document.querySelectorAll('#import-sort-list .import-row').length === 2`);
    // « Tante Alice » existe déjà : marquée doublon et ignorée par défaut
    assert.equal(await page.evaluate(`document.querySelectorAll('#import-sort-list .import-row.is-ignored').length`), 1);
    assert.deepEqual(page.errors, []);
  });
});
