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
   - `data/watchlist.json` — use only entries with `active: true` (toggled
     directly from the Watchlist panel's switch — an inactive symbol gets
     no market-data caching either, not just no analysis).
   - `data/strategy.md` — this is the authoritative rule set. Re-read it
     fresh every run; the user may have edited it since last time.
   - `data/trade-ideas.json`, `data/levels.json` — existing entries, to
     merge against rather than overwrite blindly.
   - `data/journal.json` — real trades and notes relayed by the user, plus
     Claude's own past review entries grading prior calls (distinct from
     `trade-ideas.json`'s proposals). Skim recent `review` entries before
     evaluating setups per `strategy.md`'s Discretion clause — a recent
     `miss`/`missed-opportunity` pattern should change what gets proposed,
     not just sit there unread. See root `CLAUDE.md` for the full shape
     and when to write each entry kind — this run is also a good moment
     to add fresh `review` entries for any thesis/alert that's resolved
     since the last run.

2. **Read the annotated history per symbol — and actually read it, like a
   chart.** A background cache (`vite-plugins/marketData/cache.ts`)
   proactively maintains six timeframes — `1m`, `5m`, `15m`, `1h`, `1d`,
   `1w` — for every symbol in the active watchlist, gap-checked against
   Alpaca on server startup, every 5 min, and immediately when the
   watchlist changes. **You don't need a symbol to have been opened live
   in the browser first** — this cache runs regardless.

   The cache itself is the source of the annotation — every persisted
   candle already carries `open`/`high`/`low`/`close`/`volume`, `rvol`
   (this candle's volume vs. its trailing 20-bar average — >1.5-2x is
   worth noting as above-average participation, not just a rule of
   thumb, but a red flag if a breakout/breakdown is happening *without*
   it), `ema9`/`ema21`/`sma20`/`sma50`/`sma200`, `rsi14`, `macd`/`signal`/
   `histogram`, `atr14`, `vwap`/`vwapU1`/`vwapL1` (intraday only —
   `1m`/`5m`/`15m`, resetting each trading day; `vwapU1`/`vwapL1` are the
   ±1σ volume-weighted bands around vwap — price outside them is
   statistically stretched for the session) and `patterns` (any
   candlestick pattern detected on that specific candle). It's
   partitioned so you only ever have to load what a given read actually
   needs, not one giant file:
   ```
   data/candles/<SYMBOL>/1m/<YYYY-MM-DD>.md    one file per trading day
   data/candles/<SYMBOL>/5m/<YYYY-MM-DD>.md    one file per trading day
   data/candles/<SYMBOL>/15m/<YYYY-MM-DD>.md   one file per trading day
   data/candles/<SYMBOL>/1h/<YYYY-Www>.md      one file per ISO week (e.g. 2026-W33)
   data/candles/<SYMBOL>/1d/<YYYY-MM>.md       one file per calendar month
   data/candles/<SYMBOL>/1w.md                 single file (already only ~100 rows total)
   data/candles/<SYMBOL>/latest.md             tail of every timeframe, for quick orientation
   ```
   Two-stage read:
   - **Orient with `latest.md`** — `node .claude/skills/find-trades/scan.mjs <SYMBOL>` (adds a staleness check on top of a plain read). This is enough to triage a symbol — get a read on current levels/momentum across all six timeframes at a glance — but it's only the last ~10 rows of each; it's not enough to found a real decision on.
   - **Pull exactly the history the setup actually needs.** `ls` the relevant subdirectory, `Read` whichever period file(s) matter — this is a deliberate choice per symbol/strategy, not "always load everything":
     - An ORB read wants today's (and maybe yesterday's, for a gap reference) `1m`/`5m` day file — nothing else.
     - A multi-week swing read wants a handful of `1d` month files, maybe a couple of `1h` week files — not the full multi-year history.
     - A quick momentum check might genuinely need nothing beyond `latest.md`.

   Every column value and every pattern tag is precomputed, deterministic,
   and guaranteed consistent with what's on the chart — **never recompute
   any of it yourself from raw candles**, that reintroduces exactly the
   two-implementations-drift risk this design removed. What's genuinely
   **not** precomputed, and *is* your job — this is the actual point of
   reading real tables instead of a summary:
   - **Trend structure** — read the sequence of highs/lows down the table
     yourself (higher-highs/higher-lows = uptrend, the reverse = downtrend,
     neither = range/consolidation). There's no stored "trend" field.
   - **Momentum shifts** — find where the `ema9`/`ema21` columns actually
     cross, or where `macd` crosses `signal`, in the row sequence. A
     crossover 3 rows ago that's held is a very different signal than one
     that just happened or one that reversed immediately.
   - **Levels** — identify support/resistance from *clusters* of highs or
     lows that got tested more than once, not just the single highest/
     lowest value in whatever you pulled. A level three separate candles
     wicked into and rejected from is real structure; a single extreme
     print usually isn't.
   - **Pattern context** — a `patterns` tag (doji, engulfing, hammer,
     morning/evening star, shooting star) means something in light of
     *where it sits* — at a level you already identified, after a
     multi-row pullback, at an EMA cross — not on its own. Never treat a
     tag alone as a trade trigger.
   - **Cross-timeframe synthesis — the actual reason to pull more than one
     timeframe's history, not just orient off `latest.md`.** A level or
     trend that agrees across `1h` and `1d` (or further, `1w`) is
     materially stronger than one that only shows up on a single
     timeframe. Read top-down: bias and major levels from the slow
     timeframes first, only pulling `15m`/`5m`/`1m` history for symbols
     that already look worth a closer look — both cheaper (you're not
     pulling months of history for every watchlist symbol on every run)
     and the same order a real multi-timeframe trader reads in.

   Each period file's table header carries `barCount`/`dataQuality` (`'ok'`
   once that timeframe has ~30+ bars total, else `'thin'`) — judge each
   timeframe on its own quality rather than the symbol as a whole; `1d`/`1w`
   can be trustworthy even while a newly-added symbol's `15m` is still
   thin. If `latest.md` is missing entirely, or `scan.mjs` flags it stale
   (computed >~5 min ago), say so and treat it as low/no confidence — don't
   proceed as if it were fresh, and don't fabricate a result to fill the
   gap.

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

