import React from 'react';
import { Alert, AlertTitle, Button, Stack } from '@mui/material';

interface Props {
  message: string;
  onRetry: () => void;
}

const RtcErrorBanner: React.FC<Props> = ({ message, onRetry}) => {
  return (
    <Alert severity="error" sx={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 1200 }}>
      <AlertTitle>We couldn’t start the call</AlertTitle>
      {message}
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button variant="outlined" color="inherit" size="small" onClick={onRetry}>Retry</Button>
      </Stack>
    </Alert>
  );
};

export default RtcErrorBanner;
