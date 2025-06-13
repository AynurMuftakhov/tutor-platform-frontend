import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
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
import VideoCallPage from "./pages/VideoCallPage";
import LandingPage from "./pages/landing/LandingPage";
import LearningMaterialsPage from "./pages/LearningMaterialsPage";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiErrorProvider } from './context/ApiErrorContext';

const App: React.FC = () => {
    const { isLoading } = useAuth();

    const queryClient = new QueryClient();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <ApiErrorProvider>
                <Router>
                    <Routes>
                        {/* Public routes */}
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/book-trial" element={<LandingPage />} /> {/* Placeholder - will be implemented later */}
                        <Route path="/pricing" element={<LandingPage />} /> {/* Placeholder - will be implemented later */}

                        {/* Protected routes - wrapped in AppWrapper */}
                        <Route path="/onboarding"
                               element={
                                   <PrivateRoute>
                                       <AppWrapper>
                                           <Onboarding />
                                       </AppWrapper>
                                   </PrivateRoute>
                               }
                        />
                        <Route
                            path="/dashboard"
                            element={
                                <PrivateRoute>
                                    <AppWrapper>
                                        <Dashboard />
                                    </AppWrapper>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/profile"
                            element={
                                <PrivateRoute>
                                    <AppWrapper>
                                        <Profile />
                                    </AppWrapper>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/my-students"
                            element={
                                <PrivateRoute>
                                    <AppWrapper>
                                        <MyStudentsPage />
                                    </AppWrapper>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/admin"
                            element={
                                <PrivateRoute>
                                    <AppWrapper>
                                        <AdminDashboard />
                                    </AppWrapper>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/lessons"
                            element={
                                <PrivateRoute>
                                    <AppWrapper>
                                        <LessonsPage />
                                    </AppWrapper>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/lessons/:id"
                            element={
                                <PrivateRoute>
                                    <AppWrapper>
                                        <LessonDetailPage />
                                    </AppWrapper>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/vocabulary"
                            element={
                                <PrivateRoute>
                                    <AppWrapper>
                                        <DictionaryPage />
                                    </AppWrapper>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/students/:studentId/vocabulary"
                            element={
                                <PrivateRoute>
                                    <AppWrapper>
                                        <StudentVocabularyPage />
                                    </AppWrapper>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/video-call"
                            element={
                                <PrivateRoute>
                                    <AppWrapper>
                                        <VideoCallPage />
                                    </AppWrapper>
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/learning-materials"
                            element={
                                <PrivateRoute>
                                    <AppWrapper>
                                        <LearningMaterialsPage />
                                    </AppWrapper>
                                </PrivateRoute>
                            }
                        />
                    </Routes>
                </Router>
            </ApiErrorProvider>
        </QueryClientProvider>
    );
};

export default App;
