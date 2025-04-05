import React from "react";
import {
    Typography,
    Chip,
    Grid,
    Stack,
    Box,
    Avatar,
    useTheme, Tooltip,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import dayjs from "dayjs";
import { Lesson } from "../../types/Lesson";
import { Student } from "../../pages/MyStudentsPage";
import {ENGLISH_LEVELS} from "../../types/ENGLISH_LEVELS";

interface Props {
    lesson: Lesson;
    student?: Student;
}

const LessonHero: React.FC<Props> = ({ lesson, student }) => {
    const theme = useTheme();
    const levelInfo = student?.level ? ENGLISH_LEVELS[student.level] : null;

    return (
        <Box
            sx={{
                p: { xs: 3, sm: 4 },
                borderRadius: 3,
                background: "linear-gradient(135deg, #f3f6fc, #e6efff)",
                border: "1px solid #dceaff",
                boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.04)",
                mb: 4,
            }}
        >
            <Grid container spacing={3} alignItems="center">
                {/* Left column: avatar + title */}
                <Grid item xs={12} md={8}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                            sx={{
                                width: 56,
                                height: 56,
                                bgcolor: theme.palette.primary.light,
                                fontWeight: 600,
                                fontSize: 20,
                            }}
                        >
                            {student?.name?.charAt(0).toUpperCase() || "?"}
                        </Avatar>

                        <Box>
                            <Typography
                                variant="h5"
                                fontWeight={600}
                                sx={{
                                    color: theme.palette.primary.main,
                                    letterSpacing: "-0.3px",
                                }}
                            >
                                Lesson with {student?.name || "Unnamed Student"}
                            </Typography>
                        </Box>
                    </Stack>
                    {levelInfo && (
                        <Tooltip title={levelInfo.description}>
                            <Chip
                                label={`Level: ${student?.level} (${levelInfo.code})`}
                                size="small"
                                variant="outlined"
                                color="secondary"
                                sx={{ mt: 1 }}
                            />
                        </Tooltip>
                    )}
                </Grid>

                {/* Right column: stats */}
                <Grid item xs={12} md={4}>
                    <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Chip
                                icon={<CalendarTodayIcon />}
                                label={lesson.status}
                                color="primary"
                                variant="filled"
                                size="small"
                            />
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={1}>
                            <AccessTimeIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                                {dayjs(lesson.dateTime).format("DD MMM YYYY, HH:mm")} •{" "}
                                {lesson.duration} mins
                            </Typography>
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={1}>
                            <LocationOnIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                                {lesson.location || "—"}
                            </Typography>
                        </Stack>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};

export default LessonHero;