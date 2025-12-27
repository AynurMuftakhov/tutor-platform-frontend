import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, CircularProgress, Container, Paper, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PreviousLessonNotesTab from '../features/notes/components/PreviousLessonNotesTab';
import { getTeacherByStudentId } from '../services/api';
import PageHeader from "../components/PageHeader";
import {CalendarIcon} from "@mui/x-date-pickers";
import {Notes} from "@mui/icons-material";

const StudentNotesPage: React.FC = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    const queryStudentId = searchParams.get('studentId');
    const resolvedStudentId = useMemo(() => {
        if (queryStudentId) return queryStudentId;
        if (user?.role === 'student') return user.id;
        return null;
    }, [queryStudentId, user?.role, user?.id]);

    const [teacherId, setTeacherId] = useState<string | null>(null);
    const [loadingTeacher, setLoadingTeacher] = useState(false);
    const [teacherError, setTeacherError] = useState<string | null>(null);

    useEffect(() => {
        if (!resolvedStudentId) {
            setTeacherId(null);
            setTeacherError(null);
            return;
        }

        const assumeTutor = user?.role === 'tutor' ? user.id ?? null : null;
        if (assumeTutor) {
            setTeacherId(assumeTutor);
            setTeacherError(null);
            return;
        }

        let cancelled = false;
        const load = async () => {
            try {
                setLoadingTeacher(true);
                setTeacherError(null);
                const response = await getTeacherByStudentId(resolvedStudentId);
                if (cancelled) return;
                const candidate = response?.id ?? response?.teacherId ?? response?.tutorId ?? response?.userId ?? null;
                setTeacherId(typeof candidate === 'string' ? candidate : null);
                if (!candidate) {
                    setTeacherError('No teacher information found.');
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to load teacher for notes', error);
                    setTeacherId(null);
                    setTeacherError('Unable to load teacher information.');
                }
            } finally {
                if (!cancelled) {
                    setLoadingTeacher(false);
                }
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [resolvedStudentId, user?.role, user?.id]);

    if (!resolvedStudentId) {
        return (
            <Container maxWidth="md" sx={{ mt: 6 }}>
                <Alert severity="info">Select a student to view notes.</Alert>
            </Container>
        );
    }

    return (
        <Box
            sx={{
                p: { xs: 2, sm: 2 },
                bgcolor: '#fafbfd',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            <PageHeader
                title="Lesson Notes"
                icon={<Notes />}
                titleColor="primary"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Review notes from previous lessons. Notes are read-only in this view.
            </Typography>
            <Paper sx={{ p: 2, minHeight: 360 }}>
                {loadingTeacher ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2" color="text.secondary">Loading notes…</Typography>
                    </Box>
                ) : !teacherId ? (
                    <Alert severity={teacherError ? 'error' : 'info'}>
                        {teacherError ?? 'Notes are unavailable.'}
                    </Alert>
                ) : (
                    <PreviousLessonNotesTab
                        studentId={resolvedStudentId}
                        teacherId={teacherId}
                        isActive
                    />
                )}
            </Paper>
        </Box>
    );
};

export default StudentNotesPage;
