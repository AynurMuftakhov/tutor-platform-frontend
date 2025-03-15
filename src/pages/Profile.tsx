import React, {useState, useEffect, useRef} from 'react';
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
import api, {getHistoryLessons, getUpcomingLessons} from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

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
    const [activeTab, setActiveTab] = useState(0);
    const [isEditingName, setIsEditingName] = useState(false);
    const [loading, setLoading] = useState(false);
    const [upcomingLessons, setUpcomingLessons] = useState<any[]>([]);
    const [historyLessons, setHistoryLessons] = useState<any[]>([]);

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
            e.target.value = null
        }
    };

    const handleSaveAvatar = async () => {
        if (!newAvatar) return;

        setLoading(true);
        try {
            const profileData = new FormData();
            profileData.append('avatar', newAvatar);
            profileData.append('name', formData.name);
            profileData.append('email', formData.email);
            const response = await api.put('/users/profile', profileData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            // Update user context and reset new avatar state
            updateUser({ avatar: response.data.avatar });
            setFormData((prev) => ({ ...prev, avatar: response.data.avatar }));
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
        setAvatarPreview(`${api.defaults.baseURL.replace('/api', '')}${formData.avatar}`);
        setNewAvatar(null);
    };

    const handleUpdateProfile = async () => {
        setLoading(true);
        try {
            const profileData = new FormData();
            profileData.append('name', formData.name);
            profileData.append('email', formData.email);
            if (formData.avatar instanceof File) {
                profileData.append('avatar', formData.avatar);
            }

            await api.put('/users/profile', profileData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            // Update the user context with the new data
            updateUser({ name: formData.name });

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

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);

        // Fetch data based on the selected tab
        if (newValue === 0) {
            fetchLessons('upcoming');
        } else if (newValue === 1) {
            fetchLessons('history');
        }
    };

    const fetchLessons = async (type: 'upcoming' | 'history') => {
        if (!user) return;

        setLoading(true);
        try {
            if (type === 'upcoming') {
                const upcoming = await getUpcomingLessons(user.id);
                setUpcomingLessons(upcoming);
            } else if (type === 'history') {
                const history = await getHistoryLessons(user.id);
                setHistoryLessons(history);
            }
        } catch (error) {
            console.error(`Error fetching ${type} lessons:`, error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Fetch upcoming lessons initially
        fetchLessons('upcoming');
    }, [fetchLessons, user]);


    return (
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, padding: 3 }}>
            {/* Left Sidebar */}
            <Box sx={{
                    width: '25%',
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
                        src={avatarPreview || `${api.defaults.baseURL.replace('/api', '')}${user?.avatar}`}
                        alt={formData.name}
                        sx={{ width: 200, height: 200 }}
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
                {/* Lessons Statistics */}
                <Grid container spacing={2} sx={{ marginBottom: 3 }}>
                    <Grid item xs={4}>
                        <Card sx={{ textAlign: 'center', padding: 2 }}>
                            <Typography variant="h5" color="primary">
                                5
                            </Typography>
                            <Typography variant="body2">All Lessons</Typography>
                        </Card>
                    </Grid>
                    <Grid item xs={4}>
                        <Card sx={{ textAlign: 'center', padding: 2 }}>
                            <Typography variant="h5" color="success.main">
                                2
                            </Typography>
                            <Typography variant="body2">Completed</Typography>
                        </Card>
                    </Grid>
                    <Grid item xs={4}>
                        <Card sx={{ textAlign: 'center', padding: 2 }}>
                            <Typography variant="h5" color="error.main">
                                1
                            </Typography>
                            <Typography variant="body2">Cancelled</Typography>
                        </Card>
                    </Grid>
                </Grid>

                {/* Lessons and Invoices Tabs */}
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    sx={{ marginBottom: 2 }}
                >
                    <Tab label="Upcoming Lessons" />
                    <Tab label="HomeWork" />
                    <Tab label="History" />
                </Tabs>

                {loading ? (
                    <CircularProgress sx={{ marginTop: 3 }} />)
                    : (
                    <Box sx={{ marginTop: 3 }}>
                        {activeTab === 0 && (
                            <Box>
                                <Typography variant="h5" gutterBottom>
                                    Upcoming Lessons
                                </Typography>
                                <List>
                                    {upcomingLessons.length > 0 ? (
                                        upcomingLessons.map((lesson) => (
                                            <React.Fragment key={lesson.id}>
                                                <ListItem>
                                                    <ListItemText
                                                        primary={`${lesson.title} - ${lesson.dateTime}`}
                                                        secondary={`Price: $${lesson.price}`}
                                                    />
                                                </ListItem>
                                                <Divider />
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            No upcoming lessons.
                                        </Typography>
                                    )}
                                </List>
                            </Box>
                        )}

                {activeTab === 1 && (
                    <Typography variant="body2" color="text.secondary">
                        All is done. Great work!
                    </Typography>
                )}

                {activeTab === 2 && (
                    <Box>
                        <Typography variant="h5" gutterBottom>
                            History of Lessons
                        </Typography>
                        <List>
                            {historyLessons.length > 0 ? (
                                historyLessons.map((lesson) => (
                                    <React.Fragment key={lesson.id}>
                                        <ListItem>
                                            <ListItemText
                                                primary={`${lesson.title} - ${lesson.dateTime}`}
                                                secondary={`Price: $${lesson.price}`}
                                            />
                                        </ListItem>
                                        <Divider />
                                    </React.Fragment>
                                ))
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    No completed lessons.
                                </Typography>
                            )}
                        </List>
                    </Box>
                )}

            </Box>
                    )}

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
