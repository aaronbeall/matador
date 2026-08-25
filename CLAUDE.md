# Matador — project instructions

## Portfolio (actual account state — positions and cash, nothing else)

`data/portfolio-positions.json` and `data/portfolio-balances.json` are
the durable record of **only what's actually true about the account**:
real open/closed positions and real cash. See `src/types/Portfolio.ts`
for the exact shape. Nothing analytical, speculative, or plan-shaped
belongs here — no thesis, no proposed setups, no "thinking about." That
lives in `data/thesis.json`, `data/trade-ideas.json`, or `data/journal.json`
instead. The point of this file is that reading it alone answers "what do
I actually hold and how much cash do I have," with zero editorializing
mixed in.

- **Positions** (`data/portfolio-positions.json`) — one entry per real
  trade, `status: 'open'` or `'closed'`. Log a new one the same turn the
  user relays taking a trade ("bought 5 QQQ 715c", "shorted 100 SPY").
  When they relay closing it, update that same entry in place (`exitPrice`,
  `exitAt`, `status: 'closed'`, `realizedPL` if given or computable from
  what they told you) — don't append a second entry for the same trade.
  `notes` is for a short earmark/description only ("scaled out half at
  2R"), never analysis of why it might move. Never fabricate a position —
  this only exists because the user said so.
  - **On close, give brief feedback only if there's a real insight** —
    something tying the trade to the actual structure/thesis at the time,
    a pattern across recent trades (e.g. a run of scalps taken in chop),
    or a risk-management observation worth reinforcing. Skip it when a
    trade is just unremarkable — logging the close is enough, don't
    manufacture commentary to have something to say.
- **Balances** (`data/portfolio-balances.json`) — one entry per account,
  keyed by `account`. A fresh balance overwrites the matching account's
  entry (same convention as Thesis overwriting per symbol) — this is the
  current figure, not a history. Log/update whenever the user tells you a
  cash balance, deposit, or withdrawal.

This is deliberately kept up to date the same way as Thesis/Strategy —
directly, in conversation, the same turn it's mentioned, no skill
invocation needed. It's manual for now; the natural next step, when
wanted, is reconciling it against a real broker account (a CSV import, a
brokerage API) rather than relying only on what gets relayed in chat —
not built yet.

## Journal (notes and self-graded outcomes)

`data/journal.json` is the narrative record — freeform notes, and Claude
grading its own past calls against what actually happened. Distinct from
Portfolio above (real trades and cash — state, not narrative), from
`data/thesis.json` (the current standing read, overwritten per symbol),
and from `data/trade-ideas.json` (proposals `find-trades` generates,
which may or may not match what the user actually did). See
`src/types/Journal.ts` for the exact shape. Two entry kinds, one
reverse-chronological array:

- **`note`** — freeform, `author: 'user' | 'claude'`. Log one whenever the
  user relays something worth remembering that isn't a real trade — a
  preference, a correction, a market observation. (A real trade goes to
  Portfolio instead, not here.) Use the user's own words when it's their
  note; don't paraphrase into Claude's voice.
- **`review`** — Claude grading its own prior call (a thesis, an alert, a
  skipped setup) against what the market actually did afterward.
  `verdict` is one of `hit` / `miss` / `missed-opportunity` /
  `dodged-trap`. This is the actual point of the feature: a clear,
  honest record of how the analysis holds up over time, not just a
  running commentary.

Both directions matter:
- **User-relayed** — whenever the user tells you a note worth keeping,
  log it in the same turn. Don't ask permission first — this is a live
  document.
- **Claude-initiated** — on your own initiative, when doing a fresh
  analysis pass (a chat-triggered check-in or a `find-trades` run),
  glance back at whichever past thesis/alert calls have since resolved
  (triggered, expired, or been overtaken by new price action) and log a
  `review` entry grading them, honestly — a call that was wrong is worth
  recording as plainly as one that was right. Don't force a review every
  single turn if nothing's actually resolved since the last one; don't
  fabricate a grade to have something to write.

Before proposing new setups, or exercising the discretion
`data/strategy.md`'s Discretion section grants, skim recent `review`
entries — a pattern of `missed-opportunity` or `miss` verdicts against a
particular kind of setup should actively change what gets proposed next,
not just sit there as trivia.

**Sentiment**: every entry has an optional `sentiment` field, -1 (very
negative) to +1 (very positive), 0 = neutral — the entry's own emotional
tone, not a market direction. Whenever you write an entry on the user's
behalf (either kind), set it from a genuine read of the actual tone in
what was said or found — a relayed loss or frustration reads negative, a
hit/dodged-trap review or relayed win reads positive, routine factual
content can just omit it rather than forcing a number. Don't flatten
everything to the extremes — most things are mildly one way or the other,
not -1/+1. This is a real signal worth getting right, not decoration: a
run of negative-sentiment entries is itself worth noticing (e.g. before
exercising discretion on a new setup while the user's clearly frustrated).
