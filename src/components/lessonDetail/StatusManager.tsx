// components/lessonDetail/StatusManager.tsx

import React, { useState } from "react";
import {
    Button,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import { Schedule, Done, Cancel, Replay, AccessTime, EventBusy, Edit } from "@mui/icons-material";
import { Lesson } from "../../types/Lesson";
import { updateLesson } from "../../services/api";

interface Props {
    lesson: Lesson;
    onUpdated?: (updated: Partial<Lesson>) => void;
}

const STATUS_OPTIONS = [
    { value: "SCHEDULED", label: "Scheduled", icon: <Schedule fontSize="small" /> },
    { value: "IN_PROGRESS", label: "In Progress", icon: <AccessTime fontSize="small" /> },
    { value: "COMPLETED", label: "Completed", icon: <Done fontSize="small" /> },
    { value: "MISSED", label: "Missed", icon: <EventBusy fontSize="small" /> },
    { value: "RESCHEDULED", label: "Rescheduled", icon: <Replay fontSize="small" /> },
    { value: "CANCELED", label: "Canceled", icon: <Cancel fontSize="small" /> },
] as const;

const StatusManager: React.FC<Props> = ({ lesson, onUpdated }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [saving, setSaving] = useState(false);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => setAnchorEl(null);

    const handleStatusChange = async (status: Lesson["status"]) => {
        try {
            setSaving(true);
            await updateLesson(lesson.id, { status });
            onUpdated?.({ status });
        } catch (e) {
            console.error("Failed to update status", e);
        } finally {
            setSaving(false);
            handleClose();
        }
    };

    return (
        <>
            <Button
                variant="outlined"
                size="small"
                onClick={handleClick}
                endIcon={<Edit fontSize="small" />}
                disabled={saving}
            >
                Manage Status
            </Button>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
                {STATUS_OPTIONS.map((opt) => (
                    <MenuItem
                        key={opt.value}
                        selected={lesson.status === opt.value}
                        onClick={() => handleStatusChange(opt.value)}
                    >
                        <ListItemIcon>{opt.icon}</ListItemIcon>
                        <ListItemText>{opt.label}</ListItemText>
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};

export default StatusManager;