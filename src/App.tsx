import React from 'react';
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

const App: React.FC = () => {
    return (
        <Router>
            <Header />
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password-request" element={<PasswordResetRequest />} />
                <Route path="/reset-password" element={<PasswordReset />} />
                <Route path="/profile" element={ <PrivateRoute><Profile/> </PrivateRoute>}/>
                <Route
                    path="/"
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
            </Routes>
        </Router>
    );
};

export default App;