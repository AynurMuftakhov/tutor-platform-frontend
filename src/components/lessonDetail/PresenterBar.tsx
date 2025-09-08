import React from 'react';
import { Box, Button, Stack, Switch, Typography, IconButton, Tooltip } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';

interface Props {
  content: { id: string; title?: string } | null;
  onPrevSection: () => void;
  onNextSection: () => void;
  onLockToggle: () => void;
  locked: boolean;
  onEnd: () => void;
  onFocus: (blockId?: string) => void;
}

const PresenterBar: React.FC<Props> = ({ content, onPrevSection, onNextSection, onLockToggle, locked, onEnd }) => {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      p: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default'
    }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle2" color="text.secondary">Content</Typography>
        <Typography variant="subtitle1" color="text.secondary">{content?.title || content?.id || '—'}</Typography>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <Tooltip title="Previous section">
          <span><IconButton size="small" onClick={onPrevSection} disabled={!content}><ArrowBackIosNewIcon fontSize="small" /></IconButton></span>
        </Tooltip>
        <Tooltip title="Next section">
          <span><IconButton size="small" onClick={onNextSection} disabled={!content}><ArrowForwardIosIcon fontSize="small" /></IconButton></span>
        </Tooltip>
        <Tooltip title={locked ? 'Unlock scrolling' : 'Lock scrolling'}>
          <IconButton size="small" onClick={onLockToggle} color={locked ? 'primary' : 'default'}>
            {locked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Button size="small" variant="outlined" color="error" onClick={onEnd} disabled={!content}>End presentation</Button>
      </Stack>
    </Box>
  );
};

export default PresenterBar;
