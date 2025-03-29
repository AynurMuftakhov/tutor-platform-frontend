import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import PrivateRoute from './components/PrivateRoute';
import Header from './components/Header';
import Profile from "./pages/Profile";
import AppWrapper from "./layout/AppWrapper";
import Onboarding from './pages/Onboarding';

const App: React.FC = () => {
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