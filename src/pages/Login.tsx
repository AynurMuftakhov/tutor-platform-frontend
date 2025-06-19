import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { keycloak } from '../services/keycloak';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const { authenticated, isLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // If already authenticated, redirect to dashboard
        if (authenticated && !isLoading) {
            navigate('/dashboard');
            return;
        }

        // Only trigger login if not authenticated and not still loading
        if (!authenticated && !isLoading) {
            keycloak.login({
                redirectUri: window.location.origin + '/dashboard'
            });
        }
    }, [authenticated, isLoading, navigate]);

    return <div>Redirecting to login...</div>;
};

export default Login;
