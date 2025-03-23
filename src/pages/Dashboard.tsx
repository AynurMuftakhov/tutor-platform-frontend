import React, {useEffect, useState} from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, Typography, Grid, AppBar, Toolbar, Button } from '@mui/material';
import api from "../services/api";

const Dashboard: React.FC = () => {
    const [totalUsers, setTotalUsers] = useState(0);
    const [usersByRole, setUsersByRole] = useState({ admin: 0, teacher: 0, student: 0 });

    const fetchSummaryData = async () => {
        try {
            const response = await api.get('/users/summary'); // Endpoint that returns the necessary data
            setTotalUsers(response.data.totalUsers);
            setUsersByRole({
                admin: response.data.adminCount,
                teacher: response.data.teacherCount,
                student: response.data.studentCount,
            });
        } catch (error) {
            console.error('Error fetching summary data:', error);
        }
    };

    useEffect(() => {
        fetchSummaryData();
    }, []);

    return (
        <div>
            <Typography variant="h4" gutterBottom>
                Dashboard
            </Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h5">Total Users</Typography>
                            <Typography variant="h6">{totalUsers}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h5">Admins</Typography>
                            <Typography variant="h6">{usersByRole.admin}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h5">Teachers</Typography>
                            <Typography variant="h6">{usersByRole.teacher}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h5">Students</Typography>
                            <Typography variant="h6">{usersByRole.student}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <AppBar position="static">
                    <Toolbar>
                        <Button color="inherit" component={Link} to="/users">
                            Users
                        </Button>
                        <Button color="inherit" component={Link} to="/analytics">
                            Analytics
                        </Button>
                        <Button color="inherit" component={Link} to="/settings">
                            Settings
                        </Button>
                    </Toolbar>
                </AppBar>
            </Grid>
        </div>
    );
};

export default Dashboard;