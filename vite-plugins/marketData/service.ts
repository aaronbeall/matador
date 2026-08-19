import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import { CandleStore } from '../../src/services/CandleStore';
import type { Candlestick, TimeInterval } from '../../src/types/Candlestick';
import { annotateTimeframe } from '../../src/utils/analysis';
import { connectAlpacaTrades, type AlpacaConnection } from './alpaca';
import { getCachedBars, mergeLiveCandles, recomputeAnalysis } from './cache';
import { TIMEFRAMES } from './timeframes';

const DEFAULT_INTERVAL: TimeInterval = '1m';

const PERSIST_INTERVAL_MS = 10000;
// How long to keep a symbol's Alpaca subscription alive with zero
// connected browser clients before actually tearing it down. Covers a
// page refresh (WS closes then immediately reopens and resubscribes)
// without treating every refresh as a full disconnect/reconnect cycle;
// a genuinely closed tab still cleans up shortly after.
const UNSUBSCRIBE_GRACE_MS = 45_000;

interface SymbolState {
  // Tracks only the live tick stream now — enough to compute whatever
  // interval's *current, still-forming* bucket is, nothing more. Real
  // history comes from historicalCache below. See CandleStore.ts.
  store: CandleStore;
  // Each client can view a different resolution (1m/5m/15m/1h) of the
  // same underlying live ticks — CandleStore already aggregates on
  // demand, so there's nothing to duplicate, just track what each client
  // wants.
  browserClients: Map<WebSocket, TimeInterval>;
  // The last-read annotated historical series (from the persisted,
  // period-partitioned cache — vite-plugins/marketData/cache.ts) per
  // interval currently being viewed by at least one client for this
  // symbol. Populated lazily on first request, refreshed on the 10s
  // persist tick — a disk read per trade would be wasteful; per 10s is
  // plenty since that's also the persisted cache's own live-path cadence.
  historicalCache: Map<TimeInterval, Candlestick[]>;
}

// Owns the connection to Alpaca and the browser-facing WebSocket. The
// Alpaca connection is NOT always-on: it activates the first time a
// browser client subscribes to a symbol (i.e. the user turns Live on)
// and tears down after UNSUBSCRIBE_GRACE_MS with no subscribers left —
// explicit on/off plus a timeout, not a background service that runs
// regardless of anyone watching.
export type ExternalDataStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export class MarketDataService {
  private keyId: string;
  private secretKey: string;
  private symbols = new Map<string, SymbolState>();
  private alpaca: AlpacaConnection | null = null;
  private teardownTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private persistTimer: ReturnType<typeof setInterval>;
  private wss: WebSocketServer;
  // Node's connection to Alpaca, tracked explicitly and pushed to every
  // browser client — the browser can't see this connection at all
  // otherwise, so without this it'd have no way to tell "Node can't
  // reach Alpaca" apart from "Node just hasn't sent a trade recently."
  private externalDataStatus: ExternalDataStatus = 'disconnected';

  constructor(keyId: string, secretKey: string, httpServer: HttpServer) {
    this.keyId = keyId;
    this.secretKey = secretKey;
    // `{ server, path }` attaches its own 'upgrade' listener to the
    // shared httpServer, which collided with Vite's own HMR WebSocket on
    // that same server (both listening for upgrades — Vite's client got
    // stuck in a connect/disconnect loop). `noServer: true` plus a manual
    // 'upgrade' handler that only acts on our own path — and otherwise
    // does nothing, leaving the event for other listeners — avoids that.
    this.wss = new WebSocketServer({ noServer: true });
    httpServer.on('upgrade', (request, socket, head) => {
      if (request.url?.startsWith('/ws/market')) {
        this.wss.handleUpgrade(request, socket, head, (client) => {
          this.wss.emit('connection', client, request);
        });
      }
    });
    this.wss.on('connection', (client) => this.handleBrowserConnection(client));
    this.persistTimer = setInterval(() => this.persistAll(), PERSIST_INTERVAL_MS);
  }

  private ensureAlpacaConnected() {
    if (this.alpaca) return;
    this.setExternalDataStatus('connecting');
    this.alpaca = connectAlpacaTrades(
      this.keyId,
      this.secretKey,
      (symbol, trade) => this.handleTrade(symbol, trade),
      (status) => this.setExternalDataStatus(status)
    );
    // A fresh connection needs every currently-tracked symbol
    // re-subscribed (this matters on manual reconnect — see
    // reconnectExternalData() — where symbols already exist but the old
    // Alpaca socket + its subscriptions are gone).
    for (const symbol of this.symbols.keys()) this.alpaca.subscribe(symbol);
  }

  private setExternalDataStatus(status: ExternalDataStatus) {
    this.externalDataStatus = status;
    const payload = JSON.stringify({ type: 'externalStatus', status });
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  }

  // User-triggered repair (UI "reconnect data" button) — tears down
  // whatever Alpaca connection exists, even a half-open/stuck one, and
  // opens a fresh one. Distinct from the automatic activate/teardown
  // lifecycle: this is for "it's been sitting broken, force it."
  reconnectExternalData() {
    this.alpaca?.close();
    this.alpaca = null;
    if (this.symbols.size > 0) this.ensureAlpacaConnected();
  }

  private maybeDisconnectAlpaca() {
    if (this.symbols.size === 0 && this.alpaca) {
      this.alpaca.close();
      this.alpaca = null;
    }
  }

  private subscribe(symbol: string, client: WebSocket, interval: TimeInterval) {
    const pendingTeardown = this.teardownTimers.get(symbol);
    if (pendingTeardown) {
      clearTimeout(pendingTeardown);
      this.teardownTimers.delete(symbol);
    }

    let state = this.symbols.get(symbol);
    if (!state) {
      // No seeding from disk here — historical data isn't CandleStore's
      // job anymore (see buildCandlesFor), it only ever needs to track
      // live ticks since this moment.
      state = { store: new CandleStore(), browserClients: new Map(), historicalCache: new Map() };
      this.symbols.set(symbol, state);
      this.ensureAlpacaConnected();
      this.alpaca!.subscribe(symbol);
    }
    state.browserClients.set(client, interval);
    this.sendCandlesTo(client, symbol, state, interval);
    this.sendStatusTo(client); // so a newly-joined client knows the current state immediately, not just on the next change
  }

  private unsubscribe(symbol: string, client: WebSocket) {
    const state = this.symbols.get(symbol);
    if (!state) return;
    state.browserClients.delete(client);
    if (state.browserClients.size > 0) return;

    const timer = setTimeout(() => {
      this.alpaca?.unsubscribe(symbol);
      this.symbols.delete(symbol);
      this.teardownTimers.delete(symbol);
      this.maybeDisconnectAlpaca();
    }, UNSUBSCRIBE_GRACE_MS);
    this.teardownTimers.set(symbol, timer);
  }

  private updateInterval(symbol: string, client: WebSocket, interval: TimeInterval) {
    const state = this.symbols.get(symbol);
    if (!state || !state.browserClients.has(client)) return;
    state.browserClients.set(client, interval);
    this.sendCandlesTo(client, symbol, state, interval);
  }

  // Lazily reads (and caches) the persisted historical series for an
  // interval the first time anyone asks for it — see historicalCache's
  // doc comment above for why this isn't a fresh disk read every time.
  private getHistorical(symbol: string, state: SymbolState, interval: TimeInterval): Candlestick[] {
    let cached = state.historicalCache.get(interval);
    if (!cached) {
      cached = getCachedBars(symbol, interval);
      state.historicalCache.set(interval, cached);
    }
    return cached;
  }

  // The actual fix: real history from the persisted, indicator-annotated
  // cache (getCachedBars — already fully annotated, nothing recomputed
  // for the historical portion) stitched to the one live, still-forming
  // candle from CandleStore. Re-annotating the combined array is what
  // gives that live candle real indicator continuity (EMA/RSI/MACD are
  // causal — the newest point needs the preceding series to compute
  // correctly), and unifies this with the exact same math the persisted
  // cache itself uses (src/utils/analysis.ts) — one indicator
  // implementation for both, not two that could drift.
  private buildCandlesFor(symbol: string, state: SymbolState, interval: TimeInterval): Candlestick[] {
    const historical = this.getHistorical(symbol, state, interval);
    const tf = TIMEFRAMES.find((t) => t.interval === interval)!;
    const currentBucketStart = Math.floor(Date.now() / tf.intervalMs) * tf.intervalMs;
    const liveCurrent = state.store.getCandles(interval).find((c) => c.timestamp === currentBucketStart);

    const combined = historical.filter((c) => c.timestamp < currentBucketStart);
    if (liveCurrent) combined.push(liveCurrent);

    return annotateTimeframe(combined, { intraday: tf.intraday });
  }

  private handleTrade(symbol: string, trade: { price: number; volume: number; timestamp: number; conditions: string[] }) {
    const state = this.symbols.get(symbol);
    if (!state) return; // trade arrived after teardown started; ignore
    state.store.addTrade(trade);
    for (const [client, interval] of state.browserClients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      const candles = this.buildCandlesFor(symbol, state, interval);
      client.send(JSON.stringify({ type: 'trade', symbol, trade, candles }));
    }
  }

  private sendCandlesTo(client: WebSocket, symbol: string, state: SymbolState, interval: TimeInterval) {
    if (client.readyState !== WebSocket.OPEN) return;
    const candles = this.buildCandlesFor(symbol, state, interval);
    client.send(JSON.stringify({ type: 'candles', symbol, candles }));
  }

  private sendStatusTo(client: WebSocket) {
    if (client.readyState !== WebSocket.OPEN) return;
    client.send(JSON.stringify({ type: 'externalStatus', status: this.externalDataStatus }));
  }

  // Only 1m gets written here — 5m/15m/1h/1d/1w are maintained by the
  // background gap-reconciliation cache (cache.ts), not derived from the
  // live store. Recomputing the analysis snapshot on every tick (~10s)
  // keeps find-trades' freshness for an actively-watched symbol exactly
  // where it was pre-migration; the background cache covers everything
  // else on its own 5-min cycle. Also refreshes each symbol's
  // historicalCache from disk on this same cadence, so the live chart's
  // historical portion doesn't go stale indefinitely without needing a
  // fresh read on every single trade.
  private persistAll() {
    for (const [symbol, state] of this.symbols) {
      const oneMin = state.store.getCandles('1m');
      if (oneMin.length) {
        try {
          mergeLiveCandles(symbol, '1m', oneMin);
          recomputeAnalysis(symbol, ['1m']);
        } catch (err) {
          console.warn(`[market-data] persist failed for ${symbol}:`, err);
        }
      }
      for (const interval of state.historicalCache.keys()) {
        state.historicalCache.set(interval, getCachedBars(symbol, interval));
      }
    }
  }

  private handleBrowserConnection(client: WebSocket) {
    let subscribedSymbol: string | null = null;

    client.on('message', (raw) => {
      let msg: { type?: string; symbol?: string; interval?: string };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.type === 'subscribe' && typeof msg.symbol === 'string') {
        const symbol = msg.symbol.toUpperCase();
        if (subscribedSymbol && subscribedSymbol !== symbol) this.unsubscribe(subscribedSymbol, client);
        subscribedSymbol = symbol;
        this.subscribe(symbol, client, (msg.interval as TimeInterval) || DEFAULT_INTERVAL);
      } else if (msg.type === 'setInterval' && typeof msg.interval === 'string') {
        if (subscribedSymbol) this.updateInterval(subscribedSymbol, client, msg.interval as TimeInterval);
      } else if (msg.type === 'unsubscribe') {
        if (subscribedSymbol) this.unsubscribe(subscribedSymbol, client);
        subscribedSymbol = null;
      } else if (msg.type === 'reconnectExternal') {
        this.reconnectExternalData();
      }
    });

    // Covers explicit Live-off (browser closes the socket) and ungraceful
    // disconnects (tab closed, crash, network drop) the same way — the
    // grace period in unsubscribe() is what tells them apart in practice.
    client.on('close', () => {
      if (subscribedSymbol) this.unsubscribe(subscribedSymbol, client);
    });
  }
}
