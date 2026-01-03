import React from 'react';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    IconButton,
    LinearProgress,
    Link,
    Tooltip,
    Typography,
    useTheme,
    alpha,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import SchoolIcon from '@mui/icons-material/School';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { BillingStudent } from '../../types/billing';

interface StudentCardProps {
    student: BillingStudent;
    currency: string;
    onQuickPay: (student: BillingStudent) => void;
    onClick: (student: BillingStudent) => void;
    onEditPlan: (student: BillingStudent) => void;
}

function formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

const StudentCard: React.FC<StudentCardProps> = ({
    student,
    currency,
    onQuickPay,
    onClick,
    onEditPlan,
}) => {
    const theme = useTheme();
    
    const hasDebt = student.lessonsOutstanding > 0;
    const hasCredit = student.lessonsOutstanding < 0;
    const progress = student.packageSize > 0 
        ? Math.min((student.lessonsCompleted / student.packageSize) * 100, 100)
        : 0;
    
    const quickPayLessons = hasDebt ? student.lessonsOutstanding : student.packageSize;
    // ratePerLesson stores package rate, calculate per-lesson rate
    const perLessonRate = student.packageSize > 0 ? student.ratePerLesson / student.packageSize : 0;
    const quickPayAmount = quickPayLessons * perLessonRate;

    return (
        <Card
            elevation={0}
            onClick={() => onClick(student)}
            sx={{
                height: '100%',
                cursor: 'pointer',
                border: `1px solid ${hasDebt 
                    ? alpha(theme.palette.error.main, 0.3) 
                    : theme.palette.divider}`,
                borderRadius: 3,
                transition: 'all 0.2s ease',
                '&:hover': {
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.12)}`,
                    borderColor: theme.palette.primary.main,
                    transform: 'translateY(-2px)',
                },
            }}
        >
            <CardContent sx={{ p: 2.5 }}>
                {/* Header: Avatar + Name */}
                <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                    <Avatar
                        src={student.studentAvatar}
                        alt={student.studentName}
                        sx={{
                            width: 48,
                            height: 48,
                            bgcolor: theme.palette.primary.light,
                            fontSize: 18,
                            fontWeight: 600,
                        }}
                    >
                        {student.studentName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                        <Typography 
                            variant="subtitle1" 
                            fontWeight={700}
                            noWrap
                        >
                            {student.studentName}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <Tooltip 
                                title={`Package: ${student.packageSize} lessons for ${formatMoney(student.ratePerLesson, currency)}`}
                                arrow
                            >
                                <Chip
                                    icon={<SchoolIcon sx={{ fontSize: 14 }} />}
                                    label={`${student.packageSize} lessons • ${formatMoney(student.ratePerLesson, currency)}`}
                                    size="small"
                                    sx={{
                                        height: 22,
                                        fontSize: '0.7rem',
                                        bgcolor: alpha(theme.palette.info.main, 0.1),
                                        color: theme.palette.info.dark,
                                        '& .MuiChip-icon': {
                                            color: theme.palette.info.main,
                                        },
                                    }}
                                />
                            </Tooltip>
                            <Tooltip title="Edit billing plan" arrow>
                                <IconButton
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); onEditPlan(student); }}
                                    sx={{
                                        width: 22,
                                        height: 22,
                                        color: 'text.disabled',
                                        '&:hover': {
                                            color: theme.palette.primary.main,
                                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                                        },
                                    }}
                                >
                                    <EditOutlinedIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                </Box>

                {/* Progress: Lessons completed/paid */}
                <Box mb={2.5}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" color="text.secondary">
                            Progress
                        </Typography>
                        <Typography variant="caption" fontWeight={600}>
                            {student.lessonsCompleted}/{student.packageSize} lessons
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                bgcolor: progress >= 100 
                                    ? theme.palette.success.main 
                                    : theme.palette.primary.main,
                            },
                        }}
                    />
                </Box>

                {/* Stats: Completed / Paid / Outstanding */}
                <Box 
                    display="flex" 
                    gap={1} 
                    mb={2.5}
                    sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.grey[500], 0.06),
                        border: `1px solid ${alpha(theme.palette.grey[500], 0.08)}`,
                    }}
                >
                    <Box flex={1} textAlign="center">
                        <Typography variant="h6" fontWeight={700} color="info.main">
                            {student.lessonsCompleted}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Completed
                        </Typography>
                    </Box>
                    <Box flex={1} textAlign="center">
                        <Typography variant="h6" fontWeight={700} color="success.main">
                            {student.lessonsPaid}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Paid
                        </Typography>
                    </Box>
                    <Box flex={1} textAlign="center">
                        <Typography 
                            variant="h6" 
                            fontWeight={700}
                            color={hasDebt ? 'error.main' : hasCredit ? 'success.main' : 'text.secondary'}
                        >
                            {Math.abs(student.lessonsOutstanding)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {hasCredit ? 'Credit' : 'Unpaid'}
                        </Typography>
                    </Box>
                </Box>

                {/* Outstanding amount - with stronger visual distinction */}
                {hasDebt && (
                    <Box 
                        sx={{
                            p: 1.5,
                            mb: 2.5,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.error.main, 0.1),
                            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                            borderLeft: `4px solid ${theme.palette.error.main}`,
                        }}
                    >
                        <Typography 
                            variant="body2" 
                            color="error.main"
                            fontWeight={700}
                            textAlign="center"
                        >
                            Owed: {formatMoney(student.outstandingAmount, currency)}
                        </Typography>
                    </Box>
                )}

                {hasCredit && (
                    <Box 
                        sx={{
                            p: 1.5,
                            mb: 2.5,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.success.main, 0.1),
                            border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                            borderLeft: `4px solid ${theme.palette.success.main}`,
                        }}
                    >
                        <Typography 
                            variant="body2" 
                            color="success.main"
                            fontWeight={700}
                            textAlign="center"
                        >
                            Credit: {formatMoney(Math.abs(student.outstandingAmount), currency)}
                        </Typography>
                    </Box>
                )}

                {!hasDebt && !hasCredit && (
                    <Box 
                        sx={{
                            p: 1.5,
                            mb: 2.5,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.success.light, 0.15),
                            border: `1px dashed ${alpha(theme.palette.success.main, 0.3)}`,
                        }}
                    >
                        <Typography 
                            variant="body2" 
                            color="success.dark"
                            fontWeight={600}
                            textAlign="center"
                        >
                            ✓ All settled
                        </Typography>
                    </Box>
                )}

                {/* Quick pay button - prominent for debtors, subtle link for settled */}
                {hasDebt ? (
                    <Button
                        variant="contained"
                        fullWidth
                        startIcon={<PaymentIcon />}
                        onClick={(e) => {
                            e.stopPropagation();
                            onQuickPay(student);
                        }}
                        sx={{
                            textTransform: 'none',
                            borderRadius: 2,
                            py: 1,
                            fontWeight: 600,
                        }}
                    >
                        {`Pay for ${quickPayLessons} lesson${quickPayLessons !== 1 ? 's' : ''} (${formatMoney(quickPayAmount, currency)})`}
                    </Button>
                ) : (
                    <Box textAlign="center">
                        <Link
                            component="button"
                            variant="caption"
                            onClick={(e) => {
                                e.stopPropagation();
                                onQuickPay(student);
                            }}
                            sx={{
                                color: 'text.secondary',
                                textDecoration: 'none',
                                cursor: 'pointer',
                                '&:hover': {
                                    color: 'primary.main',
                                    textDecoration: 'underline',
                                },
                            }}
                        >
                            + Make prepayment
                        </Link>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default StudentCard;
