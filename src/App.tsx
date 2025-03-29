import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import PrivateRoute from './components/PrivateRoute';
import Header from './components/Header';
import Profile from "./pages/Profile";
import AppWrapper from "./layout/AppWrapper";
import Onboarding from './pages/Onboarding';
import {useAuth} from "./context/AuthContext";

const App: React.FC = () => {
    const { isLoading } = useAuth();

    if (isLoading) {
        return <div>Loading...</div>; // you can make this a nice spinner too
    }

    return (
        <Router>
            <Header />
            <AppWrapper>
                <Routes>
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

                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <Profile />
                            </PrivateRoute>
                        }
                    />
                    <Route path="/onboarding" element={<Onboarding />} />
                </Routes>
            </AppWrapper>
        </Router>
    );
};

export default App;