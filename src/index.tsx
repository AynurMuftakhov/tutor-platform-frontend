import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { createTheme, ThemeProvider } from '@mui/material';

const theme = createTheme({
    palette: {
        primary: { main: '#2573ff' },   // modern blue
        secondary: { main: '#00d7c2' }, // mint accent
        background: { default: '#fafbfd' }
    },
    shape: { borderRadius: 12 },
    typography: {
        fontFamily: ['Inter', 'Roboto', 'sans-serif'].join(','),
        button: { textTransform: 'none', fontWeight: 600 }
    }
});


const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <AuthProvider>
                <App />
            </AuthProvider>
        </ThemeProvider>,
    </React.StrictMode>
);