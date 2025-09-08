import React from 'react';
import { Box } from '@mui/material';
import { useEditorStore } from '../editorStore';

interface BlockFrameProps {
  blockId: string;
  type: string;
  children: React.ReactNode;
}

const BlockFrame: React.FC<BlockFrameProps> = ({ blockId, type: _type, children }) => {
  const { state, actions } = useEditorStore();
  const selected = state.selectedBlockId === blockId;
  const showOverlays = state.overlaysVisible !== false;
  const isInvalid = Boolean(state.invalidById && state.invalidById[blockId]);

  const onClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
    if (showOverlays) {
      actions.setSelectedBlock(blockId);
      return;
    }
    // Clean Mode: allow selection only via Cmd/Ctrl-click
    if (e.metaKey || e.ctrlKey) {
      actions.setSelectedBlock(blockId);
    }
  };

  return (
    <Box
      id={`blk_${blockId}`}
      role="group"
      aria-label={`Block ${_type}`}
      aria-invalid={isInvalid || undefined}
      onClick={onClick}
      sx={{
        position: 'relative',
        borderRadius: 1,
        transition: 'outline-color 120ms ease, outline-width 120ms ease',
        outline: (theme) => showOverlays && selected ? `2px solid ${theme.palette.primary.main}` : '1px solid transparent',
        '&:hover': showOverlays ? {
          outline: (theme) => selected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.primary.main}55`,
        } : undefined,
        p: 0.5,
        cursor: 'pointer',
      }}
    >
      {children}
      {showOverlays && isInvalid && (
        <Box sx={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', bgcolor: (t) => t.palette.error.main }} aria-label="Invalid block" />
      )}
    </Box>
  );
};

export default BlockFrame;
