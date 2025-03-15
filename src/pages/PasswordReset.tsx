import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { TextField, Button, Box, Typography, Snackbar, Alert } from '@mui/material';
import api from '../services/api.ts';

const PasswordReset: React.FC = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [searchParams] = useSearchParams();
    const [error, setError] = useState('');

    const token = searchParams.get('token');

    const navigate = useNavigate();

    const handleResetPassword = async () => {
        if (newPassword !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        try {
            await api.post(`/auth/reset-password?token=${token}&newPassword=${newPassword}`);
            setSnackbarOpen(true);
            setError('');

            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data || 'Error resetting password');
        }
    };

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };

    return (
        <Box sx={{ maxWidth: 400, margin: '0 auto', marginTop: 5 }}>
            <Typography variant="h4" gutterBottom>
                Reset Password
            </Typography>
            {error && <Typography color="error">{error}</Typography>}
            <TextField
                fullWidth
                margin="normal"
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
            />
            <TextField
                fullWidth
                margin="normal"
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleResetPassword}
                sx={{ marginTop: 2 }}
            >
                Reset Password
            </Button>

            {/* Snackbar for Success Notification */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
                    Password reset successful! Redirecting to login...
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default PasswordReset;
