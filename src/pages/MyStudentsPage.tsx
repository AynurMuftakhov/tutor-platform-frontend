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
    Chip, Tooltip, Paper,
} from "@mui/material";
import MenuItem from "@mui/material/MenuItem";
import MenuBookIcon from "@mui/icons-material/MenuBook";

import { DataGrid, GridColDef, GridRenderCellParams, GridToolbarContainer, GridToolbarColumnsButton, GridToolbarDensitySelector, GridToolbarExport } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import LinkIcon from "@mui/icons-material/Link";
import {createStudent, deleteUser, fetchStudents, resetPasswordEmail, updateCurrentUser, generateMagicLink} from "../services/api";
import { useAuth } from '../context/AuthContext';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import {ENGLISH_LEVELS, EnglishLevel} from "../types/ENGLISH_LEVELS";
import StudentVocabularyModal from "../components/vocabulary/StudentVocabularyModal";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useNavigate } from "react-router-dom";

// Custom DataGrid toolbar without Filters and Quick Filter — only Columns, Density, Export
const CustomToolbar: React.FC = () => (
    <GridToolbarContainer>
        <GridToolbarColumnsButton />
        <GridToolbarDensitySelector />
        <GridToolbarExport />
    </GridToolbarContainer>
);

// Extended Student type
export interface Student {
    id: string;
    avatar?: string;
    name: string;
    email?: string;
    level: EnglishLevel;
    homeworkDone: boolean;
    nextLesson?: string;
}

type NewStudentForm = { name: string; email?: string; level: EnglishLevel };
const MyStudentsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user }  = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [searchText, setSearchText] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [emailToReset, setEmailToReset] = useState("");
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newStudent, setNewStudent] = useState<NewStudentForm>({ name: "", email: "", level: "Beginner" as EnglishLevel });
    const [addLoading, setAddLoading] = useState(false);
    const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

    // Invite link dialog
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteLink, setInviteLink] = useState<string>('');

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
        setNewStudent({ name: student.name, email: student.email ?? "", level: student.level });
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
        if (!student.email) {
            setSnackbarMessage("This student has no email.");
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            setResetPasswordDialogOpen(false);
            setEmailToReset("");
            return;
        }
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
            // Validate email if present
            const trimmedEmail = (newStudent.email || '').trim();
            if (trimmedEmail.length > 0) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(trimmedEmail)) {
                    setSnackbarMessage("Please enter a valid email or leave it empty.");
                    setSnackbarSeverity('error');
                    setSnackbarOpen(true);
                    return;
                }
            }

            if (editingStudentId) {
                await updateCurrentUser(editingStudentId, { ...newStudent, email: trimmedEmail || undefined });
                const data = await fetchStudents(user!.id, searchText, page, pageSize);
                setStudents(data.content);
                setTotalStudents(data.totalElements);
                setSnackbarMessage("Student updated successfully.");
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
            } else {
                const created = await createStudent(user!.email, { name: newStudent.name, email: trimmedEmail || undefined, level: newStudent.level });
                const data = await fetchStudents(user!.id, searchText, page, pageSize);
                setStudents(data.content);
                setTotalStudents(data.totalElements);

                if (!trimmedEmail) {
                    try {
                        const { link } = await generateMagicLink(created.id);
                        setInviteLink(link);
                        setInviteDialogOpen(true);
                        setSnackbarMessage("Invite link ready — copy and send to the student.");
                    } catch (err) {
                        console.error('Failed to generate link after creation', err);
                        setSnackbarMessage('Student added. Failed to generate invite link. You can retry from actions.');
                    } finally {
                        setSnackbarSeverity('success');
                        setSnackbarOpen(true);
                    }
                } else {
                    setSnackbarMessage("Email sent to set password.");
                    setSnackbarSeverity('success');
                    setSnackbarOpen(true);
                }
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
                (s.email ? s.email.toLowerCase().includes(lower) : false)
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
                <Tooltip title={params.row.email || ''}>
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
            renderCell: (params: GridRenderCellParams<Student>) => {
                const email = params.row.email;
                if (!email) {
                    return (
                        <Chip
                            label="link-only"
                            size="small"
                            sx={{ bgcolor: (theme) => theme.palette.action.hover, color: (theme) => theme.palette.text.secondary }}
                        />
                    );
                }
                return <Typography variant="body2">{email}</Typography>;
            }
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
                                onClick={(e) => { e.stopPropagation(); handleEditStudent(student); }}
                                size="small"
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Vocabulary">
                            <IconButton
                                color="info"
                                onClick={(e) => { e.stopPropagation(); handleViewVocabulary(student); }}
                                size="small"
                            >
                                <MenuBookIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        {student.email && (
                            <Tooltip title="Send password reset email">
                                <IconButton
                                    color="info"
                                    onClick={(e) => { e.stopPropagation(); handleConfirmResetPassword(student); }}
                                    size="small"
                                >
                                    <RestartAltIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip title="Invite / Copy link (single-use)">
                            <IconButton
                                color="primary"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                        const { link } = await generateMagicLink(student.id);
                                        setInviteLink(link);
                                        setInviteDialogOpen(true);
                                    } catch (err) {
                                        console.error('Failed to generate link', err);
                                        setSnackbarMessage('Failed to generate link. Please try again.');
                                        setSnackbarSeverity('error');
                                        setSnackbarOpen(true);
                                    }
                                }}
                                size="small"
                            >
                                <LinkIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                            <IconButton
                                color="error"
                                onClick={(e) => { e.stopPropagation(); handleConfirmDelete(student); }}
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
        <Box  sx={{
            bgcolor: '#fafbfd',
        }}>
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

                <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
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
                <Box sx={{ width: '100%', overflowX: 'auto', overflowY: 'auto', maxHeight: { xs: 'calc(100% - 240px)', md: 'calc(100% - 260px)' }, backgroundColor: (theme) => theme.palette.background.paper }}>
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
                        onRowClick={(params) => navigate(`/students/${params.row.id}`)}
                        pageSizeOptions={[5, 10, 25]}
                        disableRowSelectionOnClick
                        slots={{ toolbar: CustomToolbar }}
                        autoHeight
                        sx={{
                            border: 'none',
                            cursor: 'pointer',
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: (theme) => theme.palette.action.hover,
                            },
                        }}
                    />
                  </Box>
                </Box>
                </Paper>

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

            {/* Invite / Copy Link Dialog */}
            <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)}>
                <DialogTitle>Student Invite Link</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Share this link with the student (WhatsApp/Telegram). The link can be used once.
                    </DialogContentText>
                    <TextField
                        fullWidth
                        label="Magic link"
                        value={inviteLink}
                        InputProps={{ readOnly: true }}
                        margin="dense"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInviteDialogOpen(false)}>Close</Button>
                    <Button
                        variant="contained"
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(inviteLink);
                                setSnackbarMessage('Link copied to clipboard');
                                setSnackbarSeverity('success');
                                setSnackbarOpen(true);
                            } catch {
                                setSnackbarMessage('Failed to copy. Select and copy manually.');
                                setSnackbarSeverity('error');
                                setSnackbarOpen(true);
                            }
                        }}
                        disabled={!inviteLink}
                    >
                        Copy
                    </Button>
                </DialogActions>
            </Dialog>

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
                        label="Email (optional)"
                        fullWidth
                        margin="dense"
                        value={newStudent.email ?? ""}
                        onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                        helperText="Leave empty if inviting via direct link."
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
