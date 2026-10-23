import { createServer } from '../../src/server.js';

const silentEmail = { sendLoginCode: async () => ({ success: true }) };

/**
 * Démarre un serveur CapVoyage isolé (SQLite :memory:, port aléatoire).
 */
export async function startTestServer(options = {}) {
  const clock = { value: Date.now() };
  const { server, dbService } = createServer({
    dbPath: ':memory:',
    isProduction: false,
    emailService: silentEmail,
    now: () => clock.value,
    ...options
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  async function api(method, pathname, { token, body, headers = {} } = {}) {
    const res = await fetch(base + pathname, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: res.status, data, headers: res.headers };
  }

  // Connexion complète par code (devCode exposé hors production)
  async function login(email) {
    const req = await api('POST', '/api/auth/request-code', { body: { email } });
    if (req.status !== 200) throw new Error(`request-code ${req.status} ${JSON.stringify(req.data)}`);
    const ver = await api('POST', '/api/auth/verify-code', { body: { email, code: req.data.devCode } });
    if (ver.status !== 200) throw new Error(`verify-code ${ver.status} ${JSON.stringify(ver.data)}`);
    return ver.data.token;
  }

  async function createTrip(token, overrides = {}) {
    const res = await api('POST', '/api/wizard/trip', {
      token,
      body: { country: 'Cameroun', mainCity: 'Douala', startDate: '2026-11-01', endDate: '2026-11-05', totalBudget: 2000, ...overrides }
    });
    if (res.status !== 200) throw new Error(`wizard ${res.status} ${JSON.stringify(res.data)}`);
    return res.data.trip;
  }

  async function stop() {
    await new Promise(resolve => server.close(resolve));
  }

  return { base, api, login, createTrip, stop, clock, dbService };
}
