// Splits a list into "belongs to the currently selected symbol" vs.
// "everything else" — used by AlertsPanel/LevelsPanel/IdeasPanel to put
// what's relevant to the chart you're actually looking at first, instead
// of interleaving every watchlist symbol's content together.
export function partitionBySymbol<T>(
  items: T[],
  getSymbol: (item: T) => string,
  currentSymbol: string
): { current: T[]; other: T[] } {
  const current: T[] = [];
  const other: T[] = [];
  for (const item of items) {
    (getSymbol(item) === currentSymbol ? current : other).push(item);
  }
  return { current, other };
}
