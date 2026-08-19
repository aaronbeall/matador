#!/usr/bin/env node
// Reads and prints the cross-timeframe orientation snapshot the running
// app already computed for a symbol — data/candles/<SYMBOL>/latest.md,
// written by vite-plugins/marketData/cache.ts roughly every 5 minutes for
// the whole active watchlist, plus every ~10s while that symbol has an
// active browser Live subscriber. This script does NOT compute anything
// itself: every indicator value and candlestick pattern tag on every row
// is precomputed by the same code driving the chart, so it can never
// drift from what's on screen.
//
// latest.md is deliberately small — just the tail of each maintained
// timeframe, enough to triage a symbol, not enough to found a real
// decision on. For an actual read (trend structure, momentum crossovers,
// support/resistance, cross-timeframe synthesis — all Claude's job, not
// precomputed), pull the specific period file(s) the setup actually needs
// directly off the filesystem: data/candles/<SYMBOL>/<interval>/<period>.md
// — day files for 1m/5m/15m, ISO-week files for 1h, month files for 1d,
// data/candles/<SYMBOL>/1w.md for the single unpartitioned weekly file.
// `ls` the relevant subdirectory to see what's available, `Read` whichever
// period(s) matter — an ORB read wants today's (maybe yesterday's) 1m/5m;
// a swing/structure read wants several 1d month-files. No separate
// tooling needed for that — this script only covers the quick-orientation
// case.
//
// This is a convenience CLI for quick manual checks; Claude can also just
// read latest.md directly (filesystem access when in-repo) — this script
// just adds a staleness check on top.
//
// Usage: node scan.mjs <SYMBOL>

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const STALE_AFTER_MS = 5 * 60 * 1000; // reconcile runs every ~5 min in the background

const symbol = process.argv[2];
if (!symbol) {
  console.error('Usage: node scan.mjs <SYMBOL>');
  process.exit(1);
}

const filePath = path.join(REPO_ROOT, 'data', 'candles', symbol.toUpperCase(), 'latest.md');

if (!fs.existsSync(filePath)) {
  console.log(
    `${symbol.toUpperCase()}: no snapshot yet — it should appear within a few minutes of being added to ` +
      `the watchlist (data/watchlist.json), once the background cache reconciles it. If it's been longer than ` +
      `that, check the dev server log for [market-data] warnings.`
  );
  process.exit(0);
}

const markdown = fs.readFileSync(filePath, 'utf-8');

const computedAtMatch = markdown.match(/^Computed: (.+)$/m);
const ageMs = computedAtMatch ? Date.now() - Date.parse(computedAtMatch[1]) : NaN;
const stale = Number.isNaN(ageMs) || ageMs > STALE_AFTER_MS;

if (stale) {
  console.log(
    `[staleWarning: computed ${Number.isNaN(ageMs) ? 'at an unknown time' : `${Math.round(ageMs / 60000)} min ago`} — the background cache may not have reconciled this symbol recently. Treat this with caution.]\n`
  );
}
console.log(markdown);
