import React, { useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    useTheme,
    alpha,
    useMediaQuery,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SortIcon from '@mui/icons-material/Sort';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { DateRangePreset, BillingFilters, BillingSortOption, DEFAULT_BILLING_CURRENCY, CURRENCIES } from '../../types/billing';

dayjs.extend(utc);

interface BillingFiltersBarProps {
    filters: BillingFilters;
    onFiltersChange: (filters: BillingFilters) => void;
    onAddPayment: () => void;
}

function toYMD(d: Dayjs): string {
    return d.utc().format('YYYY-MM-DD');
}

function formatDateRange(from: string, to: string): string {
    const fromDate = dayjs(from);
    const toDate = dayjs(to);
    return `${fromDate.format('MMM D')} - ${toDate.format('MMM D, YYYY')}`;
}

function presetToRange(preset: DateRangePreset, now = dayjs()): { from: string; to: string } {
    const end = toYMD(now);
    switch (preset) {
        case 'thisMonth': {
            const start = toYMD(now.startOf('month'));
            return { from: start, to: end };
        }
        case 'lastMonth': {
            const lastMonth = now.subtract(1, 'month');
            return {
                from: toYMD(lastMonth.startOf('month')),
                to: toYMD(lastMonth.endOf('month')),
            };
        }
        case '3months': {
            const start = toYMD(now.subtract(3, 'month'));
            return { from: start, to: end };
        }
        case '6months': {
            const start = toYMD(now.subtract(6, 'month'));
            return { from: start, to: end };
        }
        case 'year': {
            const start = toYMD(now.subtract(1, 'year'));
            return { from: start, to: end };
        }
        default:
            return { from: end, to: end };
    }
}

const PRESET_LABELS: Record<DateRangePreset, string> = {
    thisMonth: 'This month',
    lastMonth: 'Last month',
    '3months': 'Last 3 months',
    '6months': 'Last 6 months',
    year: 'Last year',
    custom: 'Custom range',
};

export function getDefaultFilters(): BillingFilters {
    const { from, to } = presetToRange('thisMonth');
    return {
        from,
        to,
        currency: DEFAULT_BILLING_CURRENCY,
        preset: 'thisMonth',
        sortBy: 'outstanding_desc',
    };
}

const BillingFiltersBar: React.FC<BillingFiltersBarProps> = ({
    filters,
    onFiltersChange,
    onAddPayment,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [customOpen, setCustomOpen] = useState(false);
    const [customFrom, setCustomFrom] = useState<Dayjs | null>(dayjs(filters.from));
    const [customTo, setCustomTo] = useState<Dayjs | null>(dayjs(filters.to));

    const handlePresetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPreset = e.target.value as DateRangePreset;
        if (newPreset === 'custom') {
            setCustomFrom(dayjs(filters.from));
            setCustomTo(dayjs(filters.to));
            setCustomOpen(true);
            return;
        }
        const { from, to } = presetToRange(newPreset);
        onFiltersChange({ ...filters, from, to, preset: newPreset });
    };

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFiltersChange({ ...filters, currency: e.target.value });
    };

    const handleSortChange = (
        _event: React.MouseEvent<HTMLElement>,
        newSort: BillingSortOption | null,
    ) => {
        if (newSort !== null) {
            onFiltersChange({ ...filters, sortBy: newSort });
        }
    };

    const handleDateRangeClick = () => {
        setCustomFrom(dayjs(filters.from));
        setCustomTo(dayjs(filters.to));
        setCustomOpen(true);
    };

    const applyCustom = () => {
        if (customFrom && customTo) {
            onFiltersChange({
                ...filters,
                from: toYMD(customFrom),
                to: toYMD(customTo),
                preset: 'custom',
            });
        }
        setCustomOpen(false);
    };

    const cancelCustom = () => {
        setCustomOpen(false);
    };

    return (
        <>
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', md: 'center' }}
                justifyContent="space-between"
                sx={{ mb: 3 }}
            >
                {/* Left side: Date range + currency */}
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                    {/* Date range dropdown */}
                    <TextField
                        select
                        size="small"
                        value={filters.preset}
                        onChange={handlePresetChange}
                        sx={{ 
                            minWidth: 160,
                            '& .MuiSelect-select': {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            },
                        }}
                        SelectProps={{
                            renderValue: (value) => (
                                <Box display="flex" alignItems="center" gap={1}>
                                    <CalendarMonthIcon fontSize="small" sx={{ color: 'primary.main' }} />
                                    <span>{PRESET_LABELS[value as DateRangePreset]}</span>
                                </Box>
                            ),
                        }}
                    >
                        {Object.entries(PRESET_LABELS).map(([value, label]) => (
                            <MenuItem key={value} value={value}>
                                {label}
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* Show selected date range - clickable to open custom picker */}
                    <Tooltip title="Click to select custom date range" arrow>
                        <Typography 
                            variant="body2" 
                            color="text.primary"
                            onClick={handleDateRangeClick}
                            sx={{ 
                                display: { xs: 'none', sm: 'block' },
                                px: 1.5,
                                py: 0.5,
                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                                borderRadius: 1,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: 'primary.main',
                                },
                            }}
                        >
                            {formatDateRange(filters.from, filters.to)}
                        </Typography>
                    </Tooltip>

                    {/* Currency selector */}
                    <TextField
                        select
                        size="small"
                        value={filters.currency}
                        onChange={handleCurrencyChange}
                        sx={{ minWidth: 80 }}
                    >
                        {CURRENCIES.map((cur) => (
                            <MenuItem key={cur} value={cur}>
                                {cur}
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* Sort toggle */}
                    <ToggleButtonGroup
                        value={filters.sortBy}
                        exclusive
                        onChange={handleSortChange}
                        size="small"
                        aria-label="sort students"
                    >
                        <ToggleButton value="outstanding_desc" aria-label="debtors first">
                            <Tooltip title="Debtors first" arrow>
                                <SortIcon sx={{ fontSize: 20 }} />
                            </Tooltip>
                        </ToggleButton>
                        <ToggleButton value="name_asc" aria-label="alphabetical">
                            <Tooltip title="Alphabetical" arrow>
                                <SortByAlphaIcon sx={{ fontSize: 20 }} />
                            </Tooltip>
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Stack>

                {/* Right side: Action button */}
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onAddPayment}
                    size={isMobile ? 'small' : 'medium'}
                    sx={{ 
                        textTransform: 'none',
                        borderRadius: 2,
                    }}
                >
                    Record payment
                </Button>
            </Stack>

            {/* Custom range dialog */}
            <Dialog open={customOpen} onClose={cancelCustom} aria-labelledby="custom-range-title">
                <DialogTitle id="custom-range-title">Select date range</DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                        <DatePicker
                            label="From"
                            value={customFrom}
                            onChange={(v) => setCustomFrom(v)}
                            slotProps={{
                                textField: {
                                    size: 'small',
                                    inputProps: { 'aria-label': 'From date' },
                                },
                            }}
                        />
                        <DatePicker
                            label="To"
                            value={customTo}
                            onChange={(v) => setCustomTo(v)}
                            slotProps={{
                                textField: {
                                    size: 'small',
                                    inputProps: { 'aria-label': 'To date' },
                                },
                            }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelCustom}>Cancel</Button>
                    <Button onClick={applyCustom} variant="contained">
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default BillingFiltersBar;
