// Two kinds of entry, in one reverse-chronological feed — distinct from
// data/trade-ideas.json (a proposal), data/thesis.json (the current
// standing read, overwritten each update), and data/portfolio-*.json
// (actual account state — real open/closed positions and cash). This is
// the narrative layer: freeform notes, and Claude's own self-graded
// review of how past calls held up. It deliberately does NOT track real
// trades with entry/exit numbers — that's Portfolio's job, so there's one
// source of truth for "what did I actually trade," not two. Where Thesis
// answers "what do I think right now," the Journal answers "was I right,
// and what actually happened."

export type JournalEntryKind = 'note' | 'review';

// hit/miss/dodged-trap/missed-opportunity — originally just how a
// `review` grades a past call, but a `note` can carry one too when it
// describes an actual trade outcome or a clear avoid/miss (auto-detected
// from the note's text, always user-overridable — see JournalPanel's
// detectVerdict). A plain note with nothing gradeable in it just omits it.
export type ReviewVerdict = 'hit' | 'miss' | 'missed-opportunity' | 'dodged-trap';

interface JournalEntryBase {
  id: string;
  timestamp: string; // ISO — when the entry was written, not necessarily when the thing happened
  // Omitted entirely for general/market-wide notes not tied to one name.
  symbol?: string;
  // Optional emotional/directional tone of the entry, -1 (very negative)
  // to +1 (very positive), 0 = neutral. Not a market direction (see
  // Direction/bias elsewhere) — this is about the entry's own tone: a
  // relayed loss reads negative, a hit/dodged-trap review reads positive,
  // a plain factual note can just omit it. When Claude writes an entry on
  // the user's behalf, set this from a genuine read of the tone in what
  // was said — see CLAUDE.md.
  sentiment?: number;
  verdict?: ReviewVerdict;
  // Only meaningful when `verdict` is absent, and only on a `note` (a
  // `review`'s verdict is always required and always set). Distinguishes
  // two different "blank"s that otherwise look identical: a note Claude
  // has already evaluated for an outcome and deliberately decided none
  // applies (`true`) vs. one nobody's evaluated yet (`undefined`/`false`).
  // Lets the routine journal-backfill pass (see CLAUDE.md) skip what it's
  // already considered instead of re-litigating it on every visit, while
  // still catching genuinely fresh notes.
  verdictReviewed?: boolean;
}

// Freeform — either the user's own words relayed in conversation, or a
// takeaway Claude wants to record (e.g. summarizing a pattern noticed
// across several review entries). `author` distinguishes whose words
// these are; never paraphrase the user's own note into Claude's voice.
export interface JournalNoteEntry extends JournalEntryBase {
  kind: 'note';
  author: 'user' | 'claude';
  text: string;
}

// What's being graded, loosely — not a hard foreign key, just context.
export type ReviewSourceType = 'thesis' | 'alert' | 'idea';

// Claude grading its own prior call (a thesis, an alert, or a skipped
// setup) against what the market actually did afterward. This is the
// "hits and misses" mechanism — the whole point of the feature.
export interface JournalReviewEntry extends JournalEntryBase {
  kind: 'review';
  symbol: string;
  verdict: ReviewVerdict;
  summary: string; // one line: the call vs. the outcome
  details: string; // the fuller comparison — what was said, what happened, why it's graded this way
  sourceType?: ReviewSourceType;
}

export type JournalEntry = JournalNoteEntry | JournalReviewEntry;
export type Journal = JournalEntry[];