6. **Write `data/alerts.json` — as conditions, not facts.** An alert is
   either something already true right now, or something to watch for:
   - **Already true right now** (e.g. a new trade idea just qualified in
     step 4): write it with `status: 'triggered'`, `triggeredAt: now`.
   - **Not true yet, but would matter if it became true** (e.g. price
     approaching a level, a setup that needs one more confirmation): write
     it with `status: 'pending'` and a concrete `AlertCondition` (see
     `src/types/Alert.ts`) — `price-crosses`, `indicator-crosses`,
     `macd-crosses-signal`, or `indicator-threshold`. **You don't monitor
     this yourself** — a background engine (`vite-plugins/marketData/
     alertsEngine.ts`) checks every pending condition against fresh data on
     the same cadence `analysis.md` itself updates on (live ~10s while a
     symbol's on screen, every 5 min otherwise) and flips it to `triggered`
     the moment it's actually met. Your job is picking the one concrete,
     checkable condition that actually represents the setup — not writing
     a vague "watch this."
   - Every alert needs: `headline` (succinct, this is what shows in the
     desktop notification when it triggers — "QQQ broke above $730.50
     resistance", not a restated condition), `rationale` (why it matters —
     this is where multi-timeframe confluence reasoning goes), `actionGuidance`
     (what to actually do or look for next), `severity` (`watch`/`action`),
     and a required `expiresAt` — inherit the related idea's `expiresAt` if
     there is one, otherwise set a deliberate one (don't leave a pending
     condition to watch forever; the engine auto-expires anything past its
     `expiresAt` on its own even if you never rescan).
   - Also required: `bias` (`bullish`/`bearish`/`neutral` — the directional
     read the alert represents) and `action` (`long`/`short`/`exit`/`watch`
     — the actual call to action). **These aren't mechanically derived from
     each other** — a bearish read is often `watch`, not `short`: this
     strategy doesn't take every bearish signal as a short entry (check
     `strategy.md`'s entry criteria), and a break of support might just
     mean "stand aside," not "reverse and short it." Use `exit` when the
     alert is invalidating a specific open idea (`relatedIdeaId` set,
     status `taken`), not a fresh entry signal.
   - **Set `invalidation` whenever there's a real opposite scenario** — an
     `AlertCondition`, same shape as `condition`, for the competing case
     that would mean this alert's premise stopped being true (typically
     the other side of the same setup: a bearish breakdown trigger's
     natural invalidation is the bullish reclaim level that would
     contradict it). The engine evaluates this live, the same way as the
     main condition, and resolves the alert to `status: 'invalidated'` the
     moment it fires — this is what keeps a stale alert from just sitting
     there as `pending`/`action` for hours after the market has clearly
     gone the other way, waiting on `expiresAt` to eventually catch up.
     Skip it only when there's genuinely no clean opposite condition to
     point at.
   - **When `action` isn't `watch`, give at least one `suggestions` entry**
     — a concrete `TradeSuggestion` (see `src/types/Alert.ts`): instrument
     (`shares`/`call`/`put`), strike/expiry if it's an option, and
     entry/stop/target. `entry`/`stop`/`target` are always the
     *underlying's* price levels — there's no live options-chain data in
     this app to price a real premium from, so an option suggestion
     expresses the same underlying move via strike/expiry, not a
     separately-invented target. Give more than one suggestion when
     genuinely applicable (e.g. a plain-shares alternative alongside an
     options one for leverage) — strikes/expiries should respect
     `strategy.md` (no far-OTM, no naked/uncapped options; a long call/put
     is fine, a defined-risk vertical if you want to cap cost further) and
     the same 2:1 minimum R:R as everything else. **Never fabricate a
     `target`** just to fill the field — if no structural level actually
     supports one yet, omit `target` and `riskReward` and say so in `note`
     (e.g. "no fixed target — manage via ATR trail once triggered")
     instead of inventing a number.
   - **Time-box a condition with `activeFrom` when the signal only means
     something in a specific window** — not evaluated before `activeFrom`
     (defaults to right away if omitted), still auto-expires at
     `expiresAt` either way. The motivating case is ORB: the opening range
     itself isn't final until the first ~30 minutes of the session have
     closed, and a break of that level hours later isn't really "the ORB
     signal" anymore, just an unrelated late-day cross — so set
     `activeFrom` to when the opening range closes and `expiresAt` to how
     long after that a break still counts (e.g. through the next hour, not
     the rest of the day). Any signal with a natural window works the same
     way — set both ends deliberately rather than defaulting to "watch
     forever starting now."
   - **Supersede stale ones, don't just add more.** Before writing new
     alerts for a symbol, check its existing `pending` entries: if a setup
     is no longer valid (level broken the wrong way, the related idea
     itself got invalidated or expired), set that alert's `status:
     'superseded'` rather than leaving it hanging — an open desktop
     notification tied to a triggered-then-superseded alert gets actively
     closed on the frontend when this happens, and a lingering pending one
     just keeps getting checked for nothing. This is what keeps repeated
     scans from accumulating near-duplicate alerts for the same condition.

7. **Append to `data/thesis.json` — the standing read, not a proposal.**
   Independent of whether a trade idea qualified this run: append a new
   entry for this symbol (see `src/types/Thesis.ts` — give it a fresh
   `id`) with the current `sentiment` (bullish/bearish/neutral), `stance`
   (long/short/hold — **not** mechanically derived from sentiment, same
   caveat as an alert's `action`: a bearish read is often `hold`, not
   `short`, if nothing in `strategy.md` actually qualifies a short here),
   a one-line `summary`, the fuller `reasoning` from your market-structure
   read in step 3, and `invalidation` if there's a concrete level/
   condition that would change your mind. This is append-only — the
   frontend shows the most recent entry per symbol as the current read and
   everything older as history, so don't overwrite/remove a prior entry,
   and don't append one that says nothing new since the last (e.g. two
   runs in a row with an unchanged read) unless something concrete did
   change. Skip writing it only if data quality was too thin to form any
   real read (say so in the analysis-log entry instead).

8. **Append to `data/analysis-log.json`.** One entry per symbol scanned
   this run, always — including "no data yet", "insufficient history",
   and "no qualifying setup" outcomes. This is what makes the Activity
   tab in the UI a real record of what ran rather than only showing
   successes. See `src/types/AnalysisLog.ts`. Keep the log bounded —
   trim to the most recent ~200 entries when writing.

9. **Report back.** Tell the user, in plain language, what ran: symbols
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
- Candle storage is partitioned per timeframe — day files for `1m`/`5m`/
  `15m`, ISO-week files for `1h`, month files for `1d`, a single file for
  `1w` — each capped to that timeframe's own lookback window (2 days for
  `1m` up to ~2 years for `1w` — see `vite-plugins/marketData/
  timeframes.ts` for the exact table and reasoning; old-enough period
  files just get deleted as that window rolls forward). The `.json` cache
  IS the annotated data — indicators and pattern tags are computed once
  server-side and persisted alongside the OHLCV, not recomputed on every
  read. Each `.md` is a direct markdown mirror of its `.json` sibling —
  that's what you actually read; see step 2 above for the exact layout.
- Never fabricate candle data, levels, or alerts to make a panel look
  populated. An honest "no data" or "no qualifying setup" is the correct
  output when that's what the numbers show — and now that outcome is
  itself logged and visible in the UI, not silent.
- All writes go through the bridge's plain GET/POST file routes (see
  `vite-plugins/localDataApi.ts`) — but you have filesystem access when
  running in this repo, so writing the JSON files directly is fine too;
  the dev server picks up the change via `fs.watch` and pushes it to any
  open browser tab either way.
