import React from 'react';
import { Box, Paper, Typography, Skeleton, Tooltip, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

type ToggleableKpi = 'online' | 'activeToday' | 'atRisk';

interface KpiDescriptor {
    key: ToggleableKpi | 'median';
    label: string;
    description: string;
    getValue: () => string;
    isInteractive: boolean;
}

export interface ClassPulseBarProps {
    onlineNow: number;
    activeToday: number;
    atRisk: number;
    medianActiveMinutes: number;
    activeFilters: Set<ToggleableKpi>;
    isLoading?: boolean;
    onToggleFilter: (key: ToggleableKpi) => void;
    /** visual density; default 'compact' to reduce header footprint */
    variant?: 'compact' | 'default';
}

const ClassPulseBar: React.FC<ClassPulseBarProps> = ({
    onlineNow,
    activeToday,
    atRisk,
    medianActiveMinutes,
    activeFilters,
    isLoading = false,
    onToggleFilter,
    variant = 'compact',
}) => {
    const kpis: KpiDescriptor[] = [
        {
            key: 'online',
            label: 'Online now',
            description: 'Number of students currently online in the past 5 minutes.',
            getValue: () => (isLoading ? '—' : onlineNow.toString()),
            isInteractive: true,
        },
        {
            key: 'activeToday',
            label: 'Active today',
            description: 'Students with any activity logged today.',
            getValue: () => (isLoading ? '—' : activeToday.toString()),
            isInteractive: true,
        },
        {
            key: 'median',
            label: 'Median active minutes',
            description: 'Median active minutes across the class for today.',
            getValue: () => (isLoading ? '—' : `${medianActiveMinutes}m`),
            isInteractive: false,
        },
        {
            key: 'atRisk',
            label: 'At-risk',
            description: 'Students flagged by risk heuristics (e.g. dropping engagement).',
            getValue: () => (isLoading ? '—' : atRisk.toString()),
            isInteractive: true,
        },
    ];

    if (isLoading) {
        return (
            <Paper
                elevation={0}
                sx={{
                    p: variant === 'compact' ? 1.5 : 2.5,
                    display: 'grid',
                    gap: variant === 'compact' ? 1.5 : 3,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            >
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={variant === 'compact' ? 44 : 60} />
                ))}
            </Paper>
        );
    }

    return (
        <Paper
            elevation={0}
            sx={{
                p: variant === 'compact' ? 1.5 : 2.5,
                display: 'grid',
                gap: variant === 'compact' ? 1.5 : 3,
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                background: (theme) =>
                    theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(37,115,255,0.07), rgba(0,215,194,0.08))'
                        : 'linear-gradient(135deg, rgba(37,115,255,0.05), rgba(0,215,194,0.06))',
            }}
            role="group"
            aria-label="Class pulse"
        >
            {kpis.map(({ key, label, description, getValue, isInteractive }) => {
                const value = getValue();
                const isActive = isInteractive ? activeFilters.has(key as ToggleableKpi) : false;
                const content = (
                    <Box
                        component={isInteractive ? 'button' : 'div'}
                        key={key}
                        onClick={
                            isInteractive
                                ? () => onToggleFilter(key as ToggleableKpi)
                                : undefined
                        }
                        onKeyDown={
                            isInteractive
                                ? (event: React.KeyboardEvent<HTMLDivElement | HTMLButtonElement>) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        onToggleFilter(key as ToggleableKpi);
                                    }
                                }
                                : undefined
                        }
                        role={isInteractive ? 'switch' : undefined}
                        aria-checked={isInteractive ? isActive : undefined}
                        tabIndex={isInteractive ? 0 : -1}
                        sx={{
                            textAlign: 'left',
                            p: variant === 'compact' ? 0.75 : 1,
                            borderRadius: 2,
                            bgcolor: isActive ? 'rgba(37,115,255,0.14)' : 'transparent',
                            border: isActive ? '1px solid rgba(37,115,255,0.4)' : '1px solid transparent',
                            transition: 'background 0.2s ease, transform 0.2s ease',
                            cursor: isInteractive ? 'pointer' : 'default',
                            outline: 'none',
                            '&:focus-visible': {
                                boxShadow: theme => `0 0 0 2px ${theme.palette.primary.main}33`,
                            },
                            '&:hover': {
                                transform: isInteractive ? 'translateY(-1px)' : 'none',
                                bgcolor: isInteractive ? 'rgba(37,115,255,0.1)' : 'transparent',
                            },
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="overline" color="text.secondary">
                                {label}
                            </Typography>
                            <Tooltip title={description}>
                                <IconButton
                                    size="small"
                                    aria-label={`${label} info`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <InfoOutlinedIcon fontSize="inherit" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                        <Typography variant={variant === 'compact' ? 'h6' : 'h5'} sx={{ fontWeight: 700 }}>
                            {value}
                        </Typography>
                    </Box>
                );
                return content;
            })}
        </Paper>
    );
};

export default ClassPulseBar;
