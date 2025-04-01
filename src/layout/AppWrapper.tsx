import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import MainLayout from "./MainLayout";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

const AppWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Redirect to onboarding if user is not onboarded and not already on that page
        if (user && (user.isOnboarded !== true) && location.pathname !== '/onboarding') {
            navigate('/onboarding', { state: { from: location.pathname } });
        }
    }, [user, navigate, location.pathname]);

    return <LocalizationProvider dateAdapter={AdapterDayjs}>
                <MainLayout>{children}</MainLayout>
        </LocalizationProvider>;
};

export default AppWrapper;