import {
    Box,
    Typography,
    Grid,
    Paper,
    Avatar,
    Divider,
    useTheme,
    useMediaQuery,
    Button,
    alpha,
    Card,
    CardContent,
    IconButton,
    Tooltip,
    LinearProgress
} from "@mui/material";
import VideoCallButton from "../components/VideoCallButton";
import SchoolIcon from "@mui/icons-material/School";
import EventNoteIcon from "@mui/icons-material/EventNote";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AddTaskIcon from "@mui/icons-material/AddTask";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import MainLayout from "../layout/MainLayout";
import { useAuth } from "../context/AuthContext";
import UpcomingLessonsSection from "../components/dashboard/UpcomingLessonsSection";
import { motion } from "framer-motion";

type StatCardProps = {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
    progress?: number;
};

const StatCard = ({ title, value, icon, color = "primary", progress }: StatCardProps) => {
    const theme = useTheme();
    const mainColor = theme.palette[color].main;
    const lightColor = alpha(mainColor, 0.1);

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
                    borderRadius: 4, 
                    display: 'flex', 
                    flexDirection: 'column',
                    height: '100%',
                    background: `linear-gradient(135deg, white 0%, ${lightColor} 100%)`,
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
                        width: 120,
                        height: 120,
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
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">Progress</Typography>
                            <Typography variant="caption" fontWeight={600} color={mainColor}>{progress}%</Typography>
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
                            value="4"
                            icon={<SchoolIcon />}
                            color="primary"
                            progress={80}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Lessons Completed"
                            value="12"
                            icon={<EventNoteIcon />}
                            color="secondary"
                            progress={65}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Pending Tasks"
                            value="2"
                            icon={<TaskAltIcon />}
                            color="warning"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Progress Score"
                            value="88%"
                            icon={<TrendingUpIcon />}
                            color="success"
                            progress={88}
                        />
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

                {/* Tasks Section */}
                <Grid item xs={12} md={4}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 4,
                                overflow: 'hidden',
                                height: '100%',
                                border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                            }}
                        >
                            <Box
                                sx={{
                                    p: 3,
                                    borderBottom: `1px solid ${theme.palette.divider}`,
                                    background: `linear-gradient(90deg, ${alpha(theme.palette.secondary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.light, 0.02)} 100%)`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <Typography variant="h6" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TaskAltIcon sx={{ color: 'secondary.main' }} /> Tasks
                                </Typography>
                                <Tooltip title="Add new task">
                                    <IconButton
                                        size="small"
                                        sx={{
                                            color: theme.palette.secondary.main,
                                            bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.secondary.main, 0.2)
                                            }
                                        }}
                                    >
                                        <AddTaskIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>

                            <Box sx={{ p: 3 }}>
                                {/* Task Item 1 */}
                                <Box
                                    sx={{
                                        p: 2,
                                        mb: 2,
                                        borderRadius: 3,
                                        border: `1px solid ${theme.palette.divider}`,
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 2,
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.background.default, 0.5),
                                            borderColor: alpha(theme.palette.primary.main, 0.2)
                                        }
                                    }}
                                >
                                    <Avatar
                                        sx={{
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            color: theme.palette.primary.main,
                                            width: 36,
                                            height: 36
                                        }}
                                    >
                                        <EventNoteIcon fontSize="small" />
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            Review Essay Draft
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Due tomorrow • High priority
                                        </Typography>
                                    </Box>
                                    <Tooltip title="Mark as complete">
                                        <IconButton
                                            size="small"
                                            sx={{
                                                color: theme.palette.success.main,
                                                '&:hover': {
                                                    bgcolor: alpha(theme.palette.success.main, 0.1)
                                                }
                                            }}
                                        >
                                            <CheckCircleOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>

                                {/* Task Item 2 */}
                                <Box
                                    sx={{
                                        p: 2,
                                        mb: 2,
                                        borderRadius: 3,
                                        border: `1px solid ${theme.palette.divider}`,
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 2,
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.background.default, 0.5),
                                            borderColor: alpha(theme.palette.primary.main, 0.2)
                                        }
                                    }}
                                >
                                    <Avatar
                                        sx={{
                                            bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                            color: theme.palette.secondary.main,
                                            width: 36,
                                            height: 36
                                        }}
                                    >
                                        <SchoolIcon fontSize="small" />
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            Create Vocabulary Quiz
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Due in 3 days • Medium priority
                                        </Typography>
                                    </Box>
                                    <Tooltip title="Mark as complete">
                                        <IconButton
                                            size="small"
                                            sx={{
                                                color: theme.palette.success.main,
                                                '&:hover': {
                                                    bgcolor: alpha(theme.palette.success.main, 0.1)
                                                }
                                            }}
                                        >
                                            <CheckCircleOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>

                                {/* View All Tasks Button */}
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    sx={{
                                        mt: 2,
                                        borderRadius: 2,
                                        py: 1,
                                        borderColor: alpha(theme.palette.secondary.main, 0.5),
                                        color: theme.palette.secondary.main,
                                        '&:hover': {
                                            borderColor: theme.palette.secondary.main,
                                            bgcolor: alpha(theme.palette.secondary.main, 0.05)
                                        }
                                    }}
                                >
                                    View All Tasks
                                </Button>
                            </Box>
                        </Paper>
                    </motion.div>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
