import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GeographyData, COUNTRIES_CATALOG } from '../../src/domain/GeographyData.js';

describe('Suite Géographie & Villes de Référence (GeographyData)', () => {

  test('GEO-01 : Catalogue des pays avec villes et devises associées', () => {
    const countries = GeographyData.getAllCountries();
    assert.ok(Array.isArray(countries));
    assert.ok(countries.length >= 10);

    const cameroun = countries.find(c => c.name === 'Cameroun');
    assert.ok(cameroun);
    assert.equal(cameroun.defaultCurrency, 'XAF');
    assert.ok(cameroun.cities.includes('Douala'));
    assert.ok(cameroun.cities.includes('Yaoundé'));
    assert.ok(cameroun.cities.includes('Kribi'));
  });

  test('GEO-02 : Recherche tolérante aux majuscules et accents', () => {
    const senegal = GeographyData.findCountry('senegal');
    assert.ok(senegal);
    assert.equal(senegal.name, 'Sénégal');
    assert.equal(senegal.defaultCurrency, 'XOF');
    assert.ok(senegal.cities.includes('Dakar'));

    const canada = GeographyData.findCountry('CANADA');
    assert.ok(canada);
    assert.equal(canada.defaultCurrency, 'CAD');

    const chine = GeographyData.findCountry('Chine');
    assert.ok(chine);
    assert.equal(chine.defaultCurrency, 'CNY');
  });

  test('GEO-03 : Récupération des villes d’un pays', () => {
    const tokyoCities = GeographyData.getCitiesForCountry('Japon');
    assert.ok(tokyoCities.includes('Tokyo'));
    assert.ok(tokyoCities.includes('Kyoto'));

    const unknownCities = GeographyData.getCitiesForCountry('PaysInexistant');
    assert.deepEqual(unknownCities, []);
  });

  test('GEO-04 : Détection automatique de la devise par défaut', () => {
    assert.equal(GeographyData.getDefaultCurrencyForCountry('Cameroun'), 'XAF');
    assert.equal(GeographyData.getDefaultCurrencyForCountry('Canada'), 'CAD');
    assert.equal(GeographyData.getDefaultCurrencyForCountry('Chine'), 'CNY');
    assert.equal(GeographyData.getDefaultCurrencyForCountry('France'), 'EUR');
    assert.equal(GeographyData.getDefaultCurrencyForCountry('États-Unis'), 'USD');
  });
});

