// ==========================================================================
// CAPVOYAGE - CATALOGUE GÉOGRAPHIQUE & VILLES DE RÉFÉRENCE
// Support des formulaires intelligents et cascade dynamique Pays -> Villes
// ==========================================================================

export const COUNTRIES_CATALOG = [
  {
    code: 'CM',
    name: 'Cameroun',
    defaultCurrency: 'XAF',
    cities: ['Douala', 'Yaoundé', 'Kribi', 'Bafoussam', 'Garoua', 'Limbe', 'Buea', 'Maroua']
  },
  {
    code: 'SN',
    name: 'Sénégal',
    defaultCurrency: 'XOF',
    cities: ['Dakar', 'Saint-Louis', 'Saly', 'Thiès', 'Ziguinchor', 'Cap Skirring', 'Touba']
  },
  {
    code: 'CI',
    name: 'Côte d’Ivoire',
    defaultCurrency: 'XOF',
    cities: ['Abidjan', 'Yamoussoukro', 'San-Pédro', 'Grand-Bassam', 'Bouaké', 'Assinie']
  },
  {
    code: 'CA',
    name: 'Canada',
    defaultCurrency: 'CAD',
    cities: ['Montréal', 'Québec', 'Toronto', 'Vancouver', 'Ottawa', 'Calgary']
  },
  {
    code: 'CN',
    name: 'Chine',
    defaultCurrency: 'CNY',
    cities: ['Pékin (Beijing)', 'Shanghai', 'Shenzhen', 'Canton (Guangzhou)', 'Chengdu', 'Hangzhou']
  },
  {
    code: 'JP',
    name: 'Japon',
    defaultCurrency: 'EUR',
    cities: ['Tokyo', 'Kyoto', 'Osaka', 'Hiroshima', 'Sapporo', 'Fukuoka', 'Nara']
  },
  {
    code: 'FR',
    name: 'France',
    defaultCurrency: 'EUR',
    cities: ['Paris', 'Lyon', 'Marseille', 'Nice', 'Bordeaux', 'Toulouse', 'Strasbourg', 'Nantes']
  },
  {
    code: 'IT',
    name: 'Italie',
    defaultCurrency: 'EUR',
    cities: ['Rome', 'Florence', 'Venise', 'Milan', 'Naples', 'Bologne', 'Palerme']
  },
  {
    code: 'ES',
    name: 'Espagne',
    defaultCurrency: 'EUR',
    cities: ['Barcelone', 'Madrid', 'Séville', 'Valence', 'Malaga', 'Grenade']
  },
  {
    code: 'US',
    name: 'États-Unis',
    defaultCurrency: 'USD',
    cities: ['New York', 'Los Angeles', 'Miami', 'San Francisco', 'Chicago', 'Las Vegas', 'Washington']
  },
  {
    code: 'MA',
    name: 'Maroc',
    defaultCurrency: 'EUR',
    cities: ['Marrakech', 'Casablanca', 'Rabat', 'Fès', 'Tanger', 'Agadir', 'Chefchaouen']
  }
];

export class GeographyData {
  /**
   * Retourne la liste complète des pays du catalogue
   */
  static getAllCountries() {
    return COUNTRIES_CATALOG;
  }

  /**
   * Recherche un pays par nom ou code (insensible à la casse et accents)
   */
  static findCountry(query) {
    if (!query || typeof query !== 'string') return null;
    const clean = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return COUNTRIES_CATALOG.find(c => {
      const cName = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const cCode = c.code.toLowerCase();
      return cName === clean || cCode === clean || cName.includes(clean);
    }) || null;
  }

  /**
   * Retourne la liste des villes pour un pays donné
   */
  static getCitiesForCountry(countryName) {
    const found = GeographyData.findCountry(countryName);
    return found ? [...found.cities] : [];
  }

  /**
   * Retourne la devise locale par défaut pour un pays donné
   */
  static getDefaultCurrencyForCountry(countryName) {
    const found = GeographyData.findCountry(countryName);
    return found ? found.defaultCurrency : 'EUR';
  }

  /**
   * Fuseau horaire IANA du pays de destination (null si inconnu)
   */
  static getTimeZoneForCountry(countryName) {
    const found = GeographyData.findCountry(countryName);
    return found ? (TIME_ZONES_BY_CODE[found.code] || null) : null;
  }
}

const TIME_ZONES_BY_CODE = {
  CM: 'Africa/Douala', SN: 'Africa/Dakar', CI: 'Africa/Abidjan', CA: 'America/Toronto',
  CN: 'Asia/Shanghai', JP: 'Asia/Tokyo', FR: 'Europe/Paris', IT: 'Europe/Rome',
  ES: 'Europe/Madrid', US: 'America/New_York', MA: 'Africa/Casablanca'
};
