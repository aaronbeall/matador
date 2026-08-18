#!/usr/bin/env node
// Reads and prints the AnalysisSnapshot the running frontend already
// computed for a symbol — data/candles/<SYMBOL>/analysis.json, written
// by src/utils/analysis.ts every ~10s while Live is on. This script does
// NOT compute anything itself: the frontend is the single source of
// truth for the mechanical math (VWAP/EMA/RSI/MACD/ATR/candle patterns/
// swing levels), since that's the same code driving the chart the user
// is actually looking at. Duplicating that math here risked silent drift
// between what find-trades sees and what's on screen — see
// docs/trade-analysis-plan.md.
//
// This is a convenience CLI for quick manual checks; Claude can also
// just read the JSON file directly (filesystem access when in-repo) —
// this script adds a staleness check on top of that.
//
// Usage: node scan.mjs <SYMBOL>

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const STALE_AFTER_MS = 5 * 60 * 1000; // 5 minutes — persist runs every ~10s while Live

const symbol = process.argv[2];
if (!symbol) {
  console.error('Usage: node scan.mjs <SYMBOL>');
  process.exit(1);
}

function output(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

const filePath = path.join(REPO_ROOT, 'data', 'candles', symbol.toUpperCase(), 'analysis.json');

if (!fs.existsSync(filePath)) {
  output({
    symbol: symbol.toUpperCase(),
    error:
      'no analysis snapshot yet — open the app, select this symbol, enable Live, and let it stream for a while first',
  });
  process.exit(0);
}

let snapshot;
try {
  snapshot = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
} catch (err) {
  output({ symbol: symbol.toUpperCase(), error: `analysis.json is corrupt: ${err.message}` });
  process.exit(0);
}

const ageMs = Date.now() - Date.parse(snapshot.computedAt);
if (Number.isNaN(ageMs) || ageMs > STALE_AFTER_MS) {
  output({
    ...snapshot,
    staleWarning: `computed ${Math.round(ageMs / 60000)} min ago — the app may not currently have this symbol selected with Live on. Treat this snapshot with caution.`,
  });
} else {
  output(snapshot);
}
