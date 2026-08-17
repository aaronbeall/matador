// A rolling log of what analysis tools (the find-trades skill, scan.mjs
// runs, etc.) actually did — surfaced in the UI so "no setup found" or
// "skipped, insufficient data" is visible, not just silence. Keeps the
// system's reasoning legible, not just its conclusions.
export interface AnalysisLogEntry {
  id: string;
  timestamp: string; // ISO timestamp
  tool: string; // e.g. 'find-trades'
  symbol?: string;
  summary: string; // one line, always shown
  detail?: string; // optional longer explanation
}

export type AnalysisLog = AnalysisLogEntry[];
