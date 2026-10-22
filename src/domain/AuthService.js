const generateId = () => globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : 'usr-' + Math.random().toString(36).substring(2, 9);
const generateToken = () => globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID().replace(/-/g, '') + globalThis.crypto.randomUUID().replace(/-/g, '') : 'tok-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

export class AuthService {
  /**
   * Normalise une adresse email
   */
  static normalizeEmail(email) {
    if (!email || typeof email !== 'string') return '';
    return email.trim().toLowerCase();
  }

  /**
   * Valide le format d'une adresse email
   */
  static isValidEmail(email) {
    const norm = AuthService.normalizeEmail(email);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm);
  }

  /**
   * Génère un code à 6 chiffres
   */
  static generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Demande un code d'authentification par email
   * @param {Array} users - Liste d'utilisateurs
   * @param {string} email - Email
   * @param {Object} options - Options (isProduction, etc.)
   */
  static requestLoginCode(users, email, options = {}) {
    const normEmail = AuthService.normalizeEmail(email);
    if (!AuthService.isValidEmail(normEmail)) {
      throw new Error('Adresse email invalide');
    }

    let user = users.find(u => u.email === normEmail);
    const isNew = !user;
    if (!user) {
      user = {
        id: generateId(),
        email: normEmail,
        createdAt: new Date().toISOString(),
        sessionToken: null,
        verificationCode: null,
        codeExpiresAt: null,
        failedAttempts: 0,
        isNewUser: true,
        currentTripId: null,
        trips: []
      };
      users.push(user);
    } else {
      user.isNewUser = !user.currentTripId && (!user.trips || user.trips.length === 0);
    }

    const code = AuthService.generateCode();
    // Expiration à 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    user.verificationCode = code;
    user.codeExpiresAt = expiresAt;
    user.failedAttempts = 0;

    const isProd = options.isProduction !== undefined 
      ? options.isProduction 
      : (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');

    const result = {
      success: true,
      email: normEmail,
      message: `Code de vérification généré pour ${normEmail}`
    };

    if (!isProd) {
      result.devCode = code;
    }

    return result;
  }

  /**
   * Vérifie le code à 6 chiffres et génère un jeton de session
   */
  static verifyCode(users, email, inputCode) {
    const normEmail = AuthService.normalizeEmail(email);
    const user = users.find(u => u.email === normEmail);

    if (!user) {
      throw new Error('Utilisateur introuvable pour cette adresse email');
    }

    if (user.failedAttempts >= 5) {
      user.verificationCode = null;
      user.codeExpiresAt = null;
      throw new Error('Nombre maximal de tentatives de validation atteint (5). Veuillez demander un nouveau code');
    }

    if (!user.verificationCode || !inputCode) {
      throw new Error('Aucun code en attente de validation');
    }

    if (new Date() > new Date(user.codeExpiresAt)) {
      user.verificationCode = null;
      user.codeExpiresAt = null;
      throw new Error('Le code a expiré, veuillez en demander un nouveau');
    }

    if (user.verificationCode !== inputCode.toString().trim()) {
      user.failedAttempts = (user.failedAttempts || 0) + 1;
      if (user.failedAttempts >= 5) {
        user.verificationCode = null;
        user.codeExpiresAt = null;
        throw new Error('Nombre maximal de tentatives de validation atteint (5). Veuillez demander un nouveau code');
      }
      throw new Error('Code de vérification incorrect');
    }

    // Code valide : réinitialisation des tentatives et création du token de session sécurisé
    user.failedAttempts = 0;
    const token = generateToken();
    user.sessionToken = token;
    user.verificationCode = null;
    user.codeExpiresAt = null;
    user.lastLoginAt = new Date().toISOString();

    const hasTrip = !!(user.currentTripId || (user.trips && user.trips.length > 0));
    const isNew = user.isNewUser !== undefined ? user.isNewUser : !hasTrip;

    return {
      success: true,
      token,
      email: user.email,
      isNewUser: isNew,
      hasTrip,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        tripsCount: user.trips ? user.trips.length : 0,
        hasTrip
      }
    };
  }

  /**
   * Valide une session par son jeton
   */
  static validateSession(users, token) {
    if (!token) return null;
    const user = users.find(u => u.sessionToken === token);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      trips: user.trips || []
    };
  }

  /**
   * Déconnexion d'un utilisateur
   */
  static logout(users, token) {
    if (!token) return false;
    const user = users.find(u => u.sessionToken === token);
    if (!user) return false;

    user.sessionToken = null;
    return true;
  }

  /**
   * Retourne l'utilisateur complet associé au jeton de session
   */
  static getUser(users, token) {
    if (!token) return null;
    return users.find(u => u.sessionToken === token) || null;
  }

  /**
   * Bascule le voyage actif de l'utilisateur
   */
  static switchCurrentTrip(users, token, tripId) {
    const user = AuthService.getUser(users, token);
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }
    if (!user.trips || !user.trips.includes(tripId)) {
      throw new Error(`Voyage introuvable ou non associé à ce compte : ${tripId}`);
    }
    user.currentTripId = tripId;
    return { success: true, currentTripId: tripId };
  }

  /**
   * Associe un nouveau voyage au compte utilisateur
   */
  static addTripToUser(users, token, tripId) {
    const user = AuthService.getUser(users, token);
    if (!user) return null;
    if (!user.trips) user.trips = [];
    if (!user.trips.includes(tripId)) {
      user.trips.push(tripId);
    }
    user.currentTripId = tripId;
    user.isNewUser = false;
    return user;
  }

  /**
   * Supprime un voyage de la liste de l'utilisateur
   */
  static deleteTripFromUser(users, token, tripId) {
    const user = AuthService.getUser(users, token);
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }
    if (user.trips) {
      user.trips = user.trips.filter(id => id !== tripId);
    }
    if (user.currentTripId === tripId) {
      user.currentTripId = user.trips && user.trips.length > 0 ? user.trips[0] : null;
    }
    return { success: true, remainingTrips: user.trips, currentTripId: user.currentTripId };
  }

  /**
   * Retourne le carnet d'adresses global de l'utilisateur
   */
  static getGlobalContacts(users, token) {
    const user = AuthService.getUser(users, token);
    if (!user) return [];
    return user.globalContacts || [];
  }

  /**
   * Ajoute ou met à jour un contact dans le carnet d'adresses global du compte
   */
  static addGlobalContact(users, token, contact) {
    const user = AuthService.getUser(users, token);
    if (!user) return null;
    if (!user.globalContacts) user.globalContacts = [];

    const existingIdx = user.globalContacts.findIndex(c => c.id === contact.id || c.name.toLowerCase() === contact.name.toLowerCase());
    if (existingIdx !== -1) {
      user.globalContacts[existingIdx] = { ...user.globalContacts[existingIdx], ...contact };
    } else {
      user.globalContacts.push({
        id: contact.id || generateId(),
        name: contact.name,
        relationship: contact.relationship || 'Autre',
        phone: contact.phone || '',
        city: contact.city || '',
        notes: contact.notes || '',
        createdAt: new Date().toISOString()
      });
    }
    return user.globalContacts;
  }

  /**
   * Crée une session démo factice
   */
  static createDemoSession() {
    return {
      token: 'demo-token-' + Date.now(),
      email: 'demo@capvoyage.com',
      isDemo: true
    };
  }
}
