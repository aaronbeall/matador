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
- `alerts.json` — notable events (new idea, price approaching a level),
  severity-tagged, acknowledgeable from the UI.
- `analysis-log.json` — a run log of what the skill actually did per
  symbol per invocation, including "no data" / "no qualifying setup" —
  so the UI shows the system's reasoning, not just its hits.
- `candles/<symbol>.json` — real 1m candles persisted from the app's live
  WebSocket feed (not from a paid REST history endpoint — see the
  Frontend section below for why).

The filesystem is the single source of truth. The Claude skill writes to
it directly (filesystem access when chatting in-repo). The frontend
writes back too (alert acknowledgement today; idea status updates from
clicking "taken"/"skipped" are still open — see `TODO.md`).

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
- **Alerts panel** — notable events, acknowledgeable
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
