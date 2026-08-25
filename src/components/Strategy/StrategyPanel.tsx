import React from 'react';
import { MarkdownFileView } from '../MarkdownFileView';

interface StrategyPanelProps {
  strategyPath: string | null;
  strategyText: string | null;
  loading: boolean;
  error: string | null;
}

export const StrategyPanel: React.FC<StrategyPanelProps> = ({ strategyPath, strategyText, loading, error }) => (
  <MarkdownFileView path={strategyPath} content={strategyText} loading={loading} error={error} />
);
