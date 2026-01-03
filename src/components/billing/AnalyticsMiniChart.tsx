import React from 'react';
import {
    Box,
    Typography,
    useTheme,
    alpha,
    Skeleton,
} from '@mui/material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { MonthlyDataPoint } from '../../types/billing';

interface AnalyticsMiniChartProps {
    data: MonthlyDataPoint[];
    currency: string;
    loading?: boolean;
    height?: number;
}

function formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatMonthLabel(month: string): string {
    if (!month || typeof month !== 'string') return '';
    
    const parts = month.split('-');
    if (parts.length < 2) return month; // Return as-is if not in expected format
    
    const year = parseInt(parts[0], 10);
    const monthNum = parseInt(parts[1], 10);
    
    if (isNaN(year) || isNaN(monthNum)) return month;
    
    const date = new Date(year, monthNum - 1);
    if (isNaN(date.getTime())) return month;
    
    return date.toLocaleDateString('en', { month: 'short' });
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number;
        color: string;
        payload?: {
            month?: string;
            monthLabel?: string;
        };
    }>;
    label?: string;
    currency: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ 
    active, 
    payload, 
    label, 
    currency 
}) => {
    if (!active || !payload?.length) return null;

    // Get the original month from the payload data (format: "2025-01")
    const originalMonth = payload[0]?.payload?.month;
    
    // Parse the month to display full name
    let monthName = label || '';
    if (originalMonth && originalMonth.includes('-')) {
        const parts = originalMonth.split('-');
        if (parts.length >= 2) {
            const year = parseInt(parts[0], 10);
            const monthNum = parseInt(parts[1], 10);
            if (!isNaN(year) && !isNaN(monthNum)) {
                const date = new Date(year, monthNum - 1);
                if (!isNaN(date.getTime())) {
                    monthName = date.toLocaleDateString('en', { month: 'long', year: 'numeric' });
                }
            }
        }
    }

    return (
        <Box
            sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
                boxShadow: 2,
            }}
        >
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                {monthName}
            </Typography>
            {payload.map((entry, index) => (
                <Box key={index} display="flex" alignItems="center" gap={1}>
                    <Box
                        sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: entry.color,
                        }}
                    />
                    <Typography variant="body2">
                        {entry.name}: {formatMoney(entry.value, currency)}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
};

const AnalyticsMiniChart: React.FC<AnalyticsMiniChartProps> = ({
    data,
    currency,
    loading = false,
    height = 200,
}) => {
    const theme = useTheme();

    if (loading) {
        return (
            <Box sx={{ height, p: 2 }}>
                <Skeleton variant="rectangular" height={height - 32} sx={{ borderRadius: 2 }} />
            </Box>
        );
    }

    if (!data.length) {
        return (
            <Box
                sx={{
                    height,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.grey[500], 0.05),
                    borderRadius: 2,
                }}
            >
                <Typography color="text.secondary" variant="body2">
                    No data available
                </Typography>
            </Box>
        );
    }

    const chartData = data.map(point => ({
        month: point.month,
        monthLabel: formatMonthLabel(point.month),
        earned: point.earned,
        received: point.received,
    }));

    return (
        <Box sx={{ width: '100%', height }}>
            <ResponsiveContainer>
                <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    barGap={2}
                >
                    <XAxis
                        dataKey="monthLabel"
                        axisLine={false}
                        tickLine={false}
                        tick={{ 
                            fontSize: 11, 
                            fill: theme.palette.text.secondary,
                        }}
                        dy={5}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ 
                            fontSize: 11, 
                            fill: theme.palette.text.secondary,
                        }}
                        tickFormatter={(value) => {
                            if (value >= 1000) {
                                return `${(value / 1000).toFixed(0)}k`;
                            }
                            return value;
                        }}
                        width={40}
                    />
                    <RechartsTooltip
                        content={<CustomTooltip currency={currency} />}
                        cursor={{ 
                            fill: alpha(theme.palette.primary.main, 0.05),
                            radius: 4,
                        }}
                    />
                    <Legend
                        wrapperStyle={{ 
                            paddingTop: 10,
                            fontSize: 12,
                        }}
                        formatter={(value) => (
                            <span style={{ color: theme.palette.text.secondary }}>
                                {value}
                            </span>
                        )}
                    />
                    <Bar
                        dataKey="earned"
                        name="Earned"
                        fill={theme.palette.info.main}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={24}
                    />
                    <Bar
                        dataKey="received"
                        name="Received"
                        fill={theme.palette.success.main}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={24}
                    />
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
};

export default AnalyticsMiniChart;

