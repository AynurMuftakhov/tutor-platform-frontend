import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import {keycloak} from '../services/keycloak.ts';

const Register: React.FC = () => {
    const handleRegister = () => {
        // IMPORTANT: Only call keycloak.register(), not init() again
        keycloak.register();
    };

    return (
        <Box sx={{ maxWidth: 400, margin: '0 auto', marginTop: 5 }}>
            <Typography variant="h4" gutterBottom>
                Register
            </Typography>
            <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleRegister}
                sx={{ marginTop: 2 }}
            >
                Register via Keycloak
            </Button>
        </Box>
    );
};

export default Register;