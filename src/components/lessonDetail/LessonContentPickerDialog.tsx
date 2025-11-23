import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
  IconButton,
  Chip,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import DoneIcon from '@mui/icons-material/Done';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useQuery } from '@tanstack/react-query';
import { getLessonContents } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLessonContentLinks, useLinkLessonContent } from '../../hooks/useLessonContentLinks';
import type { LessonContent } from '../../types/lessonContent';

interface LessonContentPickerDialogProps {
  lessonId: string;
  open: boolean;
  onClose: () => void;
}

const LessonContentPickerDialog: React.FC<LessonContentPickerDialogProps> = ({ lessonId, open, onClose }) => {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const linkMutation = useLinkLessonContent();
  const { data: attached = [] } = useLessonContentLinks(lessonId);

  const { data, isLoading } = useQuery({
    queryKey: ['lesson-contents', { q, page: 0, size: 50, lessonId }],
    queryFn: () => getLessonContents({ ownerId: user!.id, q: q || undefined, status: 'PUBLISHED', page: 0, size: 50 }),
    enabled: open && !!user?.id,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });

  const items: LessonContent[] = useMemo(() => data?.content || data?.items || [], [data]);
  const attachedIds = useMemo(() => new Set((attached || []).map((link: any) => link.lessonContent?.id)), [attached]);

  const handleAttach = (content: LessonContent) => {
    if (!content?.id) return;
    linkMutation.mutate({ lessonId, lessonContentId: content.id });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Attach lesson content</Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close picker">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          size="small"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Lesson Materials"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {isLoading ? (
          <Typography variant="body2" color="text.secondary">Loading…</Typography>
        ) : items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No Lesson Materials found.</Typography>
        ) : (
          <List>
            {items.map((item) => {
              const isAttached = attachedIds.has(item.id);
              return (
                <ListItem
                  key={item.id}
                  secondaryAction={
                    isAttached ? (
                      <Button
                        size="small"
                        color="success"
                        variant="outlined"
                        startIcon={<DoneIcon fontSize="small" />}
                        disabled
                      >
                        Attached
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddCircleOutlineIcon fontSize="small" />}
                        onClick={() => handleAttach(item)}
                        disabled={linkMutation.isPending}
                      >
                        Attach
                      </Button>
                    )
                  }
                >
                  <ListItemText
                    primary={item.title || 'Untitled Lesson Material'}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                        {item.status && <Chip size="small" label={item.status} />}
                        {item.updatedAt && (
                          <Typography variant="caption" color="text.secondary">
                            Updated {new Date(item.updatedAt).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LessonContentPickerDialog;
