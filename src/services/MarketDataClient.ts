import { Trade } from '../types/Trade';
import { Candlestick, TimeInterval } from '../types/Candlestick';

export type ExternalDataStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

type MarketDataCallbacks = {
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (error: Event) => void;
  onCandles: (candles: Candlestick[]) => void; // full snapshot — on subscribe, and after any reseed
  onTrade: (trade: Trade, candles: Candlestick[]) => void; // live tick + the updated full candle array
  // Node's own connection to the external market-data API — distinct
  // from onConnected/onDisconnected above, which are about the browser's
  // connection to Node. The browser can't observe Node's Alpaca
  // connection any other way, so this is pushed through explicitly.
  onExternalStatus: (status: ExternalDataStatus) => void;
};

// Connects to Node's local market-data WebSocket (vite-plugins/marketData/service.ts)
// instead of Alpaca directly. Node owns aggregation and indicator math
// now — this client just relays whatever it receives; candles arrive
// already indicator-enriched, nothing to compute here.
export class MarketDataClient {
  private ws: WebSocket | null = null;
  private symbol: string = '';

  constructor(private readonly callbacks: MarketDataCallbacks) {}

  connect(symbol: string, interval: TimeInterval) {
    this.symbol = symbol;
    if (this.ws) this.ws.close();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}/ws/market`);

    this.ws.onopen = () => {
      this.ws?.send(JSON.stringify({ type: 'subscribe', symbol: this.symbol, interval }));
      this.callbacks.onConnected();
    };
    this.ws.onclose = () => this.callbacks.onDisconnected();
    this.ws.onerror = (error) => this.callbacks.onError(error);
    this.ws.onmessage = (event) => this.handleMessage(event);
  }

  private handleMessage(event: MessageEvent) {
    let msg: { type?: string; symbol?: string; trade?: Trade; candles?: Candlestick[]; status?: ExternalDataStatus };
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (msg.type === 'externalStatus' && msg.status) {
      this.callbacks.onExternalStatus(msg.status);
      return;
    }
    if (msg.symbol && msg.symbol !== this.symbol) return; // stale message from a symbol we've since left

    if (msg.type === 'candles' && msg.candles) {
      this.callbacks.onCandles(msg.candles);
    } else if (msg.type === 'trade' && msg.trade && msg.candles) {
      this.callbacks.onTrade(msg.trade, msg.candles);
    }
  }

  changeSymbol(newSymbol: string, interval: TimeInterval) {
    this.symbol = newSymbol;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol: newSymbol, interval }));
    }
  }

  setInterval(interval: TimeInterval) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'setInterval', interval }));
    }
  }

  // UI-triggered repair for Node's external connection — doesn't touch
  // the browser↔Node connection at all, just asks Node to tear down and
  // reopen whatever it has to Alpaca.
  reconnectExternal() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'reconnectExternal' }));
    }
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect() {
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'unsubscribe' }));
      }
      this.ws.close();
      this.ws = null;
    }
  }
}
