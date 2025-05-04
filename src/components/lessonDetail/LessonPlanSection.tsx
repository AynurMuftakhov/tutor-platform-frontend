import React from "react";
import {
    TextField,
    Button,
    Stack,
    Typography,
    IconButton,
    Fade,
    Box,
} from "@mui/material";
import { Edit as EditIcon, Save as SaveIcon, Close as CancelIcon } from "@mui/icons-material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { updateLesson } from "../../services/api";
import { Lesson } from "../../types/Lesson";
import CardWrapper from "./CardWrapper";
import SectionHeader from "./SectionHeader";
import { useEditableCard } from "../../hooks/useEditableCard";

interface Props {
    lesson: Lesson;
    isTeacher?: boolean;
    onUpdated?: (updated: Partial<Lesson>) => void;
}

const LessonPlanSection: React.FC<Props> = ({ lesson, isTeacher, onUpdated }) => {
    const {
        editing,
        saving,
        values,
        setSaving,
        startEditing,
        cancelEditing,
        handleChange,
    } = useEditableCard({
        lessonPlan: lesson.lessonPlan || "",
        learningObjectives: lesson.learningObjectives || "",
    });

    const handleSave = async () => {
        try {
            setSaving(true);
            const updated = {
                lessonPlan: values.lessonPlan,
                learningObjectives: values.learningObjectives,
            };
            await updateLesson(lesson.id, updated);
            onUpdated?.(updated);
            cancelEditing();
        } catch (e) {
            console.error("Failed to update lesson plan", e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <CardWrapper>
            <SectionHeader
                title="Lesson Plan"
                icon={<MenuBookIcon color="primary" />}
                action={
                    !editing && isTeacher &&(
                        <IconButton onClick={startEditing} size="small">
                            <EditIcon fontSize="small" />
                        </IconButton>
                    )
                }
            />

            <Fade in>
                <Box sx={{ minHeight: "260px" }}>
                    {editing ? (
                        <Stack spacing={2}>
                            <TextField
                                label="Lesson Outline"
                                multiline
                                minRows={3}
                                value={values.lessonPlan}
                                onChange={(e) => handleChange("lessonPlan", e.target.value)}
                                fullWidth
                            />
                            <TextField
                                label="Objectives"
                                multiline
                                minRows={3}
                                value={values.learningObjectives}
                                onChange={(e) => handleChange("learningObjectives", e.target.value)}
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
                                    onClick={cancelEditing}
                                    startIcon={<CancelIcon />}
                                >
                                    Cancel
                                </Button>
                            </Stack>
                        </Stack>
                    ) : (
                        <>
                            <Typography variant="subtitle2" color="text.secondary">
                                Outline
                            </Typography>
                            <Typography>{values.lessonPlan || "No lesson plan provided."}</Typography>

                            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                                Objectives
                            </Typography>
                            <Typography>{values.learningObjectives || "No objectives defined."}</Typography>
                        </>
                    )}
                </Box>
            </Fade>
        </CardWrapper>
    );
};

export default LessonPlanSection;