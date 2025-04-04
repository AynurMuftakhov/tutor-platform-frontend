import React, {useState, useMemo, useEffect} from "react";
import {
    Box,
    Button,
    Typography,
    TextField,
    Avatar,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Chip, Tooltip,
} from "@mui/material";

import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import MainLayout from "../layout/MainLayout";
import {createStudent, fetchStudents} from "../services/api";
import { useAuth } from '../context/AuthContext';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import {ENGLISH_LEVELS, EnglishLevel} from "../types/ENGLISH_LEVELS";

// Extended Student type
export interface Student {
    id: string;
    avatar?: string;
    name: string;
    email: string;
    level: EnglishLevel;
    homeworkDone: boolean;
    nextLesson?: string;
}
const MyStudentsPage: React.FC = () => {
    const { user }  = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [searchText, setSearchText] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newStudent, setNewStudent] = useState({ name: "", email: "", level: "Beginner" as EnglishLevel });
    const [addLoading, setAddLoading] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    const [totalStudents, setTotalStudents] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(5);
    const [loading, setLoading] = useState(false);

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(event.target.value);
    };

    const handleAddStudent = () => {
        setAddDialogOpen(true);
    };

    const handleEditStudent = (student: Student) => {
        alert(`Editing student: ${student.name}`);
    };

    const handleConfirmDelete = (student: Student) => {
        setStudentToDelete(student);
        setDeleteDialogOpen(true);
    };

    const handleDeleteClose = () => {
        setDeleteDialogOpen(false);
        setStudentToDelete(null);
    };

    const handleDeleteConfirm = () => {
        if (studentToDelete) {
            setStudents((prev) => prev.filter((s) => s.id !== studentToDelete.id));
        }
        setDeleteDialogOpen(false);
        setStudentToDelete(null);
    };

    const handleCreateStudent = async () => {
        try {
            setAddLoading(true);
            await createStudent(user!.email, newStudent);
            setAddDialogOpen(false);
            setNewStudent({ name: "", email: "", level: "Beginner" as EnglishLevel });
            // Reload students after adding
            const data = await fetchStudents(user!.id, searchText, page, pageSize);
            setStudents(data.content);
            setTotalStudents(data.totalElements);

            setSnackbarMessage("Student successfully added. Please remind him to check the email to set the password.");
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Failed to add student", err);
            setSnackbarMessage("Something went wrong. Please try again.");
            setSnackbarOpen(true);
        } finally {
            setAddLoading(false);
        }
    };

    useMemo(() => {
        if (!searchText) return students;
        const lower = searchText.toLowerCase();
        return students.filter(
            (s) =>
                s.name.toLowerCase().includes(lower) ||
                s.email.toLowerCase().includes(lower)
        );
    }, [students, searchText]);

    useEffect(() => {
        if (!user){
            return
        }
        const loadStudents = async () => {
            try {
                setLoading(true);
                const data = await fetchStudents(user?.id, searchText, page, pageSize);
                setStudents(data.content);
                setTotalStudents(data.totalElements);
            } catch (err) {
                console.error("Failed to load students", err);
            } finally {
                setLoading(false);
            }
        };

        loadStudents();
    }, [user, searchText, page, pageSize]);

    const columns: GridColDef<Student>[] = [
        {
            field: "avatar",
            headerName: "",
            width: 60,
            sortable: false,
            renderCell: (params: GridRenderCellParams<Student>) => (
                <Avatar src={params.row.avatar} alt={params.row.name} />
            ),
        },
        {
            field: "name",
            headerName: "Name",
            flex: 1,
        },
        {
            field: "email",
            headerName: "Email",
            flex: 1,
        },
        {
            field: "level",
            headerName: "Level",
            width: 140,
            renderCell: (params: GridRenderCellParams<Student>) => {
                const level = params.row.level;
                const levelInfo = ENGLISH_LEVELS[level];

                return (
                    <Tooltip title={levelInfo?.description || ""}>
                        <Chip
                            label={`${level} (${levelInfo?.code})`}
                            sx={{
                                backgroundColor: "#f0f4ff",
                                color: "#1e3a8a",
                                fontWeight: 600,
                                borderRadius: "8px",
                                px: 1.5,
                            }}
                            size="small"
                        />
                    </Tooltip>
                );
            }
        },
        {
            field: "homeworkDone",
            headerName: "Homework",
            width: 130,
            renderCell: (params: GridRenderCellParams<Student>) =>
                params.row.homeworkDone ? (
                    <Chip label="Done" color="success" />
                ) : (
                    <Chip label="Missing" color="error" />
                ),
        },
        {
            field: "nextLesson",
            headerName: "Next Lesson",
            width: 150,
        },
        {
            field: "actions",
            headerName: "Actions",
            width: 120,
            sortable: false,
            renderCell: (params) => {
                const student = params.row;
                return (
                    <Box>
                        <IconButton
                            color="primary"
                            onClick={() => handleEditStudent(student)}
                            size="small"
                            sx={{ mr: 1 }}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            color="error"
                            onClick={() => handleConfirmDelete(student)}
                            size="small"
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                );
            },
        },
    ];

    return (
        <Box>
            <Box sx={{ p: 2 }}>
                {/* Title & Add Button */}
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                    }}
                >
                    <Typography variant="h5" fontWeight="bold">
                        My Students
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<PersonAddIcon />}
                        onClick={handleAddStudent}
                    >
                        Add Student
                    </Button>
                </Box>

                {/* Search */}
                <Box sx={{ mb: 2, maxWidth: 300 }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Search by name or email"
                        variant="outlined"
                        value={searchText}
                        onChange={handleSearch}
                    />
                </Box>

                {/* DataGrid */}
                <Box sx={{ height: 500, backgroundColor: "#fff" }}>
                    <DataGrid<Student>
                        rows={students}
                        columns={columns}
                        rowCount={totalStudents}
                        loading={loading}
                        paginationMode="server"
                        paginationModel={{ pageSize, page }}
                        onPaginationModelChange={(model) => {
                            setPage(model.page);
                            setPageSize(model.pageSize);
                        }}
                        pageSizeOptions={[5, 10, 25]}
                        disableRowSelectionOnClick
                        autoHeight
                    />
                </Box>

                {/* Confirm Delete Dialog */}
                <Dialog open={deleteDialogOpen} onClose={handleDeleteClose}>
                    <DialogTitle>Delete Student</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            {`Are you sure you want to remove "${
                                studentToDelete?.name ?? "this student"
                            }"?`}
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleDeleteClose}>Cancel</Button>
                        <Button onClick={handleDeleteConfirm} color="error">
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
                <DialogTitle>Add New Student</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Name"
                        fullWidth
                        margin="dense"
                        value={newStudent.name}
                        onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    />
                    <TextField
                        label="Email"
                        fullWidth
                        margin="dense"
                        value={newStudent.email}
                        onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    />
                    <TextField
                        label="Level"
                        select
                        fullWidth
                        margin="dense"
                        value={newStudent.level}
                        onChange={(e) =>
                            setNewStudent({ ...newStudent, level: e.target.value as EnglishLevel })
                        }
                        SelectProps={{ native: true }}
                    >
                        {Object.entries(ENGLISH_LEVELS).map(([key, val]) => (
                            <option key={key} value={key}>
                                {key} ({val.code})
                            </option>
                        ))}
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleCreateStudent}
                        variant="contained"
                        disabled={addLoading}
                    >
                        {addLoading ? "Adding..." : "Add"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={5000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity="success"
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default MyStudentsPage;