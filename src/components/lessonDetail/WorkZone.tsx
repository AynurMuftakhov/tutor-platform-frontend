import React, { useEffect } from 'react';
import { Box, Typography, IconButton, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, List, ListItemButton, ListItemText } from '@mui/material';
import { 
  Close as CloseIcon,
  Videocam as VideoIcon,
  LibraryBooks as LibraryBooksIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import SyncedVideoPlayer from './SyncedVideoPlayer';
import SyncedGrammarPlayer from '../grammar/SyncedGrammarPlayer';
import LessonMaterialsTab from './LessonMaterialsTab';
import { useWorkspace, WorkspaceTool } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { UseSyncedVideoResult } from '../../hooks/useSyncedVideo';
import { UseSyncedGrammarResult } from '../../hooks/useSyncedGrammar';
import GridViewIcon from '@mui/icons-material/GridView';
import SyncedContentView from '../../features/lessonContent/student/SyncedContentView';
import type { useSyncedContent } from '../../hooks/useSyncedContent';
import { useQuery } from '@tanstack/react-query';
import { getLessonContents } from '../../services/api';

type UseSyncedContentResult = ReturnType<typeof useSyncedContent>;

import type { Room } from 'livekit-client';

interface WorkZoneProps {
  useSyncedVideo: UseSyncedVideoResult;
  useSyncedGrammar?: UseSyncedGrammarResult;
  useSyncedContent?: UseSyncedContentResult;
  onClose: () => void;
  lessonId: string;
  room?: Room | null;
}

/**
 * WorkZone component that houses the SyncedVideoPlayer and future components
 * like Whiteboard, Quiz, PDFViewer, etc.
 */
const WorkZone: React.FC<WorkZoneProps> = ({useSyncedVideo, useSyncedGrammar, useSyncedContent, onClose, lessonId, room }) => {
  const { state } = useSyncedVideo;
  const grammarState = useSyncedGrammar?.state;
  const { currentTool, setCurrentTool } = useWorkspace();
  const { user } = useAuth();
  const isTutor = user?.role === 'tutor';

  // Set default tool to 'video' if a material is open, otherwise 'materials'
  useEffect(() => {
    if (state.open && state.material) {
      setCurrentTool('video');
    } else if (grammarState?.open && grammarState?.material) {
      setCurrentTool('video');
    } else if (useSyncedContent?.state.open) {
      setCurrentTool('content');
    } else {
      setCurrentTool('materials');
    }
  }, [state.open, state.material, grammarState?.open, grammarState?.material, useSyncedContent?.state.open, setCurrentTool]);

  // Auto-open workspace when currentTool changes to 'video'
  useEffect(() => {
    if (currentTool === 'video' && !state.open && !grammarState?.open) {
      // If we're switching to video tab but no video or grammar is open,
      // switch back to materials tab
      setCurrentTool('materials');
    }
  }, [currentTool, state.open, grammarState?.open, setCurrentTool]);

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
            icon={<GridViewIcon />} 
            value="content" 
            aria-label="Content"
            title="Content"
            disabled={!useSyncedContent?.state.open}
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
            {isTutor && (
                <IconButton onClick={onClose} edge="end" aria-label="close workspace">
                    <CloseIcon />
                </IconButton>
            )}
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
            <Box sx={{ height: '100%', overflow: 'auto' }}>
              {isTutor && useSyncedContent && (
                <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
                  <OpenCompositionButton onOpen={(c) => { useSyncedContent.open({ id: c.id, title: c.title }); setCurrentTool('content'); }} />
                </Box>
              )}
              <LessonMaterialsTab 
                lessonId={lessonId} 
                isTeacher={user?.role === 'tutor'}
                onPlay={(material) => {
                  if (material.type === 'GRAMMAR' && useSyncedGrammar) {
                    useSyncedGrammar.open(material);
                  } else {
                    useSyncedVideo.open(material);
                  }
                  setCurrentTool('video');
                }}
              />
            </Box>
          )}

          {currentTool === 'video' && (
            <>
              {state.open && state.material && (
                <SyncedVideoPlayer
                  useSyncedVideo={useSyncedVideo}
                  showChat={!!room}
                />
              )}
              {grammarState?.open && grammarState?.material && useSyncedGrammar && (
                <SyncedGrammarPlayer
                  useSyncedGrammar={useSyncedGrammar}
                />
              )}
            </>
          )}

          {currentTool === 'content' && useSyncedContent?.state.open && useSyncedContent?.state.contentId && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <SyncedContentView
                  contentId={useSyncedContent.state.contentId}
                  focusBlockId={useSyncedContent.state.focusBlockId}
                  locked={!!useSyncedContent.state.locked}
                  contentSync={room ? { room, isTutor, contentId: useSyncedContent.state.contentId } : undefined}
                />
              </Box>
            </Box>
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

const OpenCompositionButton: React.FC<{ onOpen: (c: { id: string; title?: string }) => void }> = ({ onOpen }) => {
  const [open, setOpen] = React.useState(false);
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['lesson-contents', { page: 0, size: 20 }],
    queryFn: () => getLessonContents({ownerId: user!.id, status: "PUBLISHED", page: 0, size: 20, }),
  });
  const items: { id: string; title?: string }[] = React.useMemo(() => data?.content || data?.items || [], [data]);
  return (
    <>
      <Button variant="outlined" size="small" startIcon={<GridViewIcon />} onClick={() => setOpen(true)}>Open composition…</Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Select composition</DialogTitle>
        <DialogContent dividers>
          <List>
            {items?.length ? items.map((it: any) => (
              <ListItemButton key={it.id} onClick={() => { onOpen({ id: it.id, title: it.title }); setOpen(false); }}>
                <ListItemText primary={it.title || it.id} secondary={it.status || undefined} />
              </ListItemButton>
            )) : (
              <Typography variant="body2" color="text.secondary">No compositions found.</Typography>
            )}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkZone;
