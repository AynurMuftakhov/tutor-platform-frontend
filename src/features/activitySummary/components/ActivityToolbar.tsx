import React from 'react';
import {
    Box,
    Stack,
    ToggleButtonGroup,
    ToggleButton,
    Chip,
    TextField,
    InputAdornment,
    IconButton,
    Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

export type SortOption = 'risk' | 'lastSeen' | 'activeToday' | 'name';
export type FilterOption = 'online' | 'notSeenToday' | 'dropping' | 'highPerformers';

export interface ActivityToolbarProps {
    sort: SortOption;
    onSortChange: (value: SortOption) => void;
    filters: Set<FilterOption>;
    onToggleFilter: (filter: FilterOption) => void;
    search: string;
    onSearchChange: (value: string) => void;
    disabled?: boolean;
}

const filterCopy: Record<FilterOption, { label: string; tooltip: string }> = {
    online: { label: 'Online', tooltip: 'Show students currently online.' },
    notSeenToday: { label: 'Not seen today', tooltip: 'Students without any activity today.' },
    dropping: { label: 'Dropping', tooltip: 'Students tagged with dropping engagement risk.' },
    highPerformers: { label: 'High performers', tooltip: 'Students 1σ above class median active minutes.' },
};

export const ActivityToolbar: React.FC<ActivityToolbarProps> = ({
    sort,
    onSortChange,
    filters,
    onToggleFilter,
    search,
    onSearchChange,
    disabled = false,
}) => {
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => onSearchChange(event.target.value);

    return (
        <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 3 }}
        >
            <ToggleButtonGroup
                value={sort}
                exclusive
                color="primary"
                size="small"
                onChange={(_, value) => value && onSortChange(value)}
                disabled={disabled}
                aria-label="Sort students"
                sx={{ flexWrap: 'wrap', gap: 1 }}
            >
                <ToggleButton value="risk">At-risk first</ToggleButton>
                <ToggleButton value="lastSeen">Last seen</ToggleButton>
                <ToggleButton value="activeToday">Active today</ToggleButton>
                <ToggleButton value="name">Name</ToggleButton>
            </ToggleButtonGroup>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Object.entries(filterCopy).map(([key, value]) => {
                    const filterKey = key as FilterOption;
                    const selected = filters.has(filterKey);
                    return (
                        <Tooltip key={key} title={value.tooltip}>
                            <Chip
                                label={value.label}
                                clickable
                                color={selected ? 'primary' : 'default'}
                                variant={selected ? 'filled' : 'outlined'}
                                onClick={() => onToggleFilter(filterKey)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        onToggleFilter(filterKey);
                                    }
                                }}
                                aria-pressed={selected}
                            />
                        </Tooltip>
                    );
                })}
            </Stack>

            <Box sx={{ minWidth: { xs: '100%', md: 280 } }}>
                <TextField
                    fullWidth
                    size="small"
                    label="Search students"
                    value={search}
                    onChange={handleSearchChange}
                    disabled={disabled}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                        endAdornment: search ? (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => onSearchChange('')} aria-label="Clear search">
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : undefined,
                    }}
                />
            </Box>
        </Stack>
    );
};

export default ActivityToolbar;
