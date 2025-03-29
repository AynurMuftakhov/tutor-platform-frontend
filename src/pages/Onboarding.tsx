import React, { useState } from 'react';
import {
    Box, Button, Typography, CircularProgress, Snackbar, Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {updateCurrentUser} from '../services/api';
import { useAuth } from '../context/AuthContext';

const Onboarding: React.FC = () => {
    const { user, updateUser } = useAuth();
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const navigate = useNavigate();

    const handleSubmit = async () => {
        if (!selectedRole || !user?.id) {
            setSnackbar({ open: true, message: 'Please select a role.', severity: 'error' });
            return;
        }

        setLoading(true);
        try {
            const res = await updateCurrentUser(user.id, {
                role: selectedRole,
                isOnboarded: true
            });

            updateUser(res); // Refresh auth context
            setSnackbar({ open: true, message: 'Onboarding complete!', severity: 'success' });

            // Redirect back to original page or default
            const redirectTo = '/profile';
            navigate(redirectTo, { replace: true });
        } catch (error: any) {
            console.error(error);
            setSnackbar({ open: true, message: 'Failed to complete onboarding.', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 500, margin: 'auto', mt: 8, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
                {user ? `Welcome, ${user.name}!` : 'Welcome!'} <br/><br/>
                Just few more steps before we begin 🎉
            </Typography>

            <Typography variant="body1" gutterBottom>
                Choose your role to continue:
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, my: 3 }}>
                <Button
                    variant={selectedRole === 'student' ? 'contained' : 'outlined'}
                    color="primary"
                    onClick={() => setSelectedRole('student')}
                >
                    👨‍🎓 Student
                </Button>
                <Button
                    variant={selectedRole === 'tutor' ? 'contained' : 'outlined'}
                    color="secondary"
                    onClick={() => setSelectedRole('tutor')}
                >
                    🧑‍🏫 Tutor
                </Button>
            </Box>

            <Button
                variant="contained"
                color="success"
                onClick={handleSubmit}
                disabled={loading}
                sx={{ mt: 2 }}
            >
                {loading ? <CircularProgress size={24} /> : 'Finish Onboarding'}
            </Button>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Onboarding;