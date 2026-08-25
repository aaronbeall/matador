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

interface JournalEntryBase {
  id: string;
  timestamp: string; // ISO — when the entry was written, not necessarily when the thing happened
  // Omitted entirely for general/market-wide notes not tied to one name.
  symbol?: string;
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

// Claude grading its own prior call (a thesis, an alert, or a skipped
// setup) against what the market actually did afterward. This is the
// "hits and misses" mechanism — the whole point of the feature.
export type ReviewVerdict = 'hit' | 'miss' | 'missed-opportunity' | 'dodged-trap';

export interface JournalReviewEntry extends JournalEntryBase {
  kind: 'review';
  symbol: string;
  verdict: ReviewVerdict;
  summary: string; // one line: the call vs. the outcome
  details: string; // the fuller comparison — what was said, what happened, why it's graded this way
  // What's being graded, loosely — not a hard foreign key, just context.
  sourceType?: 'thesis' | 'alert' | 'idea';
}

export type JournalEntry = JournalNoteEntry | JournalReviewEntry;
export type Journal = JournalEntry[];
