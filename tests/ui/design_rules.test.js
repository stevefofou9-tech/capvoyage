import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// TC-UX-008 : garde-fou des tokens de design (REQ-UX-4, DESIGN.md « Règles de composition »).
// Le CSS historique contient des couleurs en dur (dette) : on les plafonne (cliquet) et le bloc v2.1 n'en a aucune.
const css = readFileSync(new URL('../../src/ui/style.css', import.meta.url), 'utf-8');
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const HEX_BASELINE_OUTSIDE_ROOT = 90; // à ne jamais augmenter ; à réduire au fil des retouches

describe('Règles de design (TC-UX-008)', () => {
  test('le bloc v2.1 n\'utilise que des tokens (aucune couleur ni rgba en dur)', () => {
    const start = css.indexOf('v2.1 (DÉBUT)');
    const end = css.indexOf('/* v2.1 (FIN) */');
    assert.ok(start > 0 && end > start, 'bloc v2.1 introuvable');
    const block = css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.deepEqual(block.match(HEX) || [], []);
    assert.deepEqual(block.match(/rgba?\(/g) || [], []);
  });

  test('le nombre de couleurs en dur hors :root ne dépasse pas le plafond', () => {
    const outside = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/:root\s*\{[^}]*\}/, '');
    const count = (outside.match(HEX) || []).length;
    assert.ok(count <= HEX_BASELINE_OUTSIDE_ROOT, `${count} couleurs en dur (plafond ${HEX_BASELINE_OUTSIDE_ROOT}) : utiliser les variables :root`);
  });

  test('DESIGN.md documente les règles de composition REQ-UX-1 à 4', () => {
    const design = readFileSync(new URL('../../DESIGN.md', import.meta.url), 'utf-8');
    for (const rule of ['REQ-UX-1', 'REQ-UX-2', 'REQ-UX-3', 'REQ-UX-4']) {
      assert.ok(design.includes(rule), `${rule} absent de DESIGN.md`);
    }
  });
});
