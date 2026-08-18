#!/usr/bin/env node
// Reads and prints the annotated multi-timeframe candle history the
// running app already computed for a symbol —
// data/candles/<SYMBOL>/analysis.md, written by
// vite-plugins/marketData/cache.ts (src/utils/analysis.ts) roughly every
// 5 minutes for the whole active watchlist, plus every ~10s while that
// symbol has an active browser Live subscriber. This script does NOT
// compute anything itself: every indicator value and candlestick pattern
// tag on every row is precomputed by the same code driving the chart, so
// it can never drift from what's on screen. Trend structure, momentum
// crossovers, support/resistance levels, and what a tagged pattern means
// in context are NOT precomputed — reading the tables and making those
// calls is Claude's job, the same way it would read a chart screenshot.
//
// This is a convenience CLI for quick manual checks; Claude can also just
// read the markdown file directly (filesystem access when in-repo) — this
// script adds a staleness check and optional timeframe filtering on top.
//
// Usage: node scan.mjs <SYMBOL> [--timeframe 1d,1w]
//   --timeframe   comma-separated subset of 1w,1d,1h,15m,5m,1m to print.
//                 Omit to print every maintained timeframe. Reading the
//                 slow timeframes (1w/1d) first for bias/structure, then
//                 only pulling faster ones for symbols worth a closer
//                 look, keeps a scan from pulling ~2,600 candles/symbol
//                 every time.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const STALE_AFTER_MS = 5 * 60 * 1000; // reconcile runs every ~5 min in the background

const args = process.argv.slice(2);
const symbol = args[0];
if (!symbol) {
  console.error('Usage: node scan.mjs <SYMBOL> [--timeframe 1d,1w]');
  process.exit(1);
}

const timeframeFlagIndex = args.indexOf('--timeframe');
const timeframeFilter = timeframeFlagIndex >= 0 ? args[timeframeFlagIndex + 1]?.split(',').filter(Boolean) : null;

const filePath = path.join(REPO_ROOT, 'data', 'candles', symbol.toUpperCase(), 'analysis.md');

if (!fs.existsSync(filePath)) {
  console.log(
    `${symbol.toUpperCase()}: no analysis snapshot yet — it should appear within a few minutes of being added to ` +
      `the watchlist (data/watchlist.json), once the background cache reconciles it. If it's been longer than ` +
      `that, check the dev server log for [market-data] warnings.`
  );
  process.exit(0);
}

const markdown = fs.readFileSync(filePath, 'utf-8');

const computedAtMatch = markdown.match(/^Computed: (.+)$/m);
const ageMs = computedAtMatch ? Date.now() - Date.parse(computedAtMatch[1]) : NaN;
const stale = Number.isNaN(ageMs) || ageMs > STALE_AFTER_MS;

let body = markdown;
if (timeframeFilter?.length) {
  const sections = markdown.split(/\n(?=### )/); // first "section" is the header (title + Computed line)
  const keep = [sections[0], ...sections.slice(1).filter((s) => timeframeFilter.some((tf) => s.startsWith(`### ${tf} `)))];
  body = keep.join('\n');
}

if (stale) {
  console.log(
    `[staleWarning: computed ${Number.isNaN(ageMs) ? 'at an unknown time' : `${Math.round(ageMs / 60000)} min ago`} — the background cache may not have reconciled this symbol recently. Treat this with caution.]\n`
  );
}
console.log(body);
