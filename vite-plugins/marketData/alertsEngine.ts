import fs from 'fs';
import path from 'path';
import type { Candlestick } from '../../src/types/Candlestick';
import type { AnalysisSnapshot } from '../../src/types/AnalysisSnapshot';
import type { Alert, AlertCondition, Alerts } from '../../src/types/Alert';

// Evaluates the pending AlertConditions Claude wrote against whatever
// annotated candle history cache.ts's recomputeAnalysis just assembled
// (from the persisted, partitioned cache — see cache.ts's header comment)
// — called from that same function, so this adds no new polling loop and
// no extra recompute. See docs/trade-analysis-plan.md.

const ALERTS_PATH = path.resolve(process.cwd(), 'data', 'alerts.json');

function readAlerts(): Alerts {
  if (!fs.existsSync(ALERTS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(ALERTS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function writeAlerts(alerts: Alerts) {
  fs.mkdirSync(path.dirname(ALERTS_PATH), { recursive: true });
  fs.writeFileSync(ALERTS_PATH, JSON.stringify(alerts, null, 2) + '\n');
}

// analysis.md's table columns are labeled rsi14/atr14 (the "14" makes the
// period explicit for a reader); the underlying Candlestick field for RSI
// is just `rsi` (see indicators.ts's Indicator union) while ATR already
// carries the atr14 name. This is the one place that naming gap gets
// bridged for condition evaluation.
function getIndicatorValue(candle: Candlestick, indicator: 'rsi14' | 'atr14'): number | undefined {
  return indicator === 'rsi14' ? candle.rsi : candle.atr14;
}

// Edge-triggered: compares the last two candles so a condition fires once
// on the transition into true, not on every subsequent tick it stays true.
export function evaluateCondition(condition: AlertCondition, candles: Candlestick[]): boolean {
  if (candles.length < 2) return false;
  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];

  switch (condition.kind) {
    case 'price-crosses':
      return condition.direction === 'above'
        ? prev.close < condition.level && curr.close >= condition.level
        : prev.close > condition.level && curr.close <= condition.level;

    case 'indicator-crosses': {
      const prevFast = prev[condition.fast];
      const prevSlow = prev[condition.slow];
      const currFast = curr[condition.fast];
      const currSlow = curr[condition.slow];
      if (prevFast == null || prevSlow == null || currFast == null || currSlow == null) return false;
      const prevDiff = prevFast - prevSlow;
      const currDiff = currFast - currSlow;
      return condition.direction === 'bullish' ? prevDiff <= 0 && currDiff > 0 : prevDiff >= 0 && currDiff < 0;
    }

    case 'macd-crosses-signal': {
      if (prev.macd == null || prev.signal == null || curr.macd == null || curr.signal == null) return false;
      const prevDiff = prev.macd - prev.signal;
      const currDiff = curr.macd - curr.signal;
      return condition.direction === 'bullish' ? prevDiff <= 0 && currDiff > 0 : prevDiff >= 0 && currDiff < 0;
    }

    case 'indicator-threshold': {
      const prevValue = getIndicatorValue(prev, condition.indicator);
      const currValue = getIndicatorValue(curr, condition.indicator);
      if (prevValue == null || currValue == null) return false;
      return condition.comparator === 'above'
        ? prevValue <= condition.value && currValue > condition.value
        : prevValue >= condition.value && currValue < condition.value;
    }

    case 'band-cross': {
      const upper = condition.band === 'vwap' ? 'vwapUpper2' : 'bollingerUpper';
      const lower = condition.band === 'vwap' ? 'vwapLower2' : 'bollingerLower';
      const prevUpper = prev[upper];
      const prevLower = prev[lower];
      const currUpper = curr[upper];
      const currLower = curr[lower];
      if (prevUpper == null || prevLower == null || currUpper == null || currLower == null) return false;

      if (condition.direction === 'above-upper') {
        return prev.close <= prevUpper && curr.close > currUpper;
      }
      if (condition.direction === 'below-lower') {
        return prev.close >= prevLower && curr.close < currLower;
      }
      // 'back-inside' — was stretched outside either band on the prior
      // candle, has snapped back within both on this one.
      const prevOutside = prev.close > prevUpper || prev.close < prevLower;
      const currInside = curr.close <= currUpper && curr.close >= currLower;
      return prevOutside && currInside;
    }
  }
}

// Checks every pending alert for one symbol against its freshly-computed
// snapshot: expires anything past its expiresAt (so a pending condition
// tied to a since-expired idea doesn't linger forever waiting for a scan
// that expires it), then checks `invalidation` (the competing scenario —
// evaluated the same way as the main condition, and checked first, so a
// bearish trigger that's just been overtaken by a bullish reclaim
// resolves the moment that reclaim happens, not whenever a stale window
// eventually times out), then the main condition. Only writes alerts.json
// back if something actually changed.
export function evaluateAlertsForSymbol(symbol: string, snapshot: AnalysisSnapshot): void {
  const all = readAlerts();
  const now = Date.now();
  let changed = false;

  const updated = all.map((alert): Alert => {
    if (alert.symbol.toUpperCase() !== symbol.toUpperCase() || alert.status !== 'pending') return alert;

    if (Date.parse(alert.expiresAt) < now) {
      changed = true;
      return { ...alert, status: 'expired', expiredAt: new Date(now).toISOString() };
    }

    // Invalidation isn't gated by activeFrom — the competing scenario can
    // resolve this alert even before its own watch window has opened.
    if (alert.invalidation) {
      const invBlock = snapshot.timeframes[alert.invalidation.timeframe];
      if (invBlock?.candles.length && evaluateCondition(alert.invalidation, invBlock.candles)) {
        changed = true;
        return { ...alert, status: 'invalidated', invalidatedAt: new Date(now).toISOString() };
      }
    }

    // Not yet in its active window — expiry/invalidation above still
    // apply (an alert can lapse or be invalidated before ever becoming
    // active, e.g. stale/malformed data), but the main condition isn't
    // checked yet.
    if (alert.activeFrom && Date.parse(alert.activeFrom) > now) return alert;

    const block = snapshot.timeframes[alert.condition.timeframe];
    if (!block?.candles.length) return alert; // this timeframe isn't cached yet for this symbol

    if (evaluateCondition(alert.condition, block.candles)) {
      changed = true;
      return { ...alert, status: 'triggered', triggeredAt: new Date(now).toISOString() };
    }
    return alert;
  });

  if (changed) writeAlerts(updated);
}
