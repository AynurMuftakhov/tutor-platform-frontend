import React, { useEffect, useState } from 'react';
import {
    Card, CardContent, Typography, Grid, Box, CircularProgress, Alert,
    alpha, useTheme
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SchoolIcon from '@mui/icons-material/School';
import PersonIcon from '@mui/icons-material/Person';
import api from '../services/api';

interface SummaryData {
    totalUsers: number;
    adminCount: number;
    teacherCount: number;
    studentCount: number;
}

const AdminDashboard: React.FC = () => {
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const theme = useTheme();

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await api.get('/users-service/api/users/summary');
                setSummary(response.data);
            } catch (err) {
                console.error('Error fetching summary data:', err);
                setError('Failed to load dashboard data. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    const cards = [
        { label: 'Total Users', value: summary?.totalUsers ?? 0, icon: <PeopleIcon />, color: theme.palette.primary.main },
        { label: 'Admins', value: summary?.adminCount ?? 0, icon: <AdminPanelSettingsIcon />, color: theme.palette.warning.main },
        { label: 'Teachers', value: summary?.teacherCount ?? 0, icon: <SchoolIcon />, color: theme.palette.success.main },
        { label: 'Students', value: summary?.studentCount ?? 0, icon: <PersonIcon />, color: theme.palette.info.main },
    ];

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
                Admin Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Platform overview and user statistics.
            </Typography>
            <Grid container spacing={3}>
                {cards.map(({ label, value, icon, color }) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={label}>
                        <Card
                            elevation={0}
                            sx={{
                                border: `1px solid ${alpha(color, 0.2)}`,
                                borderRadius: 3,
                                transition: 'all 0.2s ease',
                                '&:hover': { boxShadow: `0 4px 20px ${alpha(color, 0.15)}` },
                            }}
                        >
                            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 2,
                                        bgcolor: alpha(color, 0.1),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color,
                                    }}
                                >
                                    {icon}
                                </Box>
                                <Box>
                                    <Typography variant="h4" fontWeight={700}>
                                        {value}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {label}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default AdminDashboard;
