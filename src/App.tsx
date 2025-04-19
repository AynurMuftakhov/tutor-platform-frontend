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
import LessonDetailPage from "./pages/LessonDetailsPage";
import DictionaryPage from "./pages/DictionaryPage";
import StudentVocabularyPage from "./pages/StudentVocabularyPage";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const App: React.FC = () => {
    const { isLoading } = useAuth();

    const queryClient = new QueryClient();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <QueryClientProvider client={queryClient}>
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
                            path="/lessons/:id"
                            element={
                                <PrivateRoute>
                                    <LessonDetailPage />
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/vocabulary"
                            element={
                                <PrivateRoute>
                                    <DictionaryPage />
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/students/:studentId/vocabulary"
                            element={
                                <PrivateRoute>
                                    <StudentVocabularyPage />
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
        </QueryClientProvider>
    );
};

export default App;