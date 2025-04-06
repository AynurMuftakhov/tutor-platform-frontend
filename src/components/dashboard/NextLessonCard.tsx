import {
    Paper,
    Typography,
    Box,
    useTheme,
    Tooltip
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AlarmIcon from "@mui/icons-material/Alarm";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {Lesson} from "../../types/Lesson";

const NextLessonCard = ({ lesson }: { lesson: Lesson }) => {
    const navigate = useNavigate();
    const theme = useTheme();

    const start = dayjs(lesson.dateTime);
    const end = start.add(lesson.duration, "minute");
    const now = dayjs();

    const minutesToStart = start.diff(now, "minute");
    const isSoon = minutesToStart >= 0 && minutesToStart <= 30;

    return (
        <Paper
            elevation={2}
            onClick={() => navigate(`/lessons/${lesson.id}`)}
            sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
                borderRadius: 3,
                height: "100%",
                cursor: "pointer",
                border: isSoon ? `1.5px solid ${theme.palette.warning.main}` : "1px solid #e0e0e0",
                transition: "all 0.3s",
                "&:hover": {
                    boxShadow: 4,
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
                    {lesson.title} – {start.format("DD MMM")}, {start.format("HH:mm")} – {lesson.duration} min
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