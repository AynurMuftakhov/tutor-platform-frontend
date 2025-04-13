import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import MainLayout from "./MainLayout";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import {NotificationSocketProvider} from "../context/NotificationsSocketContext";

const AppWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (user && user.isOnboarded !== true && location.pathname !== '/onboarding') {
            navigate('/onboarding', { state: { from: location.pathname } });
        }
    }, [user, navigate, location.pathname]);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            {user?.id && (
                <NotificationSocketProvider userId={user.id}>
                    <MainLayout>{children}</MainLayout>
                </NotificationSocketProvider>
            )}
        </LocalizationProvider>
    );
};

export default AppWrapper;