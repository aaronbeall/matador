import { Indicator } from '../utils/indicators';
import { TimeInterval } from '../types/Candlestick';
import { SignalKey } from './signals';
import { CandleSpec, PATTERN_ILLUSTRATIONS } from '../components/PatternIllustration';

// The chart's trailing/session display window — independent of TimeInterval
// (which controls candle *size*; this controls how far back the x-axis
// goes). Lives here rather than App.tsx since ChartPreset below needs it,
// and this is the constants layer App.tsx imports from, not the reverse.
export type TimeFrame = 'today' | '15m' | '1h' | '3h' | '6h' | '1d' | '1w' | '1mo' | '3mo';

// Plain-language explanation of what each candle size and each display
// window are actually good for — shown as a tooltip on the toolbar
// buttons. The two controls are easy to conflate (both have a "15M"/"1H"
// option) despite meaning completely different things: TimeInterval is
// what each bar represents, TimeFrame is how much history is on screen.
export const TIME_INTERVAL_HELP: Record<TimeInterval, string> = {
  '1m': 'Finest granularity — one candle per minute. Best for scalping and reading exact intrabar price action, but noisy on its own; pair with a short display range (Today, 1H) rather than trying to read a whole week of 1-minute bars.',
  '5m': 'The standard intraday granularity — smooths out 1-minute noise while still showing real opening-range, VWAP, and short-term momentum structure. A good default for most intraday reads.',
  '15m': 'Smooths intraday noise further — good for a multi-hour session read, or timing a swing entry off a shorter chart than the daily.',
  '1h': "The bridge between intraday and swing — a multi-day trend read without the daily chart's lag, and the interval this app's 200-period moving averages actually have enough history to mean something on within a week's display range.",
  '1d': 'One candle per trading day — the standard swing/position-trading granularity. Moving averages (20/50/200) and weekly-scale patterns are read off this interval, not an intraday one.',
  '1w': 'One candle per week — the widest-angle view, for long-term trend context (is this stock in a multi-month uptrend at all) rather than anything actionable on its own.',
};

export const TIME_FRAME_HELP: Record<TimeFrame, string> = {
  today: "Just today's regular session (9:30am-4:00pm ET), capped at now if the market's still open. The natural default for a scalp or day-trade read — nothing from prior days crowds the chart.",
  '15m': 'Trailing 15 minutes — an extreme zoom-in, mostly useful to watch a live level test tick-by-tick as it happens.',
  '1h': 'Trailing 1 hour — a tight intraday window for scalping or watching a specific setup develop in real time.',
  '3h': "Trailing 3 hours — enough to see this morning's (or this session's) structure without older noise crowding it out.",
  '6h': "Trailing 6 hours — most of a trading day, a good middle ground for reading today's overall structure without the tight zoom of 1H/3H.",
  '1d': "Trailing 24 hours — a full session plus overnight/premarket context, useful for reviewing yesterday's close into today's open.",
  '1w': 'Trailing 1 week — the standard swing-trading range for reading multi-day trend structure and recent levels off a 1H candle.',
  '1mo': "Trailing 1 month — pair with the 1H or Daily candle interval for a real multi-week swing-structure read (a handful of swing highs/lows to actually classify a trend from), not just the last few candles 1W leaves you with on a Daily chart.",
  '3mo': "Trailing 3 months — the widest window this app offers, for genuinely longer-term structure (is this stock in a multi-month up/downtrend, and how many swings has it made getting there). Pairs best with the Daily candle interval; on 1H this is a lot of bars to render for a read that's really asking a daily-scale question.",
};

// A curated, one-click chart configuration — bundles everything the
// settings menu lets you toggle individually (interval, display range,
// indicators, patterns, signals) into a named setup built for one specific
// job, with an explanation of what it's for and how to actually read it.
// The point isn't just convenience — it's teaching which tools go together
// for which kind of read, since "which indicators do I even want on" is
// its own skill separate from knowing what each one means individually.
export interface ChartPreset {
  id: string;
  label: string;
  description: string; // what this view is for
  howToUse: string; // how to actually read/act on it
  timeInterval: TimeInterval;
  timeFrame: TimeFrame;
  indicators: Indicator[];
  patterns: string[];
  signals: SignalKey[];
  // A small schematic candle silhouette shown in the preset menu row and,
  // larger, in its tooltip — purely illustrative of the kind of setup this
  // preset is built for, not real data. Same CandleSpec shape/renderer
  // PATTERN_ILLUSTRATIONS uses (see PatternIllustration.tsx), so presets
  // that already center on one existing pattern/shape just reuse it
  // instead of hand-authoring a near-duplicate.
  thumbnail: CandleSpec[];
}

