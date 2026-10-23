// Client CDP minimal (Chrome DevTools Protocol) sans dépendance :
// lance Chrome headless et le pilote via le WebSocket natif de Node (>= 22).
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);

export function findChrome() {
  if (typeof WebSocket !== 'function') return null;
  return CANDIDATES.find(p => existsSync(p)) || null;
}

export async function launchBrowser(chromePath) {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), 'capvoyage-cdp-'));
  const proc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  const wsUrl = await new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('Chrome ne répond pas (DevTools)')), 20000);
    proc.stderr.on('data', chunk => {
      buffer += chunk.toString();
      const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    proc.on('exit', code => reject(new Error(`Chrome s'est arrêté (code ${code})`)));
  });

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      listeners.forEach(fn => fn(msg));
    }
  });

  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

  async function newPage() {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const errors = [];
    listeners.push((msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Runtime.exceptionThrown') {
        errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        errors.push(msg.params.args.map(a => a.value ?? a.description).join(' '));
      }
    });
    await send('Runtime.enable', {}, sessionId);
    await send('Page.enable', {}, sessionId);

    const page = {
      errors,
      async evaluate(expression) {
        const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
        if (res.exceptionDetails) {
          throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
        }
        return res.result.value;
      },
      async waitFor(expression, timeoutMs = 10000) {
        const start = Date.now();
        for (;;) {
          const ok = await page.evaluate(`Boolean(${expression})`).catch(() => false);
          if (ok) return true;
          if (Date.now() - start > timeoutMs) throw new Error(`Délai dépassé en attendant : ${expression}`);
          await new Promise(r => setTimeout(r, 100));
        }
      },
      async goto(url) {
        await send('Page.navigate', { url }, sessionId);
        await page.waitFor(`document.readyState === 'complete' && location.href.startsWith(${JSON.stringify(url.split('?')[0])})`);
      },
      async addInitScript(source) {
        await send('Page.addScriptToEvaluateOnNewDocument', { source }, sessionId);
      },
      async setViewport(width, height, mobile = false) {
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile }, sessionId);
      }
    };
    return page;
  }

  async function close() {
    try { await send('Browser.close'); } catch (e) { /* déjà fermé */ }
    ws.close();
    await new Promise(r => setTimeout(r, 300));
    proc.kill();
    try { rmSync(userDataDir, { recursive: true, force: true }); } catch (e) { /* fichiers verrouillés sous Windows */ }
  }

  return { newPage, close };
}
