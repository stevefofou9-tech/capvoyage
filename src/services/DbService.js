import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_SLIDE_INTERVAL_MS = 60 * 60 * 1000;

export class DbService {
  /**
   * @param {string} dbPath - Chemin vers le fichier SQLite ou ':memory:'
   */
  constructor(dbPath = ':memory:') {
    this.dbPath = dbPath;
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.db = new DatabaseSync(dbPath);
    this.initSchema();
  }

  /**
   * Initialise les tables, index et pragmas de performance/sécurité
   */
  initSchema() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL,
        last_login_at TEXT,
        session_token TEXT,
        verification_code TEXT,
        code_expires_at TEXT,
        failed_attempts INTEGER DEFAULT 0,
        current_trip_id TEXT,
        trips_json TEXT DEFAULT '[]',
        global_contacts TEXT DEFAULT '[]'
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_session_token ON users(session_token);

      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT NOT NULL,
        country TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        base_currency TEXT NOT NULL,
        total_budget REAL NOT NULL,
        share_token TEXT,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
      CREATE INDEX IF NOT EXISTS idx_trips_share_token ON trips(share_token);

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL,
        first_attempt_at INTEGER NOT NULL,
        blocked_until INTEGER DEFAULT 0
      );
    `);
  }

  // ==========================================
  // GESTION DES UTILISATEURS
  // ==========================================

  getUserByEmail(email) {
    if (!email) return null;
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email.trim().toLowerCase());
    return this._mapUserRow(row);
  }

  getUserById(id) {
    if (!id) return null;
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id);
    return this._mapUserRow(row);
  }

  getUserBySessionToken(token) {
    if (!token) return null;
    const stmt = this.db.prepare('SELECT * FROM users WHERE session_token = ?');
    const row = stmt.get(token);
    return this._mapUserRow(row);
  }

  getAllUsers() {
    const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at ASC');
    const rows = stmt.all();
    return rows.map(r => this._mapUserRow(r));
  }

  saveUser(user) {
    if (!user || !user.id || !user.email) {
      throw new Error('Utilisateur invalide (id et email requis)');
    }

    const email = user.email.trim().toLowerCase();
    const tripsJson = JSON.stringify(user.trips || []);
    const globalContacts = JSON.stringify(user.globalContacts || []);

    const stmt = this.db.prepare(`
      INSERT INTO users (
        id, email, created_at, last_login_at, session_token,
        verification_code, code_expires_at, failed_attempts,
        current_trip_id, trips_json, global_contacts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        last_login_at = excluded.last_login_at,
        verification_code = excluded.verification_code,
        code_expires_at = excluded.code_expires_at,
        failed_attempts = excluded.failed_attempts,
        current_trip_id = excluded.current_trip_id,
        trips_json = excluded.trips_json,
        global_contacts = excluded.global_contacts
    `);

    stmt.run(
      user.id,
      email,
      user.createdAt || new Date().toISOString(),
      user.lastLoginAt || null,
      null,
      user.verificationCode || null,
      user.codeExpiresAt || null,
      user.failedAttempts || 0,
      user.currentTripId || null,
      tripsJson,
      globalContacts
    );

    return user;
  }

  _mapUserRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      sessionToken: row.session_token,
      verificationCode: row.verification_code,
      codeExpiresAt: row.code_expires_at,
      failedAttempts: row.failed_attempts || 0,
      currentTripId: row.current_trip_id,
      trips: JSON.parse(row.trips_json || '[]'),
      globalContacts: JSON.parse(row.global_contacts || '[]')
    };
  }

  // ==========================================
  // GESTION DES VOYAGES
  // ==========================================

  getTripById(id) {
    if (!id) return null;
    const stmt = this.db.prepare('SELECT * FROM trips WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;
    return JSON.parse(row.data);
  }

  getTripByShareToken(shareToken) {
    if (!shareToken) return null;
    const stmt = this.db.prepare('SELECT * FROM trips WHERE share_token = ?');
    const row = stmt.get(shareToken);
    if (!row) return null;
    return JSON.parse(row.data);
  }

  getTripsByUserId(userId) {
    if (!userId) return [];
    const stmt = this.db.prepare('SELECT data FROM trips WHERE user_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(userId);
    return rows.map(r => JSON.parse(r.data));
  }

  saveTrip(trip, userId = null) {
    if (!trip || !trip.id) {
      throw new Error('Voyage invalide (id requis)');
    }

    const targetUserId = userId || trip.userId || null;
    trip.userId = targetUserId;
    const now = new Date().toISOString();
    const createdAt = trip.createdAt || now;
    const updatedAt = trip.updatedAt || now;

    const stmt = this.db.prepare(`
      INSERT INTO trips (
        id, user_id, title, country, start_date, end_date,
        base_currency, total_budget, share_token, data,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        title = excluded.title,
        country = excluded.country,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        base_currency = excluded.base_currency,
        total_budget = excluded.total_budget,
        share_token = excluded.share_token,
        data = excluded.data,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      trip.id,
      targetUserId,
      trip.title || 'Sans titre',
      trip.country || '',
      trip.startDate || '',
      trip.endDate || '',
      trip.baseCurrency || 'EUR',
      trip.totalBudget || 0,
      (trip.sharing ? (trip.sharing.enabled ? trip.sharing.token : null) : trip.shareToken) || null,
      JSON.stringify(trip),
      createdAt,
      updatedAt
    );

    return trip;
  }

  // ==========================================
  // PROTECTION BRUTE-FORCE & RATE LIMITING
  // ==========================================

  // ==========================================
  // SESSIONS MULTI-APPAREILS (ADR-004)
  // ==========================================

  /**
   * Crée une session pour un utilisateur, valable `ttlMs` (30 jours par défaut)
   */
  createSession(userId, token, nowMs = Date.now(), ttlMs = SESSION_TTL_MS) {
    const now = new Date(nowMs).toISOString();
    this.purgeExpiredSessions(nowMs);
    this.db.prepare('INSERT INTO sessions (token, user_id, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?)')
      .run(token, userId, now, now, new Date(nowMs + ttlMs).toISOString());
    return token;
  }

  /**
   * Retourne l'utilisateur d'une session valide (expiration glissante, prolongée au plus une fois par heure)
   */
  getSessionUser(token, nowMs = Date.now(), ttlMs = SESSION_TTL_MS) {
    if (!token) return null;
    const row = this.db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
    if (!row) return null;
    if (Date.parse(row.expires_at) <= nowMs) {
      this.deleteSession(token);
      return null;
    }
    if (nowMs - Date.parse(row.last_seen_at) > SESSION_SLIDE_INTERVAL_MS) {
      this.db.prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE token = ?')
        .run(new Date(nowMs).toISOString(), new Date(nowMs + ttlMs).toISOString(), token);
    }
    const user = this.getUserById(row.user_id);
    if (!user) return null;
    user.sessionToken = token;
    return user;
  }

  deleteSession(token) {
    if (!token) return false;
    return this.db.prepare('DELETE FROM sessions WHERE token = ?').run(token).changes > 0;
  }

  purgeExpiredSessions(nowMs = Date.now()) {
    this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date(nowMs).toISOString());
  }

  /**
   * Migration idempotente : l'ancien jeton unique `users.session_token` devient une session
   */
  migrateLegacySessions(nowMs = Date.now()) {
    const rows = this.db.prepare('SELECT id, session_token FROM users WHERE session_token IS NOT NULL').all();
    for (const row of rows) {
      const exists = this.db.prepare('SELECT 1 FROM sessions WHERE token = ?').get(row.session_token);
      if (!exists) this.createSession(row.id, row.session_token, nowMs);
    }
    this.db.prepare('UPDATE users SET session_token = NULL WHERE session_token IS NOT NULL').run();
    return rows.length;
  }

  /**
   * Vérifie et met à jour le rate limiting pour une clé donnée
   * @param {string} key - Identifiant (ex: 'login:ip:127.0.0.1' ou 'login:email:foo@bar.com')
   * @param {number} maxAttempts - Nombre max d'essais autorisés dans la fenêtre
   * @param {number} windowMs - Durée de la fenêtre en millisecondes
   * @param {number} blockDurationMs - Durée de blocage si dépassé
   * @returns {{ allowed: boolean, remaining: number, retryAfterSeconds: number }}
   */
  checkRateLimit(key, maxAttempts = 5, windowMs = 15 * 60 * 1000, blockDurationMs = 15 * 60 * 1000) {
    const now = Date.now();
    const selectStmt = this.db.prepare('SELECT * FROM rate_limits WHERE key = ?');
    const record = selectStmt.get(key);

    if (record) {
      if (record.blocked_until && now < record.blocked_until) {
        const retryAfterSeconds = Math.ceil((record.blocked_until - now) / 1000);
        return { allowed: false, remaining: 0, retryAfterSeconds };
      }

      if (now - record.first_attempt_at > windowMs) {
        // Fenêtre expirée, réinitialisation
        const resetStmt = this.db.prepare('UPDATE rate_limits SET attempts = 1, first_attempt_at = ?, blocked_until = 0 WHERE key = ?');
        resetStmt.run(now, key);
        return { allowed: true, remaining: maxAttempts - 1, retryAfterSeconds: 0 };
      }

      const nextAttempts = record.attempts + 1;
      if (nextAttempts > maxAttempts) {
        const blockedUntil = now + blockDurationMs;
        const blockStmt = this.db.prepare('UPDATE rate_limits SET attempts = ?, blocked_until = ? WHERE key = ?');
        blockStmt.run(nextAttempts, blockedUntil, key);
        return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(blockDurationMs / 1000) };
      }

      const updateStmt = this.db.prepare('UPDATE rate_limits SET attempts = ? WHERE key = ?');
      updateStmt.run(nextAttempts, key);
      return { allowed: true, remaining: maxAttempts - nextAttempts, retryAfterSeconds: 0 };
    }

    // Premier essai
    const insertStmt = this.db.prepare('INSERT INTO rate_limits (key, attempts, first_attempt_at, blocked_until) VALUES (?, 1, ?, 0)');
    insertStmt.run(key, now);
    return { allowed: true, remaining: maxAttempts - 1, retryAfterSeconds: 0 };
  }

  resetRateLimit(key) {
    const stmt = this.db.prepare('DELETE FROM rate_limits WHERE key = ?');
    stmt.run(key);
  }

  // ==========================================
  // AUTO-MIGRATION DEPUIS LES FICHIERS JSON
  // ==========================================

  /**
   * Importe automatiquement les utilisateurs et voyages existants depuis les fichiers JSON s'ils ne sont pas déjà en base.
   */
  autoMigrateFromJson(dataDir) {
    if (!fs.existsSync(dataDir)) return { migratedUsers: 0, migratedTrips: 0 };

    let migratedUsers = 0;
    let migratedTrips = 0;

    // 1. Migration users.json
    const usersFile = path.join(dataDir, 'users.json');
    if (fs.existsSync(usersFile)) {
      try {
        const raw = fs.readFileSync(usersFile, 'utf-8');
        const users = JSON.parse(raw);
        if (Array.isArray(users)) {
          for (const u of users) {
            if (u.id && u.email && !this.getUserById(u.id)) {
              this.saveUser(u);
              migratedUsers++;
            }
          }
        }
      } catch (err) {
        console.warn('[DbService] Erreur lors de la migration users.json:', err.message);
      }
    }

    // 2. Migration des voyages individuels dans data/trips/*.json
    const tripsDir = path.join(dataDir, 'trips');
    if (fs.existsSync(tripsDir)) {
      const files = fs.readdirSync(tripsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const raw = fs.readFileSync(path.join(tripsDir, file), 'utf-8');
            const trip = JSON.parse(raw);
            if (trip && trip.id && !this.getTripById(trip.id)) {
              this.saveTrip(trip, trip.userId);
              migratedTrips++;
            }
          } catch (err) {
            console.warn(`[DbService] Erreur lors de la migration ${file}:`, err.message);
          }
        }
      }
    }

    return { migratedUsers, migratedTrips };
  }

  close() {
    this.db.close();
  }
}
