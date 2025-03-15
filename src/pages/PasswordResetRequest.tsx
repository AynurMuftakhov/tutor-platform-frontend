import React, { useState } from 'react';
import { TextField, Button, Box, Typography, Snackbar, Alert} from '@mui/material';
import api from '../services/api.ts';

const PasswordResetRequest: React.FC = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const handleRequestReset = async () => {
        try {
            await api.post(`/auth/reset-password-request?email=${email}`)
            setSnackbarOpen(true);
            setError('');
            setEmail('')
        } catch (err: any) {
            setError(err.response?.data || 'Error requesting password reset');
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
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleRequestReset}
                sx={{ marginTop: 2 }}
            >
                Request Reset
            </Button>
            {/* Snackbar for Success Notification */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
                    Password reset link has been sent to your email
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default PasswordResetRequest;
