import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';

const LessonContentViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <Box p={3} display="flex" flexDirection="column" gap={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" fontWeight={700}>Lesson Content</Typography>
        <Stack direction="row" gap={1}>
          <Button variant="outlined" onClick={() => navigate('/lesson-contents')}>Back to Library</Button>
          <Button variant="contained" onClick={() => navigate(`/lesson-contents/${id}/editor`)}>Open in Editor</Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          borderRadius: 2,
          bgcolor: 'background.paper',
          border: '1px solid rgba(0,0,0,0.08)',
          minHeight: '60vh',
          p: 3
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Read-only responsive presentation of the composition will appear here.
        </Typography>
      </Box>
    </Box>
  );
};

export default LessonContentViewPage;
