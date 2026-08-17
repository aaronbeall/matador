# Trade Analysis: Architecture Plan

Status: **agreed, not yet built**. Captures the design discussed before implementation starts.

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

The filesystem is the single source of truth. The Claude skill writes to
it directly (filesystem access when chatting in-repo). The frontend needs
a way to write back too (status updates from clicking "taken"/"skipped"/
etc.) — see Bridge below.

## Bridge (frontend ↔ shared state)

A Vite dev-server plugin adds a few local API routes (read/write the
`data/*.json` files) to the existing dev server. No second process —
`npm run dev` covers both the app and the local API. Dev-only by nature,
which is fine since this app is local-only.

(Considered and rejected for now: a standalone Node/Express server —
more conventional but one more thing to start/keep running for no real
benefit at this scale.)

## Skill

`.claude/skills/find-trades/` — on-demand only (no scheduled/cron run for
now). Reads `watchlist.json` + `strategy.md`, runs a Node script that
reuses the existing `technicalindicators`-based calculations
(`src/utils/indicators.ts`) to pull candles per symbol and compute
indicators, then evaluates each symbol against the strategy criteria and
merges qualifying setups into `trade-ideas.json` (keeping open ideas,
expiring stale ones per timeframe rules).

Symbol universe: starts as the maintained watchlist; broader market
screening is a later addition, not in this pass.

## Frontend

Reuses the existing single-symbol candlestick/indicator chart component
rather than replacing it. New pieces:

- **Watchlist panel** — add/remove symbols, last price
- **Ideas panel** — table of current ideas: symbol, scalp/swing, R:R,
  status, age; click through to detail
- **Strategy panel** — renders `strategy.md`
- **Chart view** — existing chart + entry/stop/target reference lines, a
  shaded risk/reward zone, and a marker on whichever indicator triggered
  the idea, so the chart explains *why* an idea was flagged
- Light polling (~30–60s) plus a visible "last scanned" timestamp per
  idea, since the app will be checked intermittently through the day
  rather than left open and streaming

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
