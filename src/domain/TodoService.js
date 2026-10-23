const generateId = () => globalThis.crypto.randomUUID();

export const VALID_TODO_STATUSES = ['À faire', 'En cours', 'Fait'];
export const VALID_TODO_CATEGORIES = ['Formalités', 'Santé', 'Bagages', 'Finances', 'Autre'];
export const VALID_PRIORITIES = ['Haute', 'Moyenne', 'Basse'];

export class TodoService {
  /**
   * Génère les tâches par défaut recommandées selon le pays
   */
  static createDefaultTodos(country = 'Cameroun') {
    const isCameroon = country.toLowerCase().includes('cameroun') || country.toLowerCase().includes('cameroon');

    const todos = [
      // Formalités
      {
        id: generateId(),
        title: 'Vérifier la validité du passeport (> 6 mois après retour)',
        category: 'Formalités',
        priority: 'Haute',
        status: 'À faire',
        notes: 'Indispensable pour la délivrance du visa.'
      },
      {
        id: generateId(),
        title: 'Demande et obtention du Visa',
        category: 'Formalités',
        priority: 'Haute',
        status: 'À faire',
        notes: isCameroon ? 'E-visa pour le Cameroun via evisacam.cm' : 'Visa touristique'
      },
      {
        id: generateId(),
        title: 'Billets d’avion aller-retour',
        category: 'Formalités',
        priority: 'Haute',
        status: 'À faire',
        notes: 'Imprimer ou sauvegarder le PDF sur smartphone'
      },
      {
        id: generateId(),
        title: 'Assurance voyage & assistance rapatriement',
        category: 'Formalités',
        priority: 'Moyenne',
        status: 'À faire',
        notes: 'Attestation d’assurance obligatoire pour le visa'
      },

      // Santé
      {
        id: generateId(),
        title: 'Vaccin Fièvre Jaune (carnet jaune obligatoire)',
        category: 'Santé',
        priority: 'Haute',
        status: 'À faire',
        notes: 'Exigé à l’arrivée à Douala / Yaoundé. Doit être fait au moins 10 jours avant.'
      },
      {
        id: generateId(),
        title: 'Traitement préventif Paludisme (Malarone/Doxycycline)',
        category: 'Santé',
        priority: 'Haute',
        status: 'À faire',
        notes: 'Consulter un médecin pour l’ordonnance et démarrer la veille du départ.'
      },
      {
        id: generateId(),
        title: 'Répulsif moustiques zone tropicale 50% DEET',
        category: 'Santé',
        priority: 'Haute',
        status: 'À faire',
        notes: 'Format spray pour la peau et les vêtements'
      },
      {
        id: generateId(),
        title: 'Trousse de premiers secours & désinfectant',
        category: 'Santé',
        priority: 'Moyenne',
        status: 'À faire',
        notes: 'Pansements, antidiarrhéique, paracétamol, thermomètre'
      },

      // Bagages
      {
        id: generateId(),
        title: 'Vêtements légers en coton / lin & tenue de pluie',
        category: 'Bagages',
        priority: 'Moyenne',
        status: 'À faire',
        notes: 'Climat chaud et humide'
      },
      {
        id: generateId(),
        title: 'Adaptateur prises universel & batterie externe (Powerbank)',
        category: 'Bagages',
        priority: 'Moyenne',
        status: 'À faire',
        notes: 'Utile pour les trajets longs et coupures d’énergie'
      },
      {
        id: generateId(),
        title: 'Cadeaux pour la famille et les amis sur place',
        category: 'Bagages',
        priority: 'Moyenne',
        status: 'À faire',
        notes: 'Chocolats, parfums ou spécialités'
      },

      // Finances
      {
        id: generateId(),
        title: 'Prévoir espèces de réserve (Euros à changer en FCFA)',
        category: 'Finances',
        priority: 'Haute',
        status: 'À faire',
        notes: 'Billets d’euros propres sans déchirure'
      },
      {
        id: generateId(),
        title: 'Informer sa banque du voyage au Cameroun',
        category: 'Finances',
        priority: 'Moyenne',
        status: 'À faire',
        notes: 'Éviter le blocage préventif de la carte bancaire'
      },
      {
        id: generateId(),
        title: 'Acheter carte SIM locale à l’arrivée (Orange ou MTN)',
        category: 'Finances',
        priority: 'Haute',
        status: 'À faire',
        notes: 'Aéroport ou agence officielle avec pièce d’identité'
      }
    ];

    return todos;
  }

