import React, { useState } from 'react';
import { Box, Fab, Tooltip, Zoom } from '@mui/material';
import DashboardCustomizeRoundedIcon from '@mui/icons-material/DashboardCustomizeRounded';
import { useTheme } from '@mui/material/styles';
import DailyWhiteboardDrawer from './DailyWhiteboardDrawer';
import { useAuth } from '../../context/AuthContext';

type Props = {
  lessonId?: string;
};

const DailyOverlays: React.FC<Props> = ({ lessonId }) => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const theme = useTheme();

  const handleToggle = () => setOpen((prev) => !prev);

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          bottom: { xs: 16, md: 32 },
          right: { xs: 16, md: 32 },
          pointerEvents: 'none',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          alignItems: 'flex-end',
        }}
      >
        <Zoom in timeout={320}>
          <Tooltip title={open ? 'Hide collaboration dashboard' : 'Open collaboration dashboard'} placement="left">
            <Fab
              variant="extended"
              onClick={handleToggle}
              sx={{
                pointerEvents: 'auto',
                px: 3,
                fontWeight: 600,
                letterSpacing: 0.2,
                textTransform: 'none',
                color: '#fff',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || theme.palette.primary.dark})`,
                boxShadow: '0 18px 40px rgba(64, 69, 233, 0.35)',
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary?.dark || theme.palette.primary.main})`,
                  boxShadow: '0 22px 48px rgba(64, 69, 233, 0.45)',
                },
              }}
            >
              <DashboardCustomizeRoundedIcon sx={{ mr: 1.5 }} />
              {open ? 'Close dashboard' : 'Collaboration dashboard'}
            </Fab>
          </Tooltip>
        </Zoom>
      </Box>
      <DailyWhiteboardDrawer
        open={open}
        onClose={() => setOpen(false)}
        lessonId={lessonId}
        role={user?.role?.toLowerCase()}
      />
    </>
  );
};

export default DailyOverlays;
