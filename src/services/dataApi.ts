// Client for the local dev-server bridge (vite-plugins/localDataApi.ts).
// See docs/trade-analysis-plan.md — this is the frontend side of the
// shared data/ state layer also used by the find-trades skill.
import { Watchlist } from '../types/Watchlist';
import { TradeIdeas } from '../types/TradeIdea';
import { Candlestick } from '../types/Candlestick';
import { Levels } from '../types/Level';
import { Alerts } from '../types/Alert';
import { AnalysisLog } from '../types/AnalysisLog';

export async function getWatchlist(): Promise<Watchlist> {
  const res = await fetch('/api/watchlist');
  if (!res.ok) throw new Error('Failed to load watchlist');
  return res.json();
}

export async function saveWatchlist(watchlist: Watchlist): Promise<void> {
  const res = await fetch('/api/watchlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(watchlist),
  });
  if (!res.ok) throw new Error('Failed to save watchlist');
}

export async function getStrategy(): Promise<string> {
  const res = await fetch('/api/strategy');
  if (!res.ok) throw new Error('Failed to load strategy.md');
  return res.text();
}

export async function getTradeIdeas(): Promise<TradeIdeas> {
  const res = await fetch('/api/trade-ideas');
  if (!res.ok) throw new Error('Failed to load trade ideas');
  return res.json();
}

export async function saveTradeIdeas(ideas: TradeIdeas): Promise<void> {
  const res = await fetch('/api/trade-ideas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ideas),
  });
  if (!res.ok) throw new Error('Failed to save trade ideas');
}

export async function getLevels(): Promise<Levels> {
  const res = await fetch('/api/levels');
  if (!res.ok) throw new Error('Failed to load levels');
  return res.json();
}

export async function getAlerts(): Promise<Alerts> {
  const res = await fetch('/api/alerts');
  if (!res.ok) throw new Error('Failed to load alerts');
  return res.json();
}

export async function saveAlerts(alerts: Alerts): Promise<void> {
  const res = await fetch('/api/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alerts),
  });
  if (!res.ok) throw new Error('Failed to save alerts');
}

export async function getAnalysisLog(): Promise<AnalysisLog> {
  const res = await fetch('/api/analysis-log');
  if (!res.ok) throw new Error('Failed to load analysis log');
  return res.json();
}

export async function persistCandles(symbol: string, candles: Candlestick[]): Promise<void> {
  await fetch(`/api/candles/${symbol}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(candles),
  });
}

export async function getPersistedCandles(symbol: string): Promise<Candlestick[]> {
  const res = await fetch(`/api/candles/${symbol}`);
  if (!res.ok) return [];
  return res.json();
}

// Subscribes to server-pushed "this file changed" notices (see
// vite-plugins/localDataApi.ts). `onChange` is called with the route name
// that changed (e.g. 'trade-ideas', 'levels', `candles/QQQ`) — callers
// re-fetch just that data rather than the event carrying a payload.
// Returns an unsubscribe function. Degrades silently if the connection
// drops; pair with polling and/or a window-focus refetch as a fallback.
export function subscribeToDataEvents(onChange: (route: string) => void): () => void {
  const source = new EventSource('/api/events');
  source.onmessage = (event) => {
    try {
      const { file } = JSON.parse(event.data);
      if (file) onChange(file);
    } catch {
      // ignore malformed events
    }
  };
  return () => source.close();
}
