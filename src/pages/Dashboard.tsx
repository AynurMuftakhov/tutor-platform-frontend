import {
    Box,
    Typography,
    Grid,
    Paper,
    Avatar,
    useTheme,
    alpha,
    LinearProgress,
    Alert
} from "@mui/material";
import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { useTutorStatistics } from "../hooks/useTutorStatistics";
import SchoolIcon from "@mui/icons-material/School";
import EventNoteIcon from "@mui/icons-material/EventNote";
import { useAuth } from "../context/AuthContext";
import UpcomingLessonsSection from "../components/dashboard/UpcomingLessonsSection";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDashboardSummary } from "../hooks/useDashboardSummary";
import { updateLesson } from "../services/api";
import StudentNextLessonCard from "../components/dashboard/student/NextLessonCard";
import StudentUpcomingLessonsWidget from "../components/dashboard/student/UpcomingLessonsWidget";
import StudentHomeworkDueWidget from "../components/dashboard/student/HomeworkDueWidget";
import StudentProgressSnapshotWidget from "../components/dashboard/student/ProgressSnapshotWidget";
import TutorActionQueueWidget from "../components/dashboard/tutor/ActionQueueWidget";
import TutorTodayAgendaWidget from "../components/dashboard/tutor/TodayAgendaWidget";

type StatCardProps = {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
    progress?: number;
    progressLabel?: string;
};

const StatCard = ({ title, value, icon, color = "primary", progress, progressLabel }: StatCardProps) => {
    const theme = useTheme();
    const mainColor = theme.palette[color].main;
    const lightColor = alpha(mainColor, 0.08)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    borderRadius: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    background: `linear-gradient(135deg, #F7F9FC 0%, ${lightColor} 100%)`,
                    border: `1px solid ${alpha(mainColor, 0.1)}`,
                    boxShadow: `0 4px 20px ${alpha(mainColor, 0.1)}`,
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: -20,
                        right: -20,
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        background: lightColor,
                        zIndex: 0
                    }}
                />

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, position: 'relative', zIndex: 1 }}>
                    <Avatar
                        sx={{
                            bgcolor: lightColor,
                            color: mainColor,
                            height: 44,
                            width: 44,
                            boxShadow: `0 4px 12px ${alpha(mainColor, 0.2)}`
                        }}
                    >
                        {icon}
                    </Avatar>
                    <Typography
                        variant="h4"
                        fontWeight={700}
                        sx={{
                            color: mainColor,
                            textShadow: `0 2px 4px ${alpha(mainColor, 0.2)}`
                        }}
                    >
                        {value}
                    </Typography>
                </Box>

                <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    sx={{
                        mb: 1,
                        position: 'relative',
                        zIndex: 1
                    }}
                >
                    {title}
                </Typography>

                {progress !== undefined && (
                    <Box sx={{ mt: 'auto', position: 'relative', zIndex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                            <Typography variant="caption" align="center" color="text.secondary">
                                {progressLabel ? `${progress}% ${progressLabel}` : `Progress: ${progress}%`}
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: alpha(mainColor, 0.2),
                                '& .MuiLinearProgress-bar': {
                                    bgcolor: mainColor
                                }
                            }}
                        />
                    </Box>
                )}
            </Paper>
        </motion.div>
    );
};

const Dashboard = () => {
    const { user } = useAuth();
    const isTeacher = user?.role === "tutor";
    const navigate = useNavigate();

    // Fetch tutor statistics if user is a tutor
    const { data: tutorStats, isLoading: isLoadingStats } = useTutorStatistics(
        isTeacher && user?.id ? user.id : ""
    );

    const { data: dashboardSummary, isLoading: isDashboardSummaryLoading, refetch: refetchDashboardSummary } = useDashboardSummary();
    const [agendaActionLessonId, setAgendaActionLessonId] = useState<string | null>(null);

    const criticalWarnings = (dashboardSummary?.warnings || []).filter(
        warning => warning === "NEXT_LESSON_NULL_BUT_UPCOMING_PRESENT" || warning.startsWith("CRITICAL_")
    );

    const updateAgendaLessonStatus = async (lessonId: string, status: "IN_PROGRESS" | "COMPLETED") => {
        try {
            setAgendaActionLessonId(lessonId);
            await updateLesson(lessonId, { status });
            await refetchDashboardSummary();
        } catch (error) {
            console.error("Failed to update lesson status from dashboard agenda", error);
        } finally {
            setAgendaActionLessonId(null);
        }
    };

    return (
        <Box
            sx={{
                p: { xs: 2, sm: 3, md: 2 },
                bgcolor: '#fafbfd',
                minHeight: '100%',
                width: '100%',
                overflowX: 'hidden',
                overflow: 'hidden',
                position: 'relative',
            }}
        >

        <PageHeader
            title={`Hello, ${user?.name || "Tutor"}!`}
            titleColor="gradient"
            subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            mb={isTeacher ? 3 : 4}
        />

            {criticalWarnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Some dashboard data may be incomplete right now.
                </Alert>
            )}

            {/* Stats Cards Section */}
            {user?.role === "tutor" && (
                <Grid container spacing={2} sx={{ mb: 3 }} wrap="wrap">
                    <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                        <StatCard
                            title="Students Taught"
                            value={isLoadingStats ? "..." : tutorStats?.taughtStudents.toString() || "0"}
                            icon={<SchoolIcon />}
                            color="primary"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                        {(() => {
                            const completedLessons = tutorStats?.completedLessons || 0;
                            const monthlyGoal = 20;
                            const progressPercentage = Math.min(100, Math.round((completedLessons / monthlyGoal) * 100));

                            return (
                                <StatCard
                                    title="Lessons Completed"
                                    value={isLoadingStats ? "..." : completedLessons.toString()}
                                    icon={<EventNoteIcon />}
                                    color="secondary"
                                    progress={progressPercentage}
                                    progressLabel="of monthly goal"
                                />
                            );
                        })()}
                    </Grid>
                </Grid>
            )}

            {/* Main Content Grid */}
            {isTeacher ? (
                <Grid container spacing={{ xs: 2, md: 2.5 }} alignItems="flex-start">
                    <Grid size={{ xs: 12, md: 8 }} order={{ xs: 1, md: 1 }}>
                        <TutorTodayAgendaWidget
                            summary={dashboardSummary}
                            loading={isDashboardSummaryLoading}
                            actionLoadingLessonId={agendaActionLessonId}
                            onOpenLesson={(lessonId) => navigate(`/lessons/${lessonId}`)}
                            onMarkStarted={(lessonId) => updateAgendaLessonStatus(lessonId, "IN_PROGRESS")}
                            onMarkCompleted={(lessonId) => updateAgendaLessonStatus(lessonId, "COMPLETED")}
                            onViewAllLessons={() => navigate(`/lessons`)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }} order={{ xs: 2, md: 2 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <Box sx={{ order: { xs: 1, md: 2 } }}>
                                <TutorActionQueueWidget
                                    summary={dashboardSummary}
                                    loading={isDashboardSummaryLoading}
                                    onOpenHomeworkReview={() => navigate(`/t/homework?filter=toReview`)}
                                    onOpenMissingNotes={() => navigate(`/lessons?filter=missingNotes`)}
                                    onOpenStudentsWithoutNext={() => navigate(`/my-students?filter=noUpcoming`)}
                                />
                            </Box>
                            <Box sx={{ order: { xs: 2, md: 1 } }}>
                                <UpcomingLessonsSection
                                    lessons={dashboardSummary?.upcomingLessons || []}
                                    loading={isDashboardSummaryLoading}
                                    onOpenLesson={(lessonId) => navigate(`/lessons/${lessonId}`)}
                                    onViewAllLessons={() => navigate(`/lessons`)}
                                />
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            ) : (
                <Grid container spacing={4}>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <StudentNextLessonCard
                                summary={dashboardSummary}
                                loading={isDashboardSummaryLoading}
                                onOpenLesson={(lessonId) => navigate(`/lessons/${lessonId}`)}
                                onJoinLesson={(lessonId) =>
                                    navigate('/video-call', {
                                        state: {
                                            identity: user?.id,
                                            roomName: `lesson-${lessonId}`,
                                        },
                                    })
                                }
                                onViewAllLessons={() => navigate(`/lessons?status=SCHEDULED,RESCHEDULED,IN_PROGRESS&windowDays=7`)}
                                onMessageTutor={() => navigate(`/notes`)}
                            />
                            <StudentUpcomingLessonsWidget
                                summary={dashboardSummary}
                                loading={isDashboardSummaryLoading}
                                onOpenLesson={(lessonId) => navigate(`/lessons/${lessonId}`)}
                                onViewAllLessons={() => navigate(`/lessons?status=SCHEDULED,RESCHEDULED,IN_PROGRESS&windowDays=7`)}
                            />
                            <StudentHomeworkDueWidget
                                summary={dashboardSummary}
                                loading={isDashboardSummaryLoading}
                                onOpenHomework={() => navigate(`/homework?focus=due`)}
                            />
                            <StudentProgressSnapshotWidget
                                summary={dashboardSummary}
                                loading={isDashboardSummaryLoading}
                            />
                        </Box>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};

export default Dashboard;
