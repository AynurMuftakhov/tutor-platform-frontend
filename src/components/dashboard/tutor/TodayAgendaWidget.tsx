import React from "react";
import {
  Button,
  Stack,
  Typography,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { DashboardSummary } from "../../../services/dashboardSummary";
import {
  DashboardWidgetCard,
  EmptyState,
  StatusPill,
  WidgetListItem,
  widgetPrimaryButtonSx,
  widgetSecondaryButtonSx,
} from "../../ui/dashboard";

type Props = {
  summary?: DashboardSummary;
  loading?: boolean;
  actionLoadingLessonId?: string | null;
  onOpenLesson: (lessonId: string) => void;
  onMarkStarted: (lessonId: string) => void;
  onMarkCompleted: (lessonId: string) => void;
  onViewAllLessons: () => void;
};

const formatTimeRange = (startsAtUtc: string, endsAtUtc: string): string => {
  const start = new Date(startsAtUtc);
  const end = new Date(endsAtUtc);
  const options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  return `${start.toLocaleTimeString(undefined, options)} - ${end.toLocaleTimeString(undefined, options)}`;
};

const TodayAgendaWidget: React.FC<Props> = ({
  summary,
  loading,
  actionLoadingLessonId,
  onOpenLesson,
  onMarkStarted,
  onMarkCompleted,
  onViewAllLessons,
}) => {
  const items = (summary?.tutorTodayAgenda || []).slice(0, 5);

  return (
    <DashboardWidgetCard
      title="Today's Agenda"
      icon={<AccessTimeIcon fontSize="small" />}
      sx={{ p: 2 }}
      actionSlot={
        <Button size="small" variant="outlined" sx={widgetSecondaryButtonSx} onClick={onViewAllLessons}>
          View all
        </Button>
      }
    >
      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading agenda...
        </Typography>
      ) : items.length === 0 ? (
        <EmptyState title="No lessons scheduled for today." />
      ) : (
        <Stack spacing={1}>
          {items.map((lesson) => {
            const normalizedStatus = lesson.status?.toUpperCase();
            const canStart = normalizedStatus === "SCHEDULED" || normalizedStatus === "RESCHEDULED";
            const canComplete = normalizedStatus === "IN_PROGRESS";
            const busy = actionLoadingLessonId === lesson.id;
            const lessonLabel = lesson.studentName ? `Lesson with ${lesson.studentName}` : lesson.title || "Lesson";
            const timeRange = formatTimeRange(lesson.startsAtUtc, lesson.endsAtUtc);

            return (
              <WidgetListItem
                key={lesson.id}
                title={
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {timeRange}
                  </Typography>
                }
                subtitle={
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {lessonLabel}
                  </Typography>
                }
                endSlot={<StatusPill status={lesson.status} />}
              >
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-start" flexWrap="wrap">
                  <Button
                    size="small"
                    variant="contained"
                    sx={widgetPrimaryButtonSx}
                    onClick={() => onOpenLesson(lesson.id)}
                  >
                    Open lesson
                  </Button>
                  {canStart && (
                    <Button
                      size="small"
                      variant="outlined"
                      sx={widgetSecondaryButtonSx}
                      disabled={busy}
                      onClick={() => onMarkStarted(lesson.id)}
                    >
                      Mark started
                    </Button>
                  )}
                  {canComplete && (
                    <Button
                      size="small"
                      variant="outlined"
                      sx={widgetSecondaryButtonSx}
                      disabled={busy}
                      onClick={() => onMarkCompleted(lesson.id)}
                    >
                      Mark completed
                    </Button>
                  )}
                </Stack>
              </WidgetListItem>
            );
          })}
        </Stack>
      )}
    </DashboardWidgetCard>
  );
};

export default TodayAgendaWidget;
