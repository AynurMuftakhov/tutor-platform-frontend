import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventNoteIcon from "@mui/icons-material/EventNote";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import { DashboardLessonSummaryItem } from "../../services/dashboardSummary";
import {
  DashboardWidgetCard,
  EmptyState,
  StatusPill,
  WidgetListItem,
  widgetSecondaryButtonSx,
} from "../ui/dashboard";

type UpcomingLessonsSectionProps = {
    lessons: DashboardLessonSummaryItem[];
    loading?: boolean;
    onOpenLesson: (lessonId: string) => void;
    onViewAllLessons: () => void;
};

const formatTimeRange = (startsAtUtc: string, endsAtUtc: string): string => {
    const start = new Date(startsAtUtc);
    const end = new Date(endsAtUtc);
    const options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
    return `${start.toLocaleTimeString(undefined, options)} - ${end.toLocaleTimeString(undefined, options)}`;
};

const UpcomingLessonsSection: React.FC<UpcomingLessonsSectionProps> = ({ lessons, loading, onOpenLesson, onViewAllLessons }) => {
    return (
        <DashboardWidgetCard
            title="Upcoming Lessons"
            icon={<EventNoteIcon fontSize="small" />}
            actionSlot={
                <Button size="small" variant="outlined" sx={widgetSecondaryButtonSx} onClick={onViewAllLessons}>
                    View all
                </Button>
            }
            sx={{ p: 2 }}
        >
            {loading ? (
                <Typography variant="body2" color="text.secondary">
                    Loading upcoming lessons...
                </Typography>
            ) : lessons.length > 0 ? (
                <Box
                    sx={{
                        maxHeight: { xs: "none", md: 220, lg: 260 },
                        overflowY: { xs: "visible", md: "auto" },
                        pr: { xs: 0, md: 0.5 },
                    }}
                >
                <Stack spacing={1}>
                    {lessons.map((lesson) => {
                        const startDate = new Date(lesson.startsAtUtc);
                        const month = startDate.toLocaleDateString(undefined, { month: "short" });
                        const day = startDate.toLocaleDateString(undefined, { day: "2-digit" });

                        return (
                            <WidgetListItem
                                key={lesson.id}
                                onClick={() => onOpenLesson(lesson.id)}
                                startSlot={
                                    <Box
                                        sx={{
                                            minWidth: 46,
                                            textAlign: "center",
                                            borderRadius: 1.5,
                                            border: "1px solid",
                                            borderColor: "divider",
                                            py: 0.5,
                                            px: 0.75,
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", lineHeight: 1 }}>
                                            {month}
                                        </Typography>
                                        <Typography variant="subtitle2" fontWeight={800} lineHeight={1.15}>
                                            {day}
                                        </Typography>
                                    </Box>
                                }
                                endSlot={<StatusPill status={lesson.status} />}
                                title={<Typography variant="body2" fontWeight={700} noWrap>{lesson.title || "Lesson"}</Typography>}
                                subtitle={
                                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.35 }}>
                                        <AccessTimeIcon fontSize="inherit" sx={{ color: "text.secondary", fontSize: 14 }} />
                                        <Typography variant="caption" color="text.secondary">
                                            {formatTimeRange(lesson.startsAtUtc, lesson.endsAtUtc)}
                                        </Typography>
                                    </Stack>
                                }
                            />
                        );
                    })}
                </Stack>
                </Box>
            ) : (
                <EmptyState icon={<ListAltOutlinedIcon fontSize="small" />} title="No upcoming lessons." />
            )}
        </DashboardWidgetCard>
    );
};

export default UpcomingLessonsSection;
