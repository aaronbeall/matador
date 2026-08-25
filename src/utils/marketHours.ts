// Which discrete stage of the US equity trading day "now" falls in, in
// America/New_York wall-clock time — independent of the browser's own
// timezone. Boundaries: pre-market 4:00am, regular open 9:30am, regular
// close 4:00pm, after-hours end 8:00pm; weekends are always 'closed'.
export type MarketSession = 'closed' | 'premarket' | 'open' | 'afterhours';

const ET_TIMEZONE = 'America/New_York';

export function getMarketSession(now: number = Date.now()): MarketSession {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(now));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const weekday = get('weekday');
  if (weekday === 'Sat' || weekday === 'Sun') return 'closed';

  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  const minutesSinceMidnight = hour * 60 + minute;

  if (minutesSinceMidnight < 4 * 60) return 'closed'; // before 4:00am
  if (minutesSinceMidnight < 9 * 60 + 30) return 'premarket'; // 4:00-9:30am
  if (minutesSinceMidnight < 16 * 60) return 'open'; // 9:30am-4:00pm
  if (minutesSinceMidnight < 20 * 60) return 'afterhours'; // 4:00-8:00pm
  return 'closed'; // after 8:00pm
}

// The current ET clock time, formatted for display alongside the session
// stage (e.g. "10:42 AM ET").
export function getEtClockLabel(now: number = Date.now()): string {
  const time = new Date(now).toLocaleTimeString('en-US', {
    timeZone: ET_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${time} ET`;
}
