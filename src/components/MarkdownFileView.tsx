import React from 'react';
import { Box, Typography, CircularProgress, Link } from '@mui/material';
import { InsertDriveFile as FileIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownFileViewProps {
  path: string | null;
  content: string | null;
  loading: boolean;
  error: string | null;
}

// Shared "raw markdown file, rendered" view — used anywhere the app shows
// a project markdown file verbatim (Strategy, Agent instructions) rather
// than dumping the raw source as preformatted text. The header names the
// real file and links to it (file:// — opens/reveals it locally, since
// this only ever runs against the same machine's filesystem) so it's
// always obvious this is a rendering of an actual file, not app-generated
// content.
export const MarkdownFileView: React.FC<MarkdownFileViewProps> = ({ path, content, loading, error }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ p: 2 }}>
        {error}
      </Typography>
    );
  }

  const filename = path?.split('/').pop();

  return (
    // No `overflow: hidden` here — this box sits inside a scrolling flex
    // column (the sidebar panel), and overflow other than `visible` on a
    // flex item removes its content-based min-height, letting it get
    // flex-shrunk to fit the container instead of the container scrolling
    // to it — the content then just gets silently clipped. Round the
    // header's own top corners instead of clipping to get the same look.
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      {path && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.5,
            py: 0.75,
            bgcolor: 'action.hover',
            borderBottom: '1px solid',
            borderColor: 'divider',
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
          }}
        >
          <FileIcon fontSize="small" color="action" />
          <Link
            href={`file://${path}`}
            underline="hover"
            variant="caption"
            title={path}
            sx={{ fontFamily: 'ui-monospace, monospace', color: 'text.secondary' }}
          >
            {filename}
          </Link>
        </Box>
      )}
      <Box
        sx={{
          p: 2,
          fontSize: '0.85rem',
          lineHeight: 1.6,
          color: 'text.primary',
          '& > :first-of-type': { mt: 0 },
          '& > :last-child': { mb: 0 },
          '& h1, & h2, & h3, & h4': { fontWeight: 700, mt: 2.5, mb: 1 },
          '& h1': { fontSize: '1.3rem' },
          '& h2': { fontSize: '1.15rem' },
          '& h3, & h4': { fontSize: '1rem' },
          '& p': { my: 1 },
          '& ul, & ol': { pl: 3, my: 1 },
          '& li': { mb: 0.5 },
          '& li > p': { my: 0 },
          '& code': {
            fontFamily: 'ui-monospace, monospace',
            fontSize: '0.85em',
            bgcolor: 'action.selected',
            px: 0.5,
            py: 0.1,
            borderRadius: 0.5,
          },
          '& pre': { bgcolor: 'action.selected', p: 1.5, borderRadius: 1, overflow: 'auto' },
          '& pre code': { bgcolor: 'transparent', p: 0 },
          '& blockquote': {
            borderLeft: '3px solid',
            borderColor: 'divider',
            pl: 1.5,
            ml: 0,
            color: 'text.secondary',
          },
          '& a': { color: 'info.main' },
          '& hr': { border: 'none', borderTop: '1px solid', borderColor: 'divider', my: 2.5 },
          '& table': { borderCollapse: 'collapse', width: '100%', my: 1 },
          '& th, & td': { border: '1px solid', borderColor: 'divider', px: 1, py: 0.5, textAlign: 'left' },
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content ?? ''}</ReactMarkdown>
      </Box>
    </Box>
  );
};
