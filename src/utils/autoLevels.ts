import { Candlestick } from '../types/Candlestick';

export interface AutoLevel {
  id: string;
  label: string;
  price: number;
}

const dayKey = (timestamp: number): string => new Date(timestamp).toLocaleDateString('en-CA');

// 9:30 local time on the given day, matching how the rest of this app
// already treats "trading day" boundaries (local wall-clock, not UTC) —
// there's no explicit exchange-timezone handling anywhere else in this
// codebase either, so this stays consistent with that rather than
// introducing a one-off ET conversion just for this.
const sessionOpenMs = (dayTimestamp: number): number => {
  const d = new Date(dayTimestamp);
  d.setHours(9, 30, 0, 0);
  return d.getTime();
};

// Auto-computed reference levels — prior-day high/low/close, premarket
// high/low, and the opening range — derived purely from whatever candles
// are already loaded, client-side. Distinct from data/levels.json (Claude/
// find-trades authored, a judgment call about which levels matter); these
// are deterministic and always recomputable, so they don't belong in that
// file — they're not a decision, just arithmetic over the visible data.
export function computeAutoLevels(candles: Candlestick[]): AutoLevel[] {
  if (!candles.length) return [];

  const byDay = new Map<string, Candlestick[]>();
  for (const c of candles) {
    const key = dayKey(c.timestamp);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(c);
  }
  const dayKeys = Array.from(byDay.keys()).sort();
  const levels: AutoLevel[] = [];

  if (dayKeys.length >= 2) {
    const priorDay = byDay.get(dayKeys[dayKeys.length - 2])!;
    levels.push(
      { id: 'auto-pdh', label: 'PDH', price: Math.max(...priorDay.map((c) => c.high)) },
      { id: 'auto-pdl', label: 'PDL', price: Math.min(...priorDay.map((c) => c.low)) },
      { id: 'auto-pdc', label: 'PDC', price: priorDay[priorDay.length - 1].close },
    );
  }

  const today = byDay.get(dayKeys[dayKeys.length - 1])!;
  const open = sessionOpenMs(today[0].timestamp);
  const orEnd = open + 30 * 60 * 1000;
  const premarket = today.filter((c) => c.timestamp < open);
  const openingRange = today.filter((c) => c.timestamp >= open && c.timestamp < orEnd);

  if (premarket.length) {
    levels.push(
      { id: 'auto-pmh', label: 'PMH', price: Math.max(...premarket.map((c) => c.high)) },
      { id: 'auto-pml', label: 'PML', price: Math.min(...premarket.map((c) => c.low)) },
    );
  }
  if (openingRange.length) {
    levels.push(
      { id: 'auto-orh', label: 'ORH', price: Math.max(...openingRange.map((c) => c.high)) },
      { id: 'auto-orl', label: 'ORL', price: Math.min(...openingRange.map((c) => c.low)) },
    );
  }

  return levels;
}
