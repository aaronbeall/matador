# Trade Analysis: Architecture Plan

Status: **core loop built and working** (state layer, bridge, `find-trades`
skill, frontend panels). Live-validated against real market data — see
`TODO.md` for what's still open (multi-symbol simultaneous streaming,
chart entry/stop/target overlays for a specific idea).

## Goal

Claude acts as analyst, not executor. It scans a watchlist for short-term
setups with asymmetric risk/reward (tight, defined risk vs. open-ended
reward) and surfaces them — the user still places trades manually in
Robinhood. Trades are meant to resolve same-day (scalp) to a few days
(swing), never longer.

The user will invoke this pre-market and repeatedly through the trading
day, so state has to persist and stay fresh between chats, not just live
in conversation.

## State layer

A `data/` directory, **gitignored** (this repo is public on GitHub — no
trading data or strategy specifics get committed):

- `watchlist.json` — symbols the user follows
- `strategy.md` — single doc covering both scalp and swing criteria: R:R
  thresholds, what counts as a qualifying setup, risk rules. This is the
  one file both sides treat as authoritative — the skill reads it to know
  current criteria, the frontend renders it read-only, and Claude edits it
  directly when the user refines strategy conversationally.
- `trade-ideas.json` — scan output. Each idea: symbol, direction,
  timeframe (`scalp` | `swing`), entry, stop, target, R:R, thesis, which
  indicator(s) triggered it, status (`proposed` → `taken`/`skipped` →
  `stopped-out`/`target-hit`/`expired`), timestamps.
- `levels.json` — support/resistance levels to watch per symbol, written
  independent of whether a trade idea qualified. Rendered as reference
  lines on the chart for the active symbol, plus its own panel.
- `alerts.json` — either something already true (a new idea just
  qualified) or a concrete, checkable condition to watch for (a level
  cross, an indicator crossover/threshold). A background engine
  (`vite-plugins/marketData/alertsEngine.ts`) evaluates pending conditions
  against fresh data and flips them to triggered — that's what actually
  fires a desktop notification, not the alert's creation. Severity-tagged;
  also carries an optional `invalidation` condition (the competing
  scenario, evaluated the same way) that resolves it live without its own
  condition ever firing. No manual acknowledge — the UI fades an alert
  once it's actually resolved (invalidated/expired/superseded).
- `analysis-log.json` — a run log of what the skill actually did per
  symbol per invocation, including "no data" / "no qualifying setup" —
  so the UI shows the system's reasoning, not just its hits.
- `candles/<symbol>/<interval>/<period>.json` (+ `.md`) — the indicator-
  annotated cache, partitioned by period so a read only has to load what
  it actually needs: day files for `1m`/`5m`/`15m`, ISO-week files for
  `1h`, month files for `1d`. `1w` has no partition (`candles/<symbol>/
  1w.json`/`.md`, ~100 rows total). Every `.json` carries OHLCV plus
  precomputed EMA/SMA/RSI/MACD/ATR/VWAP(intraday-only)/candlestick
  patterns, fetched natively from Alpaca and kept gap-free by the
  background reconciliation cache (see "Live market data" below), each
  bounded to that timeframe's own lookback window (old period files just
  get deleted as the window rolls forward). Each `.md` is a direct
  markdown mirror of its `.json` sibling — deliberately *not* a summary —
  `find-trades` reads it and does its own trend/momentum/level/
  cross-timeframe reasoning over the real candles, the way it would read
  a chart screenshot; Node precomputes only what's deterministic (the
  indicator math, the pattern detection), never the judgment.
- `candles/<symbol>/latest.md` — a small cross-timeframe orientation file
  (tail of each maintained timeframe), for triage before deciding which
  deeper period files, if any, a particular read needs.

The filesystem is the single source of truth. The Claude skill writes to
it directly (filesystem access when chatting in-repo). The frontend
writes back too (full add/edit/delete on Journal entries today; idea
status updates from clicking "taken"/"skipped" are still open — see
`TODO.md`).

