import { Candlestick, TimeInterval } from '../types/Candlestick';
import { TimeframeAnalysis } from '../types/AnalysisSnapshot';
import {
  ALL_INDICATORS,
  calculateVWAPBands,
  calculateATR,
  calculateRVOL,
  attachIndicators,
  attachCandlePatterns,
} from './indicators';

const FULL_CONFIDENCE_BARS = 30; // enough for all indicators (MACD needs the most: ~26+9)
const INTRADAY_TIMEFRAMES: TimeInterval[] = ['1m', '5m', '15m'];
export const TIMEFRAME_ORDER: TimeInterval[] = ['1w', '1d', '1h', '15m', '5m', '1m'];
// VWAP gets attached separately below (day-aware), never through
// attachIndicators' default cumulative-over-the-whole-array behavior —
// see attachDailyVWAP.
const NON_VWAP_INDICATORS = ALL_INDICATORS.filter((i) => i !== 'vwap');

// --- Period keys ---------------------------------------------------------
// How the persisted cache is partitioned per timeframe (see
// vite-plugins/marketData/cache.ts): day for the fast timeframes (so
// "today" and "yesterday" are each their own small file — what an ORB-style
// read actually needs), ISO week for 1h, calendar month for 1d, and 1w
// stays a single unpartitioned file (already only ~100 rows total). All
// three key functions use local time, matching how the rest of this app
// already treats "trading day" (toLocaleDateString('en-CA')), not UTC —
// mixing the two would put a candle in a different partition than its own
// day-file at certain hours.

export const dayKey = (timestamp: number): string => new Date(timestamp).toLocaleDateString('en-CA');

export const monthKey = (timestamp: number): string => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Standard ISO week algorithm (Thursday-of-the-week trick), local time.
export const isoWeekKey = (timestamp: number): string => {
  const d = new Date(timestamp);
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

// null means "no partitioning" (1w) — a single file, not split by period.
export function periodKeyFor(interval: TimeInterval, timestamp: number): string | null {
  switch (interval) {
    case '1m':
    case '5m':
    case '15m':
      return dayKey(timestamp);
    case '1h':
      return isoWeekKey(timestamp);
    case '1d':
      return monthKey(timestamp);
    case '1w':
      return null;
  }
}

// --- Annotation ------------------------------------------------------------

// VWAP conventionally resets every trading session. Annotating it across a
// multi-day series means computing it (plus its ±1σ/±2σ bands) per
// calendar day and stitching the days back together, not running one
// cumulative VWAP over the whole window (which is what attachIndicators'
// default VWAP would otherwise do, and would just be wrong the moment
// more than one day is loaded).
function attachDailyVWAP(candles: Candlestick[]): Candlestick[] {
  const byDay = new Map<string, Candlestick[]>();
  for (const c of candles) {
    const key = dayKey(c.timestamp);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(c);
  }
  for (const dayCandles of byDay.values()) {
    const bands = calculateVWAPBands(dayCandles);
    dayCandles.forEach((c, i) => {
      c.vwap = bands[i].vwap;
      c.vwapUpper1 = bands[i].upper1;
      c.vwapLower1 = bands[i].lower1;
      c.vwapUpper2 = bands[i].upper2;
      c.vwapLower2 = bands[i].lower2;
    });
  }
  return candles;
}

// Precomputes and annotates every deterministic thing onto each candle —
// indicator values (same math the chart uses) plus detected candlestick
// patterns — and nothing else. Trend structure, momentum crossovers, level
// identification, and what a tagged pattern means in context are
// deliberately NOT computed here; that's the read-time job (find-trades
// reading the per-period markdown files cache.ts writes), same way a
// trader reads a chart rather than trusting a pre-decided verdict.
//
// Always runs over the FULL continuous series for a timeframe, never a
// single partition in isolation — EMA/SMA/RSI/MACD/ATR are causal
// (SMA200 alone needs 200 prior bars), so annotating one period file's
// rows on their own would reset the warm-up at every partition boundary.
// cache.ts is responsible for concatenating all of a timeframe's period
// files before calling this, and for splitting the result back apart
// afterward.
export function annotateTimeframe(candles: Candlestick[], opts: { intraday: boolean }): Candlestick[] {
  let annotated = attachIndicators(candles, NON_VWAP_INDICATORS);

  const atrSeries = calculateATR(candles, 14);
  const atrOffset = annotated.length - atrSeries.length;
  atrSeries.forEach((value, i) => {
    annotated[i + atrOffset].atr14 = value;
  });

  const rvolSeries = calculateRVOL(candles, 20);
  const rvolOffset = annotated.length - rvolSeries.length;
  rvolSeries.forEach((value, i) => {
    annotated[i + rvolOffset].rvol = value;
  });

  if (opts.intraday) annotated = attachDailyVWAP(annotated);

  return attachCandlePatterns(annotated);
}

export function isIntraday(interval: TimeInterval): boolean {
  return INTRADAY_TIMEFRAMES.includes(interval);
}

export function toTimeframeAnalysis(candles: Candlestick[]): TimeframeAnalysis {
  return {
    barCount: candles.length,
    dataQuality: candles.length >= FULL_CONFIDENCE_BARS ? 'ok' : 'thin',
    candles,
  };
}

// --- Markdown rendering -----------------------------------------------
// Deliberately separate from the annotation math above — the table format
// can change without touching how indicators are computed, and vice versa.

const round = (n: number | undefined, decimals: number): string =>
  n == null || Number.isNaN(n) ? '' : n.toFixed(decimals);

function formatTime(timestamp: number, interval: TimeInterval): string {
  const d = new Date(timestamp);
  if (interval === '1d' || interval === '1w') return d.toLocaleDateString('en-CA');
  const date = d.toLocaleDateString('en-CA').slice(5); // MM-DD
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} ${time}`;
}

export function renderTimeframeTable(interval: TimeInterval, block: TimeframeAnalysis): string {
  const intraday = isIntraday(interval);
  const headers = ['time', 'open', 'high', 'low', 'close', 'volume', 'rvol', 'ema9', 'ema21', 'sma20', 'sma50', 'sma200'];
  if (intraday) headers.push('vwap', 'vwapU1', 'vwapL1');
  headers.push('rsi14', 'macd', 'signal', 'histogram', 'atr14', 'patterns');

  const rows = block.candles.map((c) => {
    const cells = [
      formatTime(c.timestamp, interval),
      round(c.open, 2), round(c.high, 2), round(c.low, 2), round(c.close, 2),
      String(c.volume), round(c.rvol, 2),
      round(c.ema9, 2), round(c.ema21, 2), round(c.sma20, 2), round(c.sma50, 2), round(c.sma200, 2),
    ];
    if (intraday) cells.push(round(c.vwap, 2), round(c.vwapUpper1, 2), round(c.vwapLower1, 2));
    cells.push(
      round(c.rsi, 1), round(c.macd, 3), round(c.signal, 3), round(c.histogram, 3), round(c.atr14, 3),
      c.patterns?.length ? c.patterns.join(', ') : ''
    );
    return cells;
  });

  const lines = [
    `### ${interval} (${block.barCount} bars total, ${block.dataQuality})`,
    '',
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ];
  return lines.join('\n');
}

// One period file's worth of one timeframe — e.g. QQQ/1d/2026-08.md,
// QQQ/1m/2026-08-18.md. `periodLabel` is just the human-readable heading
// (the period key itself, e.g. "2026-08" or "2026-08-18").
export function renderPeriodMarkdown(symbol: string, interval: TimeInterval, periodLabel: string, candles: Candlestick[]): string {
  const block = toTimeframeAnalysis(candles);
  return [`# ${symbol.toUpperCase()} — ${interval} — ${periodLabel}`, '', renderTimeframeTable(interval, block)].join('\n\n');
}

// The small cross-timeframe orientation file (data/candles/<symbol>/latest.md)
// — the tail of each maintained timeframe, enough to triage but not to
// found a decision on for anything needing real history. `barCount` on
// each table still reflects the *full* cached window, not just the tail
// shown, so it's clear from this file alone how much deeper history is
// available in the period files.
export function renderLatestMarkdown(symbol: string, timeframes: Partial<Record<TimeInterval, TimeframeAnalysis>>, tailBars = 10): string {
  const sections = TIMEFRAME_ORDER
    .filter((tf) => timeframes[tf])
    .map((tf) => {
      const block = timeframes[tf]!;
      return renderTimeframeTable(tf, { ...block, candles: block.candles.slice(-tailBars) });
    });

  return [`# ${symbol.toUpperCase()} — latest`, `Computed: ${new Date().toISOString()}`, '', ...sections].join('\n\n');
}
