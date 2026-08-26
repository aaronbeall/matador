import type { Plugin, Connect } from 'vite';
import type { ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
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
// each. `strategy.md` has its own shape and gets a dedicated handler.
// `data/candles/` (raw OHLCV cache + the annotated analysis.md) has no
// HTTP route at all — nothing in the browser reads it; it's Node's own
// cache (vite-plugins/marketData/cache.ts) and Claude's filesystem read.

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CANDLES_DIR = path.join(DATA_DIR, 'candles');
const STRATEGY_PATH = path.join(DATA_DIR, 'strategy.md');
// The agent's standing instructions — what actually governs keeping
// Journal/Portfolio/Thesis/etc. up to date in conversation without a
// skill run. Exposed read-only so you can review what's actually being
// followed, same convention as strategy.md. Lives at the project root as
// CLAUDE.md (the Claude Code convention for this), outside data/, so it
// needs its own watch below rather than piggybacking on watchDataDir's.
const CLAUDE_MD_PATH = path.resolve(process.cwd(), 'CLAUDE.md');

// route name -> filename. The route is also what gets reported to SSE
// subscribers when the underlying file changes, so the frontend knows
// which of its GETters to re-run.
const JSON_COLLECTIONS: Record<string, string> = {
  watchlist: 'watchlist.json',
  'trade-ideas': 'trade-ideas.json',
  levels: 'levels.json',
  alerts: 'alerts.json',
  'analysis-log': 'analysis-log.json',
  thesis: 'thesis.json',
  journal: 'journal.json',
  'portfolio-positions': 'portfolio-positions.json',
  'portfolio-balances': 'portfolio-balances.json',
  connections: 'connections.json',
  // Not an array like the rest of these — a single object keyed by panel
  // name (see src/types/AgentActivity.ts) — but the generic GET-whole/
  // POST-replaces-whole handler below doesn't care about that shape
  // distinction, so it fits the same route machinery.
  'agent-activity': 'agent-activity.json',
};

function ensureDataFiles() {
  fs.mkdirSync(CANDLES_DIR, { recursive: true });
  for (const [route, filename] of Object.entries(JSON_COLLECTIONS)) {
    const filePath = path.join(DATA_DIR, filename);
    const emptyShape = route === 'agent-activity' ? '{}\n' : '[]\n';
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, emptyShape);
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

function watchAgentInstructions() {
  if (!fs.existsSync(CLAUDE_MD_PATH)) return;
  try {
    fs.watch(CLAUDE_MD_PATH, () => broadcast('agent-instructions'));
  } catch (err) {
    console.warn('[local-data-api] fs.watch on CLAUDE.md unavailable:', err);
  }
}

export function localDataApi(): Plugin {
  return {
    name: 'local-data-api',
    configureServer(server) {
      ensureDataFiles();
      watchDataDir();
      watchSkillsDir();
      watchAgentInstructions();

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

      // GET strategy.md — read-only from the frontend's perspective; Claude
      // edits this file directly per docs/trade-analysis-plan.md. Returns
      // the absolute path alongside the content so the UI can render a
      // file:// link back to it, not just the raw markdown.
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
        sendJson(res, 200, { path: STRATEGY_PATH, content: fs.readFileSync(STRATEGY_PATH, 'utf-8') });
      });

      // GET the agent's raw standing instructions (CLAUDE.md) — read-only
      // from the frontend's perspective; exposed for review, same
      // convention as strategy.md above.
      server.middlewares.use('/api/agent-instructions', (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end();
          return;
        }
        if (!fs.existsSync(CLAUDE_MD_PATH)) {
          sendJson(res, 404, { error: 'CLAUDE.md not found' });
          return;
        }
        sendJson(res, 200, { path: CLAUDE_MD_PATH, content: fs.readFileSync(CLAUDE_MD_PATH, 'utf-8') });
      });
    },
  };
}
