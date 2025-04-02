import React, { useState } from "react";
import {
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    Stack,
    Grid,
    IconButton,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
} from "@mui/material";
import { Edit as EditIcon, Save as SaveIcon, Close as CancelIcon } from "@mui/icons-material";
import { Lesson, LessonSatisfaction } from "../../types/Lesson";
import { updateLesson } from "../../services/api";

interface Props {
    lesson: Lesson;
    onUpdated?: (updated: Partial<Lesson>) => void;
}

const PostLessonNotes: React.FC<Props> = ({ lesson, onUpdated }) => {
    const [editing, setEditing] = useState(false);
    const [notes, setNotes] = useState(lesson.notes || "");
    const [performance, setPerformance] = useState(lesson.studentPerformance || "");
    const [satisfaction, setSatisfaction] = useState<LessonSatisfaction | "">(lesson.lessonSatisfaction || "");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        try {
            setSaving(true);
            const updated = { notes, studentPerformance: performance, lessonSatisfaction: satisfaction || undefined  };
            await updateLesson(lesson.id, updated);
            onUpdated?.(updated);
            setEditing(false);
        } catch (e) {
            console.error("Failed to save notes", e);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditing(false);
        setNotes(lesson.notes || "");
        setPerformance(lesson.studentPerformance || "");
        setSatisfaction(lesson.lessonSatisfaction || "");
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Post-Lesson Notes</Typography>
                {!editing && (
                    <IconButton onClick={() => setEditing(true)} size="small">
                        <EditIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>

            {editing ? (
                <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Tutor's Notes"
                            multiline
                            minRows={3}
                            fullWidth
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Student Performance"
                            multiline
                            minRows={3}
                            fullWidth
                            value={performance}
                            onChange={(e) => setPerformance(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel>Lesson Satisfaction</InputLabel>
                            <Select
                                value={satisfaction}
                                label="Lesson Satisfaction"
                                onChange={(e) => setSatisfaction(e.target.value as LessonSatisfaction)}
                            >
                                <MenuItem value="VERY_SATISFIED">Very satisfied</MenuItem>
                                <MenuItem value="SATISFIED">Satisfied</MenuItem>
                                <MenuItem value="NEUTRAL">Neutral</MenuItem>
                                <MenuItem value="DISSATISFIED">Dissatisfied</MenuItem>
                                <MenuItem value="VERY_DISSATISFIED">Very dissatisfied</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
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
                    </Grid>
                </Grid>
            ) : (
                <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Tutor's Notes</Typography>
                        <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                            <Typography>{notes || "No notes provided."}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Student Performance</Typography>
                        <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                            <Typography>{performance || "No performance info recorded."}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="subtitle2">Lesson Satisfaction</Typography>
                        <Typography>{satisfaction || "Not set"}</Typography>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};

export default PostLessonNotes;
