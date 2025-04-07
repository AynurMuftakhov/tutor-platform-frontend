import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Button,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Menu,
    Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {fetchStudents, deleteLesson, getLessons, fetchUserById} from "../services/api";
import AddLessonModal from "../components/AddLessonModal";
import { useAuth } from "../context/AuthContext";
import { Student } from "./MyStudentsPage";
import { useNavigate } from "react-router-dom";
import { FilterList } from "@mui/icons-material";
import {DataGrid, GridColDef, GridRenderCellParams} from "@mui/x-data-grid";

const LessonsPage = () => {
    const [lessons, setLessons] = useState([]);
    const { user } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [tutorsMap, setTutorsMap] = useState<Map<string, string>>(new Map());
    const [lessonToDelete, setLessonToDelete] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const statusFilterOpen = Boolean(anchorEl);

    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalLessons, setTotalLessons] = useState(0);
    const [loading, setLoading] = useState(false);

    const handleStatusFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleStatusFilterClose = () => {
        setAnchorEl(null);
    };

    const handleStatusSelect = (value: string) => {
        setStatus(value);
        setPage(0);
        handleStatusFilterClose();
    };

    const refreshLessons = async () => {
        setLoading(true);
        try {
            const studentId = user?.role === "student" ? user?.id : undefined;
            const tutorId = user?.role === "tutor" ? user?.id : undefined;
            const result = await getLessons(studentId as string, tutorId as string, status, page, pageSize);

            const lessons = result.content;
            setLessons(lessons);
            setTotalLessons(result.totalElements);

            if (user?.role === "student") {
                const uniqueTutorIds = Array.from(new Set(lessons.map((lesson: any) => lesson.tutorId)));

                const newMap = new Map<string, string>();

                await Promise.all(
                    uniqueTutorIds.map(async (id) => {
                        const name = await fetchTutorNameById(id as string);
                        if (name) newMap.set(id as string, name);
                    })
                );

                setTutorsMap(newMap);
            }
        } catch (e) {
            console.error("Failed to fetch lessons", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLesson = async () => {
        if (!lessonToDelete || !user) return;
        try {
            setDeleting(true);
            await deleteLesson(lessonToDelete.id);
            await refreshLessons();
            setLessonToDelete(null);
        } catch (e) {
            console.error("Failed to delete lesson", e);
        } finally {
            setDeleting(false);
        }
    };

    const getStudentById = (id: string) => {
        return students.find((s) => s.id === id);
    };

    const fetchTutorNameById = async (id: string): Promise<string | null> => {
        try {
            const data = await fetchUserById(id);
            return data.name;
        } catch (e) {
            console.error(`Failed to fetch tutor for ID ${id}`, e);
            return null;
        }
    };

    useEffect(() => {
        if (user) {
            refreshLessons();
        }
    }, [user, status, page, pageSize]);

    useEffect(() => {
        const loadStudents = async () => {
            const result = await fetchStudents(user!.id, "", 0, 100);
            setStudents(result.content || []);
        };

        if (user && user?.role === "tutor") loadStudents();

    }, [user]);

    const columns: GridColDef[] = [
        {
            field: "title",
            headerName: "Lesson",
            flex: 1,
        },
        user?.role === "student"
            ? {
                field: "tutorId",
                headerName: "Teacher",
                flex: 1,
                renderCell: (params: GridRenderCellParams<any>) => {
                    return tutorsMap.get(params.value) || "Unknown";
                },
            }
            : {
                field: "studentId",
                headerName: "Student",
                flex: 1,
                renderCell: (params: GridRenderCellParams<any>) => {
                    const student = getStudentById(params.value);
                    return student ? student.name : "Unknown";
                },
            },
        {
            field: "dateTime",
            headerName: "Date",
            width: 180,
            valueFormatter: (params) => {
                return new Date(params).toLocaleString();
            }
        },
        {
            field: "status",
            headerName: "Status",
            width: 140,
            renderHeader: () => (
                <Box display="flex" alignItems="center">
                    Status
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
                </Box>
            ),
        },
        {
            field: "homework",
            headerName: "Homework",
            width: 120,
            renderCell: (params) => (
                params.value ? <Chip label="Yes" color="success" /> : <Chip label="No" color="default" />
            ),
        },
        {
            field: "actions",
            headerName: "Actions",
            width: 130,
            sortable: false,
            renderCell: (params) => (
                <Box>
                    <Button
                        size="small"
                        onClick={() =>
                            navigate(`/lessons/${params.row.id}`, {
                                state: { student: getStudentById(params.row.studentId) },
                            })
                        }
                    >
                        View
                    </Button>
                    {user?.role === "tutor" && (
                    <Button
                        size="small"
                        color="error"
                        onClick={(e) => {
                            e.stopPropagation();
                            setLessonToDelete(params.row);
                        }}
                    >
                        Delete
                    </Button>)}
                </Box>
            ),
        },
    ];

    return (
        <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h5" fontWeight={600}>
                    Lessons
                </Typography>
                {user?.role === "tutor" && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsModalOpen(true)}>
                    Add Lesson
                </Button>)
                }
            </Box>

            <Box sx={{ height: 520, backgroundColor: "#fff" }}>
                <DataGrid
                    rows={lessons}
                    columns={columns}
                    rowCount={totalLessons}
                    loading={loading}
                    paginationMode="server"
                    paginationModel={{ page, pageSize }}
                    onPaginationModelChange={({ page, pageSize }) => {
                        setPage(page);
                        setPageSize(pageSize);
                    }}
                    pageSizeOptions={[5, 10, 25]}
                    disableRowSelectionOnClick
                    getRowId={(row) => row.id}
                />
            </Box>

            <AddLessonModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={() => user?.id && refreshLessons()}
                students={students}
            />

            {lessonToDelete && (
                <Dialog open onClose={() => setLessonToDelete(null)}>
                    <DialogTitle>Delete Lesson</DialogTitle>
                    <DialogContent>
                        Are you sure you want to delete the lesson with{" "}
                        <strong>{getStudentById(lessonToDelete.studentId)?.name || "Unknown"}</strong>?
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
            )}
        </Box>
    );
};

export default LessonsPage;