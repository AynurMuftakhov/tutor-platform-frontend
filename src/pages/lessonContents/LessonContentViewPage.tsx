import React from 'react';
import { Box, Button, Stack, Typography, Divider, Container, Paper, Chip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLessonContent } from '../../services/api';
import StudentRenderer from '../../features/lessonContent/student/StudentRenderer';
import type { LessonContent } from '../../types/lessonContent';

const LessonContentViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery<LessonContent>({
    queryKey: ['lesson-content', id],
    queryFn: () => getLessonContent(id!),
    enabled: !!id,
  });

  return (
    <Box p={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5">Lesson Content</Typography>
        <Button variant="text" startIcon={<ArrowBackIcon />} onClick={() => navigate('/lesson-contents')}>
          Back to Library
        </Button>
      </Stack>

      {isLoading && <Typography color="text.secondary">Loading…</Typography>}
      {isError && <Typography color="error">Failed to load lesson content.</Typography>}

      {data && (
        <Container maxWidth="md" disableGutters>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Paper sx={{ p: 4, borderRadius: 2 }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h4">{data.title || 'Untitled composition'}</Typography>
                  <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" alignItems="center">
                    <Chip size="small" label={data.status} color={data.status === 'PUBLISHED' ? 'success' : 'default'} />
                    {data.tags?.map((tag) => (
                      <Chip key={tag} size="small" label={tag} />
                    ))}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      Updated {new Date(data.updatedAt).toLocaleString()}
                    </Typography>
                  </Stack>
                </Box>
                <Divider />
                <StudentRenderer layout={data.layout} content={data.content} />
              </Stack>
            </Paper>
          </motion.div>
        </Container>
      )}
    </Box>
  );
};

export default LessonContentViewPage;
