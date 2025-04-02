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
} from "@mui/material";
import { createLesson } from "../services/api";
import DateTimeInput from "./DateTimeInput";
import dayjs from "dayjs";
import {Student} from "../pages/MyStudentsPage";
import {useAuth} from "../context/AuthContext";

interface AddLessonModalProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
    students: Student[];
}

const AddLessonModal: React.FC<AddLessonModalProps> = ({ open, onClose, onCreated, students }) => {
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [submitting] = useState(false);
    const [hasCustomTitle, setHasCustomTitle] = useState(false);
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        title: "",
        studentId: "",
        dateTime: "",
        duration: 60,
        location: "",
        lessonPlan: "",
        learningObjectives: "",
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
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.title.trim()) newErrors.title = "Title is required";
        if (!formData.studentId) newErrors.studentId = "Student is required";
        if (!formData.dateTime) newErrors.dateTime = "Date and time is required";
        if (!formData.duration || formData.duration <= 0) newErrors.duration = "Duration must be a positive number";
        if (!formData.location.trim()) newErrors.location = "Location is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        await createLesson({
            ...formData,
            tutorId: user!.id,
            duration: parseInt(formData.duration.toString()),
        });

        onCreated();
        onClose();
    };

    useEffect(() => {
        const getStudentName = (id: string): string => {
            const student = students.find((s) => s.id === id);
            return student ? student.name : "";
        };

        if (hasCustomTitle) return;

        const studentName = getStudentName(formData.studentId);
        const date = dayjs(formData.dateTime);

        if (studentName && date.isValid() && formData.duration) {
            const formattedDate = date.format("DD MMM, HH:mm"); // e.g. 02 Apr, 16:00
            const newTitle = `${studentName} – ${formattedDate} – ${formData.duration} min`;
            setFormData((prev) => ({ ...prev, title: newTitle }));
        }
    }, [formData.studentId, formData.dateTime, formData.duration, hasCustomTitle, students]);

    useEffect(() => {
        if (open) {
            setFormData({
                title: "",
                studentId: "",
                dateTime: "",
                duration: 60,
                location: "",
                lessonPlan: "",
                learningObjectives: "",
            });
            setErrors({});
        }
    }, [open]);

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
                                {student.name} ({student.email})
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