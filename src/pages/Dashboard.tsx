import {
    Box,
    Typography,
    Grid,
    Paper,
    Avatar,
    Divider,
    useTheme,
    useMediaQuery,
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import EventNoteIcon from "@mui/icons-material/EventNote";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import MainLayout from "../layout/MainLayout";
import { useAuth } from "../context/AuthContext";
import UpcomingLessonsSection from "../components/dashboard/UpcomingLessonsSection";

const StatCard = ({ title, value, icon }: any) => (
    <Paper elevation={1} sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: "#E3F2FD", color: "#1976d2" }}>{icon}</Avatar>
        <Box>
            <Typography variant="subtitle2" color="text.secondary">
                {title}
            </Typography>
            <Typography variant="h6">{value}</Typography>
        </Box>
    </Paper>
);

const Dashboard = () => {
    const { user } = useAuth();
    const theme = useTheme();

    return (
        <MainLayout>
            <Box sx={{ py: 2 }}>
                <Typography variant="h4" fontWeight={600} gutterBottom>
                    Hello, {user?.name || "Tutor"}!
                </Typography>

                {user?.role === "tutor" && (
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="Students Taught" value="4" icon={<SchoolIcon />} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="Lessons Completed" value="12" icon={<EventNoteIcon />} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="Pending Tasks" value="2" icon={<TaskAltIcon />} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="Progress Score" value="88%" icon={<TrendingUpIcon />} />
                        </Grid>
                    </Grid>
                )}


                {/* Next Lessons Section */}
                <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                    <Grid item xs={12}>
                        <UpcomingLessonsSection />
                    </Grid>
                </Paper>

                {/* Tasks Section */}
                <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                        Tasks
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Typography>📌 Review Essay Draft</Typography>
                    <Typography>📌 Create Quiz</Typography>
                </Paper>
            </Box>
        </MainLayout>
    );
};

export default Dashboard;