import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authenticated } = useAuth();

    if (!authenticated) {
        return <div>Checking authentication...</div>;
    }
    return <>{children}</>;
};

export default PrivateRoute;