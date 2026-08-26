// Crossover signals — distinct from indicators (continuous overlays) and
// patterns (single-candle tags): a crossover is a detected *event* between
// two already-computed series, purely derived client-side from candle
// fields that are already present (no backend computation needed — see
// App.tsx's emaCrossMarkers/macdCrossMarkers). Unlike PATTERN_INFO, each
// key here is direction-symmetric (the same condition happens both ways —
// "EMA9 crosses EMA21" bullish or bearish is one signal, not two), so
// direction lives on the marker point at detection time, not baked into
// the key the way pattern names are.
export interface SignalInfo {
  label: string;
  description: string; // what the crossover actually is, plainly
  why: string; // why it's worth weighting as a signal
}

export const SIGNAL_INFO: Record<string, SignalInfo> = {
  'ema-cross': {
    label: 'EMA 9/21 Cross',
    description: 'The 9-period EMA crosses the 21-period EMA.',
    why: 'A classic early momentum-shift signal — a fast/slow moving-average cross is often used to confirm a new short-term trend direction is actually underway, not just a wiggle.',
  },
  'macd-cross': {
    label: 'MACD Cross',
    description: 'The MACD line crosses its signal line.',
    why: "MACD's own trigger signal — a bullish cross while the histogram is still below zero often marks the start of a real push, and the mirror case flags fading momentum on the bearish side.",
  },
  'swing-high': {
    label: 'Swing High',
    description: 'A confirmed pivot — this candle\'s high beat every high within 3 bars on either side.',
    why: 'The raw material for reading trend structure at a glance: a sequence of higher swing highs argues an uptrend, a lower one argues the opposite — normally something you have to read out of a table row-by-row.',
  },
  'swing-low': {
    label: 'Swing Low',
    description: 'A confirmed pivot — this candle\'s low beat every low within 3 bars on either side.',
    why: 'The mirror of Swing High: a sequence of higher swing lows argues an uptrend intact, a lower one argues it\'s breaking down — also the structural low that divergence checks against.',
  },
};

export type SignalKey = keyof typeof SIGNAL_INFO;
