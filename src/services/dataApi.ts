// Client for the local dev-server bridge (vite-plugins/localDataApi.ts and
// marketDataPlugin.ts). See docs/trade-analysis-plan.md — this is the
// frontend side of the shared data/ state layer also used by the
// find-trades skill. Live candle/indicator data itself no longer flows
// through here — that's the /ws/market WebSocket (see MarketDataClient),
// backed by Alpaca server-side (vite-plugins/marketData/) —
// this file is for the rest of the shared state (watchlist, strategy,
// ideas, levels, alerts, activity log) plus the one-off quote fetch for
// the non-Live polling mode.
import { Watchlist } from '../types/Watchlist';
import { TradeIdeas } from '../types/TradeIdea';
import { Levels } from '../types/Level';
import { Alerts } from '../types/Alert';
import { AnalysisLog } from '../types/AnalysisLog';
import { Skills } from '../types/Skill';
import { Theses } from '../types/Thesis';

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

export async function getThesis(): Promise<Theses> {
  const res = await fetch('/api/thesis');
  if (!res.ok) throw new Error('Failed to load thesis');
  return res.json();
}

export async function saveThesis(thesis: Theses): Promise<void> {
  const res = await fetch('/api/thesis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(thesis),
  });
  if (!res.ok) throw new Error('Failed to save thesis');
}

export async function getAnalysisLog(): Promise<AnalysisLog> {
  const res = await fetch('/api/analysis-log');
  if (!res.ok) throw new Error('Failed to load analysis log');
  return res.json();
}

// Documentation only — parsed straight from .claude/skills/*/SKILL.md
// (vite-plugins/skillsReader.ts), never hand-maintained here.
export async function getSkills(): Promise<Skills> {
  const res = await fetch('/api/skills');
  if (!res.ok) throw new Error('Failed to load skills');
  return res.json();
}

// One-off quote fetch for the non-Live polling mode — Node fetches from
// Alpaca server-side (vite-plugins/marketData/alpaca.ts) so the API key
// never reaches the browser.
export async function getQuote(symbol: string): Promise<{ c: number } | null> {
  const res = await fetch(`/api/market/${symbol}/quote`);
  if (!res.ok) return null;
  return res.json();
}

// Clears a symbol's (or, with no argument, the whole active watchlist's)
// cached multi-timeframe history and forces an immediate fresh re-fetch
// from Alpaca — see vite-plugins/marketData/cache.ts. Doesn't wait for
// the 5-min background reconcile cycle.
export async function rebuildMarketData(symbol?: string): Promise<void> {
  const res = await fetch(symbol ? `/api/market/${symbol}/rebuild` : '/api/market/rebuild', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to rebuild market data cache');
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
