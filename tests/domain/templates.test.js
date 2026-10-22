import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ActivityTemplates, MACRO_CATEGORIES } from '../../src/domain/ActivityTemplates.js';

describe('Suite Templates d’Activités & Saisie Assistée (ActivityTemplates)', () => {

  test('TPL-01 : Modèles prédéfinis attachés aux macro-catégories', () => {
    const templates = ActivityTemplates.getAllTemplates();
    assert.ok(templates.length >= 10);

    const macros = MACRO_CATEGORIES.map(m => m.id);
    templates.forEach(t => {
      assert.ok(macros.includes(t.macro), `Macro ${t.macro} inconnue`);
      assert.ok(t.label);
      assert.ok(t.titlePattern);
      assert.ok(t.suggestedSlot);
    });
  });

  test('TPL-02 : Filtrage par macro-catégorie', () => {
    const familyTpls = ActivityTemplates.getTemplatesByMacro('Famille');
    assert.ok(familyTpls.length >= 2);
    familyTpls.forEach(t => assert.equal(t.macro, 'Famille'));

    const proTpls = ActivityTemplates.getTemplatesByMacro('Pro');
    assert.ok(proTpls.length >= 2);
    proTpls.forEach(t => assert.equal(t.macro, 'Pro'));
  });

  test('TPL-03 : Recherche dynamique de templates', () => {
    const resultsDiner = ActivityTemplates.searchTemplates('dîner');
    assert.ok(resultsDiner.length > 0);
    assert.ok(resultsDiner[0].label.toLowerCase().includes('dîner'));

    const contacts = [
      { id: 'c1', name: 'Oncle Paul' },
      { id: 'c2', name: 'Sophie' }
    ];

    const resultsPaul = ActivityTemplates.searchTemplates('paul', contacts);
    assert.ok(resultsPaul.length > 0);
    assert.ok(resultsPaul[0].resolvedTitle.includes('Oncle Paul'));
  });

  test('TPL-04 : Résolution de titre de template avec contact et ville', () => {
    const templateDiner = {
      titlePattern: 'Dîner avec {contact}'
    };
    const titleWithContact = ActivityTemplates.resolveTemplateTitle(templateDiner, { contactName: 'Oncle Paul' });
    assert.equal(titleWithContact, 'Dîner avec Oncle Paul');

    const templateTrajet = {
      titlePattern: 'Trajet vers {city}'
    };
    const titleWithCity = ActivityTemplates.resolveTemplateTitle(templateTrajet, { cityName: 'Kribi' });
    assert.equal(titleWithCity, 'Trajet vers Kribi');
  });
});

