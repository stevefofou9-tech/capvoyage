import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { findChrome, launchBrowser } from './cdp.js';
import { startTestServer } from '../api/helpers.js';

const chromePath = findChrome();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const WIDTHS = [320, 360, 390, 430, 1280];

// Mise en page du design system Soleil (ADR-010, phase 5) : voyage de démo enrichi de textes et de montants
// extrêmes, chaque écran et chaque fenêtre à cinq largeurs. Ce test aurait attrapé les débordements de l'ancienne interface.
const STRESS = `(() => {
  const key = 'capvoyage_demo_trip';
  const trip = JSON.parse(localStorage.getItem(key));
  const long = 'Déjeuner de retrouvailles avec toute la famille élargie chez Tante Rose à New Bell';
  trip.contacts.push({ id: 'ct-stress', name: 'Jean-Baptiste Nkoulou-Mbarga', relationship: 'Famille', city: 'Douala', phone: '+237 6 50 00 00 09', notes: 'Une note de contact assez longue pour vérifier la coupe du texte dans la liste.', archived: false });
  const day = trip.days[0];
  day.activities.push({ id: 'act-stress', title: long, time: '15:00', location: 'Quartier New Bell, derrière le grand marché central de Douala', category: 'Famille', status: 'Confirmé', contactIds: ['ct-stress'], notes: 'Une note très longue.', createdAt: new Date().toISOString() });
  trip.expenses.push({ id: 'exp-stress', label: 'Acompte de réservation de la maison de Kribi pour trois semaines', amount: 1250000, currency: 'XAF', category: 'Hébergement', date: '2026-11-03', convertedBaseAmount: 1905.6 });
  trip.todos.push({ id: 'todo-stress', title: 'Faire traduire et légaliser tous les documents administratifs nécessaires au visa', category: 'Formalités', priority: 'Haute', status: 'À faire', notes: 'Prévoir plusieurs semaines de délai auprès de la préfecture.' });
  trip.title = 'Grand voyage en famille au Cameroun : Douala, Yaoundé et Kribi';
  localStorage.setItem(key, JSON.stringify(trip));
  return true;
})()`;

// Mesure : page plus large que l'écran, éléments hors cadre, cibles tactiles sous 44 px (hors défilements horizontaux voulus)
const MEASURE = `(() => {
  const scrollers = '.day-selector, .filter-pills-row, .filter-pills, .ribbon-items-scroll';
  const openDialog = document.querySelector('dialog[open]');
  const root = openDialog ? openDialog.querySelector('.dialog-content') : document.getElementById('view-app');
  const out = { page: document.documentElement.scrollWidth - document.documentElement.clientWidth, out: [], tap: [] };
  const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  root.querySelectorAll('*').forEach(el => {
    if (el.closest('svg') || el.closest(scrollers) || el.classList.contains('sr-only') || !vis(el)) return;
    const r = el.getBoundingClientRect();
    if (r.right > innerWidth + 1 || r.left < -1) out.out.push((el.id || el.className || el.tagName).toString().slice(0, 40) + ' ' + Math.round(r.left) + '→' + Math.round(r.right));
    if ((el.tagName === 'BUTTON' || el.tagName === 'A') && r.height < 43.5 && !el.closest('.header-menu[hidden]')) out.tap.push((el.id || el.className || el.tagName).toString().slice(0, 40) + ' ' + Math.round(r.height));
  });
  out.out = [...new Set(out.out)].slice(0, 6);
  out.tap = [...new Set(out.tap)].slice(0, 6);
  return out;
})()`;

describe('Suite Mise en page Soleil (TC-LAY, Chrome headless via CDP)', { skip: chromePath ? false : 'Chrome introuvable (définir CHROME_PATH)' }, () => {
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

  async function openStressedDemo(width) {
    const page = await browser.newPage();
    await page.setViewport(width, 800, width < 768);
    await page.goto(server.base + '/');
    await page.evaluate(`localStorage.clear(); true`);
    await page.goto(server.base + '/');
    await page.evaluate(`document.getElementById('btn-hero-demo').click(); true`);
    await page.waitFor(`document.getElementById('view-app').classList.contains('active') && document.querySelector('.day-pill')`);
    await page.evaluate(STRESS);
    await page.goto(server.base + '/');
    await page.waitFor(`document.getElementById('view-app').classList.contains('active') && document.querySelector('.day-pill')`);
    await sleep(300);
    return page;
  }

  async function goTab(page, width, tab) {
    const sel = width < 769 ? `.mobile-nav-btn[data-tab="${tab}"]` : `.tab-btn[data-tab="${tab}"]`;
    await page.evaluate(`document.querySelector('${sel}').click(); true`);
    await sleep(200);
  }

  for (const width of WIDTHS) {
    test(`TC-LAY-${width} : aucun débordement ni cible trop petite à ${width} px (écrans et fenêtres, textes extrêmes)`, async () => {
      const page = await openStressedDemo(width);
      const problems = [];
      const check = async (label) => {
        const m = await page.evaluate(MEASURE);
        if (m.page > 0) problems.push(`${label} : page plus large que l'écran de ${m.page} px`);
        if (m.out.length) problems.push(`${label} : hors cadre ${m.out.join(' | ')}`);
        if (m.tap.length) problems.push(`${label} : cibles < 44 px ${m.tap.join(' | ')}`);
      };

      await check('Programme');
      await goTab(page, width, 'tab-todos'); await check('À faire');
      await goTab(page, width, 'tab-budget'); await check('Budget');
      await goTab(page, width, 'tab-contacts'); await check('Contacts');

      // Fenêtres : fiche d'activité (le texte le plus long), dépense, contact
      await goTab(page, width, 'tab-planning');
      await page.evaluate(`[...document.querySelectorAll('.activity-card')].find(c => c.textContent.includes('retrouvailles')).click(); true`);
      await page.waitFor(`document.getElementById('dialog-activity-enrich').open`);
      await sleep(250); await check('Fiche d’activité');
      await page.evaluate(`document.getElementById('dialog-activity-enrich').close(); true`);
      await goTab(page, width, 'tab-budget');
      await page.evaluate(`document.getElementById('btn-open-add-expense').click(); true`);
      await page.waitFor(`document.getElementById('dialog-add-expense').open`);
      await sleep(250); await check('Nouvelle dépense');
      await page.evaluate(`document.getElementById('dialog-add-expense').close(); true`);
      await goTab(page, width, 'tab-contacts');
      await page.evaluate(`document.getElementById('btn-open-add-contact').click(); true`);
      await page.waitFor(`document.getElementById('dialog-add-contact').open`);
      await sleep(250); await check('Nouveau contact');

      assert.deepEqual(page.errors, []);
      assert.deepEqual(problems, []);
    });
  }
});
