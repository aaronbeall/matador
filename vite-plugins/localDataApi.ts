import type { Plugin, Connect } from 'vite';
import type { ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { getAnalysisSnapshot } from './marketData/cache';
import { getSkills, skillsDir } from './skillsReader';

// Local-only dev API that reads/writes the gitignored data/ directory —
// the shared state layer between the frontend and the find-trades skill
// (and any other analysis tools run in a Claude session). See
// docs/trade-analysis-plan.md for the architecture.
//
// Dev-only by design: this plugin only runs under `vite dev`, never in a
// production build.
//
// Plain JSON-array collections (watchlist, trade-ideas, levels, alerts,
// analysis-log) all share the same GET-full-array / POST-replaces-array
// shape, so they're handled generically below rather than one route
// each. `strategy.md` and `candles/<symbol>.json` have their own shapes
// and get dedicated handlers.

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CANDLES_DIR = path.join(DATA_DIR, 'candles');
const STRATEGY_PATH = path.join(DATA_DIR, 'strategy.md');

// route name -> filename. The route is also what gets reported to SSE
// subscribers when the underlying file changes, so the frontend knows
// which of its GETters to re-run.
const JSON_COLLECTIONS: Record<string, string> = {
  watchlist: 'watchlist.json',
  'trade-ideas': 'trade-ideas.json',
  levels: 'levels.json',
  alerts: 'alerts.json',
  'analysis-log': 'analysis-log.json',
};

function ensureDataFiles() {
  fs.mkdirSync(CANDLES_DIR, { recursive: true });
  for (const filename of Object.values(JSON_COLLECTIONS)) {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]\n');
  }
}

function readJsonBody(req: Connect.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : null);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// --- SSE: push "this file changed" notices to the browser -----------------
// One-way, server -> browser, no extra dependency. The frontend subscribes
// with a plain EventSource and refetches whichever GET route the event
// names — the event carries no payload itself, just "go re-fetch levels".
// Falls back gracefully: the frontend also polls Ideas periodically and
// refetches on window focus, so a dropped SSE connection degrades, it
// doesn't go stale forever.

const sseClients = new Set<ServerResponse>();
const lastBroadcastAt = new Map<string, number>();
const SSE_DEBOUNCE_MS = 300; // fs.watch can fire twice per write

function broadcast(route: string) {
  const now = Date.now();
  const last = lastBroadcastAt.get(route) ?? 0;
  if (now - last < SSE_DEBOUNCE_MS) return;
  lastBroadcastAt.set(route, now);

  const payload = `data: ${JSON.stringify({ file: route })}\n\n`;
  for (const client of sseClients) client.write(payload);
}

function watchDataDir() {
  const filenameToRoute = new Map(
    Object.entries(JSON_COLLECTIONS).map(([route, filename]) => [filename, route])
  );

  try {
    fs.watch(DATA_DIR, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      if (filename === 'strategy.md') {
        broadcast('strategy');
      } else if (filenameToRoute.has(filename)) {
        broadcast(filenameToRoute.get(filename)!);
      } else {
        // candles/<SYMBOL>/<date-or-daily>.json
        const parts = filename.split(path.sep);
        if (parts[0] === 'candles' && parts[1]) broadcast(`candles/${parts[1]}`);
      }
    });
  } catch (err) {
    // fs.watch recursive isn't supported on every platform — SSE push is
    // a nice-to-have, so degrade silently to polling/focus-refresh only.
    console.warn('[local-data-api] fs.watch recursive unavailable, SSE push disabled:', err);
  }
}

function watchSkillsDir() {
  if (!fs.existsSync(skillsDir())) return;
  try {
    fs.watch(skillsDir(), { recursive: true }, () => broadcast('skills'));
  } catch (err) {
    console.warn('[local-data-api] fs.watch on .claude/skills unavailable:', err);
  }
}

export function localDataApi(): Plugin {
  return {
    name: 'local-data-api',
    configureServer(server) {
      ensureDataFiles();
      watchDataDir();
      watchSkillsDir();

      // GET the list of Claude skills for this project (.claude/skills/*/SKILL.md)
      // — documentation, not app state; there's nothing to POST here.
      server.middlewares.use('/api/skills', (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end();
          return;
        }
        sendJson(res, 200, getSkills());
      });

      // SSE stream — GET /api/events
      server.middlewares.use('/api/events', (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end();
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        res.write(': connected\n\n');
        sseClients.add(res);

        const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30000);
        req.on('close', () => {
          clearInterval(heartbeat);
          sseClients.delete(res);
        });
      });

      // Generic GET (full array) / POST (replace full array) for every
      // plain JSON-array collection listed in JSON_COLLECTIONS.
      for (const [route, filename] of Object.entries(JSON_COLLECTIONS)) {
        server.middlewares.use(`/api/${route}`, async (req, res) => {
          const filePath = path.join(DATA_DIR, filename);
          if (req.method === 'GET') {
            sendJson(res, 200, JSON.parse(fs.readFileSync(filePath, 'utf-8')));
          } else if (req.method === 'POST') {
            try {
              const body = await readJsonBody(req);
              fs.writeFileSync(filePath, JSON.stringify(body, null, 2) + '\n');
              sendJson(res, 200, body);
            } catch (err) {
              sendJson(res, 400, { error: String(err) });
            }
          } else {
            res.statusCode = 405;
            res.end();
          }
        });
      }

      // GET raw strategy.md — read-only from the frontend's perspective;
      // Claude edits this file directly per docs/trade-analysis-plan.md.
      server.middlewares.use('/api/strategy', (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end();
          return;
        }
        if (!fs.existsSync(STRATEGY_PATH)) {
          sendJson(res, 404, { error: 'data/strategy.md not found' });
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.end(fs.readFileSync(STRATEGY_PATH, 'utf-8'));
      });

      // GET /api/candles/<SYMBOL>/analysis — the multi-timeframe
      // AnalysisSnapshot (src/utils/analysis.ts), maintained by the
      // background gap-reconciliation cache (vite-plugins/marketData/
      // cache.ts). Read-only from here; cache.ts writes it directly on
      // disk, no HTTP round-trip needed since both run in the same
      // Node process.
      server.middlewares.use('/api/candles', (req, res) => {
        const segments = (req.url || '/').split('/').filter(Boolean);
        const [symbol, subroute] = segments;

        if (req.method !== 'GET' || !symbol || subroute !== 'analysis') {
          res.statusCode = 404;
          res.end();
          return;
        }
        const snapshot = getAnalysisSnapshot(symbol);
        if (snapshot) sendJson(res, 200, snapshot);
        else sendJson(res, 404, { error: `no analysis snapshot yet for ${symbol.toUpperCase()}` });
      });
    },
  };
}
