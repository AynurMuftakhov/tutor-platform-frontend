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
import MenuItem from "@mui/material/MenuItem";
import MenuBookIcon from "@mui/icons-material/MenuBook";

import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import {createStudent, deleteUser, fetchStudents, resetPasswordEmail, updateCurrentUser} from "../services/api";
import { useAuth } from '../context/AuthContext';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import {ENGLISH_LEVELS, EnglishLevel} from "../types/ENGLISH_LEVELS";
import StudentVocabularyModal from "../components/vocabulary/StudentVocabularyModal";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

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
    const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [emailToReset, setEmailToReset] = useState("");
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newStudent, setNewStudent] = useState({ name: "", email: "", level: "Beginner" as EnglishLevel });
    const [addLoading, setAddLoading] = useState(false);
    const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

    const [totalStudents, setTotalStudents] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(5);
    const [loading, setLoading] = useState(false);

    // State for vocabulary modal
    const [vocabularyModalOpen, setVocabularyModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(event.target.value);
    };

    const handleAddStudent = () => {
        setNewStudent({ name: "", email: "", level: "Beginner" as EnglishLevel });
        setEditingStudentId(null);
        setAddDialogOpen(true);
    };

    const handleEditStudent = (student: Student) => {
        setNewStudent({ name: student.name, email: student.email, level: student.level });
        setEditingStudentId(student.id);
        setAddDialogOpen(true);
    };

    const handleConfirmDelete = (student: Student) => {
        setStudentToDelete(student);
        setDeleteDialogOpen(true);
    };

    const handleDeleteClose = () => {
        setDeleteDialogOpen(false);
        setStudentToDelete(null);
    };

    const handleConfirmResetPassword = (student: Student) => {
        setEmailToReset(student.email);
        setResetPasswordDialogOpen(true);
    };

    const handleResetPasswordClose= () => {
        setResetPasswordDialogOpen(false);
        setStudentToDelete(null);
    };

    const handleResetPasswordConfirm = async () => {
        if (emailToReset) {
            try {
                setResetLoading(true);
                await resetPasswordEmail(emailToReset);
                setSnackbarMessage("Email has been successfully sent.");
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
            } catch (err) {
                console.error("Failed to send reset password email", err);
                setSnackbarMessage("Failed to send reset password email. Please try again.");
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
            } finally {
                setResetLoading(false);
                setResetPasswordDialogOpen(false);
                setEmailToReset("");
            }
        }
    };

    const handleDeleteConfirm = async () => {
        if (studentToDelete) {
            try {
                setDeleteLoading(true);
                await deleteUser(studentToDelete.id);
                setStudents((prev) => prev.filter((s) => s.id !== studentToDelete.id));
                setSnackbarMessage("Student successfully deleted.");
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
            } catch (err) {
                console.error("Failed to delete student", err);
                setSnackbarMessage("Failed to delete student. Please try again.");
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
            } finally {
                setDeleteLoading(false);
                setDeleteDialogOpen(false);
                setStudentToDelete(null);
            }
        }
    };

    // Handler for opening the vocabulary modal
    const handleViewVocabulary = (student: Student) => {
        setSelectedStudent(student);
        setVocabularyModalOpen(true);
    };

    const handleCreateStudent = async () => {
        try {
            setAddLoading(true);
            if (editingStudentId) {
                await updateCurrentUser(editingStudentId, newStudent);
                const data = await fetchStudents(user!.id, searchText, page, pageSize);
                setStudents(data.content);
                setTotalStudents(data.totalElements);
                setSnackbarMessage("Student updated successfully.");
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
            } else {
                await createStudent(user!.email, newStudent);
                const data = await fetchStudents(user!.id, searchText, page, pageSize);
                setStudents(data.content);
                setTotalStudents(data.totalElements);
                setSnackbarMessage("Student successfully added. Please remind them to check the email to set the password.");
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
            }
            setAddDialogOpen(false);
            setNewStudent({ name: "", email: "", level: "Beginner" as EnglishLevel });
            setEditingStudentId(null);
        } catch (err) {
            console.error("Failed to save student", err);
            setSnackbarMessage("Something went wrong. Please try again.");
            setSnackbarSeverity('error');
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
            field: "name",
            headerName: "Name",
            flex: 1,
            renderCell: (params: GridRenderCellParams<Student>) => (
                <Tooltip title={params.row.email}>
                    <Box display="flex" alignItems="center">
                        <Avatar
                            src={params.row.avatar}
                            alt={params.row.name}
                            sx={{
                                width: 32,
                                height: 32,
                                fontSize: 14,
                                bgcolor: theme => theme.palette.primary.light,
                                mr: 1
                            }}
                        />
                        <Typography fontWeight={600}>{params.row.name}</Typography>
                    </Box>
                </Tooltip>
            ),
        },
        {
            field: "email",
            headerName: "Email",
            flex: 1,
            renderCell: (params: GridRenderCellParams<Student>) => (
                <Typography variant="body2">{params.row.email}</Typography>
            )
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
            field: "actions",
            headerName: "Actions",
            width: 160,
            sortable: false,
            renderCell: (params) => {
                const student = params.row;
                return (
                    <Box display="flex" gap={1}>
                        <Tooltip title="Edit">
                            <IconButton
                                color="primary"
                                onClick={() => handleEditStudent(student)}
                                size="small"
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Vocabulary">
                            <IconButton
                                color="info"
                                onClick={() => handleViewVocabulary(student)}
                                size="small"
                            >
                                <MenuBookIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Send Reset Password Link">
                            <IconButton
                                color="info"
                                onClick={() => handleConfirmResetPassword(student)}
                                size="small"
                            >
                                <RestartAltIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                            <IconButton
                                color="error"
                                onClick={() => handleConfirmDelete(student)}
                                size="small"
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
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
                <Box sx={{ width: '100%', overflowX: 'auto', backgroundColor: '#fff' }}>
                  <Box sx={{ minWidth: 600 }}>
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
                        <Button onClick={handleDeleteClose} disabled={deleteLoading}>Cancel</Button>
                        <Button
                            onClick={handleDeleteConfirm}
                            color="error"
                            disabled={deleteLoading}
                        >
                            {deleteLoading ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Confirm Reset email Dialog */}
                <Dialog open={resetPasswordDialogOpen} onClose={handleResetPasswordClose}>
                    <DialogTitle>Resend password reset email</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            {`Are you sure you want to resent an email for resetting the password to "${
                                emailToReset ?? "this student"
                            }"?`}
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleResetPasswordClose} disabled={resetLoading}>Cancel</Button>
                        <Button
                            onClick={handleResetPasswordConfirm}
                            color="warning"
                            disabled={resetLoading}
                        >
                            {resetLoading ? "Sending email..." : "Resend"}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
                <DialogTitle>{editingStudentId ? "Edit Student" : "Add New Student"}</DialogTitle>
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
                    >
                        {Object.entries(ENGLISH_LEVELS).map(([key, val]) => (
                            <MenuItem key={key} value={key}>
                                {key} ({val.code})
                            </MenuItem>
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
                        {addLoading
                            ? (editingStudentId ? "Saving..." : "Adding...")
                            : (editingStudentId ? "Save" : "Add")
                        }
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
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            {/* Student Vocabulary Modal */}
            <StudentVocabularyModal
                open={vocabularyModalOpen}
                onClose={() => setVocabularyModalOpen(false)}
                student={selectedStudent}
            />
        </Box>
    );
};

export default MyStudentsPage;
