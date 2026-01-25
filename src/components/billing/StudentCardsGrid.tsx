import React from 'react';
import {
    Avatar,
    Box,
    Button,
    Chip,
    LinearProgress,
    Paper,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    alpha,
    useTheme,
    Stack,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { BillingStudent } from '../../types/billing';
import { PaymentPreset } from './AddPaymentModal';

interface StudentPackagesTableProps {
    students: BillingStudent[];
    loading: boolean;
    onRowClick: (student: BillingStudent) => void;
    onOpenSetup?: (student: BillingStudent) => void;
    onRecordPayment?: (student: BillingStudent, preset: PaymentPreset) => void;
}


const StudentPackagesTable: React.FC<StudentPackagesTableProps> = ({
    students,
    loading,
    onRowClick,
    onOpenSetup,
    onRecordPayment,
}) => {
    const theme = useTheme();

    const renderStatus = (student: BillingStudent) => {
        const baseChipSx = {
            fontWeight: 700,
            borderRadius: 1,
            letterSpacing: 0.3,
            minWidth: 86,
        };

        if ((student.pricePerPackage ?? 0) <= 0 || (student.packageSize ?? 0) <= 0) {
            return (
                <Chip
                    label="NO PLAN"
                    size="small"
                    sx={{
                        bgcolor: alpha(theme.palette.grey[500], 0.12),
                        color: theme.palette.text.secondary,
                        ...baseChipSx,
                    }}
                />
            );
        }

        if (student.packagePhase === 'READY_TO_SETTLE') {
            if (student.shouldShowOwedInUI) {
                return (
                    <Chip
                        label="OWES PACKAGE"
                        size="small"
                        sx={{
                            bgcolor: alpha(theme.palette.error.main, 0.12),
                            color: theme.palette.error.main,
                            ...baseChipSx,
                        }}
                    />
                );
            }
            return (
                <Chip
                    label="READY"
                    size="small"
                    sx={{
                        bgcolor: alpha(theme.palette.success.main, 0.12),
                        color: theme.palette.success.main,
                        ...baseChipSx,
                    }}
                />
            );
        }

        return (
            <Chip
                label="IN PROGRESS"
                size="small"
                sx={{
                    bgcolor: alpha(theme.palette.info.main, 0.12),
                    color: theme.palette.info.main,
                    ...baseChipSx,
                }}
            />
        );
    };

    const renderProgress = (student: BillingStudent) => {
        const packageSize = student.packageSize || 1;
        const lessonsCompleted = student.currentPackageLessonsCompleted ?? 0;
        const progressLessons = Math.min(lessonsCompleted, packageSize);
        const percent = (progressLessons / packageSize) * 100;

        return (
            <Box sx={{ minWidth: 120 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="body2" fontWeight={600}>
                        {lessonsCompleted}/{packageSize}
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={percent}
                    sx={{
                        height: 6,
                        borderRadius: 999,
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        '& .MuiLinearProgress-bar': {
                            bgcolor: theme.palette.primary.main,
                            borderRadius: 999,
                        },
                    }}
                />
            </Box>
        );
    };


    if (loading) {
        return (
            <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" fontWeight={700}>
                        Students packages
                    </Typography>
                </Box>
                <Table>
                    <TableHead>
                        <TableRow>
                            {['Student', 'Current package progress', 'State', 'Action'].map((col) => (
                                <TableCell key={col} align={col === 'Action' ? 'right' : col === 'State' ? 'center' : 'left'}>
                                    <Skeleton width={100} />
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                            <TableRow key={i}>
                                {[...Array(4)].map((__, idx) => (
                                    <TableCell key={idx} align={idx === 3 ? 'right' : idx === 2 ? 'center' : 'left'}>
                                        <Skeleton />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
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
                    No students yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Add students and set their plans to start tracking packages and payments.
                </Typography>
            </Paper>
        );
    }

    return (
        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="h6" fontWeight={700}>
                    Students packages
                </Typography>
            </Box>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell>Current package progress</TableCell>
                        <TableCell align="center">State</TableCell>
                        <TableCell align="right">Action</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {students.map((student) => {
                        const planMissing = (student.pricePerPackage ?? 0) <= 0 || (student.packageSize ?? 0) <= 0;
                        const creditLessons = student.creditLessons ?? 0;
                        return (
                            <TableRow
                                hover
                                key={student.studentId}
                                sx={{ cursor: 'pointer' }}
                                onClick={() => onRowClick(student)}
                            >
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        <Avatar
                                            src={student.studentAvatar}
                                            alt={student.studentName}
                                            sx={{ width: 40, height: 40, bgcolor: theme.palette.primary.light }}
                                        >
                                            {student.studentName.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body1" fontWeight={700}>
                                                {student.studentName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Last payment: {student.lastPaymentDate ? new Date(student.lastPaymentDate).toLocaleDateString() : '—'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    {planMissing ? (
                                        <Button
                                            variant="text"
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenSetup?.(student);
                                            }}
                                            sx={{
                                                textTransform: 'none',
                                                p: 0,
                                                minHeight: 0,
                                                fontSize: '0.75rem',
                                                color: 'primary.main',
                                                '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }
                                            }}
                                        >
                                            Set plan to track progress
                                        </Button>
                                    ) : (
                                        renderProgress(student)
                                    )}
                                </TableCell>
                                <TableCell align="center">
                                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                                        {renderStatus(student)}
                                        {creditLessons > 0 && (
                                            <Chip
                                                label={`Prepaid: ${creditLessons}`}
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                    borderColor: theme.palette.success.main,
                                                    color: theme.palette.success.main,
                                                    fontWeight: 600,
                                                    borderRadius: 1,
                                                }}
                                            />
                                        )}
                                    </Stack>
                                </TableCell>
                                <TableCell align="right">
                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                        {student.packagesToSettle ? (
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRecordPayment?.(student, {
                                                        mode: 'packages',
                                                        packagesCount: 1,
                                                    });
                                                }}
                                                sx={{ textTransform: 'none', borderRadius: 2 }}
                                            >
                                                Settle package
                                            </Button>
                                        ) : planMissing ? (
                                            <Button
                                                variant="contained"
                                                size="small"
                                                color="primary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenSetup?.(student);
                                                }}
                                                sx={{ textTransform: 'none', borderRadius: 2 }}
                                            >
                                                Setup package
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="text"
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRowClick(student);
                                                }}
                                                sx={{ textTransform: 'none', borderRadius: 2, color: 'text.secondary' }}
                                            >
                                                Details
                                            </Button>
                                        )}
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default StudentPackagesTable;
