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
    Chip,
} from "@mui/material";

import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import MainLayout from "../layout/MainLayout";
import {fetchStudents} from "../services/api";
import { useAuth } from '../context/AuthContext';

// Extended Student type
export interface Student {
    id: number;
    avatar?: string;
    name: string;
    email: string;
    level: "Beginner" | "Intermediate" | "Advanced";
    homeworkDone: boolean;
    nextLesson?: string;
}

const MyStudentsPage: React.FC = () => {
    const { user }  = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [searchText, setSearchText] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

    const [totalStudents, setTotalStudents] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(5);
    const [loading, setLoading] = useState(false);

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(event.target.value);
    };

    const handleAddStudent = () => {
        alert("Open a dialog to add a new student here!");
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

                const levelStyles: Record<
                    Student["level"],
                    { label: string; color: string; textColor: string }
                > = {
                    Beginner: {
                        label: "Beginner",
                        color: "#d0b2ef",
                        textColor: "#4c1d95",
                    },
                    Intermediate: {
                        label: "Intermediate",
                        color: "#b7d1ed",
                        textColor: "#1e3a8a",
                    },
                    Advanced: {
                        label: "Advanced",
                        color: "#93e1a9",
                        textColor: "#065f46",
                    },
                };

                // Fallback if level is undefined or unexpected
                const style = levelStyles[level] ?? {
                    label: level ?? "Unknown",
                    color: "#e5e7eb", // gray
                    textColor: "#374151", // dark gray
                };

                return (
                    <Chip
                        label={style.label}
                        sx={{
                            backgroundColor: style.color,
                            color: style.textColor,
                            fontWeight: 600,
                            borderRadius: "8px",
                            px: 1.5,
                        }}
                        size="small"
                    />
                );
            },
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
        <MainLayout>
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
        </MainLayout>
    );
};

export default MyStudentsPage;