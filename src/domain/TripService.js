import { GeographyData } from './GeographyData.js';
import { ContactService } from './ContactService.js';
import { SUPPORTED_CURRENCIES } from './BudgetEngine.js';

const generateId = () => globalThis.crypto.randomUUID();

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
   * Normalise la configuration de partage (ADR-006) et migre l'ancien `shareToken`.
   * Un ancien lien reste actif mais ne partage plus que le Programme.
   */
  static normalizeSharing(trip) {
    if (!trip.sharing || typeof trip.sharing !== 'object') {
      trip.sharing = {
        enabled: !!trip.shareToken,
        token: trip.shareToken || null,
        sections: { ...DEFAULT_SHARE_SECTIONS },
        updatedAt: null
      };
    } else {
      trip.sharing.sections = { ...DEFAULT_SHARE_SECTIONS, ...pickShareSections(trip.sharing.sections) };
      trip.sharing.enabled = !!trip.sharing.enabled;
      trip.sharing.token = trip.sharing.token || null;
    }
    delete trip.shareToken;
    return trip.sharing;
  }

  /**
   * Met à jour le partage : activation, sections partagées, régénération du lien.
   */
  static updateSharing(trip, { enabled, sections, regenerate = false } = {}) {
    const sharing = TripService.normalizeSharing(trip);
    if (sections && typeof sections === 'object') {
      sharing.sections = { ...sharing.sections, ...pickShareSections(sections) };
    }
    if (enabled !== undefined) {
      sharing.enabled = !!enabled;
    }
    if (regenerate || (sharing.enabled && !sharing.token)) {
      sharing.token = 'share-' + globalThis.crypto.randomUUID();
    }
    sharing.updatedAt = new Date().toISOString();
    return sharing;
  }

  /**
   * Projection en lecture seule d'un voyage partagé : uniquement les sections choisies,
   * sans aucun identifiant interne (id, userId, sharing, version).
   */
  static buildSharedView(trip) {
    const sharing = TripService.normalizeSharing(JSON.parse(JSON.stringify(trip)));
    const { sections } = sharing;
    const view = {
      title: trip.title,
      country: trip.country,
      startDate: trip.startDate,
      endDate: trip.endDate,
      isReadOnly: true,
      sharedSections: Object.keys(sections).filter(key => sections[key])
    };

    if (sections.planning) {
      view.days = (trip.days || []).map(day => ({
        ...day,
        activities: (day.activities || []).map(act => ({
          ...act,
          contactIds: sections.contacts ? [...(act.contactIds || [])] : []
        }))
      }));
    }
    if (sections.todos) {
      view.todos = JSON.parse(JSON.stringify(trip.todos || []));
    }
    if (sections.budget) {
      view.totalBudget = trip.totalBudget;
      view.baseCurrency = trip.baseCurrency;
      view.currencies = JSON.parse(JSON.stringify(trip.currencies || []));
      view.expenses = JSON.parse(JSON.stringify(trip.expenses || []));
    }
    if (sections.contacts) {
      view.contacts = JSON.parse(JSON.stringify(trip.contacts || []));
    }
    return view;
  }
}

export const DEFAULT_SHARE_SECTIONS = Object.freeze({ planning: true, todos: false, budget: false, contacts: false });

function pickShareSections(sections = {}) {
  const picked = {};
  for (const key of Object.keys(DEFAULT_SHARE_SECTIONS)) {
    if (sections[key] !== undefined) picked[key] = !!sections[key];
  }
  return picked;
}