## Bridge (frontend ↔ shared state)

A Vite dev-server plugin adds local API routes (read/write the
`data/*.json` files) to the existing dev server. No second process —
`npm run dev` covers both the app and the local API. Dev-only by nature,
which is fine since this app is local-only.

The frontend stays fresh three ways: an **SSE stream** (`GET /api/events`)
pushes a "this file changed" notice the moment the skill writes a file —
the server watches `data/` with `fs.watch` and the browser just refetches
whichever route changed; a **refetch on window focus** catches anything
missed while the tab was backgrounded; and a **60s poll** is a fallback
if the SSE connection ever drops. All three funnel into one
`refreshAnalysisData()` in `App.tsx`, so the UI is never more than a
focus-or-60s away from correct even if push fails outright.

(Considered and rejected for now: a standalone Node/Express server —
more conventional but one more thing to start/keep running for no real
benefit at this scale. Also considered: WebSocket for the push channel —
SSE is simpler for one-way server→browser and needs no extra dependency.)

## Live market data (the chart itself)

Originally the browser connected to Finnhub directly (REST + WebSocket),
aggregated trades into candles, and computed indicators client-side, then
POSTed the results to the bridge for `find-trades` to read. That put the
same indicator math in two places (the chart's rendering and the
analysis snapshot) with a real risk of the two drifting apart, shipped
the API key to the browser bundle, and left `npm run dev` with no
supervision over an external connection nobody explicitly asked for once
the tab was gone. The provider has since moved to Alpaca (IEX feed) —
Finnhub's free tier didn't reliably serve historical REST data, which
meant a symbol had no history at all until it had been watched live for
a while; Alpaca's historical bars aren't gated, which is what made the
proactive cache below possible.

Node now owns this end to end (`vite-plugins/marketData/`):

- **Connects to Alpaca** (`alpaca.ts`) — WebSocket for live IEX trades,
  REST for quotes and native per-timeframe historical bars. The API key
  (`VITE_ALPACA_KEY_ID` / `VITE_ALPACA_SECRET_KEY`, read via
  `server.config.env`) never reaches the browser — referenced only in
  this Node-side code.
- **Maintains a gap-free multi-timeframe cache** (`cache.ts`), proactively,
  for every symbol in the active watchlist — not just whatever's on
  screen. Six timeframes (`1m`/`5m`/`15m`/`1h`/`1d`/`1w`), each with its
  own lookback window sized to what that timeframe is actually for (fast
  timeframes: just enough recency to execute against structure; `1h`/
  `1d`/`1w`: real depth, since that's where market structure lives — see
  `timeframes.ts` for the exact table and reasoning). Alpaca is treated as
  the gap oracle: rather than compute "expected" bars against a
  hand-rolled trading calendar, each reconcile pass re-fetches the full
  window and merges, erring toward re-fetch over cleverness. Runs on
  server startup, every 5 min, and immediately when `watchlist.json`
  changes.
- **Aggregates live 1m candles** (`service.ts`, reusing
  `src/services/CandleStore.ts` — the exact same class, just instantiated
  server-side now instead of in a browser ref) and **computes every
  indicator** (`attachIndicators` from `src/utils/indicators.ts`) before
  pushing candles to the browser — the single place this math runs. Only
  1m is fed by the live trade stream; `5m`/`15m`/`1h`/`1d`/`1w` come from
  the native Alpaca fetch above, not derived from 1m.
- **Persists** live 1m candles + re-annotates that timeframe + re-renders
  `latest.md` (`src/utils/analysis.ts`'s `annotateTimeframe` +
  `renderLatestMarkdown`, via `cache.ts`'s `recomputeAnalysis`) on a 10s
  timer while a symbol has an active browser subscriber; the background
  cache above covers every other watchlist symbol, and every other
  timeframe, on its own 5-min cycle — only whichever timeframe(s) actually
  changed get re-annotated and re-split into period files each cycle.
- **Serves the browser** over a local WebSocket at `/ws/market`, attached
  to the same underlying HTTP server Vite already runs (`{ noServer: true }`
  plus a manual `upgrade` listener scoped to that path — attaching via
  `{ server, path }` directly collided with Vite's own HMR WebSocket on
  the same server and put its client in a connect/disconnect loop).

**Connection lifecycle is explicit, not always-on**: the live trade
WebSocket only connects the first time a browser client subscribes to a
symbol (Live turned on), and disconnects `UNSUBSCRIBE_GRACE_MS` (45s)
after the last subscriber leaves — long enough that a page refresh
doesn't churn the connection, short enough that a genuinely closed tab
actually cleans up. Toggling Live off client-side, or the tab/process
closing outright, both land on the same teardown path. The background
multi-timeframe cache is a separate, always-on-a-schedule concern (REST,
not a second streaming connection) — it doesn't affect this lifecycle.

**Diagnostics**: two connections make up "is data actually flowing" —
browser↔Node (the app's own WebSocket) and Node↔Alpaca (which only Node
can see, pushed through as an `externalStatus` message). Both are shown
with independent manual reconnect actions in the connection icon
(top-right AppBar) — `src/components/ConnectionDiagnostics/`, which also
has a "Rebuild cache" action to force-clear and re-fetch a symbol's
history immediately instead of waiting for the next reconcile cycle.

## Skill

`.claude/skills/find-trades/` — on-demand only (no scheduled/cron run for
now). Reads `watchlist.json` + `strategy.md`, runs `scan.mjs` (deterministic
feature extraction only, via `technicalindicators` — same math as
`src/utils/indicators.ts`) per symbol from its persisted candle history,
then Claude evaluates each symbol against the strategy criteria and
writes results: qualifying setups into `trade-ideas.json`, structural
levels into `levels.json` regardless of whether a setup qualified, notable
events into `alerts.json`, and a per-symbol run outcome — including "no
data" and "no qualifying setup" — into `analysis-log.json`. Keeps open
ideas, expires stale ones per timeframe rules; never fabricates a result
to make a panel look populated.

Symbol universe: starts as the maintained watchlist; broader market
screening is a later addition, not in this pass.

## Frontend

Reuses the existing single-symbol candlestick/indicator chart component
rather than replacing it. New pieces:

- **Watchlist panel** — add/remove symbols, click to switch the active
  chart symbol
- **Ideas panel** — table of current ideas: symbol, scalp/swing, R:R,
  status, age (thesis on hover)
- **Strategy panel** — renders `strategy.md`
- **Levels panel** — support/resistance levels across the watchlist;
  active levels for the on-screen symbol also render as reference lines
  directly on the chart
- **Alerts panel** — notable events; fades once resolved (invalidated/expired/superseded)
- **Activity panel** — the `analysis-log.json` run history, so "nothing
  qualified" is visible, not silent
- Kept fresh via SSE push + refetch-on-focus + a 60s poll fallback (see
  Bridge above) — no manual refresh needed
- Still open: entry/stop/target reference lines and a trigger marker for
  a *specific* idea on the chart (levels render now; per-idea overlay
  doesn't yet) — see `TODO.md`

Not fancy, not meant to replace real charting platforms — tailored
specifically to visualizing what the strategy skill flags.

## Explicitly out of scope for this pass

- Automated order execution (user trades manually in Robinhood)
- Scheduled/cron scans (on-demand only)
- Broad market screening beyond the maintained watchlist
- Backtesting, P&L tracking, trade journaling (all already listed in
  `TODO.md` as later roadmap items)

## Next step

When ready to build, turn this into a concrete file-by-file implementation
plan (data schemas, Vite plugin routes, skill script, component
breakdown).