// Shared by 'swing-trend' and 'market-structure' below — both are reading
// the exact same higher-high/higher-low staircase, just with different
// tooling on top of it, so they should look alike at a glance in the menu.
const STAIRCASE_THUMBNAIL: CandleSpec[] = [
  { open: 70, close: 55, high: 50, low: 75 },
  { open: 58, close: 42, high: 38, low: 62 },
  { open: 45, close: 28, high: 22, low: 50 },
  { open: 32, close: 15, high: 10, low: 36 },
];

export const CHART_PRESETS: ChartPreset[] = [
  {
    id: 'opening-range-scalp',
    label: 'Opening Range Scalp',
    description: 'For trading the first 30-60 minutes of the session off the opening range and VWAP — the fastest, noisiest read this app offers.',
    howToUse: 'Watch for price reclaiming or rejecting VWAP with a candlestick pattern confirming right at the level, or a fast EMA9/21 cross. ATR/RVOL in the OHLCV readout help judge whether a move has real range and participation behind it before sizing it — a break on low RVOL is a lot less trustworthy than the same break on 2x+ average volume.',
    timeInterval: '1m',
    timeFrame: 'today',
    indicators: ['vwap', 'vwapBands', 'ema9', 'ema21', 'atr14', 'rvol'],
    patterns: ['bullish-engulfing', 'bearish-engulfing', 'bullish-hammer', 'bearish-hammer', 'doji', 'shooting-star'],
    signals: ['ema-cross'],
    // A poke below a level, then a strong reversal candle — the VWAP
    // reclaim-or-reject shape this whole preset is built to catch.
    thumbnail: [
      { open: 55, close: 48, high: 42, low: 82 },
      { open: 46, close: 20, high: 15, low: 50 },
    ],
  },
  {
    id: 'intraday-momentum',
    label: 'Intraday Momentum',
    description: "For trading trend continuation once the open is behind you — a 5-minute chart wide enough to see today's actual structure, not just the last few candles.",
    howToUse: "Look for EMA9/21 and MACD crosses in the SAME direction as the day's established trend (check where price sits relative to VWAP first, and which way the session has been trending). A cross against the day's trend is a lower-quality, counter-trend signal per the strategy's own trend-alignment rule — worth noting, not worth trading.",
    timeInterval: '5m',
    timeFrame: '6h',
    indicators: ['ema9', 'ema21', 'macd', 'vwap'],
    patterns: [],
    signals: ['ema-cross', 'macd-cross'],
    // A steady stair-step in one direction — reads as continuation, not
    // reversal, distinct from every reversal-flavored preset around it.
    thumbnail: [
      { open: 78, close: 62, high: 58, low: 82 },
      { open: 64, close: 46, high: 42, low: 68 },
      { open: 48, close: 28, high: 24, low: 52 },
    ],
  },
  {
    id: 'mean-reversion',
    label: 'Mean-Reversion Watch',
    description: 'For spotting when price has moved statistically too far from fair value and is due to snap back — VWAP bands for an intraday read, Bollinger Bands for anything longer.',
    howToUse: "Watch the \"Stretched\" chip in the price readout — it lights up when the close is outside a band's ±2σ. Being outside the band alone isn't a signal on its own: wait for a reversal candle pattern right at the band edge, ideally with RSI confirming overbought/oversold, before treating it as an actual entry.",
    timeInterval: '15m',
    timeFrame: 'today',
    indicators: ['vwapBands', 'bollingerBands', 'rsi'],
    patterns: ['doji', 'shooting-star', 'bullish-hammer', 'bearish-hammer'],
    signals: [],
    // Reuses the actual bullish-hammer illustration — this preset's own
    // howToUse already centers on a reversal candle right at a band edge,
    // so there's no need to hand-author a near-duplicate shape.
    thumbnail: PATTERN_ILLUSTRATIONS['bullish-hammer'],
  },
  {
    id: 'swing-trend',
    label: 'Swing Trend-Following',
    description: "For the higher-timeframe read strategy.md's market-structure filter actually calls for — is this in an established trend, and is the current pullback still healthy relative to it.",
    howToUse: "Read price against SMA20/50/200 — holding above a rising SMA20/50 in an uptrend (or below in a downtrend) argues the trend is intact; losing it argues otherwise. A month of 1H candles is enough to see several real swing highs/lows, not just the last few bars — for even longer-term shape, bump the display range to 3 Months or ask the agent for a read across the full annotated history.",
    timeInterval: '1h',
    timeFrame: '1mo',
    indicators: ['sma20', 'sma50', 'sma200', 'macd', 'rsi'],
    patterns: [],
    signals: ['swing-high', 'swing-low', 'ema-cross'],
    thumbnail: STAIRCASE_THUMBNAIL,
  },
  {
    id: 'divergence-watch',
    label: 'Divergence Watch',
    description: 'For catching price/momentum disagreement — regular divergence (a reversal signal) and hidden divergence (a trend-continuation signal), confirmed against both RSI and the MACD histogram.',
    howToUse: 'Watch for the dashed connector line between two swing points on the price chart, mirrored on the RSI/MACD panel below it — that connector is the actual divergence, not just a marker dot on its own. Regular divergence (price makes a new extreme the oscillator disagrees with) argues for a reversal; hidden divergence (a shallower pullback than last time) argues the existing trend is still intact.',
    timeInterval: '1h',
    timeFrame: '1w',
    indicators: ['rsi', 'macd'],
    patterns: [
      'bullish-divergence-rsi', 'bearish-divergence-rsi',
      'bullish-divergence-macd', 'bearish-divergence-macd',
      'bullish-divergence-hidden-rsi', 'bearish-divergence-hidden-rsi',
      'bullish-divergence-hidden-macd', 'bearish-divergence-hidden-macd',
    ],
    signals: ['swing-high', 'swing-low'],
    // A small price/oscillator disagreement shape: price prints a lower
    // low while the second candle's range reads as a shallower push —
    // the two-candle version of what a real divergence looks like.
    thumbnail: [
      { open: 60, close: 42, high: 36, low: 78 },
      { open: 50, close: 38, high: 30, low: 56 },
    ],
  },
  {
    id: 'clean-price-action',
    label: 'Clean Price Action',
    description: "Strips away every overlay except VWAP, so you're reading trend structure — swing highs/lows, support/resistance, momentum — the way you'd read it manually for find-trades, not leaning on indicator confirmation to do it for you.",
    howToUse: 'Turn on Swing High/Swing Low under Signals if you want pivot points marked for you, but try reading the sequence of highs and lows yourself first — spotting higher-highs/higher-lows (or the reverse) by eye, without help, is the actual skill this view is meant to build.',
    timeInterval: '5m',
    timeFrame: 'today',
    indicators: ['vwap'],
    patterns: [],
    signals: [],
    // Plain, uneventful candles — no overlay, no marker, on purpose: this
    // preset's whole point is reading price without help.
    thumbnail: [
      { open: 40, close: 48, high: 34, low: 54 },
      { open: 46, close: 40, high: 36, low: 52 },
      { open: 42, close: 50, high: 38, low: 56 },
    ],
  },
  {
    id: 'market-structure',
    label: 'Market Structure',
    description: 'For reading trend structure directly — swing highs/lows connected into the HH/HL or LH/LL staircase, plus Break-of-Structure/Change-of-Character events marking when that structure actually gets confirmed or broken.',
    howToUse: 'Watch the connected swing-point line for the staircase shape (rising = uptrend, falling = downtrend, sideways/mixed = range). A BOS marker confirms the existing trend just continued through its last swing point; a CHoCH marker is the first warning that trend may be ending — hover the marker for the specific level and what a close back through it would mean. The trend chip next to the price readout carries the same read in one line, updated live as new swings form.',
    timeInterval: '1h',
    timeFrame: '1mo',
    indicators: [],
    patterns: [],
    signals: ['swing-high', 'swing-low', 'structure-lines', 'bos', 'choch'],
    thumbnail: STAIRCASE_THUMBNAIL,
  },
];
