import React from "react";
import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LaunchIcon from "@mui/icons-material/Launch";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import { DashboardSummary } from "../../../services/dashboardSummary";
import { resolveNextLesson } from "./nextLessonFallback";
import {
  DashboardWidgetCard,
  EmptyState,
  StatusPill,
  widgetPrimaryButtonSx,
  widgetSecondaryButtonSx,
} from "../../ui/dashboard";

type Props = {
  summary?: DashboardSummary;
  loading?: boolean;
  onOpenLesson: (lessonId: string) => void;
  onJoinLesson?: (lessonId: string) => void;
  onViewAllLessons: () => void;
  onMessageTutor: () => void;
};

const formatTimeRange = (startsAtUtc: string, endsAtUtc: string): string => {
  const start = new Date(startsAtUtc);
  const end = new Date(endsAtUtc);
  const options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  return `${start.toLocaleTimeString(undefined, options)} - ${end.toLocaleTimeString(undefined, options)}`;
};

const formatStartsIn = (startsAtUtc: string): string => {
  const nowMs = Date.now();
  const startMs = new Date(startsAtUtc).getTime();
  const diffMinutes = Math.round((startMs - nowMs) / 60000);

  if (diffMinutes <= 1 && diffMinutes >= -1) {
    return "Starts now";
  }
  if (diffMinutes < 0) {
    return "Already started";
  }
  if (diffMinutes < 60) {
    return `Starts in ${diffMinutes} min`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours < 24) {
    return minutes === 0
      ? `Starts in ${hours}h`
      : `Starts in ${hours}h ${minutes}m`;
  }

  const days = Math.floor(hours / 24);
  return `Starts in ${days}d`;
};

const NextLessonCard: React.FC<Props> = ({
  summary,
  loading,
  onOpenLesson,
  onJoinLesson,
  onViewAllLessons,
  onMessageTutor,
}) => {
  const theme = useTheme();
  const resolution = resolveNextLesson(summary);
  const lesson = resolution.lesson;

  if (loading) {
    return (
      <DashboardWidgetCard title="Next Lesson" icon={<AccessTimeIcon fontSize="small" />} sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Loading next lesson...
        </Typography>
      </DashboardWidgetCard>
    );
  }

  if (!lesson) {
    return (
      <DashboardWidgetCard title="Next Lesson" icon={<AccessTimeIcon fontSize="small" />} sx={{ p: 2 }}>
        <EmptyState
          title="No upcoming lesson"
          subtitle="No lesson is scheduled right now. You can check your lesson calendar or contact your tutor."
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          <Button size="small" variant="outlined" sx={widgetSecondaryButtonSx} startIcon={<ListAltOutlinedIcon />} onClick={onViewAllLessons}>
            View all lessons
          </Button>
          <Button size="small" variant="text" sx={widgetPrimaryButtonSx} startIcon={<ForumOutlinedIcon />} onClick={onMessageTutor}>
            Message tutor
          </Button>
        </Stack>
      </DashboardWidgetCard>
    );
  }

  const startDate = new Date(lesson.startsAtUtc);
  const dateMonth = startDate.toLocaleDateString(undefined, { month: "short" });
  const dateDay = startDate.toLocaleDateString(undefined, { day: "2-digit" });
  const isInProgress = lesson.status?.toUpperCase() === "IN_PROGRESS";
  const primaryCtaLabel = isInProgress ? "Join lesson" : "Open lesson";
  const lessonHeading = lesson.tutorName ? `Lesson with ${lesson.tutorName}` : "Your next lesson";
  const handlePrimaryAction = () => {
    if (isInProgress && onJoinLesson) {
      onJoinLesson(lesson.id);
      return;
    }
    onOpenLesson(lesson.id);
  };

  return (
    <DashboardWidgetCard title="Next Lesson" icon={<AccessTimeIcon fontSize="small" />} sx={{ p: 2 }}>
      {resolution.source === "upcomingFallback" && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Next lesson detected from upcoming list
        </Alert>
      )}

      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            minWidth: 64,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            textAlign: "center",
            py: 1,
            px: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase" }}>
            {dateMonth}
          </Typography>
          <Typography variant="h6" fontWeight={800} lineHeight={1.1}>
            {dateDay}
          </Typography>
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" fontWeight={700} noWrap>
            {lessonHeading}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75, mb: 0.75, flexWrap: "wrap" }}>
            <AccessTimeIcon fontSize="small" sx={{ color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              {formatTimeRange(lesson.startsAtUtc, lesson.endsAtUtc)}
            </Typography>
            <StatusPill status={lesson.status} />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {formatStartsIn(lesson.startsAtUtc)}
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ mt: 2 }}>
        <Button
          size="small"
          variant="contained"
          sx={widgetPrimaryButtonSx}
          startIcon={<LaunchIcon />}
          onClick={handlePrimaryAction}
        >
          {primaryCtaLabel}
        </Button>
      </Box>
    </DashboardWidgetCard>
  );
};

export default NextLessonCard;
