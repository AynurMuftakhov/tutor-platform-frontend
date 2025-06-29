import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
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
import PostLessonNotes from "../components/lessonDetail/PostLessonNotes";
import LessonTracking from "../components/lessonDetail/LessonTracking";
import LessonMaterialsTab from "../components/lessonDetail/LessonMaterialsTab";
import {Lesson} from "../types/Lesson";
import LessonActions from "../components/lessonDetail/LessonActions";
import {useAuth} from "../context/AuthContext";

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
    const navigate = useNavigate();
    const { user } = useAuth();
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState(location.state?.student || null);
    const [activeTab, setActiveTab] = useState(0);
    const isTeacher = user?.role === "tutor";

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

    if (loading) {
        return <CircularProgress />;
    }

    if (!lesson) {
        return <Typography color="error">Lesson not found</Typography>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
            <Grid item xs={12}>
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
            <Grid item xs={12} sx={{ mb: 3 }}>
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
                    <Grid item xs={12} md={6}>
                        <LessonPlanSection lesson={lesson} isTeacher={isTeacher}/>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <HomeworkSection lesson={lesson} isTeacher={isTeacher}/>
                    </Grid>

                    {/* Notes + Metrics */}
                    <Grid item xs={12} md={6}>
                        <PostLessonNotes lesson={lesson} isTeacher={isTeacher}/>
                    </Grid>
                    <Grid item xs={12} md={6}>
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
