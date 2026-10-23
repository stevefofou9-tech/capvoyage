// ==========================================================================
// CAPVOYAGE - SERVICE D'EXPORT CALENDRIER (RFC 5545 - iCalendar .ics)
// ==========================================================================

/**
 * Échappe une chaîne pour le format iCalendar RFC 5545
 */
function escapeIcsText(str = '') {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Formate une date en chaîne ICS (YYYYMMDD ou YYYYMMDDTHHMMSS)
 */
function formatIcsDate(dateStr, timeStr = '') {
  const cleanDate = dateStr.replace(/[^0-9]/g, ''); // YYYYMMDD
  const timeMatch = (timeStr || '').match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])/);

  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, '0');
    const minutes = timeMatch[2].padStart(2, '0');
    const startIso = `${cleanDate}T${hours}${minutes}00`;
    
    // Calcul de l'heure de fin par défaut (+1 heure)
    let endHours = parseInt(hours, 10) + 1;
    let endMinutes = minutes;
    let nextDate = cleanDate;
    if (endHours >= 24) {
      endHours = endHours - 24;
      // Date du lendemain
      const d = new Date(dateStr);
      d.setUTCDate(d.getUTCDate() + 1);
      nextDate = d.toISOString().slice(0, 10).replace(/[^0-9]/g, '');
    }
    const endIso = `${nextDate}T${String(endHours).padStart(2, '0')}${endMinutes}00`;

    return {
      isAllDay: false,
      dtStart: `DTSTART:${startIso}`,
      dtEnd: `DTEND:${endIso}`
    };
  }

  // Événement journée entière
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + 1);
  const nextDay = d.toISOString().slice(0, 10).replace(/[^0-9]/g, '');

  return {
    isAllDay: true,
    dtStart: `DTSTART;VALUE=DATE:${cleanDate}`,
    dtEnd: `DTEND;VALUE=DATE:${nextDay}`
  };
}

export class IcsService {
  /**
   * Génère le fichier .ics complet pour un voyage
   */
  static generateIcs(trip) {
    if (!trip) {
      throw new Error("L'objet voyage est requis pour générer le calendrier");
    }

    const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CapVoyage//Trip Calendar//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeIcsText(trip.title || 'Mon Voyage')}`
    ];

    const days = trip.days || [];
    days.forEach(day => {
      const activities = day.activities || [];
      activities.forEach(act => {
        const dateInfo = formatIcsDate(day.date, act.time);
        
        let status = 'CONFIRMED';
        if (act.status === 'Annulé') status = 'CANCELLED';
        else if (act.status === 'À planifier') status = 'TENTATIVE';

        // Construction de la description
        const descParts = [];
        if (act.category) descParts.push(`Catégorie : ${act.category}`);
        if (act.time) descParts.push(`Créneau : ${act.time}`);
        
        // Contacts associés
        if (act.contactIds && act.contactIds.length > 0 && trip.contacts) {
          const names = trip.contacts
            .filter(c => act.contactIds.includes(c.id))
            .map(c => c.name);
          if (names.length > 0) {
            descParts.push(`Avec : ${names.join(', ')}`);
          }
        }

        if (act.notes) descParts.push(`Notes : ${act.notes}`);

        const location = act.location || day.city || trip.destinationCountry || '';

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${act.id || 'act-' + Math.random().toString(36).substring(2)}@capvoyage.app`);
        lines.push(`DTSTAMP:${nowStamp}`);
        lines.push(dateInfo.dtStart);
        lines.push(dateInfo.dtEnd);
        lines.push(`SUMMARY:${escapeIcsText(act.title)}`);
        if (descParts.length > 0) {
          lines.push(`DESCRIPTION:${escapeIcsText(descParts.join(' | '))}`);
        }
        if (location) {
          lines.push(`LOCATION:${escapeIcsText(location)}`);
        }
        lines.push(`STATUS:${status}`);
        if (!dateInfo.isAllDay) {
          // Alarme 1 h avant (REQ-7.7) : le calendrier du téléphone notifie, même hors-ligne
          lines.push('BEGIN:VALARM');
          lines.push('ACTION:DISPLAY');
          lines.push(`DESCRIPTION:${escapeIcsText(act.title)}`);
          lines.push('TRIGGER:-PT1H');
          lines.push('END:VALARM');
        }
        lines.push('END:VEVENT');
      });
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
}

