// ==========================================================================
// CAPVOYAGE - JOUR COURANT & PROCHAINE ACTIVITÉ (REQ-7.5, REQ-7.6)
// Horloge et fuseau sont injectés : aucune dépendance à la date réelle.
// ==========================================================================

import { GeographyData } from './GeographyData.js';

/**
 * Date et heure locales (AAAA-MM-JJ et minutes depuis minuit) dans un fuseau IANA.
 * Sans fuseau valide, repli sur le fuseau de l'appareil.
 */
export function getLocalDateTime(now = new Date(), timeZone = null) {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || undefined,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
    const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]));
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      minutes: Number(parts.hour) * 60 + Number(parts.minute)
    };
  } catch {
    return getLocalDateTime(now, null);
  }
}

export class NowService {
  static getTripTimeZone(trip) {
    return trip?.timeZone || GeographyData.getTimeZoneForCountry(trip?.country) || null;
  }

  /**
   * Jour à afficher à l'ouverture.
   * -> { phase: 'before'|'during'|'after', dayNumber, daysUntilStart, todayStr, minutes }
   */
  static getCurrentDay(trip, now = new Date()) {
    const { date: todayStr, minutes } = getLocalDateTime(now, NowService.getTripTimeZone(trip));
    const days = trip?.days || [];
    if (days.length === 0) return { phase: 'during', dayNumber: 1, daysUntilStart: 0, todayStr, minutes };

    const first = days[0];
    const last = days[days.length - 1];
    if (todayStr < first.date) {
      const diff = Math.round((Date.parse(first.date) - Date.parse(todayStr)) / 86400000);
      return { phase: 'before', dayNumber: first.dayNumber, daysUntilStart: diff, todayStr, minutes };
    }
    if (todayStr > last.date) {
      return { phase: 'after', dayNumber: last.dayNumber, daysUntilStart: 0, todayStr, minutes };
    }
    const today = days.find(d => d.date === todayStr) || first;
    return { phase: 'during', dayNumber: today.dayNumber, daysUntilStart: 0, todayStr, minutes };
  }

  /**
   * Prochaine activité horodatée (HH:MM) du jour courant, hors idées, non terminée.
   * -> { activity, inMinutes } | null
   */
  static getNextActivity(trip, now = new Date()) {
    const current = NowService.getCurrentDay(trip, now);
    if (current.phase !== 'during') return null;
    const day = (trip.days || []).find(d => d.dayNumber === current.dayNumber);
    if (!day) return null;

    let best = null;
    for (const act of day.activities || []) {
      if (act.status === 'Effectué' || act.status === 'Annulé') continue;
      const m = String(act.time || '').match(/^([01]?\d|2[0-3])[:hH]([0-5]\d)$/);
      if (!m) continue;
      const at = Number(m[1]) * 60 + Number(m[2]);
      if (at < current.minutes) continue;
      if (!best || at < best.at) best = { activity: act, at };
    }
    return best ? { activity: best.activity, inMinutes: best.at - current.minutes } : null;
  }

  /** « 1 h 30 », « 45 min », « maintenant » */
  static formatDuration(minutes) {
    if (minutes <= 0) return 'maintenant';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
  }
}
