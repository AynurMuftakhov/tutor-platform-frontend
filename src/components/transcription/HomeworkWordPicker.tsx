import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Typography,
  Box,
  Divider,
  Stack,
  Chip,
  Button,
} from '@mui/material';
import { useStudentAssignments, useAssignmentById } from '../../hooks/useHomeworks';
import { useDictionary } from '../../hooks/useVocabulary';
import type { AssignmentListItemDto, TaskDto } from '../../types/homework';
import type { VocabularyWord } from '../../types';

const DEFAULT_LOOKBACK_DAYS = 30;
const EMPTY_ARRAY: any[] = [];

type HomeworkWordPickerProps = {
  open: boolean;
  studentId?: string;
  currentAssignmentId?: string;
  onClose: () => void;
  onApply: (args: { words: string[]; assignmentId: string; assignmentTitle?: string }) => void;
};

function isoDateLabel(iso?: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function dedupeWordsPreserveOrder(words: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of words) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function collectWordsFromTask(task: TaskDto, lookup: Map<string, VocabularyWord>) {
  const words: string[] = [];
  const contentRef = (task.contentRef || {}) as Record<string, unknown>;
  const rawIds = Array.isArray((contentRef as any).wordIds) ? (contentRef as any).wordIds : [];
  rawIds.forEach((id: unknown) => {
    if (typeof id !== 'string') return;
    const entry = lookup.get(id);
    if (entry?.text) words.push(entry.text);
  });
  return words;
}

export const HomeworkWordPicker: React.FC<HomeworkWordPickerProps> = ({
  open,
  studentId,
  currentAssignmentId,
  onClose,
  onApply,
}) => {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  const recentRange = useMemo(() => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const past = new Date(now.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    return { from: past.toISOString().slice(0, 10), to };
  }, []);

  const { data: wordsPage, isLoading: vocabLoading } = useDictionary({ size: 1000 }, { enabled: open });
  const vocabWords = wordsPage?.content ?? EMPTY_ARRAY;
  const vocabLookup = useMemo(() => {
    const map = new Map<string, VocabularyWord>();
    vocabWords.forEach((word) => {
      if (word?.id) map.set(word.id, word);
    });
    return map;
  }, [vocabWords]);

  const {
    data: assignmentsPage,
    isLoading: assignmentsLoading,
    isError: assignmentsError,
    error: assignmentsErrorObj,
  } = useStudentAssignments(studentId ?? '', {
    status: 'all',
    includeOverdue: true,
    sort: 'assigned_desc',
    size: 20,
    from: recentRange.from,
    to: recentRange.to,
    view: 'summary',
    type: 'VOCAB',
  });

  const assignments = useMemo<AssignmentListItemDto[]>(() => assignmentsPage?.content ?? [], [assignmentsPage]);

  useEffect(() => {
    if (!open) return;
    if (assignments.length === 0) {
      setSelectedAssignmentId(null);
      return;
    }
    if (currentAssignmentId && assignments.some((a) => a.id === currentAssignmentId)) {
      setSelectedAssignmentId(currentAssignmentId);
      return;
    }
    setSelectedAssignmentId((prev) => {
      if (prev && assignments.some((a) => a.id === prev)) return prev;
      return assignments[0]?.id ?? null;
    });
  }, [open, assignments, currentAssignmentId]);

  const assignmentQueryEnabled = open && !!selectedAssignmentId;
  const {
    data: selectedAssignment,
    isLoading: assignmentLoading,
    isFetching: assignmentFetching,
    isError: assignmentError,
    error: assignmentErrorObj,
  } = useAssignmentById(assignmentQueryEnabled ? selectedAssignmentId ?? undefined : undefined, {
    studentId,
    enabled: assignmentQueryEnabled,
  });

  const selectedAssignmentVocabTasks = useMemo(() => {
    if (!selectedAssignment) return [];
    const tasks = Array.isArray(selectedAssignment.tasks) ? selectedAssignment.tasks : [];
    return tasks
      .filter((task) => task.type === 'VOCAB')
      .map((task) => ({
        task,
        words: collectWordsFromTask(task, vocabLookup),
      }));
  }, [selectedAssignment, vocabLookup]);

  const combinedHomeworkWords = useMemo(
    () => dedupeWordsPreserveOrder(selectedAssignmentVocabTasks.flatMap((item) => item.words)),
    [selectedAssignmentVocabTasks],
  );

  const assignmentsErrorMessage =
    assignmentsErrorObj instanceof Error ? assignmentsErrorObj.message : undefined;
  const assignmentErrorMessage =
    assignmentErrorObj instanceof Error ? assignmentErrorObj.message : undefined;

  const previewLoading = assignmentLoading || assignmentFetching || (vocabLoading && open);

  const handleApply = () => {
    if (!selectedAssignment || combinedHomeworkWords.length === 0) return;
    onApply({
      words: combinedHomeworkWords,
      assignmentId: selectedAssignment.id,
      assignmentTitle: selectedAssignment.title,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Pick focus words from homework</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {!studentId ? (
          <Typography variant="body2" color="text.secondary">
            Select a student to load their recent homework vocabulary.
          </Typography>
        ) : assignmentsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : assignmentsError ? (
          <Typography color="error" variant="body2">
            {assignmentsErrorMessage ?? 'Failed to load homework. Try again in a moment.'}
          </Typography>
        ) : assignments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No homework found in the last {DEFAULT_LOOKBACK_DAYS} days.
          </Typography>
        ) : (
          <>
            <Typography variant="subtitle2" color="text.secondary">
              Recent assignments
            </Typography>
            <List
              dense
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                maxHeight: 220,
                overflowY: 'auto',
              }}
            >
              {assignments.map((assignment) => {
                const assignedLabel = isoDateLabel(assignment.createdAt);
                const dueLabel = isoDateLabel(assignment.dueAt);
                const secondaryParts = [
                  assignedLabel ? `Assigned ${assignedLabel}` : null,
                  dueLabel ? `Due ${dueLabel}` : null,
                ].filter(Boolean);
                return (
                  <ListItemButton
                    key={assignment.id}
                    selected={assignment.id === selectedAssignmentId}
                    onClick={() => setSelectedAssignmentId(assignment.id)}
                    sx={{ alignItems: 'flex-start' }}
                  >
                    <ListItemText
                      primary={assignment.title || 'Untitled homework'}
                      secondary={
                        secondaryParts.length ? (
                          <Typography component="span" variant="caption" color="text.secondary">
                            {secondaryParts.join(' • ')}
                          </Typography>
                        ) : undefined
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
            <Divider />
            <Box>
              {previewLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : !selectedAssignment ? (
                <Typography variant="body2" color="text.secondary">
                  Select a homework to preview vocabulary tasks.
                </Typography>
              ) : assignmentError ? (
                <Typography color="error" variant="body2">
                  {assignmentErrorMessage ?? 'Failed to load homework details.'}
                </Typography>
              ) : selectedAssignmentVocabTasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  This homework has no vocabulary tasks yet.
                </Typography>
              ) : (
                <Stack spacing={1.2}>
                  {selectedAssignmentVocabTasks.map(({ task, words }) => (
                    <Box
                      key={task.id}
                      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ mb: 0.5 }}
                      >
                        <Typography variant="subtitle2" noWrap>
                          {task.title || 'Untitled task'}
                        </Typography>
                      </Stack>
                      {words.length > 0 ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {words.map((word) => (
                            <Chip key={`${task.id}-${word}`} label={word} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No vocabulary words linked to this task yet.
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleApply}
          variant="contained"
          disabled={!selectedAssignment || combinedHomeworkWords.length === 0}
        >
          Use {combinedHomeworkWords.length || ''} words
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HomeworkWordPicker;
