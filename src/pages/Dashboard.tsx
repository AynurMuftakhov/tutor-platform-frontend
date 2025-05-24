import {
    Box,
    Typography,
    Grid,
    Paper,
    Avatar,
    useTheme,
    Button,
    alpha,
    Tooltip,
    LinearProgress
} from "@mui/material";
import { blue, green, amber } from '@mui/material/colors';
import { useTutorStatistics } from "../hooks/useTutorStatistics";
import VideoCallButton from "../components/VideoCallButton";
import SchoolIcon from "@mui/icons-material/School";
import EventNoteIcon from "@mui/icons-material/EventNote";
import { useAuth } from "../context/AuthContext";
import UpcomingLessonsSection from "../components/dashboard/UpcomingLessonsSection";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

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
                    p: 3,
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

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, position: 'relative', zIndex: 1 }}>
                    <Avatar 
                        sx={{ 
                            bgcolor: lightColor, 
                            color: mainColor,
                            width: 48,
                            height: 48,
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
    const theme = useTheme();
    const isTeacher = user?.role === "tutor";
    const navigate = useNavigate();

    // Fetch tutor statistics if user is a tutor
    const { data: tutorStats, isLoading: isLoadingStats } = useTutorStatistics(
        isTeacher && user?.id ? user.id : ""
    );

    return (
        <Box
            sx={{
                p: { xs: 2, sm: 4 },
                bgcolor: '#fafbfd',
                minHeight: '100vh'
            }}
        >
            {/* Header Section with Greeting */}
            <Box
                component={motion.div}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                sx={{
                    mb: 4,
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: 2
                }}
            >
                <Box>
                    <Typography
                        variant="h3"
                        fontWeight={700}
                        sx={{
                            mb: 1,
                            background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Hello, {user?.name || "Tutor"}!
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Typography>
                </Box>

                {isTeacher && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<EventNoteIcon />}
                            sx={{
                                borderRadius: 3,
                                px: 3,
                                py: 1.2,
                                boxShadow: '0 4px 14px rgba(37, 115, 255, 0.2)',
                                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            }}
                        >
                            Schedule New Lesson
                        </Button>
                        <VideoCallButton 
                            variant="contained"
                            color="secondary"
                            size="medium"
                        />
                    </Box>
                )}
            </Box>

            {/* Stats Cards Section */}
            {user?.role === "tutor" && (
                <Grid container spacing={3} sx={{ mb: 5 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Students Taught"
                            value={isLoadingStats ? "..." : tutorStats?.taughtStudents.toString() || "0"}
                            icon={<SchoolIcon />}
                            color="primary"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
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
            <Grid container spacing={4}>
                {/* Next Lessons Section */}
                <Grid item xs={12} md={8}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <Paper
                            elevation={0}
                            sx={{
                                p: 0,
                                borderRadius: 4,
                                overflow: 'hidden',
                                height: '100%',
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                            }}
                        >
                            <Box
                                sx={{
                                    p: 3,
                                    borderBottom: `1px solid ${theme.palette.divider}`,
                                    background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.light, 0.02)} 100%)`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <Typography variant="h6" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <EventNoteIcon sx={{ color: 'primary.main' }} /> Upcoming Lessons
                                </Typography>
                                <Tooltip title="View all lessons">
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => navigate(`/lessons`)}
                                        sx={{
                                            borderRadius: 2,
                                            borderColor: theme.palette.primary.main,
                                            color: theme.palette.primary.main,
                                            '&:hover': {
                                                borderColor: theme.palette.primary.dark,
                                                backgroundColor: alpha(theme.palette.primary.main, 0.05)
                                            }
                                        }}
                                    >
                                        View All
                                    </Button>
                                </Tooltip>
                            </Box>
                            <Box sx={{ p: 3 }}>
                                <UpcomingLessonsSection />
                            </Box>
                        </Paper>
                    </motion.div>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
