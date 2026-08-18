import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import { CandleStore } from '../../src/services/CandleStore';
import type { TimeInterval } from '../../src/types/Candlestick';
import { attachIndicators } from '../../src/utils/indicators';
import { connectAlpacaTrades, type AlpacaConnection } from './alpaca';
import { getCachedBars, mergeLiveCandles, recomputeAnalysis } from './cache';

const DEFAULT_INTERVAL: TimeInterval = '1m';

const PERSIST_INTERVAL_MS = 10000;
// How long to keep a symbol's Alpaca subscription alive with zero
// connected browser clients before actually tearing it down. Covers a
// page refresh (WS closes then immediately reopens and resubscribes)
// without treating every refresh as a full disconnect/reconnect cycle;
// a genuinely closed tab still cleans up shortly after.
const UNSUBSCRIBE_GRACE_MS = 45_000;

interface SymbolState {
  store: CandleStore;
  // Each client can view a different resolution (1m/5m/15m/1h) of the
  // same underlying 1m data — CandleStore already aggregates on demand,
  // so there's nothing to duplicate, just track what each client wants.
  browserClients: Map<WebSocket, TimeInterval>;
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

  // Just reads whatever the background gap-reconciliation cache
  // (vite-plugins/marketData/cache.ts) already has on disk for this
  // symbol's 1m — that cache is maintained proactively for the whole
  // active watchlist regardless of whether anyone's watching live, so
  // there's no ad-hoc backfill-on-subscribe logic needed here anymore.
  private seedStore(symbol: string): CandleStore {
    const store = new CandleStore();
    const persisted = getCachedBars(symbol, '1m');
    if (persisted.length) store.seedCandles(persisted);
    return store;
  }

  private subscribe(symbol: string, client: WebSocket, interval: TimeInterval) {
    const pendingTeardown = this.teardownTimers.get(symbol);
    if (pendingTeardown) {
      clearTimeout(pendingTeardown);
      this.teardownTimers.delete(symbol);
    }

    let state = this.symbols.get(symbol);
    if (!state) {
      state = { store: this.seedStore(symbol), browserClients: new Map() };
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

  private handleTrade(symbol: string, trade: { price: number; volume: number; timestamp: number; conditions: string[] }) {
    const state = this.symbols.get(symbol);
    if (!state) return; // trade arrived after teardown started; ignore
    state.store.addTrade(trade);
    for (const [client, interval] of state.browserClients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      const candles = attachIndicators(state.store.getCandles(interval));
      client.send(JSON.stringify({ type: 'trade', symbol, trade, candles }));
    }
  }

  private sendCandlesTo(client: WebSocket, symbol: string, state: SymbolState, interval: TimeInterval) {
    if (client.readyState !== WebSocket.OPEN) return;
    const candles = attachIndicators(state.store.getCandles(interval));
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
  // else on its own 5-min cycle.
  private persistAll() {
    for (const [symbol, state] of this.symbols) {
      const oneMin = state.store.getCandles('1m');
      if (!oneMin.length) continue;
      try {
        mergeLiveCandles(symbol, '1m', oneMin);
        recomputeAnalysis(symbol);
      } catch (err) {
        console.warn(`[market-data] persist failed for ${symbol}:`, err);
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
