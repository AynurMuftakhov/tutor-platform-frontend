import {
    Paper,
    Typography,
    Box,
    useTheme,
    Tooltip,
    alpha
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AlarmIcon from "@mui/icons-material/Alarm";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {Lesson} from "../../types/Lesson";
import { DashboardLessonSummaryItem } from "../../services/dashboardSummary";

type LessonCardItem = Lesson | DashboardLessonSummaryItem;

const isDashboardLesson = (lesson: LessonCardItem): lesson is DashboardLessonSummaryItem => {
    return (lesson as DashboardLessonSummaryItem).startsAtUtc !== undefined;
};

const NextLessonCard = ({ lesson }: { lesson: LessonCardItem }) => {
    const navigate = useNavigate();
    const theme = useTheme();

    const start = dayjs(isDashboardLesson(lesson) ? lesson.startsAtUtc : lesson.dateTime);
    const end = isDashboardLesson(lesson)
        ? dayjs(lesson.endsAtUtc)
        : start.add(lesson.duration, "minute");
    const now = dayjs();

    const minutesToStart = start.diff(now, "minute");
    const isSoon = minutesToStart >= 0 && minutesToStart <= 30;

    return (
        <Paper
            elevation={0}
            onClick={() => navigate(`/lessons/${lesson.id}`)}
            sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
                borderRadius: 2,
                height: "100%",
                cursor: "pointer",
                border: `1px solid ${alpha(theme.palette.grey[500], 0.28)}`,
                bgcolor: isSoon ? alpha(theme.palette.warning.main, 0.06) : "background.paper",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
                transition: "all 0.3s",
                "&:hover": {
                    borderColor: alpha(theme.palette.primary.main, 0.22),
                    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.1)",
                },
            }}
        >
            {/* Date Block */}
            <Box
                sx={{
                    minWidth: 60,
                    textAlign: "center",
                    bgcolor: "#E3F2FD",
                    borderRadius: 2,
                    py: 1,
                }}
            >
                <Typography variant="subtitle2">{start.format("MMM")}</Typography>
                <Typography variant="h6">{start.format("DD")}</Typography>
            </Box>

            {/* Info */}
            <Box sx={{ flexGrow: 1 }}>
                <Typography fontWeight={600} fontSize={14}>
                    {lesson.title || "Lesson"}
                </Typography>

                <Box display="flex" alignItems="center" gap={0.5}>
                    <AccessTimeIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary">
                        {start.format("HH:mm")} – {end.format("HH:mm")}
                    </Typography>

                    {/* Only subtle icon */}
                    {isSoon && (
                        <Tooltip title="Starts soon">
                            <AlarmIcon color="warning" fontSize="small" sx={{ ml: 1 }} />
                        </Tooltip>
                    )}
                </Box>
            </Box>
        </Paper>
    );
};

export default NextLessonCard;
