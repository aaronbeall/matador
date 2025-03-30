export const formatVolume = (volume: number) => {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toLocaleString();
};

export const formatPrice = (price: number) => 
  `${price < 0 ? '-' : ''}$${Math.abs(price).toFixed(2)}`;

export const formatPercent = (num: number) => 
  `${num.toFixed(2)}%`;

export const formatDelta = <T extends (n: number) => string>(
  value: number,
  formatter: T
) => `${value >= 0 ? '+' : ''}${formatter(value)}`;
