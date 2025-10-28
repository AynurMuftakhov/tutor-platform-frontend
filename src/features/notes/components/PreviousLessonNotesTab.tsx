import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Stack,
    Typography
} from '@mui/material';
import dayjs from 'dayjs';
import useOnlineStatus from '../../../hooks/useOnlineStatus';
import { usePreviousLessonNotes } from '../hooks/usePreviousLessonNotes';
import { useLessonNote } from '../hooks/useLessonNote';
import type { LessonNotesListItem } from '../../../types/lessonNotes';

interface PreviousLessonNotesTabProps {
    studentId?: string;
    teacherId?: string;
    isActive: boolean;
    initialLessonId?: string;
    onSelectLesson?: (lessonId: string | null) => void;
}

const formatSchedule = (iso: string) => dayjs(iso).format('MMM D, YYYY');

const PreviousLessonNotesTab: React.FC<PreviousLessonNotesTabProps> = ({
    studentId,
    teacherId,
    isActive,
    initialLessonId,
    onSelectLesson
}) => {
    const online = useOnlineStatus();
    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const [items, setItems] = useState<LessonNotesListItem[]>([]);
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(initialLessonId ?? null);
    const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

    useEffect(() => {
        setCursor(undefined);
        setItems([]);
        setSelectedLessonId(initialLessonId ?? null);
    }, [studentId, teacherId, initialLessonId]);

    const listQuery = usePreviousLessonNotes({
        studentId,
        teacherId,
        cursor,
        enabled: Boolean(studentId && teacherId && isActive)
    });

    useEffect(() => {
        if (!listQuery.data) {
            return;
        }
        setNextCursor(listQuery.data.nextCursor);

        setItems((prev) => {
            if (!cursor) {
                return [...listQuery.data!.items];
            }
            const incoming = listQuery.data.items.filter((item) => !prev.some((existing) => existing.lessonId === item.lessonId));
            return [...prev, ...incoming];
        });
    }, [listQuery.data, cursor]);

    useEffect(() => {
        if (!isActive) {
            return;
        }
        if (!initialLessonId || selectedLessonId) {
            return;
        }
        setSelectedLessonId(initialLessonId);
    }, [initialLessonId, selectedLessonId, isActive]);

    const {
        note,
        cachedNote,
        source,
        isLoading: noteLoading,
        error: noteError
    } = useLessonNote({
        lessonId: selectedLessonId ?? undefined,
        enabled: Boolean(selectedLessonId && isActive)
    });

    const noItems = items.length === 0 && listQuery.isFetched && !listQuery.isLoading;

    const handleSelect = (lessonId: string) => {
        setSelectedLessonId(lessonId);
        onSelectLesson?.(lessonId);
    };

    const handleLoadMore = () => {
        if (nextCursor) {
            setCursor(nextCursor);
        }
    };

    const viewerContent = useMemo(() => {
        if (!selectedLessonId) {
            return (
                <Typography variant="body2" color="text.secondary">
                    Select a lesson to view its notes.
                </Typography>
            );
        }

        if (noteLoading) {
            return <CircularProgress size={18} />;
        }

        if (note) {
            return (
                <Typography
                    component="div"
                    variant="body2"
                    sx={{ whiteSpace: 'pre-wrap' }}
                >
                    {note.content}
                </Typography>
            );
        }

        if (source === 'cache' && cachedNote) {
            return (
                <Typography
                    component="div"
                    variant="body2"
                    sx={{ whiteSpace: 'pre-wrap' }}
                >
                    {cachedNote.content}
                </Typography>
            );
        }

        if (!online) {
            return (
                <Typography variant="body2" color="text.secondary">
                    No offline copy available.
                </Typography>
            );
        }

        return (
            <Typography variant="body2" color="text.secondary">
                No notes for this lesson.
            </Typography>
        );
    }, [selectedLessonId, noteLoading, note, cachedNote, source, online]);

    return (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ height: '100%' }}>
            <Box
                sx={{
                    flexBasis: { xs: '100%', md: '40%' },
                    maxHeight: { xs: 240, md: '100%' },
                    overflowY: 'auto',
                    borderRadius: 1,
                    border: (theme) => `1px solid ${theme.palette.divider}`
                }}
                aria-label="Previous notes list"
            >
                {listQuery.isError ? (
                    <Stack alignItems="center" justifyContent="center" sx={{ py: 4, px: 2 }}>
                        <Alert severity="warning" sx={{ width: '100%' }}>
                            Unable to load previous notes.
                        </Alert>
                    </Stack>
                ) : listQuery.isLoading ? (
                    <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
                        <CircularProgress size={20} />
                    </Stack>
                ) : noItems ? (
                    <Stack alignItems="center" justifyContent="center" sx={{ py: 4, px: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            No lessons with notes yet.
                        </Typography>
                    </Stack>
                ) : (
                    <List dense disablePadding>
                        {items.map((item) => {
                            const selected = item.lessonId === selectedLessonId;
                            return (
                                <ListItem key={item.lessonId} disablePadding>
                                    <ListItemButton selected={selected} onClick={() => handleSelect(item.lessonId)}>
                                        <ListItemText
                                            primary={formatSchedule(item.scheduledAt)}
                                            secondary={
                                                item.updatedAt
                                                    ? `Updated ${dayjs(item.updatedAt).format('MMM D, HH:mm')}`
                                                    : undefined
                                            }
                                            primaryTypographyProps={{ variant: 'body2' }}
                                            secondaryTypographyProps={{ variant: 'caption' }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>
                )}
                {nextCursor && (
                    <>
                        <Divider />
                        <Box sx={{ p: 1.5 }}>
                            <Button
                                variant="outlined"
                                fullWidth
                                onClick={handleLoadMore}
                                disabled={listQuery.isFetching}
                            >
                                {listQuery.isFetching ? 'Loading…' : 'Load more'}
                            </Button>
                        </Box>
                    </>
                )}
            </Box>

            <Box
                sx={{
                    flex: 1,
                    borderRadius: 1,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    p: 2,
                    minHeight: 240,
                    overflowY: 'auto'
                }}
                aria-live="polite"
            >
                {noteError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {noteError.status === 403 && 'You don\'t have access to edit this lesson\'s notes.'}
                        {noteError.status === 404 && 'Lesson not found.'}
                        {noteError.status !== 403 && noteError.status !== 404 && 'Unable to load notes.'}
                    </Alert>
                )}
                {selectedLessonId && (note || cachedNote) && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        {note?.updatedAt
                            ? `Updated ${dayjs(note.updatedAt).format('MMM D, HH:mm')}`
                            : cachedNote?.updatedAt
                                ? `Offline copy from ${dayjs(cachedNote.updatedAt).format('MMM D, HH:mm')}`
                                : null}
                    </Typography>
                )}
                {viewerContent}
            </Box>
        </Stack>
    );
};

export default PreviousLessonNotesTab;
