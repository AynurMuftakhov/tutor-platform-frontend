import React from "react";
import {
  Button,
  Chip,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import { DashboardSummary } from "../../../services/dashboardSummary";
import {
  DashboardWidgetCard,
  EmptyState,
  WidgetListItem,
  widgetSecondaryButtonSx,
} from "../../ui/dashboard";

type Props = {
  summary?: DashboardSummary;
  loading?: boolean;
  onOpenHomework: () => void;
};

const HomeworkDueWidget: React.FC<Props> = ({ summary, loading, onOpenHomework }) => {
  const homeworkSummary = summary?.homeworkSummary;
  const dueCount = homeworkSummary?.dueCount ?? 0;
  const overdueCount = homeworkSummary?.overdueCount ?? 0;
  const nextDueItems = (homeworkSummary?.nextDueItems || []).slice(0, 3);

  return (
    <DashboardWidgetCard
      title="Homework Due"
      icon={<AssignmentOutlinedIcon fontSize="small" />}
      sx={{ p: 2 }}
      actionSlot={
        <Button size="small" variant="outlined" sx={widgetSecondaryButtonSx} onClick={onOpenHomework}>
          Open homework
        </Button>
      }
    >
      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading homework summary...
        </Typography>
      ) : (
        <>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, flexWrap: "wrap" }}>
            <Chip label={`Due soon: ${dueCount}`} color="info" />
            {overdueCount > 0 && (
              <Chip
                icon={<WarningAmberIcon />}
                label={`Overdue: ${overdueCount}`}
                color="warning"
                sx={{
                  fontWeight: 700,
                  bgcolor: (theme) => alpha(theme.palette.warning.main, 0.16),
                }}
              />
            )}
          </Stack>

          {nextDueItems.length > 0 ? (
            <Stack spacing={1}>
              {nextDueItems.map((item) => {
                const dueLabel = item.dueAtUtc
                  ? new Date(item.dueAtUtc).toLocaleString(undefined, {
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "No due date";
                return (
                  <WidgetListItem
                    key={item.id}
                    title={item.title || "Homework"}
                    subtitle={`Due ${dueLabel}`}
                  />
                );
              })}
            </Stack>
          ) : (
            <EmptyState icon={<AssignmentOutlinedIcon fontSize="small" />} title="No due items right now" />
          )}
        </>
      )}
    </DashboardWidgetCard>
  );
};

export default HomeworkDueWidget;
