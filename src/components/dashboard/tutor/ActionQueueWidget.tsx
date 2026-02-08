import React from "react";
import {
  Box,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { DashboardSummary } from "../../../services/dashboardSummary";
import {
  DashboardWidgetCard,
  WidgetListItem,
} from "../../ui/dashboard";

type Props = {
  summary?: DashboardSummary;
  loading?: boolean;
  onOpenHomeworkReview: () => void;
  onOpenMissingNotes: () => void;
  onOpenStudentsWithoutNext: () => void;
};

type ItemProps = {
  title: string;
  count: number;
  onClick: () => void;
  icon: React.ReactNode;
};

const QueueItem: React.FC<ItemProps> = ({ title, count, onClick, icon }) => (
  <WidgetListItem
    title={title}
    onClick={onClick}
    startSlot={icon}
    endSlot={
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
        <Chip
          size="small"
          label={count}
          sx={{
            height: 22,
            fontWeight: 700,
            borderRadius: 999,
            border: "1px solid",
            borderColor: count > 0 ? "primary.light" : "divider",
            bgcolor: count > 0 ? "rgba(25, 118, 210, 0.10)" : "rgba(100, 116, 139, 0.08)",
            color: count > 0 ? "primary.main" : "text.secondary",
          }}
        />
        <ChevronRightIcon fontSize="small" sx={{ color: "text.secondary" }} />
      </Box>
    }
  />
);

const ActionQueueWidget: React.FC<Props> = ({
  summary,
  loading,
  onOpenHomeworkReview,
  onOpenMissingNotes,
  onOpenStudentsWithoutNext,
}) => {
  const homeworkToReview = summary?.homeworkSummary?.toReviewCount ?? 0;
  const missingNotes = summary?.tutorActions?.missingNotesCount ?? 0;
  const studentsWithoutNext = summary?.tutorActions?.studentsWithoutNextLessonCount ?? 0;

  return (
    <DashboardWidgetCard title="Action Queue" icon={<AssignmentTurnedInOutlinedIcon fontSize="small" />} sx={{ p: 2 }}>
      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading actions...
        </Typography>
      ) : (
        <Stack spacing={1}>
          <QueueItem
            title="Homework to review"
            count={homeworkToReview}
            onClick={onOpenHomeworkReview}
            icon={<AssignmentTurnedInOutlinedIcon fontSize="small" />}
          />
          <QueueItem
            title="Lessons missing notes"
            count={missingNotes}
            onClick={onOpenMissingNotes}
            icon={<NoteAltOutlinedIcon fontSize="small" />}
          />
          <QueueItem
            title="Students without next lesson"
            count={studentsWithoutNext}
            onClick={onOpenStudentsWithoutNext}
            icon={<PeopleAltOutlinedIcon fontSize="small" />}
          />
        </Stack>
      )}
    </DashboardWidgetCard>
  );
};

export default ActionQueueWidget;
