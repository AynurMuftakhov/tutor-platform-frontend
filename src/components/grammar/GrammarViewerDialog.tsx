import React from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Box } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import GrammarPlayer from './GrammarPlayer';

interface GrammarViewerDialogProps {
  open: boolean;
  onClose: () => void;
  materialId: string;
  title?: string;
}

/**
 * Dialog wrapper for the GrammarPlayer component
 */
const GrammarViewerDialog: React.FC<GrammarViewerDialogProps> = ({
  open,
  onClose,
  materialId,
  title = 'Grammar Exercise',
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="grammar-viewer-dialog-title"
    >
      <DialogTitle id="grammar-viewer-dialog-title" sx={{ m: 0, p: 2 }}>
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ p: 1 }}>
          <GrammarPlayer materialId={materialId} onClose={onClose} />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default GrammarViewerDialog;