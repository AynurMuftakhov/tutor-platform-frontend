import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableContainer,
    TextField,
    MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {getUpcomingLessons, getHistoryLessons} from '../services/api';
import AddLessonModal from "../components/AddLessonModal";
import { useAuth } from "../context/AuthContext";

const LessonsPage = () => {
    const [lessons, setLessons] = useState([]);
    const { user } = useAuth();
    const [status, setStatus] = useState("SCHEDULED");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const refreshLessons = async (userId: string, status: string) => {
        const lessonsData =
            status === "SCHEDULED"
                ? await getUpcomingLessons(userId)
                : await getHistoryLessons(userId);
        setLessons(lessonsData);
    };

    useEffect(() => {
        if (user) {
            refreshLessons(user.id, status);
        }
    }, [user, status]);

    return (
        <Box>
            <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="h5" fontWeight={600}>
                        Lessons
                    </Typography>

                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsModalOpen(true)}>
                        Add Lesson
                    </Button>
                </Box>

                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                    <TextField
                        label="Filter by Status"
                        select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        size="small"
                        sx={{ width: 200 }}
                    >
                        <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                        <MenuItem value="COMPLETED">Completed</MenuItem>
                        <MenuItem value="CANCELED">Canceled</MenuItem>
                    </TextField>
                </Box>

                <Paper>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Lesson</TableCell>
                                    <TableCell>Student</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Homework</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {lessons.map((lesson: any) => (
                                    <TableRow key={lesson.id}>
                                        <TableCell>{lesson.title}</TableCell>
                                        <TableCell>{lesson.studentName}</TableCell>
                                        <TableCell>{new Date(lesson.dateTime).toLocaleString()}</TableCell>
                                        <TableCell>{lesson.status}</TableCell>
                                        <TableCell>{lesson.homework ? "Yes" : "No"}</TableCell>
                                        <TableCell>
                                            {/* Future: edit/delete buttons here */}
                                            <Button size="small">Edit</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {lessons.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            No lessons found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Box>

            <AddLessonModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={() => user?.id && refreshLessons(user?.id, status)}
            />
        </Box>
    );
};

export default LessonsPage;