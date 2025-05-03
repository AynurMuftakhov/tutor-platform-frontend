import React from "react";
import {
    Typography,
    Grid,
    Stack,
    Box,
    Avatar,
    useTheme,
    Chip,
    Tooltip,
} from "@mui/material";
import dayjs from "dayjs";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { Lesson } from "../../types/Lesson";
import { Student } from "../../pages/MyStudentsPage";
import { ENGLISH_LEVELS } from "../../types/ENGLISH_LEVELS";

interface Props {
    lesson: Lesson;
    student?: Student;
    onUpdated?: (updated: Partial<Lesson>) => void;
}

const LessonHero: React.FC<Props> = ({ lesson, student }) => {
    const theme = useTheme();
    const levelInfo = student?.level ? ENGLISH_LEVELS[student.level] : null;

    return (
        <Box
            sx={{
                p: { xs: 3, sm: 4 },
                borderRadius: 2,
                background: "linear-gradient(135deg, #f8fbff, #eef4ff)",
                border: "1px solid #dceeff",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                mb: 4,
            }}
        >
            <Grid container spacing={3} alignItems="center">
                {/* Left: Avatar + Info */}
                <Grid item xs={12} md={8}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                            sx={{
                                width: 64,
                                height: 64,
                                fontWeight: 600,
                                fontSize: 24,
                                bgcolor: theme.palette.primary.main,
                            }}
                        >
                            {student?.name?.[0]?.toUpperCase() || "?"}
                        </Avatar>

                        <Box>
                            <Typography
                                variant="h5"
                                fontWeight={700}
                                sx={{ color: theme.palette.primary.main }}
                            >
                                Lesson with {student?.name || "Unnamed Student"}
                            </Typography>

                            {levelInfo && (
                                <Tooltip title={levelInfo.description}>
                                    <Chip
                                        label={`Level: ${student?.level} (${levelInfo.code})`}
                                        size="small"
                                        sx={{
                                            mt: 1,
                                            px: 1,
                                            bgcolor: "#ede9fe",
                                            color: "#6b21a8",
                                            fontWeight: 500,
                                        }}
                                    />
                                </Tooltip>
                            )}
                        </Box>
                    </Stack>
                </Grid>

                {/* Right: Status + Meta */}
                <Grid item xs={12} md={4}>
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="flex-end"
                        spacing={1}
                        sx={{ mb: 1 }}
                    >
                        <Chip
                            label={lesson.status}
                            size="small"
                            sx={{
                                bgcolor:
                                    lesson.status === "COMPLETED"
                                        ? "#d1fae5"
                                        : lesson.status === "MISSED"
                                            ? "#fef9c3"
                                            : lesson.status === "CANCELED"
                                                ? "#fee2e2"
                                                : "#dbeafe",
                                color:
                                    lesson.status === "COMPLETED"
                                        ? "#065f46"
                                        : lesson.status === "MISSED"
                                            ? "#92400e"
                                            : lesson.status === "CANCELED"
                                                ? "#991b1b"
                                                : "#1e40af",
                                fontWeight: 600,
                                borderRadius: "6px",
                                px: 1.2,
                            }}
                        />
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                            {dayjs(lesson.dateTime).format("DD MMM YYYY, HH:mm")} •{" "}
                            {lesson.duration} mins
                        </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                        <LocationOnIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                            {lesson.location || "—"}
                        </Typography>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};

export default LessonHero;