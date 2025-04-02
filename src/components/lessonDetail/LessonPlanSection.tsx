import React, { useState } from "react";
import {
    Box,
    Typography,
    TextField,
    Button,
    Stack,
    IconButton
} from "@mui/material";
import { Edit as EditIcon, Save as SaveIcon, Close as CancelIcon } from "@mui/icons-material";
import { Lesson } from "../../types/Lesson";
import { updateLesson } from "../../services/api";

interface Props {
    lesson: Lesson;
    onUpdated?: (updated: Partial<Lesson>) => void; // Optional callback
}

const LessonPlanSection: React.FC<Props> = ({ lesson, onUpdated }) => {
    const [editing, setEditing] = useState(false);
    const [plan, setPlan] = useState(lesson.lessonPlan || "");
    const [objectives, setObjectives] = useState(lesson.learningObjectives || "");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        try {
            setSaving(true);
            const updated = {
                lessonPlan: plan,
                learningObjectives: objectives,
            };
            await updateLesson(lesson.id, updated);
            onUpdated?.(updated); // optionally notify parent
            setEditing(false);
        } catch (e) {
            console.error("Failed to update lesson plan", e);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditing(false);
        setPlan(lesson.lessonPlan || "");
        setObjectives(lesson.learningObjectives || "");
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Lesson Plan</Typography>
                {!editing && (
                    <IconButton onClick={() => setEditing(true)} size="small">
                        <EditIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>

            {editing ? (
                <Stack spacing={2} sx={{ mt: 2 }}>
                    <TextField
                        label="Lesson Outline"
                        multiline
                        minRows={3}
                        value={plan}
                        onChange={(e) => setPlan(e.target.value)}
                        fullWidth
                    />
                    <TextField
                        label="Objectives"
                        multiline
                        minRows={3}
                        value={objectives}
                        onChange={(e) => setObjectives(e.target.value)}
                        fullWidth
                    />
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="contained"
                            color="primary"
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
            ) : (
                <>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Outline
                        </Typography>
                        <Typography>{plan || "No lesson plan provided."}</Typography>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Objectives
                        </Typography>
                        <Typography>{objectives || "No objectives defined."}</Typography>
                    </Box>
                </>
            )}
        </Box>
    );
};

export default LessonPlanSection;