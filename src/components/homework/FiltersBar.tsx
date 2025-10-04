import React, { useMemo, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// Icons
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventIcon from '@mui/icons-material/Event';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

dayjs.extend(utc);

export type HomeworkStatusFilter = 'active' | 'completed' | 'all';
export type DateRangePreset = 'last7' | 'last14' | 'last30' | 'thisMonth' | 'custom';
export type HomeworkSort = 'assignedDesc' | 'assignedAsc' | 'dueAsc' | 'dueDesc';

export type FiltersState = {
    status: HomeworkStatusFilter;
    range: DateRangePreset;
    from?: string; // YYYY-MM-DD (UTC)
    to?: string;   // YYYY-MM-DD (UTC)
    hideCompleted: boolean;
    sort: HomeworkSort;
};

export interface FiltersBarProps {
    /** Controlled value for the filters */
    value: FiltersState;
    /** Notified on any filter change */
    onChange: (state: FiltersState) => void;
    /** Optional: make the bar sticky under your page header */
    sticky?: boolean;
}

function toYMD(d: Dayjs): string { return d.utc().format('YYYY-MM-DD'); }

function presetToRange(preset: DateRangePreset, now = dayjs()): { from: string; to: string } {
    const end = toYMD(now);
    if (preset === 'thisMonth') {
        const start = toYMD(now.startOf('month'));
        return { from: start, to: end };
    }
    const days = preset === 'last14' ? 13 : preset === 'last30' ? 29 : 6; // inclusive window
    const start = toYMD(now.subtract(days, 'day'));
    return { from: start, to: end };
}

const DEFAULTS: FiltersState = {
    status: 'active',
    range: 'last7',
    ...presetToRange('last7'),
    hideCompleted: true,
    sort: 'assignedDesc',
};

const FiltersBar: React.FC<FiltersBarProps> = ({ value, onChange, sticky }) => {
    const theme = useTheme();
    const isXs = useMediaQuery(theme.breakpoints.down('sm'));
    const state = value;

    const pillPx = isXs ? 0.9 : 1.25;   // horizontal padding
    const pillPy = isXs ? 0.25 : 0.5;   // vertical padding
    const pillMinH = isXs ? 32 : 36;    // consistent pill height
    const pillFont = isXs ? 13 : 14;    // font size

    const pillCommonSx = {
        textTransform: 'none',
        border: 0,
        px: pillPx,
        py: pillPy,
        minHeight: pillMinH,
        borderRadius: 999,
        fontWeight: 500,
        fontSize: pillFont,
        lineHeight: 1.6,
        gap: 0.5,
        '& .MuiSvgIcon-root': { fontSize: isXs ? 18 : 20 },
    } as const;

    // Controlled state is passed via props
    const [customOpen, setCustomOpen] = useState(false);
    const [customFrom, setCustomFrom] = useState<Dayjs | null>(state.from ? dayjs(state.from) : dayjs());
    const [customTo, setCustomTo] = useState<Dayjs | null>(state.to ? dayjs(state.to) : dayjs());

    const isDefault = useMemo(() => {
        const d = DEFAULTS;
        return (
            state.status === d.status &&
            state.range === d.range &&
            state.hideCompleted === d.hideCompleted &&
            state.sort === d.sort &&
            state.from === d.from &&
            state.to === d.to
        );
    }, [state]);

    // Handlers
    const handleStatus = (_: React.MouseEvent<HTMLElement>, value: HomeworkStatusFilter | null) => {
        if (!value) return;
        onChange({
            ...state,
            status: value,
            hideCompleted: value === 'active' ? true : state.hideCompleted,
        });
    };

    const handleRange = (_: React.MouseEvent<HTMLElement>, value: DateRangePreset | null) => {
        if (!value) return;
        if (value === 'custom') {
            onChange({ ...state, range: 'custom' });
            setCustomOpen(true);
            return;
        }
        const pr = presetToRange(value);
        onChange({ ...state, range: value, from: pr.from, to: pr.to });
    };

    const handleSort = (_: React.MouseEvent<HTMLElement>, value: HomeworkSort | null) => {
        if (!value) return;
        onChange({ ...state, sort: value });
    };

    const applyCustom = () => {
        const f = customFrom ? toYMD(customFrom) : undefined;
        const t = customTo ? toYMD(customTo) : undefined;
        onChange({ ...state, range: 'custom', from: f, to: t });
        setCustomOpen(false);
    };

    const cancelCustom = () => {
        setCustomOpen(false);
        if (state.range === 'custom' && (!state.from || !state.to)) {
            const pr = presetToRange('last7');
            onChange({ ...state, range: 'last7', from: pr.from, to: pr.to });
        }
    };

    const resetAll = () => onChange({ ...DEFAULTS });

    const hScroll = {
        overflowX: 'auto',
        px: 0.5,
        pb: 0.25,
        mx: -0.5,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        scrollSnapType: 'x mandatory',
        '& .MuiToggleButton-root': { scrollSnapAlign: 'start' },
    } as const;

    // Build groups once so we can reuse across mobile/desktop
    const statusGroup = (
        <ToggleButtonGroup
            value={state.status}
            exclusive
            onChange={handleStatus}
            aria-label="Status"
            size="small"
            sx={{
                borderRadius: 999,
                '& .MuiToggleButton-root': {
                    ...pillCommonSx,
                    color: 'text.secondary',
                },
                '& .MuiToggleButtonGroup-grouped': {
                    border: 0,
                    mx: 0.25,
                    borderRadius: 999,
                },
                '& .MuiToggleButton-root.Mui-selected': {
                    minHeight: pillMinH,
                    color: 'primary.main',
                    backgroundColor: (t) => alpha(t.palette.primary.main, 0.12),
                    border: '1px solid',
                    borderColor: (t) => alpha(t.palette.primary.main, 0.32),
                    fontWeight: 600,
                    '&:hover': {
                        backgroundColor: (t) => alpha(t.palette.primary.main, 0.18),
                    },
                },
            }}
        >
            <ToggleButton value="active" aria-label="Active">
                <CheckCircleOutlineIcon fontSize="small" style={{ marginRight: 6 }} />
                Active
            </ToggleButton>
            <ToggleButton value="completed" aria-label="Completed">
                <DoneAllIcon fontSize="small" style={{ marginRight: 6 }} />
                Completed
            </ToggleButton>
            <ToggleButton value="all" aria-label="All">
                <AllInclusiveIcon fontSize="small" style={{ marginRight: 6 }} />
                All
            </ToggleButton>
        </ToggleButtonGroup>
    );

    const dateGroup = (
        <ToggleButtonGroup
            value={state.range}
            exclusive
            onChange={handleRange}
            aria-label="Date range"
            size="small"
            sx={{
                borderRadius: 999,
                '& .MuiToggleButton-root': {
                    ...pillCommonSx,
                    color: 'text.secondary',
                },
                '& .MuiToggleButtonGroup-grouped': {
                    border: 0,
                    mx: 0.25,
                    borderRadius: 999,
                },
                '& .MuiToggleButton-root.Mui-selected': {
                    minHeight: pillMinH,
                    color: 'primary.main',
                    backgroundColor: (t) => alpha(t.palette.primary.main, 0.12),
                    border: '1px solid',
                    borderColor: (t) => alpha(t.palette.primary.main, 0.32),
                    fontWeight: 600,
                    '&:hover': {
                        backgroundColor: (t) => alpha(t.palette.primary.main, 0.18),
                    },
                },
            }}
        >
            <ToggleButton value="last7" aria-label="Last 7 days">
                <ScheduleIcon fontSize="small" style={{ marginRight: 6 }} />
                7d
            </ToggleButton>
            <ToggleButton value="last14" aria-label="Last 14 days">14d</ToggleButton>
            <ToggleButton value="last30" aria-label="Last 30 days">30d</ToggleButton>
            <ToggleButton value="thisMonth" aria-label="This month">
                <CalendarMonthIcon fontSize="small" style={{ marginRight: 6 }} />
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>This </Box>
                month
            </ToggleButton>
            <ToggleButton value="custom" aria-label="Custom range">
                <EventIcon fontSize="small" style={{ marginRight: 6 }} />
                Custom
            </ToggleButton>
        </ToggleButtonGroup>
    );

    const sortGroup = (
        <ToggleButtonGroup
            value={state.sort}
            exclusive
            onChange={handleSort}
            aria-label="Sort"
            size="small"
            sx={{
                borderRadius: 999,
                '& .MuiToggleButton-root': {
                    ...pillCommonSx,
                    color: 'text.secondary',
                },
                '& .MuiToggleButtonGroup-grouped': {
                    border: 0,
                    mx: 0.25,
                    borderRadius: 999,
                },
                '& .MuiToggleButton-root.Mui-selected': {
                    minHeight: pillMinH,
                    color: 'primary.main',
                    backgroundColor: (t) => alpha(t.palette.primary.main, 0.12),
                    border: '1px solid',
                    borderColor: (t) => alpha(t.palette.primary.main, 0.32),
                    fontWeight: 600,
                    '&:hover': {
                        backgroundColor: (t) => alpha(t.palette.primary.main, 0.18),
                    },
                },
            }}
        >
            <ToggleButton value="assignedDesc" aria-label="Newest assigned">
                <TrendingDownIcon fontSize="small" style={{ marginRight: 6 }} />
                Newest
            </ToggleButton>
            <ToggleButton value="assignedAsc" aria-label="Oldest assigned">
                <TrendingUpIcon fontSize="small" style={{ marginRight: 6 }} />
                Oldest
            </ToggleButton>
        </ToggleButtonGroup>
    );

    return (
        <>
            <Paper
                elevation={0}
                sx={{
                    px: 1,
                    py: { xs: 0.5, sm: 0.75 },
                    borderRadius: 2,
                    gap: { xs: 0.5, sm: 1 },
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    border: '1px solid',
                    borderColor: 'divider',
                    backdropFilter: 'saturate(1.1) blur(6px)',
                    background:
                        theme.palette.mode === 'light'
                            ? 'rgba(255,255,255,0.8)'
                            : 'rgba(22,22,26,0.7)',
                    position: sticky ? 'sticky' : 'static',
                    top: sticky ? 8 : 'auto',
                    zIndex: sticky ? 2 : 'auto',
                }}
                aria-label="Homework filters"
            >
                {isXs ? (
                    <Stack spacing={0.25} sx={{ width: '100%' }}>
                        <Stack direction="row" spacing={0.5} sx={hScroll}>{statusGroup}</Stack>
                        <Stack direction="row" spacing={0.5} sx={hScroll}>{dateGroup}</Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={hScroll}>
                            {sortGroup}
                            {!isDefault && (
                                <Button size="small" startIcon={<RestartAltIcon />} onClick={resetAll} sx={{ ml: 'auto', flexShrink: 0 }}>
                                    Reset
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                ) : (
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ width: '100%' }}>
                        {statusGroup}
                        {dateGroup}
                        {sortGroup}
                        {!isDefault && (
                            <Button size="small" startIcon={<RestartAltIcon />} onClick={resetAll} sx={{ ml: 'auto' }}>
                                Reset
                            </Button>
                        )}
                    </Stack>
                )}
            </Paper>

            {/* Custom range dialog */}
            <Dialog open={customOpen} onClose={cancelCustom} aria-labelledby="custom-range-title">
                <DialogTitle id="custom-range-title">Custom date range</DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                        <DatePicker
                            label="From"
                            value={customFrom}
                            onChange={(v) => setCustomFrom(v)}
                            slotProps={{ textField: { size: 'small', inputProps: { 'aria-label': 'From date' } } }}
                        />
                        <DatePicker
                            label="To"
                            value={customTo}
                            onChange={(v) => setCustomTo(v)}
                            slotProps={{ textField: { size: 'small', inputProps: { 'aria-label': 'To date' } } }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelCustom}>Cancel</Button>
                    <Button onClick={applyCustom} variant="contained">Apply</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default FiltersBar;