import React from "react";
import {
    Box,
    Typography,
    Grid,
    Paper,
    Link,
    useTheme,
    useMediaQuery,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import MainLayout from "../layout/MainLayout";

const SectionCard = ({
                         title,
                         children,
                         linkText,
                     }: {
    title: string;
    children: React.ReactNode;
    linkText?: string;
}) => (
    <Paper
        elevation={2}
        sx={{
            p: 3,
            borderRadius: 3,
            height: "100%",
            backgroundColor: "white",
        }}
    >
        <Typography variant="h6" fontWeight={600} gutterBottom>
            {title}
        </Typography>
        <Box>{children}</Box>
        {linkText && (
            <Box mt={1}>
                <Link href="#" color="primary" fontSize={14}>
                    {linkText}
                </Link>
            </Box>
        )}
    </Paper>
);

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    return (
        <MainLayout>
            <Box sx={{ py: 2 }}>
                <Typography variant="h4" fontWeight={600} gutterBottom>
                    Hello, {user?.name || "Tutor"}!
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <SectionCard title="Upcoming Lessons" linkText="View All Lessons">
                            <Typography variant="body2">Lesson 5: 05/10, 10:00 – 11:00</Typography>
                            <Typography variant="body2">Lesson 6: 05/12, 14:00 – 15:00</Typography>
                        </SectionCard>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <SectionCard title="Tasks" linkText="View All Tasks">
                            <Typography variant="body2">Review Essay Draft</Typography>
                            <Typography variant="body2">Create Quiz</Typography>
                        </SectionCard>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <SectionCard title="Progress Overview" linkText="View Detailed Progress">
                            <Typography variant="body2">Students taught: 4</Typography>
                            <Typography variant="body2">Lessons completed: 12</Typography>
                        </SectionCard>
                    </Grid>
                </Grid>
            </Box>
        </MainLayout>
    );
};

export default Dashboard;