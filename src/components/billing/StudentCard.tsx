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
    onQuickPay: (student: BillingStudent) => void;
    onClick: (student: BillingStudent) => void;
    onEditPlan: (student: BillingStudent) => void;
    filterCurrency?: string; // Top filter currency to compare with student's native currency
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
    onQuickPay,
    onClick,
    onEditPlan,
    filterCurrency,
}) => {
    const theme = useTheme();
    
    const packageSize = student.packageSize > 0 ? student.packageSize : 1;
    const packagePrice = student.pricePerPackage || 0;
    const displayCurrency = student.currency || 'USD';
    
    // Check if student currency differs from top filter currency
    const currencyDiffers = filterCurrency && filterCurrency !== displayCurrency;
    
    // Use backend-provided values (all-time, not affected by date filter)
    const outstandingPackages = student.outstandingPackages;
    const outstandingAmount = student.outstandingAmount;
    const hasDebt = student.packageDue;
    const hasCredit = student.hasCredit;
    
    // Lessons within current package (all-time)
    const lessonsInCurrentPackage = student.lessonsCompleted % packageSize;
    const currentPackageProgress = (lessonsInCurrentPackage / packageSize) * 100;
    
    // Quick pay = always full package price (default to 1 package if no debt)
    const quickPayPackages = hasDebt ? outstandingPackages : 1;
    const quickPayAmount = quickPayPackages * packagePrice;

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
                                title={`Package: ${packageSize} lessons • ${formatMoney(packagePrice, displayCurrency)} total`}
                                arrow
                            >
                                <Chip
                                    icon={<SchoolIcon sx={{ fontSize: 14 }} />}
                                    label={`${packageSize} lessons • ${formatMoney(packagePrice, displayCurrency)}`}
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

                {/* Progress: Current package progress (all-time) */}
                <Box mb={2.5}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" color="text.secondary">
                            Current package <Typography component="span" variant="caption" color="text.disabled">(all-time)</Typography>
                        </Typography>
                        <Typography variant="caption" fontWeight={600}>
                            {lessonsInCurrentPackage}/{packageSize} lessons
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={currentPackageProgress}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                bgcolor: currentPackageProgress >= 100 
                                    ? theme.palette.success.main 
                                    : theme.palette.primary.main,
                            },
                        }}
                    />
                </Box>

                {/* Stats: Period-specific lessons - Completed / Paid / Balance */}
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
                    <Tooltip title="Lessons completed in selected period" arrow>
                        <Box flex={1} textAlign="center">
                            <Typography variant="h6" fontWeight={700} color="info.main">
                                {student.periodLessonsCompleted ?? 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                                Completed
                            </Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                                (in period)
                            </Typography>
                        </Box>
                    </Tooltip>
                    <Tooltip title="Lessons paid for in selected period" arrow>
                        <Box flex={1} textAlign="center">
                            <Typography variant="h6" fontWeight={700} color="success.main">
                                {student.periodLessonsPaid ?? 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                                Paid
                            </Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                                (in period)
                            </Typography>
                        </Box>
                    </Tooltip>
                    <Tooltip title="Lessons completed minus lessons paid (all-time, ignores date filter)" arrow>
                        <Box flex={1} textAlign="center">
                            <Typography 
                                variant="h6" 
                                fontWeight={700}
                                color={hasDebt ? 'error.main' : hasCredit ? 'success.main' : 'text.secondary'}
                            >
                                {Math.abs(student.lessonsOutstanding)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                                {hasCredit ? 'Credit' : 'Unpaid'}
                            </Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                                (all-time)
                            </Typography>
                        </Box>
                    </Tooltip>
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
                        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                            <Typography 
                                variant="body2" 
                                color="error.main"
                                fontWeight={700}
                            >
                                Owed: {formatMoney(outstandingAmount, displayCurrency)}
                            </Typography>
                            {currencyDiffers && (
                                <Chip
                                    label={displayCurrency}
                                    size="small"
                                    sx={{
                                        height: 18,
                                        fontSize: '0.6rem',
                                        fontWeight: 600,
                                        bgcolor: alpha(theme.palette.grey[500], 0.15),
                                        color: theme.palette.text.secondary,
                                    }}
                                />
                            )}
                        </Box>
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
                        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                            <Typography 
                                variant="body2" 
                                color="success.main"
                                fontWeight={700}
                            >
                                Credit: {Math.abs(outstandingPackages)} pkg ({formatMoney(Math.abs(outstandingAmount), displayCurrency)})
                            </Typography>
                        </Box>
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
                        {`Pay for ${quickPayPackages} package${quickPayPackages !== 1 ? 's' : ''} (${formatMoney(quickPayAmount, displayCurrency)})`}
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
