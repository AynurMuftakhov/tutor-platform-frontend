import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useAuth } from '../context/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';
import {keycloak} from "../services/keycloak.ts";

const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleLogout = () => {
        logout();
        setIsDialogOpen(false); // Close the dialog
    };

    const navigateToProfile = () => {
        navigate('/profile')
    }

    const openDialog = () => {
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
    };

    const handleTitleClick = () => {
        if (user) {
            navigate('/'); // Redirect to the main page if logged in
        } else {
           keycloak.login();
        }
    };

    return (
        <AppBar position="static">
            <Toolbar>
                <Typography
                    variant="h6"
                    sx={{ flexGrow: 1, cursor: 'pointer' }}
                    onClick={handleTitleClick} // Make the title clickable
                >
                    Tutor's Platform
                </Typography>
                {user && (
                    <>
                        <Typography variant="body1" sx={{ marginRight: 2 }}>
                            Welcome, {user.name || user.email}
                        </Typography>
                        <Button color="inherit" onClick={navigateToProfile}>
                            My profile
                        </Button>
                        <Button color="inherit" onClick={openDialog}>
                            Logout
                        </Button>
                    </>
                )}
            </Toolbar>

            {/* Logout Confirmation Dialog */}
            <Dialog open={isDialogOpen} onClose={closeDialog}>
                <DialogTitle>Confirm Logout</DialogTitle>
                <DialogContent>
                    Are you sure you want to log out?
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog}>Cancel</Button>
                    <Button onClick={handleLogout} color="primary">
                        Logout
                    </Button>
                </DialogActions>
            </Dialog>
        </AppBar>
    );
};

export default Header;
