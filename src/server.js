import http from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { StorageService } from './domain/StorageService.js';
import { AuthService } from './domain/AuthService.js';
import { TripService } from './domain/TripService.js';
import { TodoService } from './domain/TodoService.js';
import { BudgetEngine } from './domain/BudgetEngine.js';
import { createInitialSeedTrip } from './seed.js';
import { DbService } from './services/DbService.js';
import { EmailService } from './services/EmailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'trip_cameroun.json');
const DEMO_FILE = path.join(DATA_DIR, 'trip_cameroun.json');
const TRIPS_DIR = path.join(DATA_DIR, 'trips');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const UI_DIR = path.join(__dirname, 'ui');
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// Initialisation de la persistance SQLite (Option B) avec mode WAL
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'capvoyage.db');
const dbService = new DbService(DB_PATH);
const emailService = new EmailService({ isProduction: IS_PRODUCTION });

// Migration automatique des données JSON existantes vers SQLite au premier démarrage
const migrationStats = dbService.autoMigrateFromJson(DATA_DIR);
if (migrationStats.migratedUsers > 0 || migrationStats.migratedTrips > 0) {
  console.log(`[CapVoyage DbService] Migration SQLite réussie : ${migrationStats.migratedUsers} utilisateurs, ${migrationStats.migratedTrips} voyages.`);
}

function getUserTripFilePath(userId) {
  return path.join(TRIPS_DIR, `trip_${userId}.json`);
}

function getClientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
}

function getSessionFromReq(req, users) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  return AuthService.validateSession(users, token);
}

// Types MIME supportés
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

