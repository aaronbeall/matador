import WebSocket from 'ws';

const DATA_BASE_URL = 'https://data.alpaca.markets/v2';
const STREAM_URL = 'wss://stream.data.alpaca.markets/v2/iex';

export interface AlpacaTrade {
  price: number;
  volume: number;
  timestamp: number;
  conditions: string[];
}

export interface AlpacaBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AlpacaConnection {
  subscribe(symbol: string): void;
  unsubscribe(symbol: string): void;
  close(): void;
}

function authHeaders(keyId: string, secret: string): Record<string, string> {
  return { 'APCA-API-KEY-ID': keyId, 'APCA-API-SECRET-KEY': secret };
}

// Node's connection to Alpaca's realtime IEX trade WebSocket. Unlike
// Finnhub, a bare connection isn't enough — Alpaca requires an explicit
// auth handshake after the socket opens (send {action:"auth",...}, wait
// for an "authenticated" frame) before any subscribe is accepted, and
// every message arrives as an array of frames rather than one object per
// message. Alpaca also only allows a single realtime IEX connection per
// account at a time — fine here since MarketDataService already funnels
// every symbol through one shared upstream connection.
export function connectAlpacaTrades(
  keyId: string,
  secret: string,
  onTrade: (symbol: string, trade: AlpacaTrade) => void,
  onStatus?: (status: 'connected' | 'disconnected' | 'error') => void
): AlpacaConnection {
  const ws = new WebSocket(STREAM_URL);
  const pendingSubscriptions: string[] = [];
  let authenticated = false;

  ws.on('open', () => {
    ws.send(JSON.stringify({ action: 'auth', key: keyId, secret }));
  });

  ws.on('message', (raw) => {
    let frames: unknown;
    try {
      frames = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!Array.isArray(frames)) return;

    for (const frame of frames as Record<string, unknown>[]) {
      if (frame.T === 'success' && frame.msg === 'authenticated') {
        authenticated = true;
        onStatus?.('connected');
        for (const symbol of pendingSubscriptions) {
          ws.send(JSON.stringify({ action: 'subscribe', trades: [symbol] }));
        }
        pendingSubscriptions.length = 0;
      } else if (frame.T === 'error') {
        onStatus?.('error');
      } else if (frame.T === 't') {
        onTrade(frame.S as string, {
          price: frame.p as number,
          volume: frame.s as number,
          timestamp: Date.parse(frame.t as string),
          conditions: (frame.c as string[]) ?? [],
        });
      }
    }
  });

  ws.on('close', () => onStatus?.('disconnected'));
  ws.on('error', () => onStatus?.('error'));

  return {
    subscribe(symbol: string) {
      if (authenticated) ws.send(JSON.stringify({ action: 'subscribe', trades: [symbol] }));
      else pendingSubscriptions.push(symbol);
    },
    unsubscribe(symbol: string) {
      if (authenticated) ws.send(JSON.stringify({ action: 'unsubscribe', trades: [symbol] }));
    },
    close() {
      ws.close();
    },
  };
}

// One-off latest-trade fetch for the non-Live polling mode. `{ c: price }`
// shape kept to match what dataApi.getQuote already expects.
export async function fetchQuote(keyId: string, secret: string, symbol: string): Promise<{ c: number } | null> {
  try {
    const res = await fetch(`${DATA_BASE_URL}/stocks/${symbol}/trades/latest?feed=iex`, {
      headers: authHeaders(keyId, secret),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.trade?.p !== 'number') return null;
    return { c: data.trade.p };
  } catch {
    return null;
  }
}

// Native bars for one timeframe (1Min/5Min/15Min/1Hour/1Day/1Week) over
// [startISO, endISO]. Unlike Finnhub's free tier, this reliably serves
// real history — no gating — so this is the actual backbone of the
// gap-reconciliation cache (see cache.ts), not just a bonus best-effort
// backfill. Paginates via next_page_token since a wide window can exceed
// the 10k-bar page limit (e.g. ~500 days of 1Day bars is fine in one
// page, but a wide 1Min window would not be).
export async function fetchBars(
  keyId: string,
  secret: string,
  symbol: string,
  timeframe: string,
  startISO: string,
  endISO: string
): Promise<AlpacaBar[] | null> {
  const bars: AlpacaBar[] = [];
  let pageToken: string | null = null;

  try {
    do {
      const url = new URL(`${DATA_BASE_URL}/stocks/${symbol}/bars`);
      url.searchParams.set('timeframe', timeframe);
      url.searchParams.set('start', startISO);
      url.searchParams.set('end', endISO);
      url.searchParams.set('feed', 'iex');
      url.searchParams.set('adjustment', 'raw');
      url.searchParams.set('limit', '10000');
      if (pageToken) url.searchParams.set('page_token', pageToken);

      const res = await fetch(url, { headers: authHeaders(keyId, secret) });
      if (!res.ok) return bars.length ? bars : null;
      const data = await res.json();

      for (const bar of data.bars ?? []) {
        bars.push({
          timestamp: Date.parse(bar.t),
          open: bar.o,
          high: bar.h,
          low: bar.l,
          close: bar.c,
          volume: bar.v,
        });
      }
      pageToken = data.next_page_token ?? null;
    } while (pageToken);

    return bars;
  } catch {
    return bars.length ? bars : null;
  }
}
