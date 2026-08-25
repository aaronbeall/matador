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

// An actual clock time rather than a relative "2h ago" — useful anywhere
// "when exactly did this happen" matters more than "how long ago" (e.g.
// an alert trigger — was it during regular hours? does it still apply?).
// Includes the date only when it isn't today, so a timestamp from a prior
// session doesn't read as if it just happened.
export const formatTimestamp = (iso: string) => {
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? time : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
};

// The relative counterpart to formatTimestamp above — "how long ago,"
// always phrased with "ago" (or "just now"), never a bare "5m"/"2h" that
// reads ambiguously on its own. One shared implementation so every panel
// showing an age (Alerts, Ideas, Thesis) reads identically; pair with a
// Tooltip title={formatTimestamp(iso)} wherever this is shown so the
// exact time is always one hover away.
export const formatRelativeTime = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};
