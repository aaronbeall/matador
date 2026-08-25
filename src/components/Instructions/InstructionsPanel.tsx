import React from 'react';
import { MarkdownFileView } from '../MarkdownFileView';

interface InstructionsPanelProps {
  path: string | null;
  text: string | null;
  loading: boolean;
  error: string | null;
}

// Read-only view of the project's CLAUDE.md — the standing instructions
// that govern how the agent keeps Journal/Portfolio/Thesis/etc. up to
// date in conversation without a skill run. Exposed here purely for
// review; edited directly in the repo, same convention as Strategy.
export const InstructionsPanel: React.FC<InstructionsPanelProps> = ({ path, text, loading, error }) => (
  <MarkdownFileView path={path} content={text} loading={loading} error={error} />
);
