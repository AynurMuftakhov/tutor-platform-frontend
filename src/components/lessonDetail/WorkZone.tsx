import React, { useEffect } from 'react';
import { Box, Typography, IconButton, Tabs, Tab } from '@mui/material';
import { 
  Close as CloseIcon,
  Videocam as VideoIcon,
  LibraryBooks as LibraryBooksIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import SyncedVideoPlayer from './SyncedVideoPlayer';
import MaterialsTab from './MaterialsTab';
import { Room } from 'livekit-client';
import { useWorkspace, WorkspaceTool } from '../../context/WorkspaceContext';

interface WorkZoneProps {
  room: Room;
  useSyncedVideo: any; // Import the actual type from your hook
  onClose: () => void;
  lessonId: string;
}

/**
 * WorkZone component that houses the SyncedVideoPlayer and future components
 * like Whiteboard, Quiz, PDFViewer, etc.
 */
const WorkZone: React.FC<WorkZoneProps> = ({ room, useSyncedVideo, onClose, lessonId }) => {
  const { state } = useSyncedVideo;
  const { currentTool, setCurrentTool } = useWorkspace();

  // Set default tool to 'video' if a material is open, otherwise 'materials'
  useEffect(() => {
    if (state.open && state.material) {
      setCurrentTool('video');
    } else {
      setCurrentTool('materials');
    }
  }, [state.open, state.material, setCurrentTool]);

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: WorkspaceTool) => {
    setCurrentTool(newValue);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        width: '100%',
        position: 'relative',
        bgcolor: 'background.paper',
        borderLeft: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Vertical tabs */}
      <Box sx={{ borderRight: 1, borderColor: 'divider' }}>
        <Tabs
          orientation="vertical"
          value={currentTool}
          onChange={handleTabChange}
          aria-label="Workspace tools"
          sx={{ 
            minWidth: '72px',
            '& .MuiTab-root': {
              minWidth: '72px',
              py: 2
            }
          }}
        >
          <Tab 
            icon={<LibraryBooksIcon />} 
            value="materials" 
            aria-label="Materials"
            title="Materials"
          />
          <Tab 
            icon={<VideoIcon />} 
            value="video" 
            aria-label="Video"
            title="Video"
            disabled={!state.open || !state.material}
          />
          <Tab 
            icon={<DashboardIcon />} 
            value="whiteboard" 
            aria-label="Whiteboard"
            title="Whiteboard"
            disabled={true} // Disabled for future implementation
          />
        </Tabs>
      </Box>

      {/* Content area */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Header with title and close button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" component="div">
            {currentTool === 'materials' 
              ? 'Lesson Materials' 
              : state.material 
                ? state.material.title || 'Learning Material' 
                : 'Workspace'}
          </Typography>
          <IconButton onClick={onClose} edge="end" aria-label="close workspace">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Tool content */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: 0,
          }}
        >
          {currentTool === 'materials' && (
            <MaterialsTab 
              lessonId={lessonId} 
              onSelectMaterial={useSyncedVideo.open} 
            />
          )}

          {currentTool === 'video' && state.open && state.material && (
            <SyncedVideoPlayer
              room={room}
              useSyncedVideo={useSyncedVideo}
              inWorkspace={true}
            />
          )}

          {currentTool === 'whiteboard' && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                p: 3,
              }}
            >
              <Typography variant="body1" color="text.secondary" align="center">
                Whiteboard feature coming soon.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};


export default WorkZone;
