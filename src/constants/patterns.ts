import { Direction } from './direction';

export type PatternDirection = Direction;
export type PatternStrength = 'weak' | 'moderate' | 'strong';

export interface PatternInfo {
  label: string;
  direction: PatternDirection;
  strength: PatternStrength;
  meaning: string;
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
    meaning: "A bearish candle fully engulfed by the next bullish candle — a real shift in control from sellers to buyers. Carries more weight at a tested support level than in the middle of a range.",
  },
  'bearish-engulfing': {
    label: 'Bearish Engulfing',
    direction: 'bearish',
    strength: 'strong',
    meaning: "A bullish candle fully engulfed by the next bearish candle — a real shift in control from buyers to sellers. Carries more weight at a tested resistance level than in the middle of a range.",
  },
  'bullish-hammer': {
    label: 'Bullish Hammer',
    direction: 'bullish',
    strength: 'moderate',
    meaning: "Small body near the top of the range with a long lower wick — rejection of lower prices within the bar. Meaningful after a decline into support, easy to overread as noise elsewhere.",
  },
  'bearish-hammer': {
    label: 'Bearish Hammer',
    direction: 'bearish',
    strength: 'moderate',
    meaning: "Small body with a long lower wick appearing after an advance — the rejection of lower prices happened, but in an uptrend context that can mark exhaustion rather than continued strength. Wants confirmation from the next bar.",
  },
  doji: {
    label: 'Doji',
    direction: 'neutral',
    strength: 'weak',
    meaning: "Open and close are nearly equal — pure indecision, no directional information on its own. Only worth noting when it shows up right at a level or after a strong multi-bar move.",
  },
  'morning-star': {
    label: 'Morning Star',
    direction: 'bullish',
    strength: 'strong',
    meaning: "Three-bar bottoming pattern — a down bar, a small-bodied indecision bar, then a strong up bar closing back into the first bar's range. One of the more reliable multi-bar reversal signals.",
  },
  'evening-star': {
    label: 'Evening Star',
    direction: 'bearish',
    strength: 'strong',
    meaning: "Three-bar topping pattern — an up bar, a small-bodied indecision bar, then a strong down bar closing back into the first bar's range. One of the more reliable multi-bar reversal signals.",
  },
  'shooting-star': {
    label: 'Shooting Star',
    direction: 'bearish',
    strength: 'moderate',
    meaning: "Small body near the bottom of the range with a long upper wick after an advance — rejection of higher prices. Wants confirmation from the next bar, more meaningful at a tested resistance level.",
  },
};
