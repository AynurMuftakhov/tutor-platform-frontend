import React, { useState } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.ts';

const Register: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleRegister = async () => {
        try {
            await api.post('/auth/register', formData); // Call the backend register endpoint
            setSuccess(true);
            setError('');
            // Redirect to login page after successful registration
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        }
    };

    return (
        <Box sx={{ maxWidth: 400, margin: '0 auto', marginTop: 5 }}>
            <Typography variant="h4" gutterBottom>
                Register
            </Typography>
            {error && <Typography color="error">{error}</Typography>}
            {success && <Typography color="success">Registration successful! Redirecting to login...</Typography>}
            <TextField
                fullWidth
                margin="normal"
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
            />
            <TextField
                fullWidth
                margin="normal"
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
            />
            <TextField
                fullWidth
                margin="normal"
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
            />
            <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleRegister}
                sx={{ marginTop: 2 }}
            >
                Register
            </Button>
        </Box>
    );
};

export default Register;