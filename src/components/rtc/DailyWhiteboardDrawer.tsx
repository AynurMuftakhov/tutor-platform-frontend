import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  IconButton,
  Slide,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { useTheme } from '@mui/material/styles';
import { useDailyCall } from '../../context/DailyCallContext';
import { useDailyWhiteboardLink } from '../../hooks/useDailyWhiteboardLink';

const Transition = React.forwardRef<HTMLDivElement, TransitionProps & { children: React.ReactElement }>(
  ({ children, ...rest }, ref) => (
    <Slide direction="up" ref={ref} {...rest}>
      {children}
    </Slide>
  ),
);

type Props = {
  open: boolean;
  onClose: () => void;
  lessonId?: string;
  role?: string | null;
};

const DailyWhiteboardDrawer: React.FC<Props> = ({ open, onClose, lessonId, role }) => {
  const callFrame = useDailyCall();
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const [iframeRefresh, setIframeRefresh] = useState(0);

  const {
    url,
    embedUrl,
    waitingForLink,
    error,
    lastUpdatedAt,
    remoteParticipantCount,
    resyncBoard,
    resetBoard,
    openInNewTab,
  } = useDailyWhiteboardLink({ callFrame, role, lessonId, isOpen: open });

  useEffect(() => {
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  const statusLabel = useMemo(() => {
    if (waitingForLink) return 'Waiting for host to share board…';
    if (remoteParticipantCount > 0) {
      return `Live with ${remoteParticipantCount} ${remoteParticipantCount === 1 ? 'participant' : 'participants'}`;
    }
    return 'You are the only participant right now';
  }, [remoteParticipantCount, waitingForLink]);

  const gradient = useMemo(
    () =>
      `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary?.main || '#7f6bff'} 45%, ${theme.palette.primary.main} 100%)`,
    [theme.palette.primary.dark, theme.palette.primary.main, theme.palette.secondary?.main],
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleCopyLink = useCallback(async () => {
    if (!url || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch (err) {
      console.warn('Failed to copy whiteboard link', err);
    }
  }, [url]);

  const handleResync = useCallback(() => {
    resyncBoard();
    setIframeRefresh((key) => key + 1);
  }, [resyncBoard]);

  const iframeKey = useMemo(() => `${embedUrl ?? 'blank'}:${iframeRefresh}`, [embedUrl, iframeRefresh]);
  const isTutor = role === 'tutor' || role === 'teacher';

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          backgroundColor: theme.palette.background.default,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Stack sx={{ flex: 1, minHeight: 0 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{
            px: { xs: 3, md: 5 },
            py: { xs: 2.5, md: 3 },
            background: gradient,
            color: '#fff',
            boxShadow: '0 16px 40px rgba(64, 69, 233, 0.28)',
            borderBottomLeftRadius: { xs: 28, md: 36 },
            borderBottomRightRadius: { xs: 28, md: 36 },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 2.5,
                backgroundColor: 'rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
              }}
            >
              <SpaceDashboardRoundedIcon fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700} lineHeight={1.15}>
                Collaboration dashboard
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.86 }}>
                Shared Excalidraw whiteboard with instant Daily signalling.
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              color={waitingForLink ? 'warning' : remoteParticipantCount > 0 ? 'success' : 'default'}
              variant="filled"
              icon={<GroupsRoundedIcon />}
              label={statusLabel}
              sx={{
                fontWeight: 600,
                bgcolor: waitingForLink
                  ? 'rgba(255, 183, 77, 0.25)'
                  : remoteParticipantCount > 0
                  ? 'rgba(76, 175, 80, 0.3)'
                  : 'rgba(255,255,255,0.16)',
                color: '#fff',
              }}
            />
            {lastUpdatedAt && (
              <Chip
                size="small"
                variant="outlined"
                label={`Updated ${new Date(lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                sx={{ borderColor: 'rgba(255,255,255,0.45)', color: '#fff' }}
              />
            )}
            <IconButton onClick={handleClose} sx={{ color: '#fff', border: '1px solid rgba(255,255,255,0.4)', ml: { xs: 0, md: 1 } }}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, position: 'relative', p: { xs: 2, md: 4 } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!embedUrl && !waitingForLink && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Sharing a whiteboard link for this lesson will automatically invite everyone in the Daily call. Only tutors can
              start a new board.
            </Alert>
          )}

          {waitingForLink && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                bgcolor: 'background.paper',
                borderRadius: 4,
              }}
            >
              <CircularProgress size={56} thickness={4} />
              <Typography variant="h6" color="text.secondary">
                Waiting for the host to launch the whiteboard…
              </Typography>
            </Box>
          )}

          {embedUrl && (
            <Stack spacing={2} sx={{ height: '100%' }}>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                <Tooltip title="Request the latest whiteboard link from the host">
                  <span>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<SyncRoundedIcon />}
                      onClick={handleResync}
                      disabled={waitingForLink}
                    >
                      Resync board
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="Open the whiteboard in a separate tab">
                  <span>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={openInNewTab}
                      startIcon={<OpenInNewRoundedIcon />}
                      disabled={!url}
                      sx={{ borderColor: 'divider' }}
                    >
                      Open in new tab
                    </Button>
                  </span>
                </Tooltip>
                {isTutor && (
                  <Tooltip title="Start a blank Excalidraw room for everyone">
                    <span>
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<RestartAltRoundedIcon />}
                        onClick={resetBoard}
                        sx={{ color: theme.palette.getContrastText(theme.palette.secondary.main) }}
                      >
                        New blank board
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </Stack>

              <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                <Tooltip title={copied ? 'Copied!' : 'Copy shareable link'}>
                  <span>
                    <Button
                      variant={copied ? 'contained' : 'outlined'}
                      color={copied ? 'success' : 'primary'}
                      onClick={handleCopyLink}
                      startIcon={<ContentCopyRoundedIcon />}
                      disabled={!url}
                    >
                      {copied ? 'Link copied' : 'Copy link'}
                    </Button>
                  </span>
                </Tooltip>
              </Stack>

              <Box
                component="iframe"
                key={iframeKey}
                src={embedUrl}
                title="Collaborative whiteboard"
                sx={{
                  flex: 1,
                  width: '100%',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.22)',
                  overflow: 'hidden',
                  minHeight: 0,
                }}
                allow="clipboard-read; clipboard-write; fullscreen"
              />
            </Stack>
          )}
        </Box>
      </Stack>
    </Dialog>
  );
};

export default DailyWhiteboardDrawer;
