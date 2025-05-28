import React, {useState, useEffect} from 'react';
import {
    Avatar,
    Box,
    Typography,
    IconButton,
    Card,
    Grid,
    List,
    ListItem,
    ListItemText,
    Divider,
    Snackbar,
    Alert,
    Tabs,
    Tab,
    TextField,
    CircularProgress, Button,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import api, {getHistoryLessons, getUpcomingLessons, updateUserProfile} from '../services/api';
import { useAuth } from '../context/AuthContext';
import MainLayout from "../layout/MainLayout";

const Profile: React.FC = () => {
    const {user, updateUser} = useAuth();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        avatar: user?.avatar || '',
    });
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
    const [newAvatar, setNewAvatar] = useState<File | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
    const [isEditingName, setIsEditingName] = useState(false);
    const [loading, setLoading] = useState(false);

    const resolvedAvatar =
        avatarPreview && avatarPreview !== ''
            ? avatarPreview
            : user?.avatar
                ? user.avatar.startsWith('/avatars')
                    ? `/users-service${user.avatar}`
                    : user.avatar
                : undefined;

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            // Track the new avatar file
            setNewAvatar(file);
            e.target.value = ''
        }
    };

    const handleSaveAvatar = async () => {
        if (!newAvatar || !user) return;

        setLoading(true);
        try {
            const response = await updateUserProfile(user.email, formData.name, formData.email, newAvatar);

            // Update user context and reset new avatar state
            updateUser({ avatar: response.avatar });
            setFormData((prev) => ({ ...prev, avatar: response.avatar }));
            setNewAvatar(null);
            setSnackbarMessage('Avatar updated successfully!');
            setSnackbarSeverity('success');
        } catch (error: any) {
            setSnackbarMessage('Failed to update avatar. Please try again.');
            setSnackbarSeverity('error');
        } finally {
            setLoading(false);
            setSnackbarOpen(true);
        }
    };

    const handleCancelAvatar = () => {
        // Revert to the original avatar
        if (api.defaults.baseURL) {
            setAvatarPreview(`${api.defaults.baseURL.replace('/api', '')}${formData.avatar}`);
        }
        setNewAvatar(null);
    };

    const handleUpdateProfile = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const updatedUser = await updateUserProfile(user.email, formData.name, formData.email);
            updateUser({ name: updatedUser.name });

            setSnackbarMessage('Profile updated successfully!');
            setSnackbarSeverity('success');
        } catch (error: any) {
            setSnackbarMessage(error.response?.data?.message || 'Failed to update profile.');
            setSnackbarSeverity('error');
        } finally {
            setLoading(false);
            setSnackbarOpen(true);
        }
    };

    const handleNameEditToggle = () => {
        if (isEditingName) {
            handleUpdateProfile(); // Save changes when toggling off
        }
        setIsEditingName(!isEditingName);
    };

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, padding: 3 }}>
                {/* Left Sidebar */}
                <Box sx={{
                        width: { xs: '100%', md: '25%' },
                        backgroundColor: '#f8f9fa',
                        borderRadius: 2,
                        padding: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}>
                    {/* Avatar with Edit Icon */}
                    <Box sx={{ position: 'relative', marginBottom: 2 }}>
                        <Avatar
                            src={resolvedAvatar}
                            alt={user?.name || 'User'}
                            sx={{ width: { xs: 120, sm: 160, md: 200 }, height: { xs: 120, sm: 160, md: 200 } }}
                        />
                        <IconButton
                            component="label"
                            sx={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                backgroundColor: 'white',
                                boxShadow: 1,
                            }}
                        >
                            <EditIcon fontSize="small" />
                            <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={handleAvatarChange}
                            />
                        </IconButton>
                    </Box>

                    {/* Show Save/Cancel Buttons if New Avatar is Selected */}
                    {newAvatar && (
                        <Box sx={{ display: 'flex', gap: 1, marginBottom: 2 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleSaveAvatar}
                                disabled={loading}
                            >
                                {loading ? <CircularProgress size={20} /> : <CheckIcon />}
                                Save
                            </Button>
                            <Button variant="outlined" color="error" onClick={handleCancelAvatar}>
                                <CloseIcon />
                                Cancel
                            </Button>
                        </Box>
                    )}

                    <Typography variant="subtitle2" color="text.primary">
                        email: {user?.email}
                    </Typography>

                    {/* Editable Name Field */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 2 }}>
                        {isEditingName ? (
                            <TextField
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                size="small"
                            />
                        ) : (
                            <Typography variant="h6">{user?.name}</Typography>
                        )}
                        <IconButton
                            component="label"
                            onClick={handleNameEditToggle}
                            sx={{
                                position: 'relative',
                                bottom: 0,
                                right: 0,
                                backgroundColor: 'white',
                                boxShadow: 1,
                                width:35,
                                height: 35
                            }}
                        >
                            {isEditingName ? <CheckIcon color="success" /> : <EditIcon fontSize="small"/>}
                        </IconButton>
                        {isEditingName && (
                            <IconButton onClick={() => setIsEditingName(false)}>
                                <CloseIcon color="error" />
                            </IconButton>
                        )}
                    </Box>

                    <Typography variant="subtitle2" color="text.secondary">
                        {user?.role || 'N/A'}
                    </Typography>
                </Box>

                {/* Right Content */}
                <Box sx={{ flex: 1 }}>

                {/* Snackbar */}
                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={3000}
                    onClose={handleSnackbarClose}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                        {snackbarMessage}
                    </Alert>
                </Snackbar>
            </Box>
            </Box>
    );
};

export default Profile;
