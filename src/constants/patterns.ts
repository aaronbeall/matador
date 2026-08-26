import { Direction } from './direction';

export type PatternDirection = Direction;
export type PatternStrength = 'weak' | 'moderate' | 'strong';

export interface PatternInfo {
  label: string;
  direction: PatternDirection;
  strength: PatternStrength;
  description: string; // what the pattern actually is, plainly
  why: string; // why/when it's actually worth weighting as a signal
}

// Keys match the pattern tags attached in src/utils/indicators.ts's
// CANDLE_PATTERN_CHECKERS (the `technicalindicators` library's pattern
// names, kebab-cased). `strength` is a rough, standard read of how much
// weight this pattern carries as a reversal/exhaustion signal on its own
// — never a substitute for the level/trend context it appears in (a doji
// mid-range means nothing; the same doji at a tested level is a real
// signal), which is why it's called out as 'weak' rather than omitted.
export const PATTERN_INFO: Record<string, PatternInfo> = {
  'bullish-engulfing': {
    label: 'Bullish Engulfing',
    direction: 'bullish',
    strength: 'strong',
    description: 'A bearish candle fully engulfed by the next bullish candle.',
    why: 'A real shift in control from sellers to buyers — carries more weight at a tested support level than in the middle of a range.',
  },
  'bearish-engulfing': {
    label: 'Bearish Engulfing',
    direction: 'bearish',
    strength: 'strong',
    description: 'A bullish candle fully engulfed by the next bearish candle.',
    why: 'A real shift in control from buyers to sellers — carries more weight at a tested resistance level than in the middle of a range.',
  },
  'bullish-hammer': {
    label: 'Bullish Hammer',
    direction: 'bullish',
    strength: 'moderate',
    description: 'Small body near the top of the range with a long lower wick.',
    why: 'Shows rejection of lower prices within the bar — meaningful after a decline into support, easy to overread as noise elsewhere.',
  },
  'bearish-hammer': {
    label: 'Bearish Hammer',
    direction: 'bearish',
    strength: 'moderate',
    description: 'Small body with a long lower wick, appearing after an advance.',
    why: 'The rejection of lower prices happened, but in an uptrend context that can mark exhaustion rather than continued strength — wants confirmation from the next bar.',
  },
  doji: {
    label: 'Doji',
    direction: 'neutral',
    strength: 'weak',
    description: 'Open and close are nearly equal.',
    why: "Pure indecision, no directional information on its own — only worth noting when it shows up right at a level or after a strong multi-bar move.",
  },
  'morning-star': {
    label: 'Morning Star',
    direction: 'bullish',
    strength: 'strong',
    description: "Three-bar bottoming pattern — a down bar, a small-bodied indecision bar, then a strong up bar closing back into the first bar's range.",
    why: 'One of the more reliable multi-bar reversal signals.',
  },
  'evening-star': {
    label: 'Evening Star',
    direction: 'bearish',
    strength: 'strong',
    description: "Three-bar topping pattern — an up bar, a small-bodied indecision bar, then a strong down bar closing back into the first bar's range.",
    why: 'One of the more reliable multi-bar reversal signals.',
  },
  'shooting-star': {
    label: 'Shooting Star',
    direction: 'bearish',
    strength: 'moderate',
    description: 'Small body near the bottom of the range with a long upper wick, after an advance.',
    why: 'Shows rejection of higher prices — wants confirmation from the next bar, more meaningful at a tested resistance level.',
  },
  'bullish-divergence-rsi': {
    label: 'Bullish RSI Divergence',
    direction: 'bullish',
    strength: 'strong',
    description: "Price prints a lower swing low while RSI's matching swing is higher — momentum disagrees with the new price low.",
    why: 'A classic exhaustion signal on a decline — the sellers pushing price to a new low are doing it with less underlying force than last time, often ahead of a bounce or reversal.',
  },
  'bearish-divergence-rsi': {
    label: 'Bearish RSI Divergence',
    direction: 'bearish',
    strength: 'strong',
    description: "Price prints a higher swing high while RSI's matching swing is lower — momentum disagrees with the new price high.",
    why: 'A classic exhaustion signal on an advance — the buyers pushing price to a new high are doing it with less underlying force than last time, often ahead of a stall or reversal.',
  },
  'bullish-divergence-macd': {
    label: 'Bullish MACD Divergence',
    direction: 'bullish',
    strength: 'strong',
    description: "Price prints a lower swing low while the MACD histogram's matching swing is higher — same read as RSI divergence, off a different momentum measure.",
    why: "MACD's histogram reacts to moving-average convergence rather than RSI's overbought/oversold read, so it can catch or confirm an exhaustion RSI misses — most weight when both agree on the same swing.",
  },
  'bearish-divergence-macd': {
    label: 'Bearish MACD Divergence',
    direction: 'bearish',
    strength: 'strong',
    description: "Price prints a higher swing high while the MACD histogram's matching swing is lower — same read as RSI divergence, off a different momentum measure.",
    why: "MACD's histogram reacts to moving-average convergence rather than RSI's overbought/oversold read, so it can catch or confirm an exhaustion RSI misses — most weight when both agree on the same swing.",
  },
  // Hidden divergence is the mirror concept of regular divergence above: a
  // *continuation* signal, not a reversal one. It only fires inside the
  // trend it's continuing (gated server-side by EMA9 vs EMA21 at the
  // confirming candle — see attachDivergence's hiddenRules) — the same
  // price shape outside that trend context means something different and
  // isn't tagged.
  'bullish-divergence-hidden-rsi': {
    label: 'Bullish Hidden RSI Divergence',
    direction: 'bullish',
    strength: 'moderate',
    description: "Inside an uptrend, price prints a higher swing low (a shallower pullback) while RSI's matching swing is lower — momentum is stronger than the shallow pullback suggests.",
    why: 'A continuation signal, not a reversal call — the pullback lacks the momentum to actually break the uptrend, arguing it resumes rather than rolls over.',
  },
  'bearish-divergence-hidden-rsi': {
    label: 'Bearish Hidden RSI Divergence',
    direction: 'bearish',
    strength: 'moderate',
    description: "Inside a downtrend, price prints a lower swing high (a shallower bounce) while RSI's matching swing is higher — momentum is stronger than the shallow bounce suggests.",
    why: 'A continuation signal, not a reversal call — the bounce lacks the momentum to actually break the downtrend, arguing it resumes rather than reverses.',
  },
  'bullish-divergence-hidden-macd': {
    label: 'Bullish Hidden MACD Divergence',
    direction: 'bullish',
    strength: 'moderate',
    description: "Inside an uptrend, price prints a higher swing low while the MACD histogram's matching swing is lower — same continuation read as hidden RSI divergence, off a different momentum measure.",
    why: 'Confirms the uptrend pullback is shallow on convergence/divergence terms too, not just RSI — most weight when both agree on the same swing.',
  },
  'bearish-divergence-hidden-macd': {
    label: 'Bearish Hidden MACD Divergence',
    direction: 'bearish',
    strength: 'moderate',
    description: "Inside a downtrend, price prints a lower swing high while the MACD histogram's matching swing is higher — same continuation read as hidden RSI divergence, off a different momentum measure.",
    why: 'Confirms the downtrend bounce is shallow on convergence/divergence terms too, not just RSI — most weight when both agree on the same swing.',
  },
};
