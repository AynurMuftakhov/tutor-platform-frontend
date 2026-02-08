import React from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import EventNoteIcon from "@mui/icons-material/EventNote";
import { DashboardSummary } from "../../../services/dashboardSummary";
import { dedupeUpcomingLessons } from "./upcomingLessonsDedupe";
import {
  DashboardWidgetCard,
  EmptyState,
  StatusPill,
  WidgetListItem,
  widgetSecondaryButtonSx,
} from "../../ui/dashboard";

type Props = {
  summary?: DashboardSummary;
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

const UpcomingLessonsWidget: React.FC<Props> = ({
  summary,
  loading,
  onOpenLesson,
  onViewAllLessons,
}) => {
  const deduped = dedupeUpcomingLessons(summary?.upcomingLessons || [], summary?.nextLesson);
  const lessons = deduped.slice(0, 3);

  return (
    <DashboardWidgetCard
      title="Upcoming Lessons (7 days)"
      icon={<EventNoteIcon fontSize="small" />}
      sx={{ p: 2 }}
      actionSlot={
        <Button size="small" variant="outlined" sx={widgetSecondaryButtonSx} onClick={onViewAllLessons}>
          View all
        </Button>
      }
    >
      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading upcoming lessons...
        </Typography>
      ) : lessons.length === 0 ? (
        <EmptyState
          icon={<ListAltOutlinedIcon fontSize="small" />}
          title="No upcoming lessons in next 7 days"
          action={
            <Button size="small" variant="text" startIcon={<ListAltOutlinedIcon />} onClick={onViewAllLessons}>
              Lessons
            </Button>
          }
        />
      ) : (
        <Stack spacing={1}>
          {lessons.map((lesson) => {
            const lessonLabel = lesson.tutorName ? `Lesson with ${lesson.tutorName}` : "Your next lesson";
            const startDate = new Date(lesson.startsAtUtc);
            const month = startDate.toLocaleDateString(undefined, { month: "short" });
            const day = startDate.toLocaleDateString(undefined, { day: "2-digit" });
            const dateBadge = (
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
            );

            return (
              <WidgetListItem
                key={lesson.id}
                onClick={() => onOpenLesson(lesson.id)}
                startSlot={dateBadge}
                endSlot={<StatusPill status={lesson.status} />}
                title={
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {lessonLabel}
                  </Typography>
                }
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
      )}
    </DashboardWidgetCard>
  );
};

export default UpcomingLessonsWidget;
