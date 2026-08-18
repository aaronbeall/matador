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

2. **Read the annotated history per symbol — and actually read it, like a
   chart.** A background cache (`vite-plugins/marketData/cache.ts`)
   proactively maintains six timeframes — `1m`, `5m`, `15m`, `1h`, `1d`,
   `1w` — for every symbol in the active watchlist, gap-checked against
   Alpaca on server startup, every 5 min, and immediately when the
   watchlist changes. **You don't need a symbol to have been opened live
   in the browser first** — this cache runs regardless. It writes the full
   candle history for each timeframe's cached window to
   `data/candles/<SYMBOL>/analysis.md`, one markdown table per timeframe
   (ordered `1w`/`1d`/`1h`/`15m`/`5m`/`1m`), every row a candle with
   precomputed columns: `open`/`high`/`low`/`close`/`volume`,
   `ema9`/`ema21`/`sma20`/`sma50`/`sma200`, `rsi14`, `macd`/`signal`/
   `histogram`, `atr14`, `vwap` (intraday tables only — `1m`/`5m`/`15m`,
   resetting each trading day; not a `1h`/`1d`/`1w` concept), and
   `patterns` (any candlestick pattern detected on that specific row).

   Read it directly, or run the convenience wrapper, which adds a
   staleness check and can filter to just the timeframes you need:
   ```
   node .claude/skills/find-trades/scan.mjs <SYMBOL>
   node .claude/skills/find-trades/scan.mjs <SYMBOL> --timeframe 1d,1w
   ```
   Every column value and every pattern tag is precomputed, deterministic,
   and guaranteed consistent with what's on the chart — **never recompute
   any of it yourself from raw candles**, that reintroduces exactly the
   two-implementations-drift risk this design removed. What's genuinely
   **not** precomputed, and *is* your job — this is the actual point of
   handing you the full tables instead of a summary:
   - **Trend structure** — read the sequence of highs/lows down the table
     yourself (higher-highs/higher-lows = uptrend, the reverse = downtrend,
     neither = range/consolidation). There's no stored "trend" field.
   - **Momentum shifts** — find where the `ema9`/`ema21` columns actually
     cross, or where `macd` crosses `signal`, in the row sequence. A
     crossover 3 rows ago that's held is a very different signal than one
     that just happened or one that reversed immediately.
   - **Levels** — identify support/resistance from *clusters* of highs or
     lows that got tested more than once across the visible rows, not just
     the single highest/lowest value in the table. A level three separate
     candles wicked into and rejected from is real structure; a single
     extreme print usually isn't.
   - **Pattern context** — a `patterns` tag (doji, engulfing, hammer,
     morning/evening star, shooting star) means something in light of
     *where it sits* — at a level you already identified, after a
     multi-row pullback, at a EMA cross — not on its own. Never treat a
     tag alone as a trade trigger.
   - **Cross-timeframe synthesis — the actual reason all six tables are
     given together, not one at a time.** A level or trend that agrees
     across `1h` and `1d` (or further, `1w`) is materially stronger than
     one that only shows up on a single timeframe. Read top-down: `1w`/`1d`
     first for bias and the major levels, `1h` for the swing structure
     actually in play right now, then `15m`/`5m`/`1m` only for symbols that
     already look worth a closer look (`scan.mjs --timeframe 1d,1w` first,
     drill in from there) — both because that's cheaper (full history
     across all six is a lot of rows to read for every watchlist symbol)
     and because it's the same order a real multi-timeframe trader reads
     in.

   Each timeframe block carries `barCount`/`dataQuality` (`'ok'` once it
   has ~30+ bars, else `'thin'`) in its table header — judge each
   timeframe on its own quality rather than the symbol as a whole; `1d`/
   `1w` can be trustworthy even while a newly-added symbol's `15m` is still
   thin. If the file is missing entirely, or `scan.mjs` flags it stale
   (computed >~5 min ago), say so and treat it as low/no confidence —
   don't proceed as if it were fresh, and don't fabricate a result to fill
   the gap.

3. **Evaluate against strategy.md, per symbol.** Apply the rules exactly
   as written in `data/strategy.md`, not from memory — it may have been
   edited. In particular:
   - **Market structure filter first**: read bias/trend top-down from the
     tables themselves — `1w`/`1d` EMA order and the row-by-row trend for
     the big picture, `1h` for the multi-week swing structure actually in
     play, `1m`/`5m` for price vs. `vwap` and today's swing structure. Skip
     the symbol entirely if there's no clear directional read across
     timeframes — no forcing a trade into a filter that doesn't pass.
   - **Qualifying signal**: does the data support one of momentum, range,
     breakout, VWAP, mean-reversion, or ORB? Derive the opening range
     yourself from `1m`'s first ~30 rows of the current trading day (first
     row's timestamp to +30 min) — it isn't a stored field anymore. A
     `patterns` hit at a relevant level strengthens a case but never
     substitutes for one.
   - **Structural stop**: derive a level yourself from the relevant
     table's highs/lows (below/above VWAP, the relevant EMA, or a tested
     high/low cluster) — never an arbitrary number, and never a level
     that's just the single most extreme value with no other support. Use
     `1d` or `1h` for a swing-timeframe idea, `1m`/`5m` for a scalp.
     Sanity-check the resulting stop distance against that timeframe's
     `atr14` column; if it's much tighter than 1×ATR, it's likely to get
     stopped out by noise, not the thesis being wrong — reconsider before
     proposing it.
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
   scanned symbol, write/update the structurally meaningful levels you
   identified in step 2/3 (a tested high/low cluster, the day's opening
   range, `vwap` only when it's actually acting as support/resistance, not
   just "price is near vwap") — pulling from whichever timeframe is
   relevant: intraday tables for intraday levels, `1h`/`1d` for
   swing-timeframe ones. Mark a symbol's prior levels `active: false`
   before adding the fresh set for that symbol, rather than letting stale
   ones accumulate. See `src/types/Level.ts` for the shape.

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
  against it directly. These `.json` files stay pure OHLCV, on purpose —
  `analysis.md` (what you actually read) is a separate, generated
  artifact; the raw cache is never annotated with indicators or patterns.
- Never fabricate candle data, levels, or alerts to make a panel look
  populated. An honest "no data" or "no qualifying setup" is the correct
  output when that's what the numbers show — and now that outcome is
  itself logged and visible in the UI, not silent.
- All writes go through the bridge's plain GET/POST file routes (see
  `vite-plugins/localDataApi.ts`) — but you have filesystem access when
  running in this repo, so writing the JSON files directly is fine too;
  the dev server picks up the change via `fs.watch` and pushes it to any
  open browser tab either way.
