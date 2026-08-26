// When the agent last actually looked at each panel's data — regardless of
// whether that look resulted in any change. Distinct from each file's own
// timestamps (thesis.updatedAt, alert.createdAt, etc.), which only exist
// on entries that changed; this answers "was this evaluated at all" so a
// panel that's genuinely unchanged (nothing new to say) still shows the
// agent looked, rather than reading as stale/forgotten. Also distinct from
// the sidebar's own lastSeenAt (App.tsx) — that tracks when the *user*
// last viewed a tab, this tracks when the *agent* last evaluated the data
// behind it, which is why it needs its own persisted, shared file rather
// than client-only localStorage.
export type AgentActivityPanel = 'thesis' | 'levels' | 'alerts' | 'journal' | 'activity';

// ISO timestamp per panel, set by the agent directly (same convention as
// every other data/*.json file — written in conversation, no skill
// required). Keys are added lazily; a panel with no entry yet has simply
// never been evaluated.
export type AgentActivity = Partial<Record<AgentActivityPanel, string>>;
