import React from 'react';
import { Box, Accordion, AccordionSummary, AccordionDetails, Typography, Chip } from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { Skill } from '../../types/Skill';

interface SkillsPanelProps {
  skills: Skill[];
}

export const SkillsPanel: React.FC<SkillsPanelProps> = ({ skills }) => {
  if (skills.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        No skills found in .claude/skills/.
      </Typography>
    );
  }

  return (
    <Box>
      {skills.map((skill) => (
        <Accordion key={skill.id} disableGutters sx={{ '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={skill.id} size="small" color="primary" variant="outlined" />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {skill.description}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              component="pre"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '0.75rem',
                lineHeight: 1.5,
                m: 0,
                maxHeight: 400,
                overflow: 'auto',
              }}
            >
              {skill.content}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};
