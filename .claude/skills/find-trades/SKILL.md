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

2. **Get a numeric snapshot per symbol.** For each active watchlist
   symbol, run:
   ```
   node .claude/skills/find-trades/scan.mjs <SYMBOL>
   ```
   This does deterministic feature extraction only (VWAP, EMA9/21, SMA20,
   RSI14, MACD, 30-bar swing high/low, opening-range high/low, volume vs.
   20-bar average) from `data/candles/<SYMBOL>.json` — the real candle
   history persisted from the app's live WebSocket feed. It does **not**
   judge whether a setup qualifies; that's your job in step 3.

   If a symbol's snapshot comes back with an `error` field (no data yet),
   skip it, note why in your summary, and log it (step 6) — don't just go
   quiet. If it comes back with `dataQuality: 'thin...'`, treat any signal
   read from it as low confidence — say so explicitly rather than
   proposing a trade idea with unwarranted certainty. Don't fabricate
   data to force a result either way.

3. **Evaluate against strategy.md, per symbol.** Apply the rules exactly
   as written in `data/strategy.md`, not from memory — it may have been
   edited. In particular:
   - **Market structure filter first**: read bias/trend from the
     snapshot (EMA order, price vs. VWAP, recent swing structure). Skip
     the symbol entirely if there's no clear directional read — no
     forcing a trade into a filter that doesn't pass.
   - **Qualifying signal**: does the snapshot support one of momentum,
     range, breakout, VWAP, mean-reversion, or ORB (using
     `openingRangeHigh`/`openingRangeLow`)?
   - **Structural stop**: derive from the snapshot (below/above VWAP,
     the relevant EMA, or the swing high/low) — never an arbitrary
     number.
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
   the snapshot: `swingHigh30`/`swingLow30`, `openingRangeHigh`/
   `openingRangeLow`, and `vwap` (only when it's acting as clear
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

- Free-tier Finnhub does not reliably serve historical intraday candles
  via REST (`/stock/candle` returns "You don't have access to this
  resource" on this project's key, confirmed 2026-08-17), so `scan.mjs`
  deliberately reads only from `data/candles/*.json`, which the frontend
  populates from the live trade stream while `Live` is enabled. A symbol
  needs to have been streamed live for a while before it has enough
  history to scan.
- Never fabricate candle data, levels, or alerts to make a panel look
  populated. An honest "no data" or "no qualifying setup" is the correct
  output when that's what the numbers show — and now that outcome is
  itself logged and visible in the UI, not silent.
- All writes go through the bridge's plain GET/POST file routes (see
  `vite-plugins/localDataApi.ts`) — but you have filesystem access when
  running in this repo, so writing the JSON files directly is fine too;
  the dev server picks up the change via `fs.watch` and pushes it to any
  open browser tab either way.
