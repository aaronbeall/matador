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
- [ ] Charting view to monitor live trading (Candles, Lines, Volume)
- [ ] Chart indicators (EMA, VWAP, MACD, RSI)
- [ ] Chart drawings (levels, trendlines, etc)
- [ ] Signal detection and alerts (bullish/bearish candle patterns, crossovers, price action, crossovers, etc)
- [ ] AI powered suggestions (levels, setups, entries, exits, etc) — see [docs/trade-analysis-plan.md](docs/trade-analysis-plan.md) (plan agreed, not yet built)
  - [ ] State layer: gitignored `data/` dir (`watchlist.json`, `strategy.md`, `trade-ideas.json`)
  - [ ] Bridge: Vite dev-server plugin adding local API routes to read/write `data/*.json`
  - [ ] `find-trades` Claude skill: on-demand scan of watchlist against `strategy.md`, merges qualifying setups into `trade-ideas.json`
  - [ ] Frontend: Watchlist panel, Ideas panel, Strategy panel (renders `strategy.md`), chart annotations (entry/stop/target lines, R:R zone, trigger marker), light polling (~30-60s) with last-scanned timestamp
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
