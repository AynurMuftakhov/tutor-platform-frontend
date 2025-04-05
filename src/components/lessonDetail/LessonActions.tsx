import React, { useState } from "react";
import {
    Button,
    Stack,
} from "@mui/material";
import { LessonStatus } from "../../types/Lesson";
import {
    CheckCircle as CompleteIcon,
    EventBusy as MissedIcon,
    PlayArrow as StartIcon,
    Cancel as CancelIcon,
    Schedule as RescheduleIcon,
} from "@mui/icons-material";
import {ValidStatusTransitions} from "../../constants/ValidStatusTransitions";
import RescheduleLessonDialog from "./RescheduleLessonDialog";

interface Props {
    currentStatus: LessonStatus;
    onChangeStatus: (newStatus: LessonStatus, extraData?: { newDate?: string }) => void;
    currentDatetime: any
}

const LessonActions: React.FC<Props> = ({ currentStatus, onChangeStatus, currentDatetime }) => {
    const nextStatuses = ValidStatusTransitions[currentStatus] || [];

    // Reschedule dialog state
    const [rescheduleOpen, setRescheduleOpen] = useState(false);

    return (
        <>
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mb: 2, flexWrap: "wrap" }}>
                {nextStatuses.includes("IN_PROGRESS") && (
                    <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<StartIcon />}
                        onClick={() => onChangeStatus("IN_PROGRESS")}
                    >
                        Start
                    </Button>
                )}

                {nextStatuses.includes("COMPLETED") && (
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<CompleteIcon />}
                        onClick={() => onChangeStatus("COMPLETED")}
                    >
                        Complete
                    </Button>
                )}

                {nextStatuses.includes("MISSED") && (
                    <Button
                        variant="outlined"
                        color="warning"
                        startIcon={<MissedIcon />}
                        onClick={() => onChangeStatus("MISSED")}
                    >
                        Mark as Missed
                    </Button>
                )}

                {nextStatuses.includes("CANCELED") && (
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => onChangeStatus("CANCELED")}
                    >
                        Cancel
                    </Button>
                )}

                {nextStatuses.includes("RESCHEDULED") && (
                    <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<RescheduleIcon />}
                        onClick={() => setRescheduleOpen(true)}
                    >
                        Reschedule
                    </Button>
                )}
            </Stack>

            <RescheduleLessonDialog
                open={rescheduleOpen}
                initialDateTime={currentDatetime}
                onClose={() => setRescheduleOpen(false)}
                onSubmit={(newDateTime) => {
                    onChangeStatus("RESCHEDULED", { newDate: newDateTime });
                    setRescheduleOpen(false);
                }}
            />
        </>
    );
};

export default LessonActions;