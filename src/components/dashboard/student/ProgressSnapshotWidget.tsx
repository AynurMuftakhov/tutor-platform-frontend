import React from "react";
import { Box, Typography, alpha } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { DashboardSummary } from "../../../services/dashboardSummary";
import { DashboardWidgetCard, EmptyState } from "../../ui/dashboard";

type Props = {
  summary?: DashboardSummary;
  loading?: boolean;
};

const ProgressSnapshotWidget: React.FC<Props> = ({ summary, loading }) => {
  const metrics = summary?.metrics;
  const vocabularySummary = summary?.vocabularySummary;

  const lessonsCompleted = metrics?.lessonsCompletedThisMonth;
  const homeworkCompletionRate = metrics?.homeworkCompletionRate30d;
  const streakDays = metrics?.vocabularyReviewStreakDays ?? vocabularySummary?.streakDays;
  const reviewQueueCount = vocabularySummary?.reviewQueueCount;

  const stats: Array<{ key: string; label: string; value: string; tone: "primary" | "info" | "success" }> = [];
  if (lessonsCompleted !== null && lessonsCompleted !== undefined) {
    stats.push({
      key: "lessons",
      label: "Lessons this month",
      value: String(lessonsCompleted),
      tone: "primary",
    });
  }
  if (homeworkCompletionRate !== null && homeworkCompletionRate !== undefined) {
    stats.push({
      key: "homework",
      label: "Homework completion (30d)",
      value: `${Math.round(homeworkCompletionRate)}%`,
      tone: "info",
    });
  }
  if (reviewQueueCount !== null && reviewQueueCount !== undefined) {
    stats.push({
      key: "review_queue",
      label: "Vocabulary review queue",
      value: `${reviewQueueCount}`,
      tone: "success",
    });
  } else if (streakDays !== null && streakDays !== undefined) {
    stats.push({
      key: "streak",
      label: "Review streak",
      value: `${streakDays} day${streakDays === 1 ? "" : "s"}`,
      tone: "success",
    });
  }

  const visibleStats = stats.slice(0, 3);

  return (
    <DashboardWidgetCard title="Progress Snapshot" icon={<TrendingUpIcon fontSize="small" />} sx={{ p: 2 }}>
      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading progress metrics...
        </Typography>
      ) : visibleStats.length === 0 ? (
        <EmptyState title="Keep going — your progress will appear here after a few lessons." />
      ) : (
        <Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: visibleStats.length >= 2 ? "1fr 1fr" : "1fr" },
              gap: 1,
            }}
          >
            {visibleStats.map((stat) => (
              <Box
                key={stat.key}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  px: 1.25,
                  py: 1,
                  bgcolor: (theme) =>
                    stat.tone === "primary"
                      ? alpha(theme.palette.primary.main, 0.06)
                      : stat.tone === "info"
                        ? alpha(theme.palette.info.main, 0.06)
                        : alpha(theme.palette.success.main, 0.06),
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {stat.label}
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {stat.value}
                </Typography>
              </Box>
            ))}
          </Box>
          {visibleStats.length === 1 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Keep going — your progress will appear here after a few lessons.
            </Typography>
          )}
        </Box>
      )}
    </DashboardWidgetCard>
  );
};

export default ProgressSnapshotWidget;
