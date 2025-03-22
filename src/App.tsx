import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.tsx';
import Users from './pages/Users.tsx';
import Register from './pages/Register.tsx';
import Login from './pages/Login.tsx';
import PrivateRoute from './components/PrivateRoute.tsx';
import Header from './components/Header.tsx';
import PasswordResetRequest from './pages/PasswordResetRequest.tsx';
import PasswordReset from './pages/PasswordReset.tsx';
import Profile from "./pages/Profile.tsx";
import {initKeycloak} from './services/keycloak.ts';

const App: React.FC = () => {
    // We track two states: whether we are "loading"
    // (i.e. waiting for Keycloak init) and whether
    // the user is authenticated.
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        // This will run only once because the dependency array is empty
        initKeycloak()
            .then((authResult) => {
                console.log('Keycloak initialized. Authenticated:', authResult);
                setAuthenticated(authResult);
                setLoading(false); // we can now render
            })
            .catch((error) => {
                console.error('Keycloak init error:', error);
                // Even if there’s an error, stop the loading spinner
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div>Loading Keycloak...</div>;
    }

    return (
        <Router>
            <Header />
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route
                    path="/reset-password-request"
                    element={<PasswordResetRequest />}
                />
                <Route path="/reset-password" element={<PasswordReset />} />

                {/*
          /profile, /users, /dashboard, etc.
          require the user to be logged in -> PrivateRoute
        */}
                <Route
                    path="/profile"
                    element={
                        <PrivateRoute>
                            <Profile />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/users"
                    element={
                        <PrivateRoute>
                            <Users />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        <PrivateRoute>
                            <Dashboard />
                        </PrivateRoute>
                    }
                />

                {/* fallback or root */}
                <Route
                    path="/"
                    element={
                        <PrivateRoute>
                            <Profile />
                        </PrivateRoute>
                    }
                />
            </Routes>
        </Router>
    );
};

export default App;