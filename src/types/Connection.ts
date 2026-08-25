// External systems this app pulls from or reflects — market data and
// brokerage accounts today, room for more kinds later (e.g. options-chain
// pricing). Distinct from Portfolio's `AccountBalance`/`Position` (the
// actual state a connection like Robinhood produces) — this is about the
// connection itself: what it is, how it's currently wired up, and whether
// that's a real API integration or just a manual convention. Neither
// connection has a self-service settings form — same as the rest of this
// app, they're configured conversationally: tell Claude what to change
// and it edits data/connections.json directly (or, for something
// code-level like swapping market-data providers, the actual
// integration). This type exists to represent that as real data instead
// of leaving it implicit in code.

export type ConnectionKind = 'market-data' | 'brokerage';

// 'connected' — a real, working integration (Alpaca today).
// 'manual' — no API integration; state is kept in sync by the user
//   relaying it in chat (Robinhood's balances/positions today).
// 'disconnected' — configured at some point but not currently active.
export type ConnectionStatus = 'connected' | 'manual' | 'disconnected';

export interface Connection {
  id: string;
  kind: ConnectionKind;
  provider: string; // e.g. "Alpaca", "Robinhood"
  label: string; // display name for the card, e.g. "Market Data"
  status: ConnectionStatus;
  // A few plain facts about how it's wired up today — not a real settings
  // form, just enough surface to show what "configuring" this would
  // eventually mean (e.g. { feed: "IEX" } or { account: "Robinhood" }).
  details?: Record<string, string>;
  // Whether a real configuration UI exists for this connection yet. False
  // for everything today — both connections are hardcoded/manual, not
  // actually configurable — but the field exists so the panel can render
  // honestly once one becomes real instead of pretending they all are.
  configurable: boolean;
  notes?: string; // one short, honest line about the current limitation
}

export type Connections = Connection[];
