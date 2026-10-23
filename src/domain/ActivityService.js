const generateId = () => globalThis.crypto.randomUUID();

export const VALID_ACTIVITY_STATUSES = ['À planifier', 'Confirmé', 'Effectué', 'Annulé'];
export const VALID_ACTIVITY_CATEGORIES = [
  'Famille',
  'Amis',
  'Loisir',
  'Sorties',
  'Travail',
  'Logistique',
  'Découverte',
  'Santé',
  'Autre'
];

export class ActivityService {
  /**
   * Création rapide en 2 secondes (titre seul obligatoire)
   */
  static addActivity(trip, { dayId, title, category = 'Autre', time = '', location = '', contactIds = [], notes = '' }) {
    if (!title || !title.trim()) {
      throw new Error("Le titre de l'activité est obligatoire");
    }

    const day = trip.days.find(d => d.id === dayId || d.dayNumber === Number(dayId));
    if (!day) {
      throw new Error(`Journée introuvable pour l'identifiant : ${dayId}`);
    }

    if (!day.activities) {
      day.activities = [];
    }

    const newActivity = {
      id: generateId(),
      dayId: day.id,
      title: title.trim(),
      category: VALID_ACTIVITY_CATEGORIES.includes(category) ? category : 'Autre',
      time: time ? time.trim() : '',
      location: location ? location.trim() : '',
      contactIds: Array.isArray(contactIds) ? [...contactIds] : [],
      status: 'À planifier',
      notes: notes ? notes.trim() : '',
      createdAt: new Date().toISOString()
    };

    day.activities.push(newActivity);
    trip.updatedAt = new Date().toISOString();
    return newActivity;
  }

  /**
   * Recherche d'une activité par son ID
   */
  static findActivity(trip, activityId) {
    for (const day of trip.days) {
      if (day.activities) {
        const found = day.activities.find(a => a.id === activityId);
        if (found) {
          return { activity: found, day };
        }
      }
    }
    return null;
  }

  /**
   * Enrichissement progressif d'une activité existante
   */
  static updateActivity(trip, activityId, updates) {
    const result = ActivityService.findActivity(trip, activityId);
    if (!result) {
      throw new Error(`Activité introuvable avec l'id : ${activityId}`);
    }

    const { activity } = result;

    if (updates.title !== undefined) {
      if (!updates.title || !updates.title.trim()) {
        throw new Error("Le titre de l'activité ne peut pas être vide");
      }
      activity.title = updates.title.trim();
    }

    if (updates.category !== undefined) {
      activity.category = VALID_ACTIVITY_CATEGORIES.includes(updates.category) ? updates.category : 'Autre';
    }

    if (updates.time !== undefined) {
      activity.time = updates.time ? updates.time.trim() : '';
    }

    if (updates.location !== undefined) {
      activity.location = updates.location ? updates.location.trim() : '';
    }

    if (updates.contactIds !== undefined && Array.isArray(updates.contactIds)) {
      activity.contactIds = [...updates.contactIds];
    }

    if (updates.status !== undefined) {
      if (!VALID_ACTIVITY_STATUSES.includes(updates.status)) {
        throw new Error(`Statut d'activité invalide : ${updates.status}`);
      }
      activity.status = updates.status;
    }

    if (updates.notes !== undefined) {
      activity.notes = updates.notes ? updates.notes.trim() : '';
    }

    trip.updatedAt = new Date().toISOString();
    return activity;
  }

  /**
   * Déplace une activité d'une journée à une autre
   */
  static moveActivity(trip, activityId, targetDayId) {
    const result = ActivityService.findActivity(trip, activityId);
    if (!result) {
      throw new Error(`Activité introuvable avec l'id : ${activityId}`);
    }

    const targetDay = trip.days.find(d => d.id === targetDayId || d.dayNumber === Number(targetDayId));
    if (!targetDay) {
      throw new Error(`Journée cible introuvable : ${targetDayId}`);
    }

    const { activity, day: sourceDay } = result;

    // Retrait de la journée source
    sourceDay.activities = sourceDay.activities.filter(a => a.id !== activityId);

    // Mise à jour du lien de journée
    activity.dayId = targetDay.id;

    // Ajout à la journée cible
    if (!targetDay.activities) targetDay.activities = [];
    targetDay.activities.push(activity);

    trip.updatedAt = new Date().toISOString();
    return activity;
  }

  /**
   * Supprime une activité
   */
  static deleteActivity(trip, activityId) {
    const result = ActivityService.findActivity(trip, activityId);
    if (!result) {
      throw new Error(`Activité introuvable avec l'id : ${activityId}`);
    }

    const { activity, day } = result;
    day.activities = day.activities.filter(a => a.id !== activityId);
    trip.updatedAt = new Date().toISOString();
    return activity;
  }

  /**
   * Détermine le bloc temporel d'une activité
   * Blocs : 'À caler aujourd\'hui' | 'Matin' | 'Après-midi' | 'Soirée'
   */
  static determineTemporalBlock(activity) {
    const time = (activity.time || '').toLowerCase().trim();

    if (!time) {
      return "À caler aujourd'hui";
    }

    if (time.includes('matin')) {
      return 'Matin';
    }
    if (time.includes('après-midi') || time.includes('apres-midi') || time.includes('midi')) {
      return 'Après-midi';
    }
    if (time.includes('soir')) {
      return 'Soirée';
    }

    // Format horaire standard (ex: 09:30, 14:00, 20h)
    const match = time.match(/(\d{1,2})[:hH](\d{0,2})/);
    if (match) {
      const hour = parseInt(match[1], 10);
      if (hour >= 6 && hour < 12) {
        return 'Matin';
      } else if (hour >= 12 && hour < 18) {
        return 'Après-midi';
      } else {
        return 'Soirée';
      }
    }

    return "À caler aujourd'hui";
  }

  /**
   * Regroupe les activités d'une journée dans les 4 blocs temporels
   */
  static groupActivitiesByTemporalBlocks(activities = []) {
    const groups = {
      unassigned: [], // À caler aujourd'hui
      morning: [],    // Matin
      afternoon: [],  // Après-midi
      evening: []     // Soirée
    };

    activities.forEach(act => {
      const block = ActivityService.determineTemporalBlock(act);
      switch (block) {
        case 'Matin':
          groups.morning.push(act);
          break;
        case 'Après-midi':
          groups.afternoon.push(act);
          break;
        case 'Soirée':
          groups.evening.push(act);
          break;
        case "À caler aujourd'hui":
        default:
          groups.unassigned.push(act);
          break;
      }
    });

    return groups;
  }

  /**
   * Filtre une liste d'activités selon la catégorie
   */
  static filterActivitiesByCategory(activities = [], category = 'Tous') {
    if (!category || category === 'Tous') return [...activities];
    return activities.filter(a => (a.category || 'Autre').toLowerCase() === category.toLowerCase());
  }
}
