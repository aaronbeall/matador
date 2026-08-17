export type AlertSeverity = 'info' | 'watch' | 'action';

export interface Alert {
  id: string;
  symbol: string;
  severity: AlertSeverity;
  message: string;
  relatedIdeaId?: string;
  relatedLevelId?: string;
  createdAt: string; // ISO timestamp
  acknowledged: boolean;
}

export type Alerts = Alert[];
