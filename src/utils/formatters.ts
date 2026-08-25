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

// A plain clock time, always — never a date, regardless of which day it
// falls on. Distinct from formatTimestamp above (which includes the date
// once it isn't today): use this where the surrounding UI already makes
// the date clear on its own (e.g. a per-day-grouped timeline row), so
// repeating it on every row would just be noise.
export const formatClockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// A time range's two endpoints — deliberately NOT two separate
// formatTimestamp calls (which each independently omit the date whenever
// that one timestamp falls on *today*, relative to now). That's the
// wrong reference point for a range: what matters is whether the range's
// own two ends fall on the same day as EACH OTHER, not whether either
// happens to be today. A same-day window ("10:00 AM → 4:15 PM") doesn't
// need dates at all; a window starting yesterday and ending today needs
// the date on *both* ends ("Aug 24, 4:11 PM → Aug 25, 4:15 PM") — showing
// it on only the non-today end makes the dated one look like the odd one
// out, i.e. like the whole range belongs to that earlier day and has
// already closed.
export const formatWindow = (startIso: string, endIso: string) => {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const spansDays = start.toDateString() !== end.toDateString();
  const bound = (d: Date) => {
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (!spansDays) return time;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
  };
  return `${bound(start)} → ${bound(end)}`;
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
