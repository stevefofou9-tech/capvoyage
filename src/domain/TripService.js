import { GeographyData } from './GeographyData.js';
import { ContactService } from './ContactService.js';
import { SUPPORTED_CURRENCIES } from './BudgetEngine.js';

const generateId = () => globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : 'trip-' + Math.random().toString(36).substring(2, 9);

export class TripService {
  /**
   * Crée un nouveau voyage et génère automatiquement le calendrier des journées
   */
  static createTrip({
    country = 'Cameroun',
    title = 'Mon Voyage au Cameroun',
    startDate,
    endDate,
    baseCurrency = 'EUR',
    totalBudget = 2000
  }) {
    if (!country || !country.trim()) {
      throw new Error('Le pays de destination est obligatoire');
    }
    if (!startDate || !endDate) {
      throw new Error('Les dates de début et de fin sont obligatoires');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Format de date invalide (attendu : YYYY-MM-DD)');
    }

    if (end < start) {
      throw new Error('La date de fin ne peut pas être antérieure à la date de début');
    }

    const days = TripService.generateDays(startDate, endDate);

    // Initialisation des devises par défaut selon la destination
    const currencies = [
      { code: baseCurrency, name: baseCurrency === 'EUR' ? 'Euro' : baseCurrency, symbol: baseCurrency === 'EUR' ? '€' : baseCurrency, rateToBase: 1.0 }
    ];

    const targetLocalCode = GeographyData.getDefaultCurrencyForCountry(country) || 'XAF';
    if (targetLocalCode !== baseCurrency) {
      const matchCurr = SUPPORTED_CURRENCIES.find(c => c.code === targetLocalCode) || {
        code: 'XAF',
        name: 'Franc CFA (BEAC)',
        symbol: 'FCFA',
        rateToBase: 655.957
      };
      currencies.push({ ...matchCurr });
    } else if (baseCurrency === 'EUR') {
      currencies.push({
        code: 'XAF',
        name: 'Franc CFA (BEAC)',
        symbol: 'FCFA',
        rateToBase: 655.957
      });
    }

    return {
      id: generateId(),
      country: country.trim(),
      title: title ? title.trim() : `Voyage ${country.trim()}`,
      startDate,
      endDate,
      baseCurrency,
      totalBudget: Number(totalBudget) || 0,
      days,
      contacts: [],
      expenses: [],
      todos: [],
      currencies,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Génère la liste des objets Day ordonnés
   */
  static generateDays(startDateStr, endDateStr, existingDays = []) {
    const days = [];
    const [y1, m1, d1] = startDateStr.split('-').map(Number);
    const [y2, m2, d2] = endDateStr.split('-').map(Number);
    const current = new Date(Date.UTC(y1, m1 - 1, d1));
    const end = new Date(Date.UTC(y2, m2 - 1, d2));

    let dayNumber = 1;

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const existing = existingDays.find(d => d.date === dateStr || d.dayNumber === dayNumber);

      days.push({
        id: existing ? existing.id : `day-${dayNumber}`,
        dayNumber,
        date: dateStr,
        city: existing ? existing.city : '',
        notes: existing ? existing.notes : '',
        activities: existing ? existing.activities : []
      });

      current.setUTCDate(current.getUTCDate() + 1);
      dayNumber++;
    }

    return days;
  }

  /**
   * Assigne une ville étape à une journée spécifique
   */
  static assignCityToDay(trip, dayNumber, city) {
    const day = trip.days.find(d => d.dayNumber === dayNumber);
    if (!day) {
      throw new Error(`Journée introuvable pour le jour numéro : ${dayNumber}`);
    }
    day.city = city ? city.trim() : '';
    trip.updatedAt = new Date().toISOString();
    return day;
  }

  /**
   * Assigne une ville étape à une plage de journées (ex: jours 1 à 7)
   */
  static assignCityToRange(trip, startDayNumber, endDayNumber, city) {
    if (startDayNumber > endDayNumber) {
      throw new Error('Le jour de début doit être inférieur ou égal au jour de fin');
    }
    trip.days.forEach(day => {
      if (day.dayNumber >= startDayNumber && day.dayNumber <= endDayNumber) {
        day.city = city ? city.trim() : '';
      }
    });
    trip.updatedAt = new Date().toISOString();
    return trip.days;
  }

  /**
   * Prolonge la durée d'un voyage en ajoutant de nouvelles journées sans toucher aux existantes
   */
  static extendTrip(trip, newEndDate) {
    const currentEnd = new Date(trip.endDate);
    const targetEnd = new Date(newEndDate);

    if (targetEnd <= currentEnd) {
      throw new Error('La nouvelle date de fin doit être strictement postérieure à la date de fin actuelle');
    }

    trip.days = TripService.generateDays(trip.startDate, newEndDate, trip.days);
    trip.endDate = newEndDate;
    trip.updatedAt = new Date().toISOString();
    return trip;
  }

  /**
   * Raccourcit la durée d'un séjour en appliquant le garde-fou anti-perte
   */
  static reduceTrip(trip, newEndDate, { force = false } = {}) {
    const currentStart = new Date(trip.startDate);
    const currentEnd = new Date(trip.endDate);
    const targetEnd = new Date(newEndDate);

    if (targetEnd >= currentEnd) {
      throw new Error('La nouvelle date de fin doit être strictement antérieure à la date actuelle');
    }
    if (targetEnd < currentStart) {
      throw new Error('La date de fin ne peut pas être antérieure à la date de début');
    }

    // Recherche des activités présentes sur les jours qui seraient supprimés
    const orphanedActivities = [];
    trip.days.forEach(day => {
      const dayDate = new Date(day.date);
      if (dayDate > targetEnd && day.activities && day.activities.length > 0) {
        day.activities.forEach(act => {
          orphanedActivities.push({
            dayNumber: day.dayNumber,
            date: day.date,
            title: act.title
          });
        });
      }
    });

    if (orphanedActivities.length > 0 && !force) {
      const summary = orphanedActivities.map(a => `Jour ${a.dayNumber} : "${a.title}"`).join(', ');
      throw new Error(`Impossible de raccourcir le séjour sans confirmation : ${orphanedActivities.length} activité(s) orpheline(s) détectée(s) (${summary})`);
    }

    // Réduction effective
    trip.days = trip.days.filter(day => new Date(day.date) <= targetEnd);
    trip.endDate = newEndDate;
    trip.updatedAt = new Date().toISOString();
    return trip;
  }

  /**
   * Synthèse globale du voyage
   */
  static getTripSummary(trip) {
    const totalDays = trip.days.length;
    let totalActivities = 0;
    const citiesSet = new Set();

    trip.days.forEach(day => {
      totalActivities += day.activities ? day.activities.length : 0;
      if (day.city) citiesSet.add(day.city);
    });

    return {
      country: trip.country,
      totalDays,
      totalActivities,
      totalContacts: trip.contacts ? trip.contacts.length : 0,
      totalExpenses: trip.expenses ? trip.expenses.length : 0,
      cities: Array.from(citiesSet)
    };
  }

  /**
   * Initialisation express via le Wizard Onboarding (< 3 min)
   * Valide les 4 immanquables et personnalise selon les types d'activités
   */
  static createTripFromWizard({
    country,
    mainCity,
    startDate,
    endDate,
    totalBudget,
    baseCurrency = 'EUR',
    activityPurposes = [],
    initialContacts = []
  }) {
    if (!country || !country.trim()) {
      throw new Error('Le pays de destination est obligatoire');
    }
    if (!mainCity || !mainCity.trim()) {
      throw new Error('La ville principale est obligatoire');
    }
    if (!startDate || !endDate) {
      throw new Error('Les dates de séjour sont obligatoires');
    }
    const numBudget = Number(totalBudget);
    if (isNaN(numBudget) || numBudget <= 0) {
      throw new Error('Le budget prévisionnel est obligatoire et doit être strictement positif');
    }

    const trip = TripService.createTrip({
      country: country.trim(),
      title: `Voyage ${country.trim()} (${mainCity.trim()})`,
      startDate,
      endDate,
      baseCurrency,
      totalBudget: numBudget
    });

    // Assigner la ville principale à toutes les journées par défaut
    trip.days.forEach(d => {
      d.city = mainCity.trim();
    });

    trip.activityPurposes = Array.isArray(activityPurposes) ? [...activityPurposes] : [];

    // Ajout effectif des contacts initiaux
    if (Array.isArray(initialContacts) && initialContacts.length > 0) {
      initialContacts.forEach(contact => {
        if (contact && contact.name && contact.name.trim()) {
          ContactService.addContact(trip, contact);
        }
      });
    }

    return trip;
  }

  /**
   * Déplace directement une activité vers un jour cible par son numéro de jour
   */
  static moveActivityToDay(trip, activityId, targetDayNumber) {
    const targetDay = (trip.days || []).find(d => d.dayNumber === Number(targetDayNumber));
    if (!targetDay) {
      throw new Error(`Journée cible introuvable pour le jour numéro : ${targetDayNumber}`);
    }

    let foundActivity = null;
    (trip.days || []).forEach(d => {
      if (d.activities) {
        const idx = d.activities.findIndex(a => a.id === activityId);
        if (idx !== -1) {
          [foundActivity] = d.activities.splice(idx, 1);
        }
      }
    });

    if (!foundActivity) {
      throw new Error(`Activité introuvable avec l'id : ${activityId}`);
    }

    foundActivity.dayId = targetDay.id;
    if (!targetDay.activities) targetDay.activities = [];
    targetDay.activities.push(foundActivity);
    trip.updatedAt = new Date().toISOString();
    return { activity: foundActivity, targetDay };
  }

  /**
   * Modifie le budget prévisionnel à tout moment
   */
  static updateTripBudget(trip, { totalBudget, baseCurrency }) {
    if (totalBudget !== undefined) {
      const num = Number(totalBudget);
      if (isNaN(num) || num <= 0) {
        throw new Error('Le budget doit être un nombre strictement positif');
      }
      trip.totalBudget = num;
    }

    if (baseCurrency) {
      trip.baseCurrency = baseCurrency.toUpperCase();
    }

    trip.updatedAt = new Date().toISOString();
    return trip;
  }

  /**
   * Obtient ou génère un jeton de partage en lecture seule
   */
  static getOrCreateShareToken(trip) {
    if (!trip.shareToken) {
      trip.shareToken = 'share-' + (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).substring(2, 10));
      trip.updatedAt = new Date().toISOString();
    }
    return trip.shareToken;
  }

  /**
   * Valide un jeton de partage
   */
  static validateShareToken(trip, token) {
    if (!trip || !token || !trip.shareToken) return false;
    return trip.shareToken === token.trim();
  }
}
