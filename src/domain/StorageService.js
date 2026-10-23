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
}
