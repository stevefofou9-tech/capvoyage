// ==========================================================================
// CAPVOYAGE - MODÈLES & TEMPLATES D'ACTIVITÉS PRÉDÉFINIES
// Saisie accélérée attachée aux macro-catégories de voyage
// ==========================================================================

export const MACRO_CATEGORIES = [
  { id: 'Famille', label: 'Famille', icon: '👨‍👩‍👦', color: '#10b981' },
  { id: 'Amis', label: 'Amis & Sorties', icon: '🎉', color: '#f59e0b' },
  { id: 'Loisirs', label: 'Loisirs & Découverte', icon: '🏖️', color: '#06b6d4' },
  { id: 'Pro', label: 'Pro & Affaires', icon: '💼', color: '#6366f1' },
  { id: 'Logistique', label: 'Logistique & Trajets', icon: '🚗', color: '#64748b' }
];

export const ACTIVITY_TEMPLATES = [
  // 1. Famille & Proches
  {
    id: 'tpl-fam-repas',
    macro: 'Famille',
    category: 'Famille',
    icon: '🍲',
    label: 'Repas de famille',
    titlePattern: 'Repas de famille chez {contact}',
    needsContact: true,
    suggestedSlot: 'Midi',
    suggestedTime: '12:30'
  },
  {
    id: 'tpl-fam-visite',
    macro: 'Famille',
    category: 'Famille',
    icon: '🏠',
    label: 'Visite chez un proche',
    titlePattern: 'Visite chez {contact}',
    needsContact: true,
    suggestedSlot: 'Après-midi',
    suggestedTime: '15:30'
  },
  {
    id: 'tpl-fam-cadeaux',
    macro: 'Famille',
    category: 'Famille',
    icon: '🎁',
    label: 'Distribution des cadeaux',
    titlePattern: 'Remise des cadeaux à {contact}',
    needsContact: true,
    suggestedSlot: 'Après-midi',
    suggestedTime: '16:00'
  },

  // 2. Amis & Sorties
  {
    id: 'tpl-ami-diner',
    macro: 'Amis',
    category: 'Sorties',
    icon: '🍽️',
    label: 'Dîner entre amis',
    titlePattern: 'Dîner avec {contact}',
    needsContact: true,
    suggestedSlot: 'Soirée',
    suggestedTime: '20:00'
  },
  {
    id: 'tpl-ami-verre',
    macro: 'Amis',
    category: 'Sorties',
    icon: '🍹',
    label: 'Prendre un verre',
    titlePattern: 'Verre / Sortie avec {contact}',
    needsContact: true,
    suggestedSlot: 'Soirée',
    suggestedTime: '19:00'
  },
  {
    id: 'tpl-ami-dejeuner',
    macro: 'Amis',
    category: 'Sorties',
    icon: '🥗',
    label: 'Déjeuner informel',
    titlePattern: 'Déjeuner avec {contact}',
    needsContact: true,
    suggestedSlot: 'Midi',
    suggestedTime: '12:30'
  },

  // 3. Loisirs & Découverte
  {
    id: 'tpl-loisir-plage',
    macro: 'Loisirs',
    category: 'Loisir',
    icon: '🏖️',
    label: 'Plage & Baignade',
    titlePattern: 'Journée plage & détente',
    needsContact: false,
    suggestedSlot: 'Après-midi',
    suggestedTime: '14:30'
  },
  {
    id: 'tpl-loisir-marche',
    macro: 'Loisirs',
    category: 'Loisir',
    icon: '🛍️',
    label: 'Marché & Artisanat',
    titlePattern: 'Visite du marché local & artisanat',
    needsContact: false,
    suggestedSlot: 'Matin',
    suggestedTime: '10:00'
  },
  {
    id: 'tpl-loisir-visite',
    macro: 'Loisirs',
    category: 'Découverte',
    icon: '🏛️',
    label: 'Visite culturelle / Musée',
    titlePattern: 'Visite guidée avec {contact}',
    needsContact: true,
    suggestedSlot: 'Matin',
    suggestedTime: '09:30'
  },

  // 4. Pro & Affaires
  {
    id: 'tpl-pro-rdv',
    macro: 'Pro',
    category: 'Travail',
    icon: '💼',
    label: 'Rendez-vous professionnel',
    titlePattern: 'Rendez-vous professionnel avec {contact}',
    needsContact: true,
    suggestedSlot: 'Matin',
    suggestedTime: '10:00'
  },
  {
    id: 'tpl-pro-dej',
    macro: 'Pro',
    category: 'Travail',
    icon: '🤝',
    label: 'Déjeuner d’affaires',
    titlePattern: 'Déjeuner d’affaires avec {contact}',
    needsContact: true,
    suggestedSlot: 'Midi',
    suggestedTime: '13:00'
  },

  // 5. Logistique & Trajets
  {
    id: 'tpl-log-trajet',
    macro: 'Logistique',
    category: 'Logistique',
    icon: '🚆',
    label: 'Trajet / Déplacement',
    titlePattern: 'Trajet vers {city}',
    needsContact: false,
    suggestedSlot: 'Matin',
    suggestedTime: '08:30'
  },
  {
    id: 'tpl-log-hotel',
    macro: 'Logistique',
    category: 'Logistique',
    icon: '🏨',
    label: 'Installation hôtel / logement',
    titlePattern: 'Arrivée & installation hôtel',
    needsContact: false,
    suggestedSlot: 'Après-midi',
    suggestedTime: '15:00'
  },
  {
    id: 'tpl-log-sim',
    macro: 'Logistique',
    category: 'Logistique',
    icon: '📱',
    label: 'Achat SIM & Change',
    titlePattern: 'Achat carte SIM locale & change devises',
    needsContact: false,
    suggestedSlot: 'Matin',
    suggestedTime: '09:00'
  }
];

