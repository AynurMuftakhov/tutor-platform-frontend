import React from 'react';
import {
    Box, Button, Card,
    CardActionArea, CardContent, Chip, CircularProgress, Container, Grid, Typography,
} from '@mui/material';
import { useStudentAssignments } from '../../hooks/useHomeworks';
import { AssignmentDto } from '../../types/homework';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AssignmentCard: React.FC<{ a: AssignmentDto }> = ({ a }) => {
  const total = a.tasks.length;
  const done = a.tasks.filter(t => t.status === 'COMPLETED').length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const due = a.dueAt ? new Date(a.dueAt) : null;

  return (
      <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardActionArea
              component={RouterLink}
              to={`/homework/${a.id}`}
              sx={{ flexGrow: 1, display: 'flex', alignItems: 'stretch' }}
          >
              <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>{a.title}</Typography>
                  {a.instructions && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{a.instructions}</Typography>
                  )}
                  <Box display="flex" alignItems="center" gap={2}>
                      <Box position="relative" display="inline-flex">
                          <CircularProgress variant="determinate" value={pct} />
                          <Box
                              top={0}
                              left={0}
                              bottom={0}
                              right={0}
                              position="absolute"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                          >
                              <Typography variant="caption" component="div" color="text.secondary">
                                  {`${pct}%`}
                              </Typography>
                          </Box>
                      </Box>
                      <Typography variant="body2">{done}/{total} tasks</Typography>
                  </Box>
                  {due && (
                      <Chip size="small" label={`Due: ${due.toLocaleDateString()}`} sx={{ mt: 1 }} />
                  )}
              </CardContent>
          </CardActionArea>
      </Card>
  );
};

const StudentHomeworkPage: React.FC = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const isTeacher = role === 'tutor' || role === 'teacher';
  const { data, isLoading, isError } =  useStudentAssignments(!isTeacher ? (user?.id || '') : '', undefined);

  if (isTeacher) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>This page is for students.</Typography>
        <Button component={RouterLink} to="/t/homework" variant="contained">Go to Teacher Homework</Button>
      </Container>
    );
  }

  if (isLoading) return <Container sx={{ py: 4 }}><Typography>Loading...</Typography></Container>;
  if (isError) return <Container sx={{ py: 4 }}><Typography color="error">Failed to load homework.</Typography></Container>;

  return (
      <Box
          sx={{
              p: { xs: 1, sm: 1 },
              bgcolor: '#fafbfd',
              height: '100dvh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative'
          }}
      >
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 600, color: '#2573ff' }}>Here is your homework</Typography>
      <Grid container spacing={2}>
        {data && data.content.length > 0 ? (
          data.content.map((a: AssignmentDto) => (
            <Grid size ={{xs: 12, sm: 6, md: 4}} key={a.id}>
              <AssignmentCard a={a} />
            </Grid>
          ))
        ) : (
            <Grid size ={{xs: 12}}>
            <Box textAlign="center" py={6}>
              <Typography variant="h6">No homework yet</Typography>
              <Typography variant="body2" color="text.secondary">Your teacher will assign tasks after a lesson.</Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Container>
      </Box>
  );
};

export default StudentHomeworkPage;
