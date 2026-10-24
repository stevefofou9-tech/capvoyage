import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, '..', '..', 'src');

describe('Suite Intégrité du Front-end (scripts chargés par le navigateur)', () => {

  // Régression : un `showToast` déclaré deux fois dans app.js provoquait un SyntaxError,
  // le module ne s'exécutait pas et plus aucun clic ne réagissait dans l'interface.
  test('UI-01 : Tous les modules servis au navigateur sont syntaxiquement valides', async () => {
    const files = [
      path.join(SRC_DIR, 'ui', 'app.js'),
      path.join(SRC_DIR, 'ui', 'sw.js'),
      path.join(SRC_DIR, 'ui', 'icons.js'),
      ...readdirSync(path.join(SRC_DIR, 'domain')).filter(f => f.endsWith('.js')).map(f => path.join(SRC_DIR, 'domain', f))
    ];
    const failures = (await Promise.all(files.map(file =>
      execFileAsync(process.execPath, ['--check', file])
        .then(() => null)
        .catch(err => `${path.relative(SRC_DIR, file)} : ${err.stderr.split('\n').find(l => l.includes('Error')) || err.message}`)
    ))).filter(Boolean);
    assert.deepEqual(failures, [], `Erreurs de syntaxe :\n${failures.join('\n')}`);
  });

  test('UI-02 : Chaque id référencé par getElementById dans app.js existe dans index.html', () => {
    const app = readFileSync(path.join(SRC_DIR, 'ui', 'app.js'), 'utf-8');
    const html = readFileSync(path.join(SRC_DIR, 'ui', 'index.html'), 'utf-8');
    const htmlIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    // Ids créés dynamiquement par app.js lui-même (pas présents dans le HTML statique)
    const dynamicIds = new Set([...app.matchAll(/\.id\s*=\s*['"]([^'"]+)['"]/g)].map(m => m[1]));
    const missing = [...new Set([...app.matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1]))]
      .filter(id => !htmlIds.has(id) && !dynamicIds.has(id));
    assert.deepEqual(missing, [], `Ids absents de index.html : ${missing.join(', ')}`);
  });

  test('UI-03 : Le Service Worker ne sert pas les fichiers de l\'app en cache-first', () => {
    const sw = readFileSync(path.join(SRC_DIR, 'ui', 'sw.js'), 'utf-8');
    const fetchHandler = sw.slice(sw.indexOf("addEventListener('fetch'"));
    assert.ok(fetchHandler.indexOf('fetch(event.request') < fetchHandler.indexOf('caches.match'),
      'Le handler fetch doit interroger le réseau avant le cache');
  });
});
