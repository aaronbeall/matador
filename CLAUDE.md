# Matador — project instructions

## Trade journal (learning from real trade activity)

`data/trade-journal.md` is the durable record of real trades the user has
taken and lessons relayed in conversation — distinct from
`data/trade-ideas.json` (proposals `find-trades` generates, which may or
may not match what the user actually did).

- Whenever the user relays a trade result, a decision they made, or
  feedback on how a setup played out ("I took the QQQ long, stopped out
  for -1R", "that VWAP reclaim was too early, should've waited for a 15m
  close above it", "skipping ORB trades on FOMC days now") — log it to
  `data/trade-journal.md` directly, in the same turn. Add a Trade log row
  for an actual trade with a real outcome; add a Lessons bullet for a
  pattern, preference, or adjustment, whether or not it's tied to one
  specific trade.
- Before proposing new setups, or exercising the discretion
  `data/strategy.md`'s Discretion section grants, read the journal's
  Lessons section first — a recent, relevant lesson should actively
  shape what gets proposed and how, not just sit there as trivia.
- This is a live document — edit it directly when the user tells you
  something worth recording; don't ask permission first.
