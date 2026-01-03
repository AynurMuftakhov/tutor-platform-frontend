import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Collapse,
    Grid,
    IconButton,
    Skeleton,
    Tooltip,
    Typography,
    useTheme,
    alpha,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { BillingAnalytics } from '../../types/billing';
import AnalyticsMiniChart from './AnalyticsMiniChart';

interface BillingKPICardsProps {
    analytics: BillingAnalytics | null;
    loading: boolean;
    currency: string;
}

function formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

const BillingKPICards: React.FC<BillingKPICardsProps> = ({ analytics, loading, currency }) => {
    const theme = useTheme();
    const [chartExpanded, setChartExpanded] = React.useState(true);

    const earned = analytics?.earnedThisMonth ?? 0;
    const received = analytics?.receivedThisMonth ?? 0;
    const outstanding = analytics?.outstandingTotal ?? 0;
    const hasOutstanding = outstanding > 0;

    return (
        <Box sx={{ mb: 3 }}>
            <Grid container spacing={3}>
                {/* Earned Card */}
                <Grid size={{ xs:12, sm:6, md:4, lg:3, xl:2 }}>
                    <Card
                        elevation={0}
                        sx={{
                            height: '100%',
                            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                            borderRadius: 3,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.08)}`,
                                borderColor: alpha(theme.palette.info.main, 0.2),
                            },
                        }}
                    >
                        <CardContent sx={{ p: 2.5 }}>
                            <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                                <Box>
                                    <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ fontWeight: 500 }}
                                        >
                                            Earned this month
                                        </Typography>
                                        <Tooltip title="Total value of lessons conducted this month based on your set rates. This reflects how much you've earned through teaching." arrow>
                                            <InfoOutlinedIcon 
                                                sx={{ 
                                                    fontSize: 14, 
                                                    color: 'text.disabled',
                                                    cursor: 'help',
                                                }} 
                                            />
                                        </Tooltip>
                                    </Box>
                                    {loading ? (
                                        <Skeleton width={100} height={36} />
                                    ) : (
                                        <Typography
                                            variant="h5"
                                            sx={{
                                                fontWeight: 700,
                                                color: theme.palette.info.main,
                                                letterSpacing: '-0.01em',
                                            }}
                                        >
                                            {formatMoney(earned, currency)}
                                        </Typography>
                                    )}
                                </Box>
                                <Box
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: alpha(theme.palette.info.main, 0.1),
                                        color: theme.palette.info.main,
                                    }}
                                >
                                    <ReceiptLongIcon sx={{ fontSize: 24 }} />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Received Card */}
                <Grid size={{ xs:12, sm:6, md:4, lg:3, xl:2 }}>
                    <Card
                        elevation={0}
                        sx={{
                            height: '100%',
                            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                            borderRadius: 3,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                boxShadow: `0 4px 12px ${alpha(theme.palette.success.main, 0.08)}`,
                                borderColor: alpha(theme.palette.success.main, 0.2),
                            },
                        }}
                    >
                        <CardContent sx={{ p: 2.5 }}>
                            <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                                <Box>
                                    <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ fontWeight: 500 }}
                                        >
                                            Received this month
                                        </Typography>
                                        <Tooltip title="Actual payments received from students this month. This is the cash that has been collected." arrow>
                                            <InfoOutlinedIcon 
                                                sx={{ 
                                                    fontSize: 14, 
                                                    color: 'text.disabled',
                                                    cursor: 'help',
                                                }} 
                                            />
                                        </Tooltip>
                                    </Box>
                                    {loading ? (
                                        <Skeleton width={100} height={36} />
                                    ) : (
                                        <Typography
                                            variant="h5"
                                            sx={{
                                                fontWeight: 700,
                                                color: theme.palette.success.main,
                                                letterSpacing: '-0.01em',
                                            }}
                                        >
                                            {formatMoney(received, currency)}
                                        </Typography>
                                    )}
                                </Box>
                                <Box
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: alpha(theme.palette.success.main, 0.1),
                                        color: theme.palette.success.main,
                                    }}
                                >
                                    <AccountBalanceWalletIcon sx={{ fontSize: 24 }} />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Outstanding Card - More prominent */}
                <Grid size={{ xs:12, sm:6, md:4, lg:3, xl:2 }}>
                    <Card
                        elevation={0}
                        sx={{
                            height: '100%',
                            border: `2px solid ${hasOutstanding 
                                ? alpha(theme.palette.error.main, 0.5) 
                                : alpha(theme.palette.success.main, 0.5)}`,
                            borderRadius: 3,
                            bgcolor: hasOutstanding 
                                ? alpha(theme.palette.error.main, 0.02)
                                : alpha(theme.palette.success.main, 0.02),
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                boxShadow: hasOutstanding
                                    ? `0 4px 16px ${alpha(theme.palette.error.main, 0.15)}`
                                    : `0 4px 16px ${alpha(theme.palette.success.main, 0.15)}`,
                            },
                        }}
                    >
                        <CardContent sx={{ p: 2.5 }}>
                            <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                                <Box>
                                    <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ fontWeight: 500 }}
                                        >
                                            Owed total
                                        </Typography>
                                        <Tooltip title="Cumulative unpaid balance across all students to date. This is the total amount students still owe you." arrow>
                                            <InfoOutlinedIcon 
                                                sx={{ 
                                                    fontSize: 14, 
                                                    color: 'text.disabled',
                                                    cursor: 'help',
                                                }} 
                                            />
                                        </Tooltip>
                                    </Box>
                                    {loading ? (
                                        <Skeleton width={120} height={40} />
                                    ) : (
                                        <Typography
                                            variant="h4"
                                            sx={{
                                                fontWeight: 800,
                                                color: hasOutstanding 
                                                    ? theme.palette.error.main 
                                                    : theme.palette.success.main,
                                                letterSpacing: '-0.02em',
                                            }}
                                        >
                                            {formatMoney(outstanding, currency)}
                                        </Typography>
                                    )}
                                    {!loading && (
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: hasOutstanding 
                                                    ? theme.palette.error.main 
                                                    : theme.palette.success.main,
                                                fontWeight: 500,
                                                mt: 0.5,
                                                display: 'block',
                                            }}
                                        >
                                            {hasOutstanding 
                                                ? 'Students have unpaid balances' 
                                                : 'All students are settled!'}
                                        </Typography>
                                    )}
                                </Box>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: hasOutstanding
                                            ? alpha(theme.palette.error.main, 0.1)
                                            : alpha(theme.palette.success.main, 0.1),
                                        color: hasOutstanding
                                            ? theme.palette.error.main
                                            : theme.palette.success.main,
                                    }}
                                >
                                    {hasOutstanding ? (
                                        <WarningAmberIcon sx={{ fontSize: 28 }} />
                                    ) : (
                                        <CheckCircleOutlineIcon sx={{ fontSize: 28 }} />
                                    )}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Monthly Chart */}
            <Card
                elevation={0}
                sx={{
                    mt: 3,
                    border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    borderRadius: 3,
                }}
            >
                <CardContent sx={{ p: 0 }}>
                    <Box 
                        display="flex" 
                        alignItems="center" 
                        justifyContent="space-between"
                        sx={{ 
                            px: 2.5, 
                            py: 1.5,
                            borderBottom: chartExpanded ? `1px solid ${theme.palette.divider}` : 'none',
                        }}
                    >
                        <Typography variant="subtitle2" fontWeight={600}>
                            12-Month Overview
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={() => setChartExpanded(!chartExpanded)}
                            sx={{ color: 'text.secondary' }}
                        >
                            {chartExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                    </Box>
                    <Collapse in={chartExpanded}>
                        <Box sx={{ p: 2 }}>
                            <AnalyticsMiniChart
                                data={analytics?.monthlyData ?? []}
                                currency={currency}
                                loading={loading}
                                height={220}
                            />
                        </Box>
                    </Collapse>
                </CardContent>
            </Card>
        </Box>
    );
};

export default BillingKPICards;
