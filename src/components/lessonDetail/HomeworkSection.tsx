import React from "react";
import {
    TextField,
    Button,
    Stack,
    Typography,
    IconButton,
    Fade,
    Box,
    Paper,
} from "@mui/material";
import { Edit as EditIcon, Save as SaveIcon, Close as CancelIcon } from "@mui/icons-material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { updateLesson } from "../../services/api";
import { Lesson } from "../../types/Lesson";
import CardWrapper from "./CardWrapper";
import SectionHeader from "./SectionHeader";
import { useEditableCard } from "../../hooks/useEditableCard";

interface Props {
    lesson: Lesson;
    onUpdated?: (updated: Partial<Lesson>) => void;
}

const HomeworkSection: React.FC<Props> = ({ lesson, onUpdated }) => {
    const {
        editing,
        saving,
        values,
        setSaving,
        startEditing,
        cancelEditing,
        handleChange,
    } = useEditableCard({
        homework: lesson.homework || "",
    });

    const handleSave = async () => {
        try {
            setSaving(true);
            await updateLesson(lesson.id, values);
            onUpdated?.(values);
            cancelEditing();
        } catch (e) {
            console.error("Failed to update homework", e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <CardWrapper>
            <SectionHeader
                title="Homework"
                icon={<AssignmentIcon color="primary" />}
                action={
                    !editing && (
                        <IconButton onClick={startEditing} size="small">
                            <EditIcon fontSize="small" />
                        </IconButton>
                    )
                }
            />

            <Fade in>
                <Box sx={{ minHeight: "220px" }}>
                    {editing ? (
                        <Stack spacing={2}>
                            <TextField
                                label="Homework Instructions"
                                multiline
                                minRows={3}
                                value={values.homework}
                                onChange={(e) => handleChange("homework", e.target.value)}
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
                                    onClick={cancelEditing}
                                    startIcon={<CancelIcon />}
                                >
                                    Cancel
                                </Button>
                            </Stack>
                        </Stack>
                    ) : values.homework ? (
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography>{values.homework}</Typography>
                        </Paper>
                    ) : (
                        <Typography color="text.secondary">No homework assigned.</Typography>
                    )}
                </Box>
            </Fade>
        </CardWrapper>
    );
};

export default HomeworkSection;