import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import Users from './pages/Users';
import PrivateRoute from './components/PrivateRoute';
import Profile from "./pages/Profile";
import AppWrapper from "./layout/AppWrapper";
import Onboarding from './pages/Onboarding';
import {useAuth} from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import MyStudentsPage from "./pages/MyStudentsPage";
import LessonsPage from "./pages/LessonsPage";

const App: React.FC = () => {
    const { isLoading } = useAuth();

    if (isLoading) {
        return <div>Loading...</div>; // you can make this a nice spinner too
    }

    return (
        <Router>
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
                        path="/my-students"
                        element={
                            <PrivateRoute>
                                <MyStudentsPage />
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
                        path="/admin"
                        element={
                            <PrivateRoute>
                                <AdminDashboard />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/lessons"
                        element={
                            <PrivateRoute>
                                <LessonsPage />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <Dashboard />
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