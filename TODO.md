# MVP Use Case
- Monitor high volumne/liquidity ticker for scalping (QQQ, SPY, etc)
- Setup chart based on daily levels (support, resistance) -- AI assisted
- Setup chart indicators for scalping -- AI assisted
- Get realtime scalping signals: 
  - Momentum (trend continuation)
  - Range (buy support, sell resistance)
  - Breakouts (breaking levels)
  - VWAP (buy below, sell above)
  - Mean-reversion
  - Opening Range Breakout (opening range levels)
- Get realtime market structure analysis:
  - Bias (bearish, bullish, nuetral)
  - Trend (up, down, sideways)
  - Range-bound, consolidation
  - Reversal

# Roadmap

## MVP
- [x] Charting view to monitor live trading (Candles, Lines, Volume) — real-time, backed by Node's market data service (see below); historical depth is now reliable (Alpaca, not Finnhub's gated free tier)
- [x] Chart indicators (EMA, VWAP, MACD, RSI) — computed server-side once, pushed to the chart pre-enriched
- [x] Chart drawings (levels, trendlines, etc) — active support/resistance levels render as reference lines on the chart
- [ ] Signal detection and alerts (bullish/bearish candle patterns, crossovers, price action, crossovers, etc) — candle pattern detection exists in the analysis snapshot (see below) but isn't yet surfaced as its own chart marker/alert type
- [x] AI powered suggestions (levels, setups, entries, exits, etc) — core loop built, see [docs/trade-analysis-plan.md](docs/trade-analysis-plan.md)
  - [x] State layer: gitignored `data/` dir (`watchlist.json`, `strategy.md`, `trade-ideas.json`, `levels.json`, `alerts.json`, `analysis-log.json`, `candles/<symbol>/<interval>.json` per maintained timeframe)
  - [x] Bridge: Vite dev-server plugin with local API routes + SSE push (`/api/events`) so the UI updates the moment a file changes
  - [x] `find-trades` Claude skill: on-demand scan of watchlist against `strategy.md`; writes trade ideas, levels, alerts, and a run log — live-validated against real market data
  - [x] Frontend: Watchlist, Strategy, Ideas, Levels, Alerts, Activity, Skills panels (vertical icon nav with "new" badges + per-panel skill tips); active levels render as reference lines on the chart; kept fresh via SSE push + refetch-on-focus + 60s poll fallback. Skills tab reads `.claude/skills/*/SKILL.md` directly — documents itself, nothing to hand-maintain
  - [x] Candle storage split by symbol + timeframe (`1m`/`5m`/`15m`/`1h`/`1d`/`1w`), each natively fetched from Alpaca and bounded to its own lookback window (was: single JSON blob, 24h cutoff, no swing-timeframe history at all; then: per-day 1m files + a derived daily rollup, superseded by native per-timeframe fetch)
  - [x] ATR14 and candlestick pattern detection (engulfing, doji, hammer, morning/evening star, shooting star) added to `scan.mjs` — ATR for stop-sizing sanity checks, patterns as confirmation signals
  - [x] Live market data moved server-side (`vite-plugins/marketData/`) — Node owns the market data connection (WS + REST), candle aggregation, and all indicator computation; the browser no longer talks to the provider or computes anything itself, just renders what Node pushes over a local `/ws/market` WebSocket. Fixes: API key no longer shipped to the browser bundle; indicator math had two independent implementations (chart vs. analysis snapshot) that could silently drift, now there's exactly one
  - [x] Connection lifecycle: the live trade WS connects on first Live subscribe, disconnects ~45s after the last subscriber leaves (survives a quick page refresh, cleans up a genuinely closed tab) — explicit and supervised, not an always-on background connection
  - [x] Connection diagnostics UI: separate status + manual reconnect for browser↔Node and Node↔provider (top-right connection icon), plus a manual "rebuild cache" action to force-clear and re-fetch a symbol's history — "it says Live but nothing's moving" (or "this data looks wrong") is now diagnosable and fixable from the UI
  - [x] Real desktop notifications (Web Notifications API) for new non-info alerts, opt-in via the bell icon — `data/alerts.json` is the only thing any skill needs to write to; the notification system is generic on top of it
  - [x] Switched data provider from Finnhub to Alpaca (IEX feed) — Finnhub's free tier didn't reliably serve historical REST data, so a symbol had zero history until it had been watched live for a while; Alpaca's historical bars aren't gated
  - [x] Proactive, gap-free multi-timeframe cache (`vite-plugins/marketData/cache.ts`) — every active watchlist symbol gets `1m`/`5m`/`15m`/`1h`/`1d`/`1w` history maintained in the background (startup, every 5 min, and immediately on watchlist change), independent of whether anyone has that symbol open live. This is what actually unblocks `find-trades` from needing a chart opened first — closes the historical-depth limitation flagged above
  - [ ] Multi-symbol simultaneous **live-tick** streaming — the background cache above covers history/structure for the whole watchlist via periodic REST, but the realtime WS trade stream is still single-symbol, subscriber-driven (whichever symbol is on screen with Live on); watching the whole watchlist tick-by-tick in the background is still a separate, unbuilt feature
  - [ ] Per-idea chart overlay: entry/stop/target reference lines + trigger marker for a *specific* trade idea (levels already render; this is the idea-specific layer on top)
  - [ ] Ideas panel write-back: click to mark taken/skipped/stopped-out/target-hit (Alerts panel already supports acknowledge; Ideas doesn't yet)
  - [ ] Still-open prediction-quality gaps (see conversation): relative volume by time-of-day (not just trailing-bar average), market-wide correlation/regime context, news & earnings awareness, live bid/ask spread — bigger lifts than the quick wins above, not started
- [ ] Configuration and local storage of user settings

## Autonomous Trading (Phase 2 — after the manual system above is built)
Same Claude, different role: instead of just surfacing ideas for the user to place by hand, Claude actively executes and manages trades in the broker account itself, unattended.
- [ ] Claude-driven autonomous execution — Claude (running locally, same as this session) places and manages trades in the broker account directly, no manual click-through
  - [ ] Execution mechanism: browser control (e.g. Claude in Chrome) driving the broker's web UI, since most retail brokers (RH included) have no public trading API
  - [ ] Reuses `trade-ideas.json` / `strategy.md` from the manual system as the source of qualifying setups
  - [ ] Guardrails: position sizing limits, daily loss limits, human confirmation step / kill-switch, full audit log of every action taken
- [ ] Integration with brokerages (RH for starters) -- read account state, positions, balances
- [ ] Strategy based robo trading
- [ ] Strategy live testing
- [ ] AI broker agent -- based on user's track record, choose strategies that are working, discard strategies that aren't

## MVP+
- [ ] Backtesting of algo signals, signal reliability grading based on prediction vs performance
- [ ] Broader market screening for trade ideas beyond the maintained watchlist
- [ ] Strategy builder based on algorithmic signals and AI
- [ ] Strategy backtesting
- [ ] News feed integration
- [ ] Run in background
- [ ] Push notifications
- [ ] P&L
- [ ] Trade journaling -- P&L calendar, see trades per day, add notes to months, days and trades, AI powerered suggestions
- [ ] AI assistant -- look at chart, price action, give realtime feedack
- [ ] AI tip of the day (based on journal, trade history, activity)

## MMP
- [ ] User accounts
- [ ] API key management
- [ ] Legal

## Blue Sky
- [ ] Social trading -- expose trade history publically
- [ ] Social signaling -- user's can signal trades
- [ ] Social trade copy -- user's can choose signallers to automatically trade with
- [ ] Social app integration (Discord, Slack, Twitter, etc)
- [ ] AI Signal Agent -- publically available signal algos that can be used as trade copy source, anyone can make the AI Agent, can proxy for real people not part of the app, like Nancy Pelosi


# Dev

- [ ] Turn [docs/trade-analysis-plan.md](docs/trade-analysis-plan.md) into a concrete file-by-file implementation plan (data schemas, Vite plugin routes, skill script, component breakdown)
- [ ] ...
