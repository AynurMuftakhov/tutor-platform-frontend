import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Paper,
    Grid, Dialog,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import MaterialCard, {Material} from '../materials/MaterialCard';
import MaterialPickerDialog from './MaterialPickerDialog';
import ListeningTaskManager from '../materials/ListeningTaskManager';
import { fetchStudents } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLessonMaterials, useUnlinkMaterialFromLesson } from '../../hooks/useLessonMaterials';
import { useQueryClient } from '@tanstack/react-query';
import StandaloneMediaPlayer from "./StandaloneMediaPlayer";
import {extractVideoId} from "../../utils/videoUtils";
import GrammarViewerDialog from "../grammar/GrammarViewerDialog";
import { resolveUrl } from '../../services/assets';
import LessonContentAttachments from './LessonContentAttachments';

interface LessonMaterialsTabProps {
  lessonId: string;
  isTeacher: boolean;
    /** Optional: when provided we’re inside the video-call workspace
     *  and should forward the material to the synced player instead
     *  of opening the standalone dialog. */
    onPlay?: (material: Material) => void;
}

const LessonMaterialsTab: React.FC<LessonMaterialsTabProps> = ({ lessonId, isTeacher, onPlay }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [isTaskManagerOpen, setIsTaskManagerOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null);
  const [isGrammarDialogOpen, setIsGrammarDialogOpen] = useState(false);
  // Shared student search state for all MaterialCards on this tab
  const [studentQ, setStudentQ] = useState<string>("");
  const [studentOptions, setStudentOptions] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [studentLoading, setStudentLoading] = useState<boolean>(false);
  const meterialsEnabled = false;
  React.useEffect(() => {
    if (!user?.id) return;
    const h = setTimeout(async () => {
      setStudentLoading(true);
      try {
        const res = await fetchStudents(user.id, studentQ, 0, 10);
        setStudentOptions(res.content.map((s: any) => ({ id: s.id, name: s.name, email: s.email })));
      } finally {
        setStudentLoading(false);
      }
    }, 300);
    return () => clearTimeout(h);
  }, [studentQ, user?.id]);

  // Fetch lesson materials
  const { data: lessonMaterials = [], isLoading } = useLessonMaterials(lessonId);

  // Unlink material mutation
  const unlinkMutation = useUnlinkMaterialFromLesson();

  // Handle opening the material picker
  const handleOpenPicker = () => {
    setIsPickerOpen(true);
  };

  // Handle closing the material picker
  const handleClosePicker = () => {
    setIsPickerOpen(false);
    queryClient.invalidateQueries({ queryKey: ['lessonMaterials', lessonId] });
  };

    const handlePlay = (material: Material) => {
        // If parent supplied an onPlay callback (video-conference mode)
        // send the material up regardless of type. Otherwise handle locally.
        if (onPlay) {
            onPlay(material);
        } else {
            // Local handling based on material type
            if (material.type === 'GRAMMAR') {
                setSelectedMaterial(material);
                setIsGrammarDialogOpen(true);
            } else {
                setCurrentMaterial(material);
            }
        }
    };

    // Close the grammar dialog
    const handleCloseGrammarDialog = () => {
        setIsGrammarDialogOpen(false);
        setSelectedMaterial(null);
    };

    // Close the player
    const handleClosePlayer = () => {
        setCurrentMaterial(null);
    };

  // Handle unlinking a material from the lesson
  const handleUnlink = (material: any) => {
    // Find the link ID for this material
    const lessonMaterial = lessonMaterials.find((lm: any) => lm.material.id === material.id);
    if (lessonMaterial) {
      unlinkMutation.mutate(
        { lessonId, linkId: lessonMaterial.id },
        {
          onSuccess: () => {
            // Do nothing, the query will be invalidated automatically
          },
          onError: (error) => {
            console.error('Failed to unlink material from lesson', error);
          },
        }
      );
    }
  };

  // Handle managing tasks for a material
  const handleManageTasks = (material: any) => {
    setSelectedMaterial(material);
    setIsTaskManagerOpen(true);
  };

  // Handle closing the task manager
  const handleCloseTaskManager = () => {
    setIsTaskManagerOpen(false);
    // Invalidate lesson materials query to update task counts
    queryClient.invalidateQueries({ queryKey: ['lessonMaterials', lessonId] });
  };

  // Empty state component
  const EmptyState = () => (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 4, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'background.default',
        borderRadius: 2,
        textAlign: 'center'
      }}
    >
      <img 
        src="/assets/empty-materials.svg" 
        alt="No materials" 
        style={{ width: '150px', height: '150px', marginBottom: '16px' }}
        onError={(e) => {
          // Fallback if image doesn't exist
          e.currentTarget.style.display = 'none';
        }}
      />
      <Typography variant="h6" gutterBottom>
        No materials yet
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        {isTeacher 
          ? "Add learning materials to help your student practice."
          : "Your teacher hasn't added any materials yet."}
      </Typography>
      {isTeacher && (
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleOpenPicker}
        >
          Add from Library
        </Button>
      )}
    </Paper>
  );

  return (
    <Box sx={{ p: 2 }}>
      <LessonContentAttachments lessonId={lessonId} isTeacher={isTeacher} />

        {meterialsEnabled && (<Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {isTeacher && lessonMaterials.length > 0 && (
        <Button
            variant="outlined" 
            startIcon={<AddIcon />}
            onClick={handleOpenPicker}
          >
            Add from Library
          </Button>
        )}
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : lessonMaterials.length === 0 ? (
        <EmptyState />
      ) : (
        <Grid container spacing={2}>
          {lessonMaterials.map((lessonMaterial: any) => (
            <Grid
              key={lessonMaterial.id}
            >
              <MaterialCard 
                material={lessonMaterial.material}
                onPlay={handlePlay}
                onManageTasks={isTeacher ? handleManageTasks : undefined}
                onUnlink={isTeacher ? handleUnlink : undefined}
                viewMode="grid"
                studentOptionsExternal={studentOptions}
                studentLoadingExternal={studentLoading}
                onStudentQueryChange={setStudentQ}
              />
            </Grid>
          ))}
        </Grid>
      )}


         Media Player Dialog
        <Dialog
            open={!!currentMaterial}
            onClose={handleClosePlayer}
            maxWidth="md"
            fullWidth
        >
            {currentMaterial && currentMaterial.sourceUrl && (
                currentMaterial.type === 'AUDIO' ? (
                    <Box sx={{ p: 3 }}>
                        <audio
                            controls
                            src={resolveUrl(currentMaterial.sourceUrl)}
                            style={{ width: '100%' }}
                            aria-label={currentMaterial.title || 'Audio material'}
                        />
                    </Box>
                ) : (
                    <Box sx={{ position: 'relative', height: 500 }}>
                        <StandaloneMediaPlayer
                            videoId={extractVideoId(currentMaterial.sourceUrl) || ''}
                            startTime={0}
                            endTime={0}
                            onClose={handleClosePlayer}
                        />
                    </Box>
                )
            )}
        </Dialog>

       Material Picker Dialog
      <MaterialPickerDialog
        lessonId={lessonId}
        open={isPickerOpen}
        onClose={handleClosePicker}
      />

       Listening Task Manager
      {selectedMaterial && (selectedMaterial.type === 'VIDEO' || selectedMaterial.type === 'AUDIO') && (
        <ListeningTaskManager
          material={selectedMaterial}
          open={isTaskManagerOpen}
          onClose={handleCloseTaskManager}
        />
      )}

         Grammar Viewer Dialog
        {selectedMaterial && selectedMaterial.type === 'GRAMMAR' && (
            <GrammarViewerDialog
                open={isGrammarDialogOpen}
                onClose={handleCloseGrammarDialog}
                materialId={selectedMaterial.id}
                title={selectedMaterial.title}
            />
        )}
    </Box>)}
    </Box>
  );
};

export default LessonMaterialsTab;
