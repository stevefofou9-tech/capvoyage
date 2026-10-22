export class StorageService {
  /**
   * Valide la structure d'un objet voyage
   */
  static validateTripSchema(trip) {
    if (!trip || typeof trip !== 'object') {
      throw new Error('Données de voyage invalides (objet attendu)');
    }

    const requiredFields = ['id', 'country', 'startDate', 'endDate', 'days'];
    for (const field of requiredFields) {
      if (trip[field] === undefined) {
        throw new Error(`Champ obligatoire manquant dans le voyage : ${field}`);
      }
    }

    if (!Array.isArray(trip.days)) {
      throw new Error('La propriété "days" doit être un tableau');
    }

    return true;
  }

  /**
   * Exporte les données du voyage en chaîne JSON formatée
   */
  static exportToJson(trip) {
    StorageService.validateTripSchema(trip);
    return JSON.stringify(trip, null, 2);
  }

  /**
   * Parse et valide un fichier JSON importé
   */
  static parseAndValidate(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('Contenu JSON vide ou non textuel');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      throw new Error(`Erreur de syntaxe JSON : ${err.message}`);
    }

    StorageService.validateTripSchema(parsed);
    return parsed;
  }

  /**
   * Sauvegarde sur disque de manière atomique (Node.js uniquement)
   */
  static async saveToFile(trip, filePath) {
    StorageService.validateTripSchema(trip);
    const { promises: fs } = await import('fs');
    const path = await import('path');
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Écriture atomique avec fichier temporaire et renommage
    const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(trip, null, 2), 'utf-8');
    await fs.rename(tempPath, filePath);
    return filePath;
  }

  /**
   * Charge depuis le disque (Node.js uniquement)
   */
  static async loadFromFile(filePath) {
    try {
      const { promises: fs } = await import('fs');
      const content = await fs.readFile(filePath, 'utf-8');
      return StorageService.parseAndValidate(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  }

  /**
   * Génère un récapitulatif textuel propre prêt pour impression / PDF
   */
  static generatePrintableSummary(trip) {
    StorageService.validateTripSchema(trip);

    const lines = [];
    lines.push(`================================================================`);
    lines.push(` PLANNING VOYAGE : ${trip.title.toUpperCase()}`);
    lines.push(` Destination : ${trip.country} | Du ${trip.startDate} au ${trip.endDate}`);
    lines.push(`================================================================\n`);

    lines.push(`--- PROGRAMME JOUR PAR JOUR ---`);
    (trip.days || []).forEach(day => {
      lines.push(`\n[Jour ${day.dayNumber} - ${day.date}] ${day.city ? `Étape : ${day.city}` : ''}`);
      if (!day.activities || day.activities.length === 0) {
        lines.push(`  (Aucune activité planifiée)`);
      } else {
        day.activities.forEach(act => {
          const time = act.time ? `[${act.time}] ` : '';
          const loc = act.location ? ` @ ${act.location}` : '';
          const status = act.status ? ` (${act.status})` : '';
          lines.push(`  - ${time}${act.title}${loc} [${act.category}]${status}`);
        });
      }
    });

    lines.push(`\n--- RÉPERTOIRE DES CONTACTS ---`);
    if (!trip.contacts || trip.contacts.length === 0) {
      lines.push(`  (Aucun contact enregistré)`);
    } else {
      trip.contacts.forEach(c => {
        lines.push(`  - ${c.name} (${c.relationship}) - Tél: ${c.phone || 'N/A'} - Ville: ${c.city || 'N/A'}`);
      });
    }

    lines.push(`\n--- PRÉPARATIFS & FORMALITÉS ---`);
    if (!trip.todos || trip.todos.length === 0) {
      lines.push(`  (Aucune tâche)`);
    } else {
      trip.todos.forEach(t => {
        const check = t.status === 'Fait' ? '[X]' : '[ ]';
        lines.push(`  ${check} [${t.category}] ${t.title} (${t.status})`);
      });
    }

    return lines.join('\n');
  }
}
