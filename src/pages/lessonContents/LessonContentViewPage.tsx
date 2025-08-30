import React from 'react';
import { Box, Button, Stack, Typography, Divider } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLessonContent } from '../../services/api';
import StudentRenderer from '../../features/lessonContent/student/StudentRenderer';

const LessonContentViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['lesson-content', id],
    queryFn: () => getLessonContent(id!),
    enabled: !!id,
  });

  return (
    <Box p={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Lesson Content</Typography>
        <Button variant="text" onClick={() => navigate('/lesson-contents')}>Back to Library</Button>
      </Stack>

      {isLoading && <Typography color="text.secondary">Loading…</Typography>}
      {isError && <Typography color="error">Failed to load lesson content.</Typography>}

      {data && (
        <Box>
          <Typography variant="h6" gutterBottom>
            {data.title || 'Untitled composition'}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <StudentRenderer layout={data.layout} content={data.content} />
        </Box>
      )}
    </Box>
  );
};

export default LessonContentViewPage;
