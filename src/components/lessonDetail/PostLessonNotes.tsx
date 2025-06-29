import React from "react";
import {
    Grid,
    Typography,
    Paper,
    TextField,
    Button,
    Stack,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Fade,
    Box,
} from "@mui/material";
import { Edit as EditIcon, Save as SaveIcon, Close as CancelIcon } from "@mui/icons-material";
import RateReviewIcon from "@mui/icons-material/RateReview";
import { updateLesson } from "../../services/api";
import { Lesson, LessonSatisfaction } from "../../types/Lesson";
import CardWrapper from "./CardWrapper";
import SectionHeader from "./SectionHeader";
import { useEditableCard } from "../../hooks/useEditableCard";

interface Props {
    lesson: Lesson;
    isTeacher?: boolean;
    onUpdated?: (updated: Partial<Lesson>) => void;
}

const PostLessonNotes: React.FC<Props> = ({ lesson, isTeacher, onUpdated }) => {
    const {
        editing,
        saving,
        values,
        setSaving,
        startEditing,
        cancelEditing,
        handleChange,
    } = useEditableCard({
        notes: lesson.notes || "",
        studentPerformance: lesson.studentPerformance || "",
        lessonSatisfaction: lesson.lessonSatisfaction || "",
    });

    const handleSave = async () => {
        try {
            setSaving(true);
            const updated: Partial<Lesson> = {
                notes: values.notes,
                studentPerformance: values.studentPerformance,
                lessonSatisfaction: values.lessonSatisfaction
                    ? (values.lessonSatisfaction as LessonSatisfaction)
                    : undefined,
            };
            await updateLesson(lesson.id, updated);
            onUpdated?.(updated);
            cancelEditing();
        } catch (e) {
            console.error("Failed to save notes", e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <CardWrapper>
            <SectionHeader
                title="Post-Lesson Notes"
                icon={<RateReviewIcon color="primary" />}
                action={
                    !editing && isTeacher && (
                        <IconButton onClick={startEditing} size="small">
                            <EditIcon fontSize="small" />
                        </IconButton>
                    )
                }
            />

            <Fade in>
                <Box sx={{ minHeight: "280px" }}>
                    {editing ? (
                        <Grid container spacing={2}>
                            <Grid size={{ xs:12, sm:6 }}>
                                <TextField
                                    label="Tutor's Notes"
                                    multiline
                                    minRows={3}
                                    fullWidth
                                    value={values.notes}
                                    onChange={(e) => handleChange("notes", e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs:12, sm:6 }}>
                                <TextField
                                    label="Student Performance"
                                    multiline
                                    minRows={3}
                                    fullWidth
                                    value={values.studentPerformance}
                                    onChange={(e) => handleChange("studentPerformance", e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs:12 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Lesson Satisfaction</InputLabel>
                                    <Select
                                        value={values.lessonSatisfaction}
                                        label="Lesson Satisfaction"
                                        onChange={(e) =>
                                            handleChange("lessonSatisfaction", e.target.value as LessonSatisfaction)
                                        }
                                    >
                                        <MenuItem value="VERY_SATISFIED">Very satisfied</MenuItem>
                                        <MenuItem value="SATISFIED">Satisfied</MenuItem>
                                        <MenuItem value="NEUTRAL">Neutral</MenuItem>
                                        <MenuItem value="DISSATISFIED">Dissatisfied</MenuItem>
                                        <MenuItem value="VERY_DISSATISFIED">Very dissatisfied</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs:12 }}>
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
                                        onClick={cancelEditing}
                                        startIcon={<CancelIcon />}
                                    >
                                        Cancel
                                    </Button>
                                </Stack>
                            </Grid>
                        </Grid>
                    ) : (
                        <Grid container spacing={2}>
                            <Grid size={{ xs:12, sm:6 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Tutor Notes
                                </Typography>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography>{values.notes || "No notes provided."}</Typography>
                                </Paper>
                            </Grid>
                            <Grid size={{ xs:12, sm:6 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Student Performance
                                </Typography>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography>{values.studentPerformance || "No performance info recorded."}</Typography>
                                </Paper>
                            </Grid>
                            <Grid size={{ xs:12, sm:6 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Lesson Satisfaction
                                </Typography>
                                <Typography>{values.lessonSatisfaction || "Not set"}</Typography>
                            </Grid>
                        </Grid>
                    )}
                </Box>
            </Fade>
        </CardWrapper>
    );
};

export default PostLessonNotes;