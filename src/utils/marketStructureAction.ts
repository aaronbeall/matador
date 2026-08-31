import { formatPrice } from './formatters';
import { StructureBreak, StructureRead } from './marketStructure';

// Presentation/copy layer, deliberately separate from marketStructure.ts's
// detection math — mirrors this codebase's existing split between
// indicators.ts (computation) and signals.ts/patterns.ts (copy). Every
// sentence here is template-driven off the real StructureRead/
// StructureBreak passed in, never a baked-in price — that's what makes
// this "taking into consideration market structure and price action"
// rather than a static tooltip string.

export function describeTrendAction(structure: StructureRead, currentPrice: number): string {
  if (structure.trend === 'range' || !structure.lastSwingHigh || !structure.lastSwingLow) {
    return 'No clear structure yet — mixed or too few swing highs/lows; wait for a break of the recent range before reading a direction.';
  }
  if (structure.trend === 'uptrend') {
    const level = structure.lastSwingLow.price;
    const holding = currentPrice >= level;
    return holding
      ? `Uptrend (higher highs/higher lows) — a pullback to ${formatPrice(level)} (last swing low) is the highest-quality continuation entry; a close below it would flip this to a reversal warning.`
      : `Uptrend structure just failed — price is below ${formatPrice(level)}, the swing low that was defining it; treat as a Change of Character until a fresh higher low forms.`;
  }
  // downtrend
  const level = structure.lastSwingHigh.price;
  const holding = currentPrice <= level;
  return holding
    ? `Downtrend (lower highs/lower lows) — a bounce to ${formatPrice(level)} (last swing high) is the highest-quality continuation short/exit level; a close above it would flip this to a reversal warning.`
    : `Downtrend structure just failed — price is above ${formatPrice(level)}, the swing high that was defining it; treat as a Change of Character until a fresh lower high forms.`;
}

export function describeBreakAction(brk: StructureBreak, structure: StructureRead): string {
  const level = formatPrice(brk.brokenLevel);
  const current = structure.trend === 'uptrend' ? 'Current structure now reads uptrend.'
    : structure.trend === 'downtrend' ? 'Current structure now reads downtrend.'
    : 'Structure since this break is still mixed — no fresh trend confirmed yet.';

  if (brk.kind === 'bos') {
    return brk.direction === 'bullish'
      ? `Confirms the uptrend — closed above ${level}, the level that was defining it. Pullbacks toward ${level} are now the buy-the-dip reference; a close back below it would undo this confirmation. ${current}`
      : `Confirms the downtrend — closed below ${level}, the level that was defining it. Bounces toward ${level} are now the sell-the-rip reference; a close back above it would undo this confirmation. ${current}`;
  }
  // choch
  return brk.direction === 'bullish'
    ? `First reversal warning — closed back above ${level}, the swing high that was capping the prior downtrend. Not a confirmed reversal yet; wait for a fresh higher low to form before treating the trend as flipped. ${current}`
    : `First reversal warning — closed back below ${level}, the swing low that was supporting the prior uptrend. Not a confirmed reversal yet; wait for a fresh lower high to form before treating the trend as flipped. ${current}`;
}