// Chargement des utilisateurs (depuis SQLite avec fallback/miroir JSON)
async function loadUsers() {
  const dbUsers = dbService.getAllUsers();
  if (dbUsers.length > 0) {
    return dbUsers;
  }
  try {
    const content = await fs.readFile(USERS_FILE, 'utf-8');
    const users = JSON.parse(content);
    if (Array.isArray(users)) {
      users.forEach(u => dbService.saveUser(u));
    }
    return users;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

// Sauvegarde des utilisateurs (SQLite + miroir atomique users.json)
async function saveUsers(users) {
  for (const u of users) {
    dbService.saveUser(u);
  }
  const dir = path.dirname(USERS_FILE);
  await fs.mkdir(dir, { recursive: true });
  const tempPath = `${USERS_FILE}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(users, null, 2), 'utf-8');
  await fs.rename(tempPath, USERS_FILE);
}

// En-têtes de sécurité HTTP de niveau production
function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=()'
  };
}

// Récupère le body JSON d'une requête avec limitation de taille (protection DoS)
function parseRequestBody(req, maxBytes = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        req.destroy();
        return reject(new Error('Charge utile trop volumineuse (limite : 5 Mo)'));
      }
      body += chunk;
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Corps de requête JSON invalide : ' + err.message));
      }
    });
    req.on('error', reject);
  });
}

// Envoi de réponse JSON avec en-têtes sécurisés
function sendJson(res, statusCode, data) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...getSecurityHeaders()
  };
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(data));
}

// Serveur principal HTTP
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Gestion des requêtes OPTIONS (CORS)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...getSecurityHeaders()
    });
    return res.end();
  }

  try {
    // --- HEALTH CHECK / PROBES ---
    if ((pathname === '/health' || pathname === '/api/health') && req.method === 'GET') {
      return sendJson(res, 200, {
        status: 'ok',
        uptime: Math.round(process.uptime()),
        environment: IS_PRODUCTION ? 'production' : 'development',
        database: 'sqlite-wal',
        timestamp: new Date().toISOString()
      });
    }

    // --- API ROUTES : AUTH & COMPTES ---
    if (pathname === '/api/auth/request-code' && req.method === 'POST') {
      const clientIp = getClientIp(req);
      const rl = dbService.checkRateLimit(`req_code:${clientIp}`, 5, 15 * 60 * 1000, 15 * 60 * 1000);
      if (!rl.allowed) {
        return sendJson(res, 429, {
          error: `Trop de demandes de code. Veuillez patienter ${rl.retryAfterSeconds} secondes.`,
          retryAfterSeconds: rl.retryAfterSeconds
        });
      }

      const { email } = await parseRequestBody(req);
      const users = await loadUsers();
      const result = AuthService.requestLoginCode(users, email, { isProduction: IS_PRODUCTION });
      await saveUsers(users);

      // Envoi du mail transactionnel
      const user = users.find(u => u.email === AuthService.normalizeEmail(email));
      if (user && user.verificationCode) {
        await emailService.sendLoginCode(user.email, user.verificationCode).catch(err => {
          console.error('[EmailService] Erreur transmission e-mail:', err.message);
        });
      }

      return sendJson(res, 200, result);
    }

    if (pathname === '/api/auth/verify-code' && req.method === 'POST') {
      const clientIp = getClientIp(req);
      const rl = dbService.checkRateLimit(`verify_code:${clientIp}`, 10, 15 * 60 * 1000, 15 * 60 * 1000);
      if (!rl.allowed) {
        return sendJson(res, 429, {
          error: `Trop de tentatives de validation. Veuillez patienter ${rl.retryAfterSeconds} secondes.`,
          retryAfterSeconds: rl.retryAfterSeconds
        });
      }

      const { email, code } = await parseRequestBody(req);
      const users = await loadUsers();
      try {
        const result = AuthService.verifyCode(users, email, code);
        await saveUsers(users);
        return sendJson(res, 200, result);
      } catch (err) {
        await saveUsers(users);
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const users = await loadUsers();
      const session = AuthService.validateSession(users, token);
      if (!session) {
        return sendJson(res, 401, { error: 'Session invalide ou expirée' });
      }
      return sendJson(res, 200, { success: true, user: session });
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const users = await loadUsers();
      AuthService.logout(users, token);
      await saveUsers(users);
      return sendJson(res, 200, { success: true, message: 'Déconnecté avec succès' });
    }

    // --- API ROUTES : VOYAGES & WIZARD ---
    if (pathname === '/api/user/trips' && req.method === 'GET') {
      const users = await loadUsers();
      const session = getSessionFromReq(req, users);
      if (!session) {
        return sendJson(res, 401, { error: 'Session non authentifiée' });
      }

      const user = users.find(u => u.id === session.id);
      const tripIds = user?.trips || [];
      const summaries = [];

      for (const tid of tripIds) {
        try {
          let t = dbService.getTripById(tid);
          if (!t) {
            const specificPath = path.join(TRIPS_DIR, `trip_${tid}.json`);
            t = await StorageService.loadFromFile(specificPath).catch(() => null);
          }

          if (t) {
            summaries.push({
              id: t.id,
              title: t.title,
              country: t.country,
              startDate: t.startDate,
              endDate: t.endDate,
              totalBudget: t.totalBudget,
              baseCurrency: t.baseCurrency,
              daysCount: (t.days || []).length,
              activitiesCount: (t.days || []).reduce((acc, d) => acc + (d.activities || []).length, 0),
              isActive: t.id === user.currentTripId
            });
          }
        } catch (err) {}
      }

      return sendJson(res, 200, {
        success: true,
        trips: summaries,
        currentTripId: user?.currentTripId,
        userEmail: user?.email
      });
    }

    if (pathname === '/api/user/trips/switch' && req.method === 'POST') {
      const { tripId } = await parseRequestBody(req);
      const users = await loadUsers();
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();

      try {
        AuthService.switchCurrentTrip(users, token, tripId);
        await saveUsers(users);

        let trip = dbService.getTripById(tripId);
        if (!trip) {
          trip = await StorageService.loadFromFile(path.join(TRIPS_DIR, `trip_${tripId}.json`));
        }

        return sendJson(res, 200, { success: true, trip, currentTripId: tripId });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    if (pathname === '/api/user/contacts') {
      const users = await loadUsers();
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();

      if (req.method === 'GET') {
        const contacts = AuthService.getGlobalContacts(users, token);
        return sendJson(res, 200, { success: true, contacts });
      }

      if (req.method === 'POST') {
        const contact = await parseRequestBody(req);
        AuthService.addGlobalContact(users, token, contact);
        await saveUsers(users);
        return sendJson(res, 200, { success: true, contacts: AuthService.getGlobalContacts(users, token) });
      }
    }

    if (pathname === '/api/wizard/trip' && req.method === 'POST') {
      const payload = await parseRequestBody(req);
      const users = await loadUsers();
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const session = getSessionFromReq(req, users);
      const newTrip = TripService.createTripFromWizard(payload);
      newTrip.todos = TodoService.createDefaultTodos(payload.country);

      if (session) {
        newTrip.userId = session.id;
        // Sauvegarde SQLite
        dbService.saveTrip(newTrip, session.id);

        // Sauvegarde miroir fichier JSON
        await fs.mkdir(TRIPS_DIR, { recursive: true });
        await StorageService.saveToFile(newTrip, path.join(TRIPS_DIR, `trip_${newTrip.id}.json`));
        await StorageService.saveToFile(newTrip, getUserTripFilePath(session.id));

        // Mettre à jour l'utilisateur
        AuthService.addTripToUser(users, token, newTrip.id);
        if (Array.isArray(payload.initialContacts)) {
          payload.initialContacts.forEach(c => AuthService.addGlobalContact(users, token, c));
        }
        await saveUsers(users);
      } else {
        dbService.saveTrip(newTrip, null);
        await StorageService.saveToFile(newTrip, DEMO_FILE);
      }

      return sendJson(res, 200, { success: true, trip: newTrip });
    }

    if (pathname === '/api/trip/budget' && req.method === 'POST') {
      const { totalBudget, baseCurrency, localRate } = await parseRequestBody(req);
      const users = await loadUsers();
      const session = getSessionFromReq(req, users);
      const user = session ? users.find(u => u.id === session.id) : null;
      let trip = null;
      let tripFile = DEMO_FILE;

      if (user && user.currentTripId) {
        trip = dbService.getTripById(user.currentTripId);
        tripFile = path.join(TRIPS_DIR, `trip_${user.currentTripId}.json`);
      }

      if (!trip) {
        trip = await StorageService.loadFromFile(tripFile).catch(() => null);
      }

      if (!trip) {
        return sendJson(res, 404, { error: 'Aucun voyage trouvé' });
      }

      TripService.updateTripBudget(trip, { totalBudget, baseCurrency });
      if (localRate && trip.currencies) {
        const secondary = trip.currencies.find(c => c.code !== (trip.baseCurrency || 'EUR'));
        if (secondary) {
          BudgetEngine.setCurrencyRate(trip, secondary.code, localRate);
        }
      }

      // Persistance SQLite + Fichier
      dbService.saveTrip(trip, trip.userId);
      await StorageService.saveToFile(trip, tripFile);
      return sendJson(res, 200, { success: true, trip });
    }

    if (pathname === '/api/trip') {
      const users = await loadUsers();
      const session = getSessionFromReq(req, users);
      const user = session ? users.find(u => u.id === session.id) : null;

      if (req.method === 'GET') {
        // 1. Mode Partage en Lecture Seule (?share=token)
        const shareToken = url.searchParams.get('share');
        if (shareToken) {
          let trip = dbService.getTripByShareToken(shareToken);
          if (!trip) {
            // Recherche de secours dans les fichiers
            const files = await fs.readdir(TRIPS_DIR).catch(() => []);
            for (const f of files) {
              if (f.endsWith('.json')) {
                const candidate = await StorageService.loadFromFile(path.join(TRIPS_DIR, f)).catch(() => null);
                if (candidate && candidate.shareToken === shareToken) {
                  trip = candidate;
                  dbService.saveTrip(trip, trip.userId);
                  break;
                }
              }
            }
          }
          if (trip) {
            return sendJson(res, 200, { ...trip, isReadOnly: true });
          } else {
            return sendJson(res, 404, { error: 'Voyage introuvable pour ce lien de partage' });
          }
        }

        // 2. Utilisateur authentifié : charger son voyage actif
        if (session) {
          let userTrip = null;
          if (user?.currentTripId) {
            userTrip = dbService.getTripById(user.currentTripId);
            if (!userTrip) {
              userTrip = await StorageService.loadFromFile(path.join(TRIPS_DIR, `trip_${user.currentTripId}.json`)).catch(() => null);
            }
          }
          if (!userTrip) {
            userTrip = await StorageService.loadFromFile(getUserTripFilePath(session.id)).catch(() => null);
          }

          if (userTrip) {
            return sendJson(res, 200, userTrip);
          }
          return sendJson(res, 200, { hasTrip: false, message: 'Aucun voyage configuré pour ce compte' });
        }

        // 3. Mode Démo ou visiteur non connecté : charger le voyage démo Cameroun
        let trip = dbService.getTripById('trip-cameroun-seed') || (await StorageService.loadFromFile(DEMO_FILE).catch(() => null));
        if (!trip) {
          trip = createInitialSeedTrip();
          trip.id = trip.id || 'trip-cameroun-seed';
          dbService.saveTrip(trip, null);
          await StorageService.saveToFile(trip, DEMO_FILE);
        }
        return sendJson(res, 200, trip);
      }

      if (req.method === 'POST') {
        const updatedTrip = await parseRequestBody(req);
        StorageService.validateTripSchema(updatedTrip);

        // Protection de sécurité : interdire la modification d'un voyage en mode lecture seule
        if (updatedTrip.isReadOnly) {
          return sendJson(res, 403, { error: 'Modification interdite en mode consultation partagée (Lecture Seule)' });
        }

        updatedTrip.updatedAt = new Date().toISOString();

        let tripFile = DEMO_FILE;
        if (user?.currentTripId) {
          tripFile = path.join(TRIPS_DIR, `trip_${user.currentTripId}.json`);
        } else if (session) {
          tripFile = getUserTripFilePath(session.id);
        }

        // Persistance SQLite
        dbService.saveTrip(updatedTrip, user?.id || null);

        // Miroir fichier JSON
        await fs.mkdir(path.dirname(tripFile), { recursive: true });
        await StorageService.saveToFile(updatedTrip, tripFile);
        return sendJson(res, 200, { success: true, trip: updatedTrip });
      }
    }

    if (pathname === '/api/reset' && req.method === 'POST') {
      const freshTrip = createInitialSeedTrip();
      freshTrip.id = freshTrip.id || 'trip-cameroun-seed';
      dbService.saveTrip(freshTrip, null);
      await StorageService.saveToFile(freshTrip, DATA_FILE);
      return sendJson(res, 200, { success: true, trip: freshTrip });
    }

    // --- STATIC FILES ROUTING ---
    const DOMAIN_DIR = path.join(__dirname, 'domain');
    let filePath;
    if (pathname.startsWith('/domain/')) {
      const rel = pathname.replace('/domain/', '');
      filePath = path.join(DOMAIN_DIR, rel);
      if (!filePath.startsWith(DOMAIN_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', ...getSecurityHeaders() });
        return res.end('Accès refusé');
      }
    } else {
      filePath = path.join(UI_DIR, pathname === '/' ? 'index.html' : pathname);
      if (!filePath.startsWith(UI_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', ...getSecurityHeaders() });
        return res.end('Accès refusé');
      }
    }

    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const fileStat = await fs.stat(filePath);

      // Les fichiers ne sont pas fingerprintés (app.js, style.css...) : un max-age
      // figerait une version cassée chez l'utilisateur. On impose la revalidation
      // à chaque requête, rendue peu coûteuse par l'ETag (réponse 304 sans corps).
      const etag = `W/"${fileStat.size.toString(16)}-${Math.floor(fileStat.mtimeMs).toString(16)}"`;
      const cacheHeaders = {
        'Cache-Control': 'no-cache',
        'ETag': etag,
        ...getSecurityHeaders()
      };

      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, cacheHeaders);
        return res.end();
      }

      const content = await fs.readFile(filePath);
      res.writeHead(200, {
        'Content-Type': contentType,
        ...cacheHeaders
      });
      return res.end(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...getSecurityHeaders() });
        return res.end('Page ou fichier introuvable');
      }
      throw err;
    }

  } catch (error) {
    console.error('[CapVoyage Serveur] Erreur non gérée :', error);
    return sendJson(res, 500, { error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🧭 CapVoyage Production Ready démarré sur : http://localhost:${PORT}`);
  console.log(`📦 Base de données : SQLite WAL (${DB_PATH})`);
  console.log(`🛡️ Sécurité : Rate Limiting actif, En-têtes sécurisés`);
  console.log(`=======================================================`);
});

// Arrêt propre du serveur (Graceful Shutdown)
function gracefulShutdown(signal) {
  console.log(`\n[CapVoyage] Signal ${signal} reçu, arrêt propre du serveur...`);
  server.close(() => {
    try {
      dbService.close();
      console.log('[CapVoyage] Connexion SQLite fermée proprement.');
    } catch (err) {}
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { server, dbService, emailService };
