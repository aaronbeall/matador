export type TradeDirection = 'long' | 'short';
export type TradeTimeframe = 'scalp' | 'swing';
export type TradeIdeaStatus =
  | 'proposed'
  | 'taken'
  | 'skipped'
  | 'stopped-out'
  | 'target-hit'
  | 'expired';

export interface TradeIdea {
  id: string;
  symbol: string;
  direction: TradeDirection;
  timeframe: TradeTimeframe;
  entry: number;
  stop: number;
  target: number;
  riskReward: number; // e.g. 2.5 means 2.5:1
  thesis: string;
  triggeredBy: string[]; // e.g. ['vwap-reclaim', 'ema9-cross']
  status: TradeIdeaStatus;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp, set per timeframe rules
}

export type TradeIdeas = TradeIdea[];
