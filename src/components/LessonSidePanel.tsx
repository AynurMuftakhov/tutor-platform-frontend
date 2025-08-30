import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    TextField,
    Button,
    MenuItem,
    Stack,
    FormControlLabel,
    Checkbox,
    Radio,
    RadioGroup,
    FormControl,
    FormLabel,
    Paper,
    Collapse,
    Drawer,
    IconButton,
    useTheme,
    useMediaQuery,
    Dialog,
    Slide,
} from "@mui/material";
import { TransitionProps } from '@mui/material/transitions';
import { motion } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import { createLesson } from "../services/api";
import DateTimeInput from "./DateTimeInput";
import dayjs from "dayjs";
import { Student } from "../pages/MyStudentsPage";
import { useAuth } from "../context/AuthContext";

// Slide transition for mobile dialog
const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

interface LessonSidePanelProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
    students: Student[];
    initialDate?: string; // ISO string for initial date
}

const LessonSidePanel: React.FC<LessonSidePanelProps> = ({ 
    open, 
    onClose, 
    onCreated, 
    students, 
    initialDate 
}) => {
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [submitting, setSubmitting] = useState(false);
    const [hasCustomTitle, setHasCustomTitle] = useState(false);
    const { user } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    
    const [formData, setFormData] = useState({
        title: "",
        studentId: "",
        dateTime: "",
        duration: 60,
        location: "On The platform",
        lessonPlan: "",
        learningObjectives: "",
        repeatWeekly: false,
        repeatWeeksCount: 4,
        repeatUntil: "",
        repeatOption: "count", // "count" or "until"
    });

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFormData((prev) => ({ ...prev, title: val }));

        if (val.trim() === "") {
            setHasCustomTitle(false);
        } else {
            setHasCustomTitle(true);
        }
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
            setSubmitting(true);
            await createLesson({
                ...formData,
                tutorId: user!.id,
                duration: parseInt(formData.duration.toString()),
            });

            onCreated();
            onClose();
        } catch (error) {
            console.log("Error caught in component:", error);
        } finally {
            setSubmitting(false);
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
                location: "On The platform",
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

    const formContent = (
        <Stack spacing={3} sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" fontWeight={600} component={motion.div} 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                Add New Lesson
            </Typography>
            
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <TextField
                    label="Lesson Title"
                    name="title"
                    fullWidth
                    value={formData.title}
                    onChange={handleTitleChange}
                    error={!!errors.title}
                    helperText={errors.title}
                    sx={{ mt: 2 }}
                />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
            >
                <TextField
                    label="Student"
                    name="studentId"
                    select
                    fullWidth
                    value={formData.studentId}
                    onChange={handleChange}
                    error={!!errors.studentId}
                    helperText={errors.studentId}
                >
                    {students.map((student) => (
                        <MenuItem key={student.id} value={student.id}>
                            {student.name}
                        </MenuItem>
                    ))}
                </TextField>
            </motion.div>

            <Box component={motion.div}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
            >
                <DateTimeInput
                    value={formData.dateTime}
                    onChange={(iso) => setFormData({ ...formData, dateTime: iso })}
                    error={!!errors.dateTime}
                    helperText={errors.dateTime}
                />
            </Box>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.25 }}
            >
                <TextField
                    label="Duration (minutes)"
                    name="duration"
                    type="number"
                    fullWidth
                    value={formData.duration}
                    onChange={handleChange}
                    error={!!errors.duration}
                    helperText={errors.duration}
                />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
            >
                <TextField
                    label="Location (Zoom link or in-person)"
                    name="location"
                    fullWidth
                    value={formData.location}
                    onChange={handleChange}
                />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.35 }}
            >
                <TextField
                    label="Lesson Plan"
                    name="lessonPlan"
                    multiline
                    rows={2}
                    fullWidth
                    value={formData.lessonPlan}
                    onChange={handleChange}
                />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
            >
                <TextField
                    label="Learning Objectives"
                    name="learningObjectives"
                    multiline
                    rows={2}
                    fullWidth
                    value={formData.learningObjectives}
                    onChange={handleChange}
                />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.45 }}
            >
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
            </motion.div>

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
                    component={motion.div}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
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
            
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: 2, 
                mt: 3,
                position: 'sticky',
                bottom: 0,
                pb: 2,
                pt: 2,
                backgroundColor: theme.palette.background.paper,
                borderTop: `1px solid ${theme.palette.divider}`,
                zIndex: 1,
            }}
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            >
                <Button onClick={onClose} variant="outlined">
                    Cancel
                </Button>
                <Button 
                    variant="contained" 
                    onClick={handleSubmit} 
                    disabled={submitting}
                >
                    {submitting ? "Creating..." : "Create Lesson"}
                </Button>
            </Box>
        </Stack>
    );

    // Use Drawer for desktop and Dialog for mobile
    return (
        <>
            {!isMobile ? (
                <Drawer
                    anchor="right"
                    open={open}
                    onClose={onClose}
                    PaperProps={{
                        sx: {
                            width: { sm: '450px', md: '500px' },
                            borderRadius: '0',
                            boxShadow: '0 0 20px rgba(0,0,0,0.08)',
                            p: 0,
                        }
                    }}
                >
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        p: 1,
                        borderBottom: `1px solid ${theme.palette.divider}`
                    }}>
                        <IconButton onClick={onClose} edge="end" aria-label="close">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                    <Box sx={{ 
                        height: '100%', 
                        overflowY: 'auto',
                        pb: 8
                    }}>
                        {formContent}
                    </Box>
                </Drawer>
            ) : (
                <Dialog
                    fullScreen
                    open={open}
                    onClose={onClose}
                    TransitionComponent={Transition}
                >
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        p: 1,
                        borderBottom: `1px solid ${theme.palette.divider}`
                    }}>
                        <IconButton onClick={onClose} edge="end" aria-label="close">
                            <CloseIcon />
                        </IconButton>
                    </Box>
                    <Box sx={{ 
                        height: 'calc(100% - 48px)', 
                        overflowY: 'auto',
                        pb: 8
                    }}>
                        {formContent}
                    </Box>
                </Dialog>
            )}
        </>
    );
};

export default LessonSidePanel;