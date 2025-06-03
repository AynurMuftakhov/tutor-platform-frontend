import React, { useState } from "react";
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle,
    Stack,
} from "@mui/material";
import { LessonStatus } from "../../types/Lesson";
import {
    CheckCircle as CompleteIcon,
    EventBusy as MissedIcon,
    PlayArrow as StartIcon,
    Cancel as CancelIcon,
    Schedule as RescheduleIcon,
    Videocam as VideoIcon,
} from "@mui/icons-material";
import {ValidStatusTransitions} from "../../constants/ValidStatusTransitions";
import RescheduleLessonDialog from "./RescheduleLessonDialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DeleteIcon from "@mui/icons-material/Delete";
import {deleteLesson} from "../../services/api";

interface Props {
    currentStatus: LessonStatus;
    onChangeStatus: (newStatus: LessonStatus, extraData?: { newDate?: string }) => void;
    currentDatetime: any;
    lessonId: string;
    studentId: string;
}

const LessonActions: React.FC<Props> = ({ currentStatus, onChangeStatus, currentDatetime, lessonId, studentId }) => {
    const nextStatuses = ValidStatusTransitions[currentStatus] || [];
    const navigate = useNavigate();
    const { user } = useAuth();

    // Reschedule dialog state
    const [rescheduleOpen, setRescheduleOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    // Start video call
    const startVideoCall = () => {
        // Navigate to video call page with lesson ID as room name
        navigate('/video-call', {
            state: {
                identity: user?.id,
                roomName: `lesson-${lessonId}`,
            },
        });
    };

    const handleDeleteLesson = () => {
        deleteLesson(lessonId)
        setDeleteOpen(false)
        navigate(`/lessons`)
    };

    return (
        <>
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mb: 2, flexWrap: "wrap" }}>
                {nextStatuses.includes("IN_PROGRESS") && (
                    <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<StartIcon />}
                        onClick={() => {
                            onChangeStatus("IN_PROGRESS");
                            startVideoCall();
                        }}
                    >
                        Start Lesson & Video Call
                    </Button>
                )}

                {currentStatus === "IN_PROGRESS" && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<VideoIcon />}
                        onClick={startVideoCall}
                    >
                        Join Video Call
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
                {currentStatus != "IN_PROGRESS" && (
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => setDeleteOpen(true)}
                    >
                        Delete
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


            <Dialog open = { deleteOpen }
                    onClose={() => setDeleteOpen(false)}>
                <DialogTitle>Delete Lesson</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete the lesson ?
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleDeleteLesson}
                        color="error"
                        variant="contained"
                        >
                       Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default LessonActions;
