import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    MenuItem,
    Stack,
    FormControlLabel,
    Checkbox,
    Box,
    Typography,
    Radio,
    RadioGroup,
    FormControl,
    FormLabel,
    Paper,
    Collapse,
} from "@mui/material";
import { createLesson } from "../services/api";
import DateTimeInput from "./DateTimeInput";
import dayjs from "dayjs";
import { Student } from "../features/students/types";
import {useAuth} from "../context/AuthContext";

interface AddLessonModalProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
    students: Student[];
    initialDate?: string;
}

const AddLessonModal: React.FC<AddLessonModalProps> = ({ open, onClose, onCreated, students, initialDate }) => {
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [submitting] = useState(false);
    const [hasCustomTitle, setHasCustomTitle] = useState(false);
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        title: "",
        studentId: "",
        dateTime: "",
        duration: 60,
        location: "On The platfrom",
        lessonPlan: "",
        learningObjectives: "",
        repeatWeekly: false,
        repeatWeeksCount: 4,
        repeatUntil: "",
        repeatOption: "count",
    });

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFormData((prev) => ({ ...prev, title: val }));

        if (val.trim() === "") {
            setHasCustomTitle(false);
        } else {
            setHasCustomTitle(true);
        }

        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.title.trim()) newErrors.title = "Title is required";
        if (!formData.studentId) newErrors.studentId = "Student is required";
        if (!formData.dateTime) newErrors.dateTime = "Date and time is required";
        if (!formData.duration || formData.duration <= 0) newErrors.duration = "Duration must be a positive number";

        // Validate repeat options if weekly repeat is enabled
        if (formData.repeatWeekly) {
            if (formData.repeatOption === "count") {
                if (!formData.repeatWeeksCount || formData.repeatWeeksCount <= 0) {
                    newErrors.repeatWeeksCount = "Please enter a valid number of weeks";
                } else if (formData.repeatWeeksCount > 52) {
                    newErrors.repeatWeeksCount = "Maximum 52 weeks allowed";
                }
            } else if (formData.repeatOption === "until") {
                if (!formData.repeatUntil) {
                    newErrors.repeatUntil = "Please select an end date";
                } else {
                    const endDate = dayjs(formData.repeatUntil);
                    const startDate = dayjs(formData.dateTime);

                    if (!endDate.isValid()) {
                        newErrors.repeatUntil = "Invalid date format";
                    } else if (endDate.isBefore(startDate)) {
                        newErrors.repeatUntil = "End date must be after the start date";
                    }
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        try {
            await createLesson({
                ...formData,
                tutorId: user!.id,
                duration: parseInt(formData.duration.toString()),
            });

            onCreated();
            onClose();
        } catch (error) {
            // The global error handler will display the error message
            // We don't need to do anything here
            console.log("Error caught in component:", error);
        }
    };

    useEffect(() => {
        const getStudentName = (id: string): string => {
            const student = students.find((s) => s.id === id);
            return student ? student.name : "";
        };

        if (hasCustomTitle) return;

        const studentName = getStudentName(formData.studentId);

        if (studentName) {
            const newTitle = `Lesson with ${studentName}`;
            setFormData((prev) => ({ ...prev, title: newTitle }));
        }
    }, [formData.studentId, formData.dateTime, formData.duration, hasCustomTitle, students]);

    useEffect(() => {
        if (open) {
            setFormData({
                title: "",
                studentId: "",
                dateTime: initialDate || "",
                duration: 60,
                location: "",
                lessonPlan: "",
                learningObjectives: "",
                repeatWeekly: false,
                repeatWeeksCount: 4,
                repeatUntil: "",
                repeatOption: "count",
            });
            setErrors({});
        }
    }, [open, initialDate]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Lesson</DialogTitle>
            <DialogContent>
                <Stack spacing={2} mt={1}>
                    <TextField
                        label="Lesson Title"
                        name="title"
                        fullWidth
                        value={formData.title}
                        onChange={handleTitleChange}
                        error={!!errors.title}
                        helperText={errors.title}
                    />
                    <TextField
                        label="Student"
                        name="studentId"
                        select
                        fullWidth
                        value={formData.studentId}
                        onChange={handleChange}
                    >
                        {students.map((student) => (
                            <MenuItem key={student.id} value={student.id}>
                                {student.name}
                            </MenuItem>
                        ))}
                    </TextField>
                    <DateTimeInput
                        value={formData.dateTime}
                        onChange={(iso) => setFormData({ ...formData, dateTime: iso })}
                        error={!!errors.dateTime || !!errors.time}
                        helperText={errors.dateTime || errors.time}
                    />
                    <TextField
                        label="Duration (minutes)"
                        name="duration"
                        type="number"
                        fullWidth
                        value={formData.duration}
                        onChange={handleChange}
                    />
                    <TextField
                        label="Location (Zoom link or in-person)"
                        name="location"
                        fullWidth
                        value={formData.location}
                        onChange={handleChange}
                    />
                    <TextField
                        label="Lesson Plan"
                        name="lessonPlan"
                        multiline
                        rows={2}
                        fullWidth
                        value={formData.lessonPlan}
                        onChange={handleChange}
                    />
                    <TextField
                        label="Learning Objectives"
                        name="learningObjectives"
                        multiline
                        rows={2}
                        fullWidth
                        value={formData.learningObjectives}
                        onChange={handleChange}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                name="repeatWeekly"
                                checked={formData.repeatWeekly}
                                onChange={handleChange}
                            />
                        }
                        label="Repeat this lesson weekly"
                    />

                    <Collapse in={formData.repeatWeekly} timeout="auto" unmountOnExit>
                        <Paper 
                            elevation={0} 
                            sx={{ 
                                p: 2, 
                                mt: 1, 
                                borderRadius: 2,
                                bgcolor: 'background.subtle',
                                border: '1px solid',
                                borderColor: 'divider'
                            }}
                        >
                            <Typography variant="subtitle2" fontWeight={500} gutterBottom>
                                Repeat Options
                            </Typography>

                            <FormControl component="fieldset" sx={{ width: '100%', mt: 1 }}>
                                <RadioGroup
                                    name="repeatOption"
                                    value={formData.repeatOption}
                                    onChange={handleChange}
                                    sx={{ width: '100%' }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <FormControlLabel 
                                            value="count" 
                                            control={<Radio />} 
                                            label="Repeat for" 
                                            sx={{ mr: 1 }}
                                        />
                                        <TextField
                                            name="repeatWeeksCount"
                                            type="number"
                                            value={formData.repeatWeeksCount}
                                            onChange={handleChange}
                                            disabled={formData.repeatOption !== 'count'}
                                            error={!!errors.repeatWeeksCount}
                                            helperText={errors.repeatWeeksCount}
                                            InputProps={{ 
                                                inputProps: { min: 1, max: 52 },
                                                sx: { borderRadius: 2 }
                                            }}
                                            size="small"
                                            sx={{ width: '80px' }}
                                        />
                                        <Typography sx={{ ml: 1 }}>weeks</Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <FormControlLabel 
                                            value="until" 
                                            control={<Radio />} 
                                            label="Repeat until" 
                                            sx={{ mr: 1 }}
                                        />
                                        <DateTimeInput
                                            value={formData.repeatUntil}
                                            onChange={(iso) => setFormData({ ...formData, repeatUntil: iso })}
                                            disabled={formData.repeatOption !== 'until'}
                                            error={!!errors.repeatUntil}
                                            helperText={errors.repeatUntil}
                                            dateOnly
                                        />
                                    </Box>
                                </RadioGroup>
                            </FormControl>
                        </Paper>
                    </Collapse>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "Creating..." : "Create"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddLessonModal;
