import React, { useState } from "react";
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    Stack,
    IconButton,
} from "@mui/material";
import {
    Edit as EditIcon,
    Save as SaveIcon,
    Close as CancelIcon,
} from "@mui/icons-material";
import { Lesson } from "../../types/Lesson";
import { updateLesson } from "../../services/api";

interface Props {
    lesson: Lesson;
    onUpdated?: (updated: Partial<Lesson>) => void;
}

const HomeworkSection: React.FC<Props> = ({ lesson, onUpdated }) => {
    const [editing, setEditing] = useState(false);
    const [homework, setHomework] = useState(lesson.homework || "");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        try {
            setSaving(true);
            const updated = { homework };
            await updateLesson(lesson.id, updated);
            onUpdated?.(updated);
            setEditing(false);
        } catch (e) {
            console.error("Failed to update homework", e);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditing(false);
        setHomework(lesson.homework || "");
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Homework</Typography>
                {!editing && (
                    <IconButton onClick={() => setEditing(true)} size="small">
                        <EditIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>

            {editing ? (
                <Stack spacing={2} sx={{ mt: 2 }}>
                    <TextField
                        label="Homework Instructions"
                        multiline
                        minRows={3}
                        value={homework}
                        onChange={(e) => setHomework(e.target.value)}
                        fullWidth
                    />
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="contained"
                            onClick={handleSave}
                            disabled={saving}
                            startIcon={<SaveIcon />}
                        >
                            Save
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleCancel}
                            startIcon={<CancelIcon />}
                        >
                            Cancel
                        </Button>
                    </Stack>
                </Stack>
            ) : homework ? (
                <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                    <Typography>{homework}</Typography>
                </Paper>
            ) : (
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                    No homework assigned.
                </Typography>
            )}
        </Box>
    );
};

export default HomeworkSection;