import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import LaunchIcon from '@mui/icons-material/Launch';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import { useNavigate } from 'react-router-dom';
import { useLessonContentLinks, useUnlinkLessonContent } from '../../hooks/useLessonContentLinks';
import LessonContentPickerDialog from './LessonContentPickerDialog';
import type { LessonContentLink } from '../../types/lessonContent';

interface LessonContentAttachmentsProps {
  lessonId: string;
  isTeacher: boolean;
}

const LessonContentAttachments: React.FC<LessonContentAttachmentsProps> = ({ lessonId, isTeacher }) => {
  const navigate = useNavigate();
  const { data: links = [], isLoading } = useLessonContentLinks(lessonId);
  const unlinkMutation = useUnlinkLessonContent();
  const [pickerOpen, setPickerOpen] = useState(false);

  const sortedLinks: LessonContentLink[] = useMemo(
    () => [...(links as LessonContentLink[])]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [links],
  );

  const handleUnlink = (linkId: string) => {
    unlinkMutation.mutate({ lessonId, linkId });
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }} variant="outlined">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <LinkIcon color="primary" fontSize="small" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Lesson contents</Typography>
        </Stack>
        {isTeacher && (
          <Button
            size="small"
            startIcon={<LibraryAddIcon />}
            variant="contained"
            onClick={() => setPickerOpen(true)}
          >
            Attach from library
          </Button>
        )}
      </Stack>

      {isLoading ? (
        <Typography variant="body2" color="text.secondary">Loading attachments…</Typography>
      ) : sortedLinks.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {isTeacher ? 'No Materials attached yet.' : 'No Materials attached to this lesson.'}
        </Typography>
      ) : (
        <List dense disablePadding>
          {sortedLinks.map((link) => (
            <ListItem
              key={link.id}
              secondaryAction={(
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Tooltip title="Open in viewer">
                    <IconButton size="small" onClick={() => navigate(`/lesson-contents/${link.lessonContent.id}/view`)}>
                      <LaunchIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {isTeacher && (
                    <Tooltip title="Detach from lesson">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleUnlink(link.id)}
                          disabled={unlinkMutation.isPending}
                        >
                          <RemoveCircleOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              )}
              sx={{ py: 1 }}
            >
              <ListItemText
                primary={link.lessonContent?.title || 'Untitled Lesson Material'}
                secondary={(
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {link.lessonContent?.status && <Chip size="small" label={link.lessonContent.status} />}
                    {link.lessonContent?.updatedAt && (
                      <Typography variant="caption" color="text.secondary">
                        Updated {new Date(link.lessonContent.updatedAt).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                )}
              />
            </ListItem>
          ))}
        </List>
      )}

      <LessonContentPickerDialog
        lessonId={lessonId}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </Paper>
  );
};

export default LessonContentAttachments;
