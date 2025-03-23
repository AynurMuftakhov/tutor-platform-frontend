import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.tsx';
import Users from './pages/Users.tsx';
import PrivateRoute from './components/PrivateRoute.tsx';
import Header from './components/Header.tsx';
import Profile from "./pages/Profile.tsx";

const App: React.FC = () => {
    return (
        <Router>
            <Header />
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
            </Routes>
        </Router>
    );
};

export default App;