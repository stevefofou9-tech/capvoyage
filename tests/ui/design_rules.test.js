import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// TC-UX-008 : garde-fou des tokens de design (REQ-UX-4, DESIGN.md « Règles de composition »).
// Le CSS historique contient des couleurs en dur (dette) : on les plafonne (cliquet) et le bloc v2.1 n'en a aucune.
const css = readFileSync(new URL('../../src/ui/style.css', import.meta.url), 'utf-8');
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const HEX_BASELINE_OUTSIDE_ROOT = 80; // à ne jamais augmenter ; à réduire au fil des retouches

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

// Design system Soleil (ADR-010, phase 1) : jetons obligatoires et cliquets sur les valeurs en dur.
describe('Design system Soleil : jetons et cliquets (TC-UX-009)', () => {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rootBlock = stripped.match(/:root\s*\{([\s\S]*?)\n\}/)[1];
  const outsideRoot = stripped.replace(/:root\s*\{[\s\S]*?\n\}/, '').replace(/@font-face\s*\{[^}]*\}/g, '');

  test('le :root définit tous les jetons Soleil', () => {
    const required = [
      '--paper', '--surface', '--sunken', '--line', '--line-strong', '--ink', '--ink-2', '--ink-3',
      '--accent', '--accent-press', '--accent-soft', '--accent-ink', '--on-accent',
      '--pos', '--pos-soft', '--pos-ink', '--warn', '--warn-soft', '--warn-ink', '--neg', '--neg-soft', '--focus',
      '--f-body', '--f-head', '--t-caption', '--t-small', '--t-body', '--t-title-s', '--t-title', '--t-headline', '--t-large', '--t-display',
      '--s1', '--s2', '--s3', '--s4', '--s5', '--s6', '--s8', '--s10',
      '--r-md', '--r-lg', '--r-pill', '--h-dense', '--h-md', '--h-lg', '--e1', '--e2', '--e3'
    ];
    const missing = required.filter(token => !new RegExp(`\\s${token}\\s*:`).test(rootBlock));
    assert.deepEqual(missing, [], `jetons absents du :root : ${missing.join(', ')}`);
  });

  test('chaque variable utilisée est définie (aucun var() orphelin)', () => {
    const defined = new Set([...rootBlock.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(m => m[1]));
    for (const m of outsideRoot.matchAll(/(--[a-z0-9-]+)\s*:/g)) defined.add(m[1]);
    const used = [...new Set([...stripped.matchAll(/var\((--[a-z0-9-]+)/g)].map(m => m[1]))];
    const orphans = used.filter(v => !defined.has(v));
    assert.deepEqual(orphans, [], `variables non définies : ${orphans.join(', ')}`);
  });

  test('les contrastes des couleurs de texte tiennent (≥ 4,5:1 sur leur fond)', () => {
    const val = name => rootBlock.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))[1];
    const lum = hex => {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const pairs = [
      ['--ink', '--paper'], ['--ink-2', '--paper'], ['--ink-3', '--paper'], ['--ink-3', '--surface'],
      ['--on-accent', '--accent'], ['--accent-ink', '--accent-soft'], ['--accent', '--surface'],
      ['--pos-ink', '--pos-soft'], ['--on-accent', '--pos'], ['--warn-ink', '--warn-soft'], ['--warn', '--warn-soft'],
      ['--neg', '--surface'], ['--neg', '--neg-soft'], ['--on-accent', '--neg']
    ];
    const low = pairs.map(([fg, bg]) => [fg, bg, ratio(val(fg), val(bg))]).filter(([, , r]) => r < 4.5);
    assert.deepEqual(low.map(([fg, bg, r]) => `${fg} sur ${bg} : ${r.toFixed(2)}`), []);
  });

  test('aucun border-radius en valeur fixe hors :root (toujours un jeton)', () => {
    const raw = [...outsideRoot.matchAll(/border-radius\s*:\s*([^;}]+)/g)].map(m => m[1].trim())
      .filter(v => /\d(px|rem|em)\b/.test(v) && !/var\(/.test(v));
    assert.deepEqual(raw, [], 'utiliser --r-md, --r-lg ou --r-pill');
  });

  test('le bloc Soleil ne contient que des jetons (aucune couleur, aucun rgb(), aucun rayon en dur)', () => {
    const start = css.indexOf('Soleil (DÉBUT)');
    const end = css.indexOf('/* Soleil (FIN) */');
    assert.ok(start > 0 && end > start, 'bloc Soleil introuvable');
    const block = css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.deepEqual(block.match(/#[0-9a-fA-F]{3,8}/g) || [], []);
    assert.deepEqual(block.match(/rgba?\(/g) || [], []);
    assert.deepEqual([...block.matchAll(/border-radius\s*:\s*([^;}]+)/g)].map(m => m[1].trim()).filter(v => /\d(px|rem|em)/.test(v) && !/var\(/.test(v)), []);
  });

  const SMALL_TEXT_BASELINE = 23; // à ne jamais augmenter ; objectif 0 (plancher de 13 px)
  test('le texte sous 13 px ne progresse pas (cliquet)', () => {
    const small = [...outsideRoot.matchAll(/font-size\s*:\s*([\d.]+)(rem|px|em)/g)]
      .filter(m => (m[2] === 'px' ? Number(m[1]) : Number(m[1]) * 16) < 12.99);
    assert.ok(small.length <= SMALL_TEXT_BASELINE, `${small.length} tailles de texte sous 13 px (plafond ${SMALL_TEXT_BASELINE})`);
  });
});
