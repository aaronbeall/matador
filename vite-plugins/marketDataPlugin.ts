import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { MarketDataService } from './marketData/service';
import { fetchQuote } from './marketData/alpaca';
import { reconcileWatchlist, clearSymbol, clearAll } from './marketData/cache';

const RECONCILE_INTERVAL_MS = 5 * 60_000;
const WATCHLIST_PATH = path.resolve(process.cwd(), 'data', 'watchlist.json');

// Hosts the real-time market data connection server-side (see
// marketData/service.ts) instead of the browser connecting to Alpaca
// directly — keeps the API key off the client bundle, and puts the
// connection's on/off/timeout lifecycle under Node's control rather than
// tied to a component mounting in the browser. Also runs the background
// gap-reconciliation cache (marketData/cache.ts) that proactively keeps
// every active watchlist symbol's multi-timeframe history gap-free, and
// adds small REST passthroughs for the non-Live "poll a quote" mode and
// manual cache rebuilds.
//
// Dev-only, like the other vite-plugins/ — never runs in a production build.
export function marketDataPlugin(): Plugin {
  return {
    name: 'market-data-service',
    configureServer(server) {
      const keyId = server.config.env.VITE_ALPACA_KEY_ID;
      const secretKey = server.config.env.VITE_ALPACA_SECRET_KEY;
      if (!keyId || !secretKey) {
        console.warn('[market-data] VITE_ALPACA_KEY_ID / VITE_ALPACA_SECRET_KEY not set — live market data will not connect.');
        return;
      }
      if (!server.httpServer) {
        console.warn('[market-data] no underlying http server (middleware mode?) — skipping.');
        return;
      }

      new MarketDataService(keyId, secretKey, server.httpServer);

      const runReconcile = () => reconcileWatchlist(keyId, secretKey).catch((err) => console.warn('[market-data] reconcile failed:', err));
      runReconcile();
      setInterval(runReconcile, RECONCILE_INTERVAL_MS);
      // A newly-added watchlist symbol shouldn't wait up to 5 min for its
      // first fill — reuse the same data/ fs.watch approach localDataApi
      // already relies on for SSE.
      try {
        fs.watch(WATCHLIST_PATH, () => runReconcile());
      } catch (err) {
        console.warn('[market-data] fs.watch on watchlist.json unavailable — new symbols wait for the next reconcile cycle:', err);
      }

      // GET  /api/market/<SYMBOL>/quote    — one-off quote for non-Live polling
      // POST /api/market/<SYMBOL>/rebuild  — clear + force-refetch one symbol's cache
      // POST /api/market/rebuild           — same, for the whole active watchlist
      server.middlewares.use('/api/market', async (req, res) => {
        const segments = (req.url || '/').split('/').filter(Boolean);
        const [first, second] = segments;

        if (req.method === 'POST' && first === 'rebuild' && !second) {
          await clearAll(keyId, secretKey);
          res.statusCode = 200;
          res.end();
        } else if (req.method === 'POST' && first && second === 'rebuild') {
          await clearSymbol(keyId, secretKey, first);
          res.statusCode = 200;
          res.end();
        } else if (req.method === 'GET' && first && second === 'quote') {
          const quote = await fetchQuote(keyId, secretKey, first);
          res.statusCode = quote ? 200 : 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(quote ?? { error: 'quote fetch failed' }));
        } else {
          res.statusCode = 404;
          res.end();
        }
      });
    },
  };
}
