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
import { useLessonMaterials, useUnlinkMaterialFromLesson } from '../../hooks/useLessonMaterials';
import { useQueryClient } from '@tanstack/react-query';
import StandaloneMediaPlayer from "./StandaloneMediaPlayer";
import {extractVideoId} from "../../utils/videoUtils";

interface LessonMaterialsTabProps {
  lessonId: string;
  isTeacher: boolean;
}

const LessonMaterialsTab: React.FC<LessonMaterialsTabProps> = ({ lessonId, isTeacher }) => {
  const queryClient = useQueryClient();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [isTaskManagerOpen, setIsTaskManagerOpen] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null);

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
  };

  // Handle play button click
    const handlePlay = (material: Material) => {
        setCurrentMaterial(material);
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
    queryClient.invalidateQueries(['lessonMaterials', lessonId]);
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

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
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

      {lessonMaterials.length === 0 ? (
        <EmptyState />
      ) : (
        <Grid container spacing={2}>
          {lessonMaterials.map((lessonMaterial: any) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              lg={3}
              key={lessonMaterial.id}
            >
              <MaterialCard 
                material={lessonMaterial.material}
                onPlay={handlePlay}
                onManageTasks={isTeacher ? handleManageTasks : undefined}
                onUnlink={isTeacher ? handleUnlink : undefined}
                viewMode="grid"
              />
            </Grid>
          ))}
        </Grid>
      )}


        {/* Media Player Dialog */}
        <Dialog
            open={!!currentMaterial}
            onClose={handleClosePlayer}
            maxWidth="md"
            fullWidth
        >
            {currentMaterial && currentMaterial.sourceUrl && (
                <Box sx={{ position: 'relative', height: 500 }}>
                    <StandaloneMediaPlayer
                        videoId={extractVideoId(currentMaterial.sourceUrl) || ''}
                        startTime={0}
                        endTime={0}
                        onClose={handleClosePlayer}
                    />
                </Box>
            )}
        </Dialog>

      {/* Material Picker Dialog */}
      <MaterialPickerDialog
        lessonId={lessonId}
        open={isPickerOpen}
        onClose={handleClosePicker}
      />

      {/* Listening Task Manager */}
      {selectedMaterial && (
        <ListeningTaskManager
          material={selectedMaterial}
          open={isTaskManagerOpen}
          onClose={handleCloseTaskManager}
        />
      )}
    </Box>
  );
};

export default LessonMaterialsTab;