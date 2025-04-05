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
    MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Menu,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {getUpcomingLessons, getHistoryLessons, fetchStudents, deleteLesson, getLessons} from '../services/api';
import AddLessonModal from "../components/AddLessonModal";
import { useAuth } from "../context/AuthContext";
import {Student} from "./MyStudentsPage";
import { useNavigate } from "react-router-dom";
import {FilterList} from "@mui/icons-material";

const LessonsPage = () => {
    const [lessons, setLessons] = useState([]);
    const { user } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState("SCHEDULED");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [students, setStudents] = useState<Student[]>([]);

    const [lessonToDelete, setLessonToDelete] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const statusFilterOpen = Boolean(anchorEl);

    const handleStatusFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleStatusFilterClose = () => {
        setAnchorEl(null);
    };

    const handleStatusSelect = (value: string) => {
        setStatus(value);
        handleStatusFilterClose();
    };

    const refreshLessons = async (userId: string, status: string) => {
        const lessonsData = await getLessons(userId, status)
        setLessons(lessonsData);
    };

    const handleDeleteLesson = async () => {
        if (!lessonToDelete || !user) return;
        try {
            setDeleting(true);
            await deleteLesson(lessonToDelete.id);
            await refreshLessons(user.id, status);
            setLessonToDelete(null);
        } catch (e) {
            console.error("Failed to delete lesson", e);
        } finally {
            setDeleting(false);
        }
    };

    const getStudentName = (id: string) => {
        return students.find((s) => s.id === id)?.name || "Unknown";
    }

    useEffect(() => {
        if (user) {
            refreshLessons(user.id, status);
        }
    }, [user, status]);

    useEffect(() => {
        const loadStudents = async () => {
            const result = await fetchStudents(user!.id, "", 0, 100);
            setStudents(result.content || []);
        };

        loadStudents();
    }, [user]);

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

                <Paper>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Lesson</TableCell>
                                    <TableCell>Student</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>
                                        Status{" "}
                                        <IconButton size="small" onClick={handleStatusFilterClick}>
                                            <FilterList fontSize="small" />
                                        </IconButton>
                                        <Menu
                                            anchorEl={anchorEl}
                                            open={statusFilterOpen}
                                            onClose={handleStatusFilterClose}
                                        >
                                            <MenuItem onClick={() => handleStatusSelect("SCHEDULED")}>Scheduled</MenuItem>
                                            <MenuItem onClick={() => handleStatusSelect("COMPLETED")}>Completed</MenuItem>
                                            <MenuItem onClick={() => handleStatusSelect("CANCELED")}>Canceled</MenuItem>
                                            <MenuItem onClick={() => handleStatusSelect("")}>All</MenuItem>
                                        </Menu>
                                    </TableCell>
                                    <TableCell>Homework</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {lessons.map((lesson: any) => {
                                    const student = students.find((s) => s.id === lesson.studentId);

                                    return (
                                        <TableRow
                                            key={lesson.id}
                                            hover
                                            sx={{ cursor: "pointer" }}
                                            onClick={() => {
                                                navigate(`/lessons/${lesson.id}`, {
                                                    state: { student },
                                                });
                                            }}
                                        >
                                            <TableCell>{lesson.title}</TableCell>
                                            <TableCell>{student?.name || "Unknown"}</TableCell>
                                            <TableCell>{new Date(lesson.dateTime).toLocaleString()}</TableCell>
                                            <TableCell>{lesson.status}</TableCell>
                                            <TableCell>{lesson.homework ? "Yes" : "No"}</TableCell>
                                            <TableCell>
                                                <Button size="small">Edit</Button>
                                                <Button
                                                    size="small"
                                                    color="error"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // prevent row click navigation
                                                        setLessonToDelete(lesson);
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
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
                students={students}
            />

            {lessonToDelete && (
                <Box>
                    <Dialog open onClose={() => setLessonToDelete(null)}>
                        <DialogTitle>Delete Lesson</DialogTitle>
                        <DialogContent>
                            Are you sure you want to delete the lesson with <b>{getStudentName(lessonToDelete.studentId)}</b>?
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setLessonToDelete(null)}>Cancel</Button>
                            <Button
                                onClick={handleDeleteLesson}
                                color="error"
                                variant="contained"
                                disabled={deleting}
                            >
                                {deleting ? "Deleting..." : "Delete"}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            )}
        </Box>
    );
};

export default LessonsPage;