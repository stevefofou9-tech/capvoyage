export class ReminderService {
  /**
   * Calcule le nombre de jours restants avant une date cible
   */
  static getDaysDifference(targetDateStr, fromDateStr = null) {
    const from = fromDateStr ? new Date(fromDateStr) : new Date();
    const target = new Date(targetDateStr);

    // Normalisation aux minuits
    const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());

    const diffMs = targetMidnight.getTime() - fromMidnight.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Génère les rappels d'échéances pré-voyage (To-Do critiques)
   */
  static getPreTripReminders(trip, referenceDateStr = null) {
    const alerts = [];
    if (!trip || !trip.startDate || !trip.todos) return alerts;

    const daysUntilDeparture = ReminderService.getDaysDifference(trip.startDate, referenceDateStr);

    // 1. Alertes d'échéances avant le départ
    if (daysUntilDeparture > 0) {
      // Alerte Visa
      const visaTodo = trip.todos.find(t => t.title.toLowerCase().includes('visa') && t.status !== 'Fait');
      if (visaTodo && daysUntilDeparture <= 20) {
        alerts.push({
          id: 'rem-visa',
          type: 'todo',
          priority: daysUntilDeparture <= 7 ? 'urgent' : 'warning',
          level: daysUntilDeparture <= 7 ? 'URGENT' : 'WARNING',
          title: `Démarche Visa en attente (Départ dans ${daysUntilDeparture} j)`,
          message: `La demande de visa pour le ${trip.country} doit être finalisée au plus vite.`,
          todoId: visaTodo.id
        });
      }

      // Alerte Vaccin Fièvre Jaune
      const yellowFeverTodo = trip.todos.find(t => t.title.toLowerCase().includes('fièvre jaune') && t.status !== 'Fait');
      if (yellowFeverTodo && daysUntilDeparture <= 15) {
        alerts.push({
          id: 'rem-vaccin',
          type: 'todo',
          priority: 'urgent',
          level: 'URGENT',
          title: `Vaccin Fièvre Jaune obligatoire (Départ dans ${daysUntilDeparture} j)`,
          message: `Le vaccin fièvre jaune met 10 jours à être légalement valide. Ne tardez pas !`,
          todoId: yellowFeverTodo.id
        });
      }

      // Alerte Valise / Pharmacie à l'approche du départ
      if (daysUntilDeparture <= 3) {
        const undoneTodos = trip.todos.filter(t => t.status !== 'Fait');
        if (undoneTodos.length > 0) {
          alerts.push({
            id: 'rem-last-days',
            type: 'todo',
            priority: 'warning',
            level: 'WARNING',
            title: `Départ dans ${daysUntilDeparture} jour(s) !`,
            message: `Il vous reste ${undoneTodos.length} préparatif(s) à finaliser avant de boucler les valises.`,
            todoId: null
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Alias de getPreTripReminders pour compatibilité
   */
  static getUrgentAlerts(trip, referenceDateStr = null) {
    return ReminderService.getPreTripReminders(trip, referenceDateStr);
  }

  /**
   * Génère le briefing matinal pour une journée donnée
   */
  static getMorningBrief(trip, dayNumber) {
    const day = (trip.days || []).find(d => d.dayNumber === Number(dayNumber));
    if (!day) return { dayNumber, activitiesCount: 0, text: 'Aucune donnée pour ce jour.' };

    const acts = day.activities || [];
    const textLines = acts.map(a => `${a.time ? `[${a.time}] ` : ''}${a.title}${a.location ? ` @ ${a.location}` : ''}`);

    return {
      dayNumber: day.dayNumber,
      date: day.date,
      city: day.city || 'Étape libre',
      activitiesCount: acts.length,
      text: acts.length > 0 
        ? `Aujourd'hui à ${day.city || 'votre étape'} : ${textLines.join(', ')}`
        : `Aucune activité programmée pour le moment pour ce Jour ${day.dayNumber}.`
    };
  }

  /**
   * Génère les rappels pour les activités prévues une date donnée
   */
  static getDailyActivityReminders(trip, targetDateStr) {
    const alerts = [];
    if (!trip || !trip.days) return alerts;

    const day = trip.days.find(d => d.date === targetDateStr);
    if (!day || !day.activities) return alerts;

    day.activities.forEach(act => {
      if (act.status !== 'Effectué' && act.status !== 'Annulé') {
        alerts.push({
          id: `rem-act-${act.id}`,
          type: 'activity',
          priority: act.time ? 'info' : 'low',
          level: act.time ? 'INFO' : 'LOW',
          title: act.time ? `À ${act.time} : ${act.title}` : `Aujourd'hui : ${act.title}`,
          location: act.location || (day.city ? `Étape ${day.city}` : ''),
          activityId: act.id,
          dayNumber: day.dayNumber
        });
      }
    });

    return alerts;
  }

  /**
   * Consolide tous les rappels actifs pertinents
   */
  static getConsolidatedReminders(trip, options = {}) {
    const refDate = options.currentDateStr || new Date().toISOString().split('T')[0];
    const preTripAlerts = ReminderService.getPreTripReminders(trip, refDate);
    const dailyAlerts = ReminderService.getDailyActivityReminders(trip, refDate);

    return [...preTripAlerts, ...dailyAlerts];
  }
}
