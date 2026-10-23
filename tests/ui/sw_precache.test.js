import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// Garde-fou hors-ligne (REQ-6.4) : tout module de domaine importé par le navigateur doit être préchargé
// par le Service Worker, sinon l'application ne démarre plus sans réseau.
test('TC-UI-010 : le Service Worker précharge tous les modules de domaine importés par le front', () => {
  const ui = new URL('../../src/ui/', import.meta.url);
  const domain = new URL('../../src/domain/', import.meta.url);
  const sw = readFileSync(new URL('sw.js', ui), 'utf-8');
  const cached = new Set([...sw.matchAll(/'\/domain\/([A-Za-z]+\.js)'/g)].map(m => m[1]));

  const needed = new Set();
  const visit = (file, base) => {
    const src = readFileSync(new URL(file, base), 'utf-8');
    for (const m of src.matchAll(/from\s+'(?:\.\.\/domain\/|\.\/)([A-Za-z]+\.js)'/g)) {
      if (!needed.has(m[1]) && readdirSync(domain).includes(m[1])) {
        needed.add(m[1]);
        visit(m[1], domain);
      }
    }
  };
  visit('app.js', ui);

  const missing = [...needed].filter(f => !cached.has(f));
  assert.deepEqual(missing, [], `modules absents du cache hors-ligne : ${missing.join(', ')}`);
  assert.ok(needed.has('NowService.js') && needed.has('ContactImport.js'));
});
