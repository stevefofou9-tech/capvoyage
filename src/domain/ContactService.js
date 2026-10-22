const generateId = () => globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : 'cnt-' + Math.random().toString(36).substring(2, 9);

export const RELATION_CIRCLES = [
  'Famille',
  'Amis',
  'Pro / Affaires',
  'Guides / Prestataires',
  'Autre'
];

export class ContactService {
  /**
   * Ajoute un nouveau contact au voyage
   */
  static addContact(trip, { name, relationship = 'Autre', phone = '', city = '', notes = '' }) {
    if (!name || !name.trim()) {
      throw new Error('Le nom du contact est obligatoire');
    }

    if (!trip.contacts) {
      trip.contacts = [];
    }

    const newContact = {
      id: generateId(),
      name: name.trim(),
      relationship: relationship ? relationship.trim() : 'Autre',
      phone: phone ? phone.trim() : '',
      city: city ? city.trim() : '',
      notes: notes ? notes.trim() : '',
      archived: false,
      createdAt: new Date().toISOString()
    };

    trip.contacts.push(newContact);
    trip.updatedAt = new Date().toISOString();
    return newContact;
  }

  /**
   * Modifie un contact
   */
  static updateContact(trip, contactId, updates) {
    const contact = trip.contacts.find(c => c.id === contactId);
    if (!contact) {
      throw new Error(`Contact introuvable avec l'id : ${contactId}`);
    }

    if (updates.name !== undefined) {
      if (!updates.name || !updates.name.trim()) {
        throw new Error('Le nom du contact ne peut pas être vide');
      }
      contact.name = updates.name.trim();
    }

    if (updates.relationship !== undefined) contact.relationship = updates.relationship.trim();
    if (updates.phone !== undefined) contact.phone = updates.phone.trim();
    if (updates.city !== undefined) contact.city = updates.city.trim();
    if (updates.notes !== undefined) contact.notes = updates.notes.trim();
    if (updates.archived !== undefined) contact.archived = Boolean(updates.archived);

    trip.updatedAt = new Date().toISOString();
    return contact;
  }

  /**
   * Recherche toutes les activités liées à un contact donné
   */
  static getContactActivities(trip, contactId) {
    const results = [];
    if (!trip.days) return results;

    trip.days.forEach(day => {
      if (day.activities) {
        day.activities.forEach(act => {
          if (act.contactIds && act.contactIds.includes(contactId)) {
            results.push({
              dayNumber: day.dayNumber,
              date: day.date,
              city: day.city,
              activity: act
            });
          }
        });
      }
    });

    return results;
  }

  /**
   * Supprime ou archive un contact de manière sécurisée (Incohérence 2)
   */
  static deleteOrArchiveContact(trip, contactId, { forceDelete = false } = {}) {
    const contactIndex = trip.contacts.findIndex(c => c.id === contactId);
    if (contactIndex === -1) {
      throw new Error(`Contact introuvable avec l'id : ${contactId}`);
    }

    const contact = trip.contacts[contactIndex];
    const linkedActivities = ContactService.getContactActivities(trip, contactId);

    if (linkedActivities.length > 0 && !forceDelete) {
      // Archivage sécurisé pour préserver l'historique
      contact.archived = true;
      trip.updatedAt = new Date().toISOString();
      return { action: 'archived', contact, linkedCount: linkedActivities.length };
    }

    // Suppression définitive : délier le contact de toutes les activités
    trip.days.forEach(day => {
      if (day.activities) {
        day.activities.forEach(act => {
          if (act.contactIds) {
            act.contactIds = act.contactIds.filter(id => id !== contactId);
          }
        });
      }
    });

    const [deleted] = trip.contacts.splice(contactIndex, 1);
    trip.updatedAt = new Date().toISOString();
    return { action: 'deleted', contact: deleted, linkedCount: linkedActivities.length };
  }

  /**
   * Trie et priorise les contacts selon la catégorie d'activité choisie (Cercles relationnels)
   */
  static getContactsForActivityCategory(trip, activityCategory = '') {
    const contacts = (trip.contacts || []).filter(c => !c.archived);
    if (!activityCategory) return contacts;

    const cat = activityCategory.toLowerCase();
    let priorityKeyword = '';
    if (cat.includes('famille')) priorityKeyword = 'famille';
    else if (cat.includes('ami')) priorityKeyword = 'ami';
    else if (cat.includes('travail') || cat.includes('pro')) priorityKeyword = 'pro';
    else if (cat.includes('loisir') || cat.includes('découverte')) priorityKeyword = 'guide';

    if (!priorityKeyword) return contacts;

    return [...contacts].sort((a, b) => {
      const aMatches = (a.relationship || '').toLowerCase().includes(priorityKeyword);
      const bMatches = (b.relationship || '').toLowerCase().includes(priorityKeyword);
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });
  }
}
