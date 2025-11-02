import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
    Container,
    CircularProgress,
    Typography,
    Grid,
    Button,
    Box,
    Tabs,
    Tab,
    Paper
} from "@mui/material";
import { Videocam as VideoIcon } from "@mui/icons-material";
import {fetchUserById, getLessonById, updateLesson} from "../services/api";

import LessonHero from "../components/lessonDetail/LessonHero";
import LessonPlanSection from "../components/lessonDetail/LessonPlanSection";
import HomeworkSection from "../components/lessonDetail/HomeworkSection";
import LessonTracking from "../components/lessonDetail/LessonTracking";
import LessonMaterialsTab from "../components/lessonDetail/LessonMaterialsTab";
import {Lesson} from "../types/Lesson";
import LessonActions from "../components/lessonDetail/LessonActions";
import {useAuth} from "../context/AuthContext";
import { LessonNotesPanel } from "../features/notes";
import { useRtc } from "../context/RtcContext";

// Tab panel component
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel = (props: TabPanelProps) => {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`lesson-tabpanel-${index}`}
            aria-labelledby={`lesson-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ py: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
};

const LessonDetailPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { dailyCall, lessonId: rtcLessonId } = useRtc();
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState(location.state?.student || null);
    const [activeTab, setActiveTab] = useState(0);
    const isTeacher = user?.role === "tutor";
    const notesViewParam = searchParams.get('notes');
    const previousLessonParam = searchParams.get('lid');
    const [selectedPreviousLessonId, setSelectedPreviousLessonId] = useState<string | null>(previousLessonParam);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    useEffect(() => {
        const fetchLesson = async () => {
            try {
                const lessonData = await getLessonById(id as string);
                setLesson(lessonData);

                // Fetch student if not already passed from location.state
                if (!student && lessonData?.studentId) {
                    const fetchedStudent = await fetchUserById(lessonData.studentId);
                    setStudent(fetchedStudent);
                }
            } catch (e) {
                console.error("Failed to fetch lesson", e);
            } finally {
                setLoading(false);
            }
        };

        fetchLesson();
    }, [id, student]);

    useEffect(() => {
        setSelectedPreviousLessonId(previousLessonParam);
    }, [previousLessonParam]);

    const notesTab = useMemo(() => (notesViewParam === 'previous' ? 'previous' : 'current'), [notesViewParam]);

    const canEditNotes = useMemo(() => {
        if (!lesson || !user) {
            return false;
        }
        return user.id === lesson.tutorId || user.id === lesson.studentId;
    }, [lesson, user]);

    const [callActive, setCallActive] = useState(false);

    useEffect(() => {
        if (!dailyCall) {
            setCallActive(false);
            return;
        }

        const computeState = () => {
            try {
                const state = dailyCall.meetingState?.();
                setCallActive(state === 'joined-meeting');
            } catch {
                setCallActive(false);
            }
        };

        const handleJoined = () => setCallActive(true);
        const handleLeft = () => setCallActive(false);

        computeState();

        dailyCall.on('joined-meeting', handleJoined);
        dailyCall.on('left-meeting', handleLeft);

        return () => {
            try { dailyCall.off('joined-meeting', handleJoined); } catch { /* noop */ }
            try { dailyCall.off('left-meeting', handleLeft); } catch { /* noop */ }
        };
    }, [dailyCall]);

    const notesDataMode = useMemo(() => {
        if (!lesson) return 'offline';
        if (!callActive) return 'offline';
        if (!rtcLessonId) return 'offline';
        return rtcLessonId === lesson.id ? 'realtime' : 'offline';
    }, [lesson, callActive, rtcLessonId]);

    const notesCall = notesDataMode === 'realtime' ? dailyCall : null;

    const applyNotesSearchParams = (tab: 'current' | 'previous', lessonId: string | null = null) => {
        const params = new URLSearchParams(searchParams);
        if (tab === 'previous') {
            params.set('notes', 'previous');
            if (lessonId) {
                params.set('lid', lessonId);
            } else {
                params.delete('lid');
            }
        } else {
            params.delete('notes');
            params.delete('lid');
        }
        setSearchParams(params, { replace: true });
    };

    const handleNotesTabSwitch = (tab: 'current' | 'previous') => {
        if (tab === 'current') {
            setSelectedPreviousLessonId(null);
        }
        applyNotesSearchParams(tab, tab === 'previous' ? selectedPreviousLessonId : null);
    };

    const handlePreviousLessonSelect = (lessonId: string | null) => {
        setSelectedPreviousLessonId(lessonId);
        applyNotesSearchParams('previous', lessonId);
    };

    if (loading) {
        return <CircularProgress />;
    }

    if (!lesson) {
        return <Typography color="error">Lesson not found</Typography>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
            <Grid size={{xs:12}}>
                {user?.role === "tutor" && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            flexDirection: 'row',
                            gap: 1,
                            mb: 2,
                            justifyContent: { xs: 'flex-start', sm: 'flex-start' }
                        }}
                    >
                        <LessonActions
                            currentStatus={lesson.status}
                            currentDatetime={lesson.dateTime}
                            lessonId={lesson.id}
                            studentId={lesson.studentId}
                            onChangeStatus={async (newStatus, extraData) => {
                                const updatedFields: Partial<Lesson> = {
                                    status: newStatus,
                                };

                                if (extraData?.newDate) {
                                    updatedFields.dateTime = extraData.newDate;
                                }

                                try {
                                    await updateLesson(lesson.id, updatedFields);
                                    setLesson((prev) => prev ? { ...prev, ...updatedFields } : prev);
                                } catch (error) {
                                    console.error("Failed to update lesson", error);
                                    // Optional: Show toast/snackbar
                                }
                            }}
                        />
                    </Box>
                )}

                {user?.role === "student" && lesson.status === "IN_PROGRESS" && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<VideoIcon />}
                        onClick={() => {
                            navigate('/video-call', {
                                state: {
                                    identity: user.id,
                                    roomName: `lesson-${lesson.id}`,
                                },
                            });
                        }}
                        sx={{ mb: 2 }}
                    >
                        Join Lesson
                    </Button>
                )}
            </Grid>

            {/* Header */}
            <Grid size={{xs:12}} sx={{ mb: 3 }}>
                <LessonHero
                    lesson={lesson}
                    student={student}
                    onUpdated={(updated) => {
                        setLesson((prev): Lesson | null => {
                            if (!prev) return prev;

                            const safePrev = prev as Lesson;
                            return { ...safePrev, ...updated };
                        });
                    }}
                />
            </Grid>

            {/* Tabs */}
            <Paper sx={{ width: '100%', mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                    aria-label="lesson tabs"
                >
                    <Tab label="Overview" id="lesson-tab-0" aria-controls="lesson-tabpanel-0" />
                    <Tab label="Materials" id="lesson-tab-1" aria-controls="lesson-tabpanel-1" />
                    <Tab label="Attendance" id="lesson-tab-2" aria-controls="lesson-tabpanel-2" />
                </Tabs>
            </Paper>

            {/* Tab Panels */}
            <TabPanel value={activeTab} index={0}>
                <Grid container spacing={3}>
                    {/* Plan + Homework */}
                    <Grid  size={{xs:12, md:6}}>
                        <LessonPlanSection lesson={lesson} isTeacher={isTeacher}/>
                    </Grid>
                    <Grid size={{xs:12, md:6}}>
                        <HomeworkSection lesson={lesson} isTeacher={isTeacher}/>
                    </Grid>

                    {/* Notes + Metrics */}
                    <Grid size={{xs:12, md:5}} sx={{ display: 'flex' }}>
                        <Box sx={{ flex: 1 }}>
                            <LessonNotesPanel
                                lessonId={lesson.id}
                                lessonTitle={lesson.title || 'Lesson Notes'}
                                studentId={lesson.studentId}
                                teacherId={lesson.tutorId}
                                canEdit={canEditNotes}
                                dataMode={notesDataMode}
                                call={notesCall}
                                senderId={user?.id}
                                initialTab={notesTab}
                                initialPreviousLessonId={selectedPreviousLessonId ?? undefined}
                                onTabChange={handleNotesTabSwitch}
                                onSelectPreviousLesson={handlePreviousLessonSelect}
                                pollIntervalMs={notesDataMode === 'realtime' ? undefined : 15000}
                                showPreviousTab={false}
                            />
                        </Box>
                    </Grid>
                    <Grid size={{xs:12, md:7}}>
                        <LessonTracking lesson={lesson}/>
                    </Grid>
                </Grid>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
                <LessonMaterialsTab lessonId={lesson.id} isTeacher={isTeacher} />
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
                <Box sx={{ p: 2 }}>
                    <Typography variant="h5" gutterBottom>Attendance</Typography>
                    <Typography variant="body1">
                        Attendance tracking will be implemented in a future update.
                    </Typography>
                </Box>
            </TabPanel>
        </Container>
    )
};

export default LessonDetailPage;
