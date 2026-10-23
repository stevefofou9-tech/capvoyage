import http from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { AuthService } from './domain/AuthService.js';
import { TripService } from './domain/TripService.js';
import { TodoService } from './domain/TodoService.js';
import { StorageService } from './domain/StorageService.js';
import { createInitialSeedTrip, DEMO_TRIP_ID } from './seed.js';
import { DbService } from './services/DbService.js';
import { EmailService } from './services/EmailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_DIR = path.join(__dirname, '..', 'data');
const UI_DIR = path.join(__dirname, 'ui');
const DOMAIN_DIR = path.join(__dirname, 'domain');

const RATES_URL = 'https://api.frankfurter.dev/v1/latest?base=EUR';
const RATES_CACHE_MS = 6 * 60 * 60 * 1000;
const SHARE_INACTIVE_MESSAGE = "Ce lien de partage n'est plus actif";

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

// Politique de sécurité de contenu (ADR-002) : 'unsafe-inline' requis par les attributs style="" de l'UI
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

// En-têtes de sécurité HTTP de niveau production
function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
    'Content-Security-Policy': CONTENT_SECURITY_POLICY
  };
}

// Erreur métier portant un code HTTP
class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
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
        return reject(new HttpError(413, 'Charge utile trop volumineuse (limite : 5 Mo)'));
      }
      body += chunk;
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new HttpError(400, 'Corps de requête JSON invalide : ' + err.message));
      }
    });
    req.on('error', reject);
  });
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.replace(/^Bearer\s+/i, '').trim();
}

/**
 * Crée le serveur HTTP CapVoyage sans l'écouter (ADR-005).
 * @returns {{ server: http.Server, dbService: DbService }}
 */