  /**
   * Ajoute une nouvelle tâche personnalisée
   */
  static addTodo(todos, { title, category = 'Autre', priority = 'Moyenne', dueDate = null, notes = '' }) {
    if (!title || !title.trim()) {
      throw new Error('Le titre de la tâche est obligatoire');
    }

    const newTodo = {
      id: generateId(),
      title: title.trim(),
      category: VALID_TODO_CATEGORIES.includes(category) ? category : 'Autre',
      priority: VALID_PRIORITIES.includes(priority) ? priority : 'Moyenne',
      status: 'À faire',
      dueDate: dueDate || null,
      notes: notes ? notes.trim() : ''
    };

    todos.push(newTodo);
    return newTodo;
  }

  /**
   * Met à jour le statut d'une tâche
   */
  static updateTodoStatus(todos, id, newStatus) {
    if (!VALID_TODO_STATUSES.includes(newStatus)) {
      throw new Error(`Statut invalide : ${newStatus}. Statuts valides : ${VALID_TODO_STATUSES.join(', ')}`);
    }

    const todo = todos.find(t => t.id === id);
    if (!todo) {
      throw new Error(`Tâche introuvable avec l'id : ${id}`);
    }

    todo.status = newStatus;
    return todo;
  }

  /**
   * Modifie l'ensemble des champs d'une tâche
   */
  static updateTodo(todos, id, updates = {}) {
    const todo = todos.find(t => t.id === id);
    if (!todo) {
      throw new Error(`Tâche introuvable avec l'id : ${id}`);
    }

    if (updates.title !== undefined) {
      if (!updates.title || !updates.title.trim()) {
        throw new Error('Le titre de la tâche ne peut pas être vide');
      }
      todo.title = updates.title.trim();
    }

    if (updates.category !== undefined) {
      todo.category = VALID_TODO_CATEGORIES.includes(updates.category) ? updates.category : 'Autre';
    }

    if (updates.priority !== undefined) {
      todo.priority = VALID_PRIORITIES.includes(updates.priority) ? updates.priority : 'Moyenne';
    }

    if (updates.status !== undefined) {
      if (!VALID_TODO_STATUSES.includes(updates.status)) {
        throw new Error(`Statut invalide : ${updates.status}. Statuts valides : ${VALID_TODO_STATUSES.join(', ')}`);
      }
      todo.status = updates.status;
    }

    if (updates.dueDate !== undefined) {
      todo.dueDate = updates.dueDate || null;
    }

    if (updates.notes !== undefined) {
      todo.notes = updates.notes ? updates.notes.trim() : '';
    }

    return todo;
  }

  /**
   * Supprime une tâche
   */
  static deleteTodo(todos, id) {
    const index = todos.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error(`Tâche introuvable avec l'id : ${id}`);
    }
    const [deleted] = todos.splice(index, 1);
    return deleted;
  }

  /**
   * Calcule le taux d'avancement
   */
  static calculateProgress(todos) {
    if (!todos || todos.length === 0) {
      return { total: 0, completed: 0, inProgress: 0, todo: 0, percentage: 0 };
    }

    const total = todos.length;
    const completed = todos.filter(t => t.status === 'Fait').length;
    const inProgress = todos.filter(t => t.status === 'En cours').length;
    const todo = todos.filter(t => t.status === 'À faire').length;
    const percentage = Math.round((completed / total) * 100);

    return { total, completed, inProgress, todo, percentage };
  }

  /**
   * Filtre les tâches par catégorie
   */
  static filterByCategory(todos, category) {
    if (!category || category === 'Tous') return [...todos];
    return todos.filter(t => t.category.toLowerCase() === category.toLowerCase());
  }
}
