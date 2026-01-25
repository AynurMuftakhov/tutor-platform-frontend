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
    const [chartExpanded, setChartExpanded] = React.useState(false);
    const insightsStorageKey = 'billing-insights-expanded';

    React.useEffect(() => {
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem(insightsStorageKey) : null;
        if (stored !== null) {
            setChartExpanded(stored === 'true');
        } else {
            // Default to collapsed for new redesign
            setChartExpanded(false);
        }
    }, []);

    const toggleChartExpanded = () => {
        setChartExpanded((prev) => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(insightsStorageKey, String(next));
            }
            return next;
        });
    };

    // Period-specific (based on date filter)
    const earned = analytics?.earnedInPeriod ?? 0;
    const received = analytics?.receivedInPeriod ?? 0;
    // All-time (always cumulative)
    const packagesToSettleCount = analytics?.packagesToSettleCount ?? 0;

    return (
        <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
                {/* Earned Card */}
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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
                                            Earned (this period)
                                        </Typography>
                                        <Tooltip title="Value of lessons delivered in this period." arrow>
                                            <InfoOutlinedIcon 
                                                sx={{ 
                                                    fontSize: 14, 
                                                    color: 'text.disabled',
                                                    cursor: 'help',
                                                }}
                                                data-testid="earned-tooltip-icon"
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
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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
                                            Received (this period)
                                        </Typography>
                                        <Tooltip title="Total payments received in this period." arrow>
                                            <InfoOutlinedIcon 
                                                sx={{ 
                                                    fontSize: 14, 
                                                    color: 'text.disabled',
                                                    cursor: 'help',
                                                }}
                                                data-testid="received-tooltip-icon"
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

                {/* Packages to Settle Card */}
                <Grid size={{ xs: 12, sm: 12, md: 4 }}>
                    <Card
                        elevation={0}
                        sx={{
                            height: '100%',
                            border: `1px solid ${packagesToSettleCount > 0 
                                ? alpha(theme.palette.warning.main, 0.3) 
                                : alpha(theme.palette.divider, 0.5)}`,
                            borderRadius: 3,
                            bgcolor: packagesToSettleCount > 0 
                                ? alpha(theme.palette.warning.main, 0.02)
                                : 'transparent',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                boxShadow: `0 4px 12px ${alpha(theme.palette.warning.main, 0.08)}`,
                                borderColor: alpha(theme.palette.warning.main, 0.4),
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
                                            Packages to settle
                                        </Typography>
                                        <Tooltip title="Count of students who finished their package and need a new one or payment." arrow>
                                            <InfoOutlinedIcon 
                                                sx={{ 
                                                    fontSize: 14, 
                                                    color: 'text.disabled',
                                                    cursor: 'help',
                                                }}
                                                data-testid="settle-tooltip-icon"
                                            />
                                        </Tooltip>
                                    </Box>
                                    {loading ? (
                                        <Skeleton width={60} height={36} />
                                    ) : (
                                        <Typography
                                            variant="h5"
                                            sx={{
                                                fontWeight: 700,
                                                color: packagesToSettleCount > 0 
                                                    ? theme.palette.warning.main 
                                                    : theme.palette.text.secondary,
                                                letterSpacing: '-0.01em',
                                            }}
                                        >
                                            {packagesToSettleCount}
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
                                        bgcolor: packagesToSettleCount > 0 
                                            ? alpha(theme.palette.warning.main, 0.1)
                                            : alpha(theme.palette.divider, 0.1),
                                        color: packagesToSettleCount > 0 
                                            ? theme.palette.warning.main 
                                            : theme.palette.text.disabled,
                                    }}
                                >
                                    <WarningAmberIcon sx={{ fontSize: 24 }} />
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
                            Insights
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={toggleChartExpanded}
                            aria-label={chartExpanded ? 'Collapse insights' : 'Expand insights'}
                            sx={{ color: 'text.secondary' }}
                        >
                            {chartExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                    </Box>
                    <Collapse in={chartExpanded}>
                        <Box sx={{ p: 2 }} data-testid="billing-insights-content">
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
