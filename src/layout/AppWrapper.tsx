import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

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

    return <>{children}</>;
};

export default AppWrapper;