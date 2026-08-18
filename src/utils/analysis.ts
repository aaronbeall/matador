import { Candlestick, TimeInterval } from '../types/Candlestick';
import { AnalysisSnapshot, TimeframeAnalysis } from '../types/AnalysisSnapshot';
import {
  ALL_INDICATORS,
  calculateVWAP,
  calculateATR,
  attachIndicators,
  attachCandlePatterns,
} from './indicators';

const FULL_CONFIDENCE_BARS = 30; // enough for all indicators (MACD needs the most: ~26+9)
const INTRADAY_TIMEFRAMES: TimeInterval[] = ['1m', '5m', '15m'];
const ALL_TIMEFRAMES: TimeInterval[] = ['1m', '5m', '15m', '1h', '1d', '1w'];
// VWAP gets attached separately below (day-aware), never through
// attachIndicators' default cumulative-over-the-whole-array behavior —
// see attachDailyVWAP.
const NON_VWAP_INDICATORS = ALL_INDICATORS.filter((i) => i !== 'vwap');

const dayKey = (timestamp: number) => new Date(timestamp).toLocaleDateString('en-CA');

// VWAP conventionally resets every trading session. Annotating it across a
// multi-day series means computing it per calendar day and stitching the
// days back together, not running one cumulative VWAP over the whole
// window (which is what attachIndicators' default VWAP would otherwise do,
// and would just be wrong the moment more than one day is loaded).
function attachDailyVWAP(candles: Candlestick[]): Candlestick[] {
  const byDay = new Map<string, Candlestick[]>();
  for (const c of candles) {
    const key = dayKey(c.timestamp);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(c);
  }
  for (const dayCandles of byDay.values()) {
    const vwapSeries = calculateVWAP(dayCandles);
    dayCandles.forEach((c, i) => {
      c.vwap = vwapSeries[i];
    });
  }
  return candles;
}

// Precomputes and annotates every deterministic thing onto each candle —
// indicator values (same math the chart uses) plus detected candlestick
// patterns — and nothing else. Trend structure, momentum crossovers, level
// identification, and what a tagged pattern means in context are
// deliberately NOT computed here; that's the read-time job (find-trades
// reading data/candles/<symbol>/analysis.md), same way a trader reads a
// chart rather than trusting a pre-decided verdict.
function annotateTimeframe(candles: Candlestick[], opts: { intraday: boolean }): Candlestick[] {
  let annotated = attachIndicators(candles, NON_VWAP_INDICATORS);

  const atrSeries = calculateATR(candles, 14);
  const atrOffset = annotated.length - atrSeries.length;
  atrSeries.forEach((value, i) => {
    annotated[i + atrOffset].atr14 = value;
  });

  if (opts.intraday) annotated = attachDailyVWAP(annotated);

  return attachCandlePatterns(annotated);
}

// Builds the full annotated candle history per timeframe — see
// TimeframeAnalysis. Called from the gap-reconciliation cache
// (vite-plugins/marketData/cache.ts) whenever any timeframe's candles
// change; rendered to markdown by renderAnalysisMarkdown below.
export function computeAnalysisSnapshot(
  symbol: string,
  candlesByTimeframe: Partial<Record<TimeInterval, Candlestick[]>>
): AnalysisSnapshot | null {
  const timeframes: Partial<Record<TimeInterval, TimeframeAnalysis>> = {};

  for (const tf of ALL_TIMEFRAMES) {
    const candles = candlesByTimeframe[tf];
    if (!candles?.length) continue;
    timeframes[tf] = {
      barCount: candles.length,
      dataQuality: candles.length >= FULL_CONFIDENCE_BARS ? 'ok' : 'thin',
      candles: annotateTimeframe(candles, { intraday: INTRADAY_TIMEFRAMES.includes(tf) }),
    };
  }

  if (Object.keys(timeframes).length === 0) return null;

  return {
    symbol: symbol.toUpperCase(),
    computedAt: new Date().toISOString(),
    timeframes,
  };
}

// --- Markdown rendering -----------------------------------------------
// Deliberately a separate step from computing the data above — the table
// format can change without touching the annotation math, and vice versa.

const round = (n: number | undefined, decimals: number): string =>
  n == null || Number.isNaN(n) ? '' : n.toFixed(decimals);

function formatTime(timestamp: number, interval: TimeInterval): string {
  const d = new Date(timestamp);
  if (interval === '1d' || interval === '1w') return d.toLocaleDateString('en-CA');
  const date = d.toLocaleDateString('en-CA').slice(5); // MM-DD
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} ${time}`;
}

const TIMEFRAME_ORDER: TimeInterval[] = ['1w', '1d', '1h', '15m', '5m', '1m'];

function renderTimeframeTable(interval: TimeInterval, block: TimeframeAnalysis): string {
  const intraday = INTRADAY_TIMEFRAMES.includes(interval);
  const headers = ['time', 'open', 'high', 'low', 'close', 'volume', 'ema9', 'ema21', 'sma20', 'sma50', 'sma200'];
  if (intraday) headers.push('vwap');
  headers.push('rsi14', 'macd', 'signal', 'histogram', 'atr14', 'patterns');

  const rows = block.candles.map((c) => {
    const cells = [
      formatTime(c.timestamp, interval),
      round(c.open, 2), round(c.high, 2), round(c.low, 2), round(c.close, 2),
      String(c.volume),
      round(c.ema9, 2), round(c.ema21, 2), round(c.sma20, 2), round(c.sma50, 2), round(c.sma200, 2),
    ];
    if (intraday) cells.push(round(c.vwap, 2));
    cells.push(
      round(c.rsi, 1), round(c.macd, 3), round(c.signal, 3), round(c.histogram, 3), round(c.atr14, 3),
      c.patterns?.length ? c.patterns.join(', ') : ''
    );
    return cells;
  });

  const lines = [
    `### ${interval} (${block.barCount} bars, ${block.dataQuality})`,
    '',
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ];
  return lines.join('\n');
}

// The Claude-facing artifact: one table per maintained timeframe, ordered
// top-down (1w -> 1m) to match the reading order find-trades is instructed
// to use — bias/structure from the slow timeframes first, drilling into
// faster ones only for symbols worth it. Written to
// data/candles/<symbol>/analysis.md by cache.ts. A markdown table states
// each column name once instead of repeating it on every candle the way
// JSON would, and reads closer to tracing lines/patterns on a chart than a
// JSON dump does.
export function renderAnalysisMarkdown(snapshot: AnalysisSnapshot): string {
  const sections = TIMEFRAME_ORDER
    .filter((tf) => snapshot.timeframes[tf])
    .map((tf) => renderTimeframeTable(tf, snapshot.timeframes[tf]!));

  return [`# ${snapshot.symbol} — analysis snapshot`, `Computed: ${snapshot.computedAt}`, '', ...sections].join('\n\n');
}
