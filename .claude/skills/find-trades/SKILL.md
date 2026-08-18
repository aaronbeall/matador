---
name: find-trades
description: Scan the Matador watchlist against data/strategy.md and write results — trade setups, levels to watch, alerts, and a run log — to the shared data/ state so the frontend UI shows them live. Use when the user asks to scan for trades, check for setups, or run find-trades — on-demand only, no scheduled runs.
---

# find-trades

Scans the maintained watchlist for setups that qualify under the current
strategy, and writes results to the shared `data/` state so the frontend
picks them up — pushed live via SSE, no manual refresh needed. See
`docs/trade-analysis-plan.md` for the architecture this implements.

On-demand only — there is no scheduled/cron version of this yet.

## Steps

1. **Read state.**
   - `data/watchlist.json` — use only entries with `active: true`.
   - `data/strategy.md` — this is the authoritative rule set. Re-read it
     fresh every run; the user may have edited it since last time.
   - `data/trade-ideas.json`, `data/levels.json` — existing entries, to
     merge against rather than overwrite blindly.

2. **Read the numeric snapshot per symbol.** A background cache
   (`vite-plugins/marketData/cache.ts`) proactively maintains six
   timeframes — `1m`, `5m`, `15m`, `1h`, `1d`, `1w` — for every symbol in
   the active watchlist, gap-checked against Alpaca on server startup,
   every 5 min, and immediately when the watchlist changes. **You don't
   need a symbol to have been opened live in the browser first anymore**
   — this cache runs regardless. It computes the snapshot using the exact
   same code (`src/utils/analysis.ts`) that enriches the candles pushed to
   the chart, and writes it to `data/candles/<SYMBOL>/analysis.json`.
   **You don't recompute anything here** — read the file directly, or run
   the convenience wrapper which adds a staleness check:
   ```
   node .claude/skills/find-trades/scan.mjs <SYMBOL>
   ```
   This is a deliberate split: Node owns 100% of the mechanical math
   (deterministic, and guaranteed consistent with what's on screen and
   what the chart itself uses); your job starts at step 3, judging what the
   numbers mean. Never reimplement any of this math yourself from raw
   candles — that reintroduces exactly the two-implementations-drift risk
   this design removed.

   The snapshot shape is `{ symbol, computedAt, timeframes: { '1m': {...},
   '5m': {...}, '15m': {...}, '1h': {...}, '1d': {...}, '1w': {...} } }`
   — a timeframe key is only present once that timeframe has cached bars,
   and each block carries its own `dataQuality` (`'ok'` once it has ~30+
   bars, else `'thin'`). If the snapshot is missing entirely (`error`
   field) or carries a `staleWarning` (older than ~5 min), say so and
   treat it as low/no confidence — don't proceed as if it were fresh.
   Within a fresh snapshot, judge each timeframe block on its own
   `dataQuality` rather than the snapshot as a whole — e.g. `1d`/`1w` can
   be trustworthy even while a newly-added symbol's `15m` is still thin.
   Per-timeframe fields:
   - **VWAP, EMA9/21, SMA20, RSI14, MACD** — trend/momentum, as before.
     `vwap`/`priceVsVwapPct`/`openingRangeHigh`/`openingRangeLow` are only
     populated on `1m` (and vwap on `5m`/`15m`) — both are single-trading-
     day concepts, `null` on `1h`/`1d`/`1w`.
   - **`atr14`** — average true range. Use this for stop *sizing*, not
     just stop *placement*: a stop derived from a swing level that's
     narrower than ~1×ATR is probably just noise, not structure — treat
     it skeptically rather than as a clean setup.
   - **`candlePatterns`** — an array of any of bullish/bearish engulfing,
     bullish/bearish hammer, doji, morning/evening star, shooting star
     detected on the most recent bars of that timeframe. Treat these as
     **confirmation**, not a standalone signal — e.g. a doji on `1d`
     sitting right at an active support level is a much stronger "watch
     this" than either fact alone; don't create a trade idea off a
     pattern by itself.
   - **`swingHigh`/`swingLow`** — on `1m`/`5m`/`15m`, the last 30 bars (a
     recent, tactical read). On `1h`/`1d`/`1w`, the full cached window for
     that timeframe — this is real market structure now, not an
     approximation: use `1h`'s swingHigh/swingLow for multi-week levels,
     `1d`'s for major S/R (up to ~500 days), `1w`'s for top-down bias (up
     to ~2 years). Trust these in proportion to `barCount`/`dataQuality`
     on that block, same as any other field.
   - **`volumeVsAvgPct`** — last bar vs. its trailing 20-bar average, on
     whichever timeframe you're reading. Still a rough measure, not
     time-of-day-adjusted — a low reading late in a quiet stretch isn't
     necessarily meaningful.

   Either way (missing, stale, or a needed timeframe's `dataQuality:
   'thin'`), skip the symbol or flag low confidence explicitly, note why
   in your summary, and log it (step 6) — don't go quiet, and don't
   fabricate a result to fill the gap.

3. **Evaluate against strategy.md, per symbol.** Apply the rules exactly
   as written in `data/strategy.md`, not from memory — it may have been
   edited. In particular:
   - **Market structure filter first**: read bias/trend top-down —
     `1w`/`1d` EMA order and trend for the big picture, `1h` for the
     multi-week swing structure actually in play, `1m`/`5m` for price vs.
     VWAP and today's swing structure. Skip the symbol entirely if there's
     no clear directional read across timeframes — no forcing a trade
     into a filter that doesn't pass.
   - **Qualifying signal**: does the snapshot support one of momentum,
     range, breakout, VWAP, mean-reversion, or ORB (using `1m`'s
     `openingRangeHigh`/`openingRangeLow`)? A `candlePatterns` hit at a
     relevant level strengthens a case but never substitutes for one.
   - **Structural stop**: derive from the snapshot (below/above VWAP, the
     relevant EMA, or a swing high/low) — never an arbitrary number. Use
     `1d`'s (or `1h`'s, for a tighter swing) `swingHigh`/`swingLow` for a
     swing-timeframe idea, `1m`/`5m`'s for a scalp. Sanity-check the
     resulting stop distance against that timeframe's `atr14`; if it's
     much tighter than 1×ATR, it's likely to get stopped out by noise, not
     the thesis being wrong — reconsider before proposing it.
   - **R:R threshold**: compute entry/stop/target from the above and
     confirm it clears the minimum in `strategy.md` (2:1 as of writing,
     but read the file — don't hardcode it here).

4. **Merge into `data/trade-ideas.json`.**
   - Expire stale open ideas (`status: 'proposed'` or `'taken'`) whose
     `expiresAt` has passed — set `status: 'expired'`, bump `updatedAt`.
     Scalp ideas expire same trading day; swing ideas expire after a few
     days — set `expiresAt` accordingly when creating new ones.
   - Don't duplicate: skip creating a new `proposed` idea for a
     symbol+direction+timeframe that already has an open (`proposed` or
     `taken`) idea.
   - For each new qualifying setup, construct a `TradeIdea` (see
     `src/types/TradeIdea.ts`): `id` (generate, e.g. `crypto.randomUUID()`
     equivalent — a short unique string is fine), `symbol`, `direction`,
     `timeframe`, `entry`, `stop`, `target`, `riskReward`, `thesis` (1-2
     sentences citing the actual numbers from the snapshot), `triggeredBy`
     (which signal(s) fired, e.g. `['vwap-reclaim']`), `status: 'proposed'`,
     `createdAt`/`updatedAt` (now), `expiresAt`.
   - Write the full merged array back to `data/trade-ideas.json`.

5. **Merge into `data/levels.json`.** Independent of whether a trade
   idea qualified — "levels to watch" is useful on its own. For each
   scanned symbol, write/update the structurally meaningful levels from
   the snapshot, pulling from whichever timeframe block is relevant: `1m`'s
   `swingHigh`/`swingLow` and `openingRangeHigh`/`openingRangeLow` for
   intraday levels, `1h`'s or `1d`'s `swingHigh`/`swingLow` for
   swing-timeframe levels, and `vwap` (only when it's acting as clear
   support/resistance, not just "price is near vwap"). Mark a symbol's
   prior levels `active: false` before adding the fresh set for that
   symbol, rather than letting stale ones accumulate. See
   `src/types/Level.ts` for the shape.

6. **Write `data/alerts.json` for anything notable.** At minimum: one
   `action` alert per new trade idea created (step 4), and a `watch`
   alert when price is within roughly 0.3% of an active level without
   yet qualifying as a full setup. Keep the `message` concrete — cite
   the actual price and level, not "approaching a level." See
   `src/types/Alert.ts`.

7. **Append to `data/analysis-log.json`.** One entry per symbol scanned
   this run, always — including "no data yet", "insufficient history",
   and "no qualifying setup" outcomes. This is what makes the Activity
   tab in the UI a real record of what ran rather than only showing
   successes. See `src/types/AnalysisLog.ts`. Keep the log bounded —
   trim to the most recent ~200 entries when writing.

8. **Report back.** Tell the user, in plain language, what ran: symbols
   scanned, symbols skipped and why (no data / no qualifying setup), and
   any new ideas with their thesis. If nothing qualified, say so plainly
   — that's a legitimate, useful result, not a failure. The UI updates
   itself (SSE push) — no need to tell the user to refresh.

## Notes

- Data comes from Alpaca (IEX feed) now, not Finnhub — historical bars
  are reliable and not gated, which is what makes proactive caching
  possible at all. `scan.mjs` still just reads `data/candles/<SYMBOL>/`,
  but that directory is now kept gap-free by a background cache
  (`vite-plugins/marketData/cache.ts`) for the whole active watchlist —
  **a symbol no longer needs to have been streamed live in the browser
  first**. If a symbol was *just* added to the watchlist, give it a
  moment (the cache reconciles new symbols immediately on watchlist
  change, but the Alpaca fetch itself takes a few seconds per timeframe).
- Candle storage is one bounded file per timeframe
  (`data/candles/<SYMBOL>/<1m|5m|15m|1h|1d|1w>.json`), each capped to
  that timeframe's own lookback window (2 days for `1m` up to ~2 years
  for `1w` — see `vite-plugins/marketData/timeframes.ts` for the exact
  table and reasoning) — no day-sharding or derived rollups anymore,
  since every timeframe is fetched natively from Alpaca and reconciled
  against it directly.
- Never fabricate candle data, levels, or alerts to make a panel look
  populated. An honest "no data" or "no qualifying setup" is the correct
  output when that's what the numbers show — and now that outcome is
  itself logged and visible in the UI, not silent.
- All writes go through the bridge's plain GET/POST file routes (see
  `vite-plugins/localDataApi.ts`) — but you have filesystem access when
  running in this repo, so writing the JSON files directly is fine too;
  the dev server picks up the change via `fs.watch` and pushes it to any
  open browser tab either way.
