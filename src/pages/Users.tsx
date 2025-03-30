import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    Box,
    Typography,
    Grid,
    TextField,
    Button,
    Select,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Pagination,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle
} from '@mui/material';
import MainLayout from "../layout/MainLayout";

const Users: React.FC = () => {
    const [users, setUsers] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [loading, setLoading] = useState(false);
    const [itemsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [userFormData, setUserFormData] = useState({ id: null, name: '', email: '', role: '' });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get(`users-service/api/users?page=${currentPage - 1}&size=${itemsPerPage}&search=${searchQuery}&role=${selectedRole}`);
            setUsers(response.data.content);
            setTotalPages(response.data.totalPages);
            setTotalUsers(response.data.totalElements);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [currentPage, itemsPerPage, searchQuery, selectedRole]);

    const openDialog = (user = null) => {
        setUserFormData(user || { id: null, name: '', email: '', role: '' });
        setIsEditMode(Boolean(user));
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
    };

    const handleSaveUser = async () => {
        try {
            if (isEditMode) {
                await api.put(`/users/${userFormData.id}`, userFormData);
            } else {
                await api.post('/users', userFormData);
            }
            fetchUsers();
            closeDialog();
        } catch (error) {
            console.error('Error saving user:', error);
        }
    };

    return (
        <MainLayout>
            <Box sx={{ padding: 3 }}>
                {/* Header */}
                <Typography variant="h4" gutterBottom>
                    My Students
                </Typography>

                {/* Filters and Actions */}
                <Grid container spacing={2} alignItems="center" marginBottom={3}>
                    <Grid item xs={12} sm={6} md={4}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            label="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Select
                            fullWidth
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            displayEmpty
                        >
                            <MenuItem value="">All Roles</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="teacher">Teacher</MenuItem>
                            <MenuItem value="student">Student</MenuItem>
                        </Select>
                    </Grid>
                    <Grid item xs={12} sm={12} md={4} textAlign="right">
                        <Button variant="contained" onClick={() => openDialog()}>
                            Add Student
                        </Button>
                    </Grid>
                </Grid>

                {/* User Table */}
                {loading ? (
                    <CircularProgress />
                ) : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.map((user: any) => (
                                    <TableRow key={user.id}>
                                        <TableCell>{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{user.role}</TableCell>
                                        <TableCell>
                                            <Button color="primary" onClick={() => openDialog(user)}>
                                                Edit
                                            </Button>
                                            <Button color="error" onClick={() => console.log('Delete')}>
                                                Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* Footer */}
                <Grid container spacing={2} alignItems="center" marginTop={3}>
                    <Grid item xs={12} sm={6}>
                        <Typography>Total Students: {totalUsers}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} textAlign="right">
                        <Pagination
                            count={totalPages}
                            page={currentPage}
                            onChange={(e, page) => setCurrentPage(page)}
                            color="primary"
                        />
                    </Grid>
                </Grid>

                {/* Dialog */}
                <Dialog open={isDialogOpen} onClose={closeDialog}>
                    <DialogTitle>{isEditMode ? 'Edit User' : 'Create User'}</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Name"
                            name="name"
                            value={userFormData.name}
                            onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            margin="dense"
                            label="Email"
                            name="email"
                            value={userFormData.email}
                            onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                            fullWidth
                        />
                        {/* Role Dropdown */}
                        <Select
                            value={userFormData.role}
                            onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                            fullWidth
                            displayEmpty
                            margin="dense"
                            sx={{ marginTop: 2 }}
                        >
                            <MenuItem value="" disabled>
                                Select Role
                            </MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="teacher">Teacher</MenuItem>
                            <MenuItem value="student">Student</MenuItem>
                        </Select>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeDialog}>Cancel</Button>
                        <Button onClick={handleSaveUser} color="primary">
                            Save
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>

        </MainLayout>
    );
};

export default Users;