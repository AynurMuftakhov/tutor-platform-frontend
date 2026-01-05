import React from 'react';
import {
    Box,
    Grid,
    Paper,
    Skeleton,
    Typography,
    useTheme,
    alpha,
} from '@mui/material';
import CelebrationIcon from '@mui/icons-material/Celebration';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { BillingStudent } from '../../types/billing';
import StudentCard from './StudentCard';

interface StudentCardsGridProps {
    students: BillingStudent[];
    loading: boolean;
    onCardClick: (student: BillingStudent) => void;
    onQuickPay: (student: BillingStudent) => void;
    onEditPlan: (student: BillingStudent) => void;
    filterCurrency?: string; // Top filter currency to show badge when student currency differs
}

const StudentCardsGrid: React.FC<StudentCardsGridProps> = ({
    students,
    loading,
    onCardClick,
    onQuickPay,
    onEditPlan,
    filterCurrency,
}) => {
    const theme = useTheme();

    // Check if all students are settled
    const allSettled = students.length > 0 && students.every(s => s.lessonsOutstanding <= 0);

    if (loading) {
        return (
            <Grid container spacing={3}>
                {[...Array(6)].map((_, i) => (
                    <Grid size ={{xs:12, sm:6, lg:4}} key={i}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2.5,
                                borderRadius: 3,
                                border: `1px solid ${theme.palette.divider}`,
                            }}
                        >
                            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                                <Skeleton variant="circular" width={48} height={48} />
                                <Box flex={1}>
                                    <Skeleton variant="text" width="60%" height={24} />
                                    <Skeleton variant="rounded" width={120} height={22} />
                                </Box>
                            </Box>
                            <Skeleton variant="rounded" height={6} sx={{ mb: 2 }} />
                            <Skeleton variant="rounded" height={80} sx={{ mb: 2 }} />
                            <Skeleton variant="rounded" height={40} />
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        );
    }

    if (students.length === 0) {
        return (
            <Paper
                elevation={0}
                sx={{
                    p: 6,
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.divider}`,
                    textAlign: 'center',
                    bgcolor: alpha(theme.palette.background.paper, 0.5),
                }}
            >
                <Box
                    sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        mb: 2,
                    }}
                >
                    <ReceiptLongIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                </Box>
                <Typography variant="h6" color="text.primary" gutterBottom fontWeight={600}>
                    No students found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Students with lessons will appear here.
                </Typography>
            </Paper>
        );
    }

    return (
        <Box>
            {/* Celebration banner when all settled */}
            {allSettled && (
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        mb: 3,
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.success.main, 0.08),
                        border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                    }}
                >
                    <CelebrationIcon sx={{ color: 'success.main' }} />
                    <Typography variant="body2" fontWeight={600} color="success.main">
                        All students are settled! No outstanding payments.
                    </Typography>
                </Paper>
            )}

            <Grid container spacing={3}>
                {students.map((student) => (
                    <Grid size={{xs:12, sm:5,  md:6, lg:4, xl:3 }} key={student.studentId}>
                        <StudentCard
                            student={student}
                            onClick={onCardClick}
                            onQuickPay={onQuickPay}
                            onEditPlan={onEditPlan}
                            filterCurrency={filterCurrency}
                        />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default StudentCardsGrid;
