import { Alert } from '../types/Alert';

// Whether an alert is still within its own relevance window — the single
// definition of "active" used everywhere (the Alerts badge count AND
// each card's dimmed state), so the two can never disagree the way they
// used to. `expiresAt` is the whole window of relevance, full stop, for
// both statuses that can still be "live":
//  - `pending`: live once past `activeFrom` (defaults to `createdAt`) and
//    before `expiresAt` — the engine only re-evaluates pending alerts on
//    its own cadence (~10s/5min, see alertsEngine.ts), so between the
//    moment its window actually closes and the engine's next pass
//    flipping it to `expired`, this check is what keeps it from
//    rendering as live in the meantime.
//  - `triggered`: live while before `expiresAt` — the engine never
//    revisits an already-triggered alert at all, so this is computed
//    here, live, off the current time, rather than mutating `status` (a
//    triggered alert genuinely did trigger; that fact shouldn't change).
// Every other status (invalidated/superseded/expired) is resolved and
// never live, regardless of timing.
export function isAlertLive(alert: Alert): boolean {
  const now = Date.now();
  if (alert.status === 'pending') {
    const from = Date.parse(alert.activeFrom ?? alert.createdAt);
    return now >= from && now <= Date.parse(alert.expiresAt);
  }
  if (alert.status === 'triggered') {
    return Date.parse(alert.expiresAt) >= now;
  }
  return false;
}
