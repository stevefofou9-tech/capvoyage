import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { TripService } from '../../src/domain/TripService.js';
import { ActivityTemplates, searchTemplates, resolveTemplateTitle } from '../../src/domain/ActivityTemplates.js';
import { StorageService } from '../../src/domain/StorageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Suite Robustesse, Sécurité & Exportations (ROB-SEC)', () => {

  test('ROB-01 : Exportations nommées de ActivityTemplates (searchTemplates, resolveTemplateTitle)', () => {
    assert.equal(typeof searchTemplates, 'function', 'searchTemplates doit être exporté comme fonction');
    assert.equal(typeof resolveTemplateTitle, 'function', 'resolveTemplateTitle doit être exporté comme fonction');

    const results = searchTemplates('plage');
    assert.ok(Array.isArray(results));
    assert.ok(results.length > 0);

    const title = resolveTemplateTitle({ titlePattern: 'Visite de {city} avec {contact}' }, { cityName: 'Kribi', contactName: 'Paul' });
    assert.equal(title, 'Visite de Kribi avec Paul');
  });

  test('ROB-02 : Résilience de la génération des jours face aux fuseaux horaires (UTC date math)', () => {
    // Test de génération de dates sur une période incluant un changement d'heure
    const days = TripService.generateDays('2026-11-01', '2026-11-05');
    assert.equal(days.length, 5, 'Doit générer exactement 5 journées du 01/11 au 05/11');
    assert.equal(days[0].date, '2026-11-01');
    assert.equal(days[1].date, '2026-11-02');
    assert.equal(days[2].date, '2026-11-03');
    assert.equal(days[3].date, '2026-11-04');
    assert.equal(days[4].date, '2026-11-05');
  });

  test('ROB-03 : Portabilité de la persistance fichier sans chemin absolu rigide', async () => {
    const tempFile = path.join(os.tmpdir(), `capvoyage_test_portability_${Date.now()}.json`);
    const trip = TripService.createTrip({
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-03'
    });

    await StorageService.saveToFile(trip, tempFile);
    const loaded = await StorageService.loadFromFile(tempFile);
    assert.equal(loaded.id, trip.id);
    assert.equal(loaded.country, 'Cameroun');
  });
});