export class ActivityTemplates {
  /**
   * Retourne tous les modèles prédéfinis
   */
  static getAllTemplates() {
    return ACTIVITY_TEMPLATES;
  }

  /**
   * Filtre les templates selon une macro-catégorie
   */
  static getTemplatesByMacro(macroId) {
    if (!macroId || macroId === 'Tous') return ACTIVITY_TEMPLATES;
    return ACTIVITY_TEMPLATES.filter(t => t.macro === macroId);
  }

  /**
   * Recherche dynamique de templates et suggestion assistée au fil de la saisie
   */
  static searchTemplates(query, contacts = []) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return ACTIVITY_TEMPLATES.slice(0, 5);
    }

    const clean = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const results = [];

    // 1. Vérifier si la saisie mentionne un prénom de contact connu
    const matchedContact = contacts.find(c => {
      const cName = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return clean.includes(cName) || cName.includes(clean);
    });

    ACTIVITY_TEMPLATES.forEach(tpl => {
      const labelNorm = tpl.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const patternNorm = tpl.titlePattern.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const macroNorm = tpl.macro.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      let matches = labelNorm.includes(clean) || patternNorm.includes(clean) || macroNorm.includes(clean);

      if (matches || matchedContact) {
        let resolvedTitle = tpl.titlePattern;
        if (matchedContact) {
          resolvedTitle = resolvedTitle.replace('{contact}', matchedContact.name);
        } else {
          resolvedTitle = resolvedTitle.replace('{contact}', '...').replace('{city}', '...');
        }

        results.push({
          ...tpl,
          resolvedTitle,
          suggestedContact: matchedContact || null
        });
      }
    });

    return results.slice(0, 6);
  }

  /**
   * Génère le titre final à partir du modèle, d'un contact et d'une ville
   */
  static resolveTemplateTitle(template, { contactName = '', cityName = '' } = {}) {
    let title = template.titlePattern;
    if (contactName) {
      title = title.replace('{contact}', contactName.trim());
    } else {
      title = title.replace(' avec {contact}', '').replace(' chez {contact}', '').replace('{contact}', '');
    }

    if (cityName) {
      title = title.replace('{city}', cityName.trim());
    } else {
      title = title.replace(' vers {city}', '').replace('{city}', '');
    }

    return title.trim();
  }
}

export const searchTemplates = ActivityTemplates.searchTemplates;
export const resolveTemplateTitle = ActivityTemplates.resolveTemplateTitle;

