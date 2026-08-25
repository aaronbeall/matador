import { Alert } from '../types/Alert';

// Whether a triggered alert is still within its own relevance window.
// `expiresAt` isn't just "how long to watch a pending condition" — it's
// the alert's whole window of relevance, full stop. The engine
// (vite-plugins/marketData/alertsEngine.ts) only re-evaluates `pending`
// alerts, so a `triggered` alert never gets automatically moved to
// `expired` once its window passes — it would otherwise sit there
// looking "live" forever. This is computed here, live, off the current
// time, rather than mutating `status` (a triggered alert genuinely did
// trigger; that fact shouldn't change), so both the Alerts badge count
// and each card's faded state agree on what's actually still current.
export function isAlertLive(alert: Alert): boolean {
  return alert.status === 'triggered' && Date.parse(alert.expiresAt) >= Date.now();
}
