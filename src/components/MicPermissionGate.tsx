import { Alert, Snackbar } from '@mui/material';
import React from 'react';

type MicState = 'unknown' | 'granted' | 'denied' | 'prompt';

export function MicPermissionGate() {
  const [state, setState] = React.useState<MicState>('unknown');
  const [msg, setMsg] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  // Only show a notification (no button). We do not attempt to request permissions here.
  React.useEffect(() => {
    const check = async () => {
      const p: any = (navigator as any).permissions;

      // Safari (no Permissions API): show a generic prompt notification
      if (!p?.query) {
        setState('prompt');
        setMsg(
          'Microphone is not enabled yet. Click the mic button in the call to allow when prompted. Safari: Safari → Settings → Websites → Microphone → Allow for this site.'
        );
        setOpen(true);
        return;
      }

      try {
        const status = await p.query({ name: 'microphone' as PermissionName });
        setState(status.state as MicState);

        const show = status.state !== 'granted';
        if (show) {
          setMsg(
            status.state === 'denied'
              ? 'Microphone is blocked for this site. Click the camera icon in the address bar to allow it, then reload.'
              : 'Microphone is not enabled yet. Click the mic button in the call to allow when prompted.'
          );
          setOpen(true);
        } else {
          setOpen(false);
          setMsg(null);
        }

        status.onchange = () => {
          const s = status.state as MicState;
          setState(s);
          if (s === 'granted') {
            setOpen(false);
            setMsg(null);
          } else {
            setMsg(
              s === 'denied'
                ? 'Microphone is blocked for this site. Click the camera icon in the address bar to allow it, then reload.'
                : 'Microphone is not enabled yet. Click the mic button in the call to allow when prompted.'
            );
            setOpen(true);
          }
        };
      } catch {
        // ignore
      }
    };

    check();
  }, []);

  if (state === 'granted') return null;

  return (
    <Snackbar
      open={open}
      onClose={(event, reason) => {
        // Keep visible unless permission becomes "granted".
        // Ignore user-initiated closes: clickaway, timeout, or ESC.
        if (reason === 'clickaway' || reason === 'timeout' || reason === 'escapeKeyDown') return;
        setOpen(false);
      }}
      autoHideDuration={null}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert severity="warning" sx={{ width: '100%' }}>
        {msg}
        <br />
        <small>
          Chrome: click the camera icon → “Always allow microphone for this site”.<br />
          Safari: Safari → Settings → Websites → Microphone → Allow for this site.
        </small>
      </Alert>
    </Snackbar>
  );
}