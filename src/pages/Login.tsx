import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Box, Typography } from '@mui/material';
import api from '../services/api.ts';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { setToken } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            const response = await api.post('auth/login', { email, password });
            setToken(response.data.token);
            navigate('/'); // Redirect to the dashboard
        } catch (err) {
            setError('Invalid email or password');
        }
    };

    return (
        <Box sx={{ maxWidth: 400, margin: '0 auto', marginTop: 5 }}>
            <Typography variant="h4" gutterBottom>
                Login
            </Typography>
            {error && <Typography color="error">{error}</Typography>}
            <TextField
                fullWidth
                margin="normal"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
                fullWidth
                margin="normal"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <Button fullWidth variant="contained" onClick={handleLogin}>
                Login
            </Button>
            <Button
                fullWidth
                variant="outlined"
                color="secondary"
                onClick={() => navigate('/register')} // Redirect to register page
                sx={{ marginTop: 2 }}
            >
                Sign Up
            </Button>
            <Button
                fullWidth
                variant="outlined"
                color="secondary"
                onClick={() => navigate('/reset-password-request')} // Redirect to register page
                sx={{ marginTop: 2 }}
            >
                Forget password
            </Button>
        </Box>
    );
};

export default Login;