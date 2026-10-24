import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

// Assets du design system Soleil (ADR-010) : polices et icônes hébergées, précachées pour le hors-ligne (REQ-6.4).
const ui = new URL('../../src/ui/', import.meta.url);
const read = name => readFileSync(new URL(name, ui), 'utf-8');
const sw = read('sw.js');
const cached = new Set([...sw.matchAll(/'(\/[^']*)'/g)].map(m => m[1]));

describe('Assets UI hébergés et précachés (TC-UI-011 à 014)', () => {
  test('TC-UI-011 : chaque police référencée par style.css existe, est un woff2 valide et est précachée', () => {
    const css = read('style.css');
    const urls = [...new Set([...css.matchAll(/url\('(fonts\/[^']+)'\)/g)].map(m => m[1]))];
    assert.ok(urls.length >= 4, 'au moins 4 fichiers de polices attendus');
    for (const rel of urls) {
      assert.ok(existsSync(new URL(rel, ui)), `${rel} introuvable`);
      assert.equal(readFileSync(new URL(rel, ui)).subarray(0, 4).toString(), 'wOF2', `${rel} n'est pas un woff2`);
      assert.ok(cached.has('/' + rel), `${rel} absent du précache du Service Worker`);
    }
  });

  test('TC-UI-012 : aucune police ni feuille de style n\'est chargée depuis un service tiers', () => {
    for (const file of ['index.html', 'style.css', 'reset.html']) {
      assert.doesNotMatch(read(file), /fonts\.googleapis|fonts\.gstatic/, `${file} dépend encore de Google Fonts`);
    }
  });

  test('TC-UI-013 : tout module de src/ui importé par app.js existe et est précaché', () => {
    const app = read('app.js');
    const imported = [...app.matchAll(/from\s+'\.\/([A-Za-z]+\.js)'/g)].map(m => m[1]);
    for (const file of imported) {
      assert.ok(readdirSync(ui).includes(file), `${file} importé mais absent de src/ui`);
      assert.ok(cached.has('/' + file), `${file} absent du précache du Service Worker`);
    }
  });

  test('TC-UI-014 : le module d\'icônes est précaché et ne casse jamais sur un nom inconnu', async () => {
    assert.ok(cached.has('/icons.js'));
    const { icon, ICONS } = await import('../../src/ui/icons.js');
    assert.ok(Object.keys(ICONS).length >= 40);
    assert.match(icon('check', 18), /^<svg class="ic" width="18" height="18"[^>]*aria-hidden="true"/);
    assert.doesNotMatch(icon('inexistante'), /<path|<circle|<rect/);
    for (const [name, body] of Object.entries(ICONS)) assert.doesNotMatch(body, /<script|on\w+=/i, `icône ${name} suspecte`);
  });
});