export function createServer({
  dbPath = ':memory:',
  isProduction = process.env.NODE_ENV === 'production',
  emailService = new EmailService({ isProduction }),
  dataDir = null,
  allowedOrigin = process.env.ALLOWED_ORIGIN || '*',
  trustFlyClientIp = !!process.env.FLY_APP_NAME,
  ratesFetch = globalThis.fetch,
  now = () => Date.now(),
  uiDir = UI_DIR,
  domainDir = DOMAIN_DIR
} = {}) {
  const dbService = new DbService(dbPath);

  // Identifiant de build (ADR-009) : empreinte du contenu des fichiers servis au navigateur.
  // Recalculée seulement si la taille ou la date d'un fichier change.
  let buildCache = { signature: '', build: '' };
  async function getBuildId() {
    const files = [];
    for (const dir of [uiDir, domainDir]) {
      for (const name of (await fs.readdir(dir)).sort()) {
        const full = path.join(dir, name);
        const st = await fs.stat(full);
        if (st.isFile()) files.push({ full, key: `${path.basename(dir)}/${name}:${st.size}:${Math.floor(st.mtimeMs)}` });
      }
    }
    const signature = files.map(f => f.key).join('|');
    if (signature !== buildCache.signature) {
      const hash = createHash('sha1');
      for (const f of files) hash.update(f.key.split(':')[0]).update(await fs.readFile(f.full));
      buildCache = { signature, build: hash.digest('hex').slice(0, 10) };
    }
    return buildCache.build;
  }

  // Migrations idempotentes au démarrage
  if (dataDir) {
    const stats = dbService.autoMigrateFromJson(dataDir);
    if (stats.migratedUsers > 0 || stats.migratedTrips > 0) {
      console.log(`[CapVoyage DbService] Migration SQLite : ${stats.migratedUsers} utilisateurs, ${stats.migratedTrips} voyages.`);
    }
  }
  dbService.migrateLegacySessions(now());
  dbService.purgeExpiredSessions(now());
  if (!dbService.getTripById(DEMO_TRIP_ID)) {
    const seed = createInitialSeedTrip();
    seed.version = 1;
    TripService.normalizeSharing(seed);
    dbService.saveTrip(seed, null);
  }

  let ratesCache = null;

  function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...getSecurityHeaders()
    });
    res.end(JSON.stringify(data));
  }

  // IP réelle : Fly-Client-IP sur Fly (non falsifiable par le client), sinon l'adresse du socket.
  // X-Forwarded-For est volontairement ignoré (ADR-002, S4).
  function getClientIp(req) {
    if (trustFlyClientIp && req.headers['fly-client-ip']) {
      return String(req.headers['fly-client-ip']).trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }

  function enforceRateLimit(key, maxAttempts, message) {
    const rl = dbService.checkRateLimit(key, maxAttempts, 15 * 60 * 1000, 15 * 60 * 1000);
    if (!rl.allowed) {
      throw new HttpError(429, `${message} Veuillez patienter ${rl.retryAfterSeconds} secondes.`, { retryAfterSeconds: rl.retryAfterSeconds });
    }
  }

  // Utilisateur de la session courante, ou null (session absente, inconnue ou expirée)
  function getSessionUser(req) {
    return dbService.getSessionUser(getBearerToken(req), now());
  }

  function requireUser(req) {
    const user = getSessionUser(req);
    if (!user) throw new HttpError(401, 'Session invalide ou expirée');
    return user;
  }

  // Charge un voyage depuis la base et vérifie qu'il appartient à l'utilisateur (ADR-002)
  function loadOwnedTrip(user, tripId) {
    const trip = tripId ? dbService.getTripById(tripId) : null;
    if (!trip) throw new HttpError(404, 'Voyage introuvable');
    if (trip.userId !== user.id) throw new HttpError(403, 'Accès refusé à ce voyage');
    trip.version = trip.version || 1;
    TripService.normalizeSharing(trip);
    return trip;
  }

  function summarizeTrip(t, user) {
    return {
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
    };
  }

  async function handleApi(req, res, url) {
    const { pathname } = url;

    // --- HEALTH CHECK / PROBES ---
    if ((pathname === '/health' || pathname === '/api/health') && req.method === 'GET') {
      return sendJson(res, 200, {
        status: 'ok',
        uptime: Math.round(process.uptime()),
        environment: isProduction ? 'production' : 'development',
        database: 'sqlite-wal',
        timestamp: new Date().toISOString()
      });
    }

    // --- VERSION DU FRONT (détection de mise à jour, ADR-009) ---
    if (pathname === '/api/version' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...getSecurityHeaders()
      });
      return res.end(JSON.stringify({ build: await getBuildId() }));
    }

    // --- AUTH ---
    if (pathname === '/api/auth/request-code' && req.method === 'POST') {
      enforceRateLimit(`req_code:${getClientIp(req)}`, 5, 'Trop de demandes de code.');
      const { email } = await parseRequestBody(req);
      if (!AuthService.isValidEmail(email)) throw new HttpError(400, 'Adresse email invalide');
      const normEmail = AuthService.normalizeEmail(email);
      enforceRateLimit(`req_code_email:${normEmail}`, 5, 'Trop de demandes de code pour cette adresse.');

      const existing = dbService.getUserByEmail(normEmail);
      const users = existing ? [existing] : [];
      const result = AuthService.requestLoginCode(users, normEmail, { isProduction });
      const user = users[0];
      dbService.saveUser(user);

      await emailService.sendLoginCode(user.email, user.verificationCode).catch(err => {
        console.error('[EmailService] Erreur transmission e-mail:', err.message);
      });
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/auth/verify-code' && req.method === 'POST') {
      enforceRateLimit(`verify_code:${getClientIp(req)}`, 10, 'Trop de tentatives de validation.');
      const { email, code } = await parseRequestBody(req);
      const normEmail = AuthService.normalizeEmail(email);
      enforceRateLimit(`verify_email:${normEmail}`, 10, 'Trop de tentatives de validation pour cette adresse.');

      const user = dbService.getUserByEmail(normEmail);
      if (!user) throw new HttpError(400, 'Utilisateur introuvable pour cette adresse email');
      try {
        const result = AuthService.verifyCode([user], normEmail, code);
        dbService.saveUser(user);
        dbService.createSession(user.id, result.token, now());
        return sendJson(res, 200, result);
      } catch (err) {
        dbService.saveUser(user);
        throw new HttpError(400, err.message);
      }
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const user = requireUser(req);
      return sendJson(res, 200, { success: true, user: { id: user.id, email: user.email, trips: user.trips } });
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      dbService.deleteSession(getBearerToken(req));
      return sendJson(res, 200, { success: true, message: 'Déconnecté avec succès' });
    }

    // --- MULTI-VOYAGES & CONTACTS ---
    if (pathname === '/api/user/trips' && req.method === 'GET') {
      const user = requireUser(req);
      const trips = (user.trips || [])
        .map(tid => dbService.getTripById(tid))
        .filter(t => t && t.userId === user.id)
        .map(t => summarizeTrip(t, user));
      return sendJson(res, 200, { success: true, trips, currentTripId: user.currentTripId, userEmail: user.email });
    }

    if (pathname === '/api/user/trips/switch' && req.method === 'POST') {
      const user = requireUser(req);
      const { tripId } = await parseRequestBody(req);
      const trip = loadOwnedTrip(user, tripId);
      try {
        AuthService.switchCurrentTrip([user], user.sessionToken, tripId);
      } catch (err) {
        throw new HttpError(403, err.message);
      }
      dbService.saveUser(user);
      return sendJson(res, 200, { success: true, trip, currentTripId: tripId });
    }

    if (pathname === '/api/user/contacts') {
      const user = requireUser(req);
      if (req.method === 'GET') {
        return sendJson(res, 200, { success: true, contacts: user.globalContacts || [] });
      }
      if (req.method === 'POST') {
        const contact = await parseRequestBody(req);
        if (!contact || !contact.name || !String(contact.name).trim()) {
          throw new HttpError(400, 'Le nom du contact est obligatoire');
        }
        AuthService.addGlobalContact([user], user.sessionToken, contact);
        dbService.saveUser(user);
        return sendJson(res, 200, { success: true, contacts: user.globalContacts });
      }
    }

    // --- VOYAGES ---
    if (pathname === '/api/wizard/trip' && req.method === 'POST') {
      const user = requireUser(req);
      const payload = await parseRequestBody(req);
      let newTrip;
      try {
        newTrip = TripService.createTripFromWizard(payload);
      } catch (err) {
        throw new HttpError(400, err.message);
      }
      newTrip.todos = TodoService.createDefaultTodos(payload.country);
      newTrip.userId = user.id;
      newTrip.version = 1;
      TripService.normalizeSharing(newTrip);
      dbService.saveTrip(newTrip, user.id);

      AuthService.addTripToUser([user], user.sessionToken, newTrip.id);
      if (Array.isArray(payload.initialContacts)) {
        payload.initialContacts
          .filter(c => c && c.name && String(c.name).trim())
          .forEach(c => AuthService.addGlobalContact([user], user.sessionToken, c));
      }
      dbService.saveUser(user);
      return sendJson(res, 200, { success: true, trip: newTrip });
    }

    if (pathname === '/api/trip/sharing' && req.method === 'PUT') {
      const user = requireUser(req);
      const { tripId, enabled, sections, regenerate } = await parseRequestBody(req);
      const trip = loadOwnedTrip(user, tripId || user.currentTripId);
      const sharing = TripService.updateSharing(trip, { enabled, sections, regenerate: !!regenerate });
      dbService.saveTrip(trip, user.id);
      return sendJson(res, 200, { success: true, sharing });
    }

    if (pathname === '/api/trip' && req.method === 'GET') {
      // 1. Lien de partage : vue filtrée en lecture seule (ADR-006)
      const shareToken = url.searchParams.get('share');
      if (shareToken) {
        const trip = dbService.getTripByShareToken(shareToken);
        const sharing = trip ? TripService.normalizeSharing(trip) : null;
        if (!sharing || !sharing.enabled || sharing.token !== shareToken) {
          throw new HttpError(404, SHARE_INACTIVE_MESSAGE);
        }
        return sendJson(res, 200, TripService.buildSharedView(trip));
      }

      // 2. Utilisateur authentifié : voyage courant
      if (getBearerToken(req)) {
        const user = requireUser(req);
        const trip = user.currentTripId ? dbService.getTripById(user.currentTripId) : null;
        if (!trip || trip.userId !== user.id) {
          return sendJson(res, 200, { hasTrip: false, message: 'Aucun voyage configuré pour ce compte' });
        }
        trip.version = trip.version || 1;
        TripService.normalizeSharing(trip);
        return sendJson(res, 200, trip);
      }

      // 3. Visiteur : voyage démo, jamais modifié par l'API (ADR-001, ADR-003)
      const demo = dbService.getTripById(DEMO_TRIP_ID);
      delete demo.sharing;
      delete demo.userId;
      return sendJson(res, 200, { ...demo, isDemo: true });
    }

    if (pathname === '/api/trip' && req.method === 'POST') {
      const user = requireUser(req);
      const body = await parseRequestBody(req);
      const incoming = body && body.trip;
      if (!incoming) throw new HttpError(400, 'Corps attendu : { trip, baseVersion }');
      try {
        StorageService.validateTripSchema(incoming);
      } catch (err) {
        throw new HttpError(400, err.message);
      }

      const current = loadOwnedTrip(user, incoming.id);
      if (body.baseVersion !== current.version) {
        throw new HttpError(409, 'Le voyage a été modifié ailleurs (conflit de version)', { trip: current });
      }

      // Les champs serveur ne viennent jamais du client (ADR-002)
      const saved = {
        ...incoming,
        id: current.id,
        userId: user.id,
        sharing: current.sharing,
        createdAt: current.createdAt,
        version: current.version + 1,
        updatedAt: new Date(now()).toISOString()
      };
      delete saved.shareToken;
      delete saved.isReadOnly;
      delete saved.isDemo;
      dbService.saveTrip(saved, user.id);
      return sendJson(res, 200, { success: true, trip: saved });
    }

    // --- TAUX DE CHANGE (proxy serveur, cache 6 h) ---
    if (pathname === '/api/rates' && req.method === 'GET') {
      if (!ratesCache || now() - ratesCache.fetchedAt > RATES_CACHE_MS) {
        try {
          const upstream = await ratesFetch(RATES_URL);
          if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`);
          const data = await upstream.json();
          ratesCache = { fetchedAt: now(), data: { base: data.base || 'EUR', date: data.date, rates: data.rates || {} } };
        } catch (err) {
          throw new HttpError(503, `Taux de change indisponibles : ${err.message}`);
        }
      }
      return sendJson(res, 200, ratesCache.data);
    }

    return null;
  }

  async function serveStatic(req, res, pathname) {
    let filePath;
    if (pathname.startsWith('/domain/')) {
      filePath = path.join(domainDir, pathname.replace('/domain/', ''));
      if (!filePath.startsWith(domainDir)) throw new HttpError(403, 'Accès refusé');
    } else {
      // /reset : page de secours « Actualiser CapVoyage » (ADR-009)
      const target = pathname === '/' ? 'index.html' : (pathname === '/reset' ? 'reset.html' : pathname);
      filePath = path.join(uiDir, target);
      if (!filePath.startsWith(uiDir)) throw new HttpError(403, 'Accès refusé');
    }

    try {
      let fileStat = await fs.stat(filePath);
      if (fileStat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        fileStat = await fs.stat(filePath);
      }
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

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
      res.writeHead(200, { 'Content-Type': contentType, ...cacheHeaders });
      return res.end(content);
    } catch (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...getSecurityHeaders() });
        return res.end('Page ou fichier introuvable');
      }
      throw err;
    }
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        ...getSecurityHeaders()
      });
      return res.end();
    }

    try {
      if (url.pathname === '/health' || url.pathname.startsWith('/api/')) {
        const handled = await handleApi(req, res, url);
        if (handled === null) sendJson(res, 404, { error: 'Route introuvable' });
        return;
      }
      await serveStatic(req, res, url.pathname);
    } catch (error) {
      if (error instanceof HttpError) {
        return sendJson(res, error.status, { error: error.message, ...error.extra });
      }
      console.error('[CapVoyage Serveur] Erreur non gérée :', error);
      return sendJson(res, 500, { error: 'Erreur interne du serveur' });
    }
  });

  server.on('close', () => {
    try { dbService.close(); } catch (err) {}
  });

  return { server, dbService };
}

// Démarrage uniquement si le fichier est exécuté directement (`node src/server.js`)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const PORT = process.env.PORT || 3000;
  const DB_PATH = process.env.DATABASE_PATH || path.join(DEFAULT_DATA_DIR, 'capvoyage.db');
  const { server } = createServer({ dbPath: DB_PATH, dataDir: DEFAULT_DATA_DIR });

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🧭 CapVoyage démarré sur : http://localhost:${PORT}`);
    console.log(`📦 Base de données : SQLite WAL (${DB_PATH})`);
    console.log(`=======================================================`);
  });

  // Arrêt propre du serveur (Graceful Shutdown)
  const gracefulShutdown = (signal) => {
    console.log(`\n[CapVoyage] Signal ${signal} reçu, arrêt propre du serveur...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
