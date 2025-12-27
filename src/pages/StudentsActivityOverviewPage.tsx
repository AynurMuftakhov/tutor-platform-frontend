import React, { useMemo } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Container,
    Skeleton,
    Stack,
    Typography,
} from '@mui/material';
import PageHeader from '../components/PageHeader';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useAuth } from '../context/AuthContext';
import {
    ActivityToolbar,
    type FilterOption,
    type SortOption,
} from '../features/activitySummary/components/ActivityToolbar';
import ClassPulseBar from '../features/activitySummary/components/ClassPulseBar';
import StudentActivityCard from '../features/activitySummary/components/StudentActivityCard';
import VirtualizedStudentGrid from '../features/activitySummary/components/VirtualizedStudentGrid';
import { useActivitySummary } from '../features/activitySummary';
import { activitySummaryConfig } from '../features/activitySummary';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useStudentNudge } from '../features/activitySummary';
import type { StudentActivityViewModel } from '../features/activitySummary';
import { trackAnalyticsEvent } from '../services/analytics';

const DEFAULT_SORT: SortOption = 'risk';
type ExtendedFilter = FilterOption | 'activeToday' | 'atRisk';

const sumTodayMinutes = (student: StudentActivityViewModel) =>
    student.todayMinutes.active + student.todayMinutes.homework + student.todayMinutes.vocab;

const riskPriority = (student: StudentActivityViewModel) => {
    if (student.riskLevel === 'high') return 3;
    if (student.riskLevel === 'medium') return 2;
    if (student.riskTags.includes('dropping')) return 2;
    if (student.riskLevel === 'low') return 1;
    return 0;
};

const lastSeenValue = (student: StudentActivityViewModel) => {
    if (student.online) return Number.MAX_SAFE_INTEGER;
    if (!student.lastSeenTs) return 0;
    return new Date(student.lastSeenTs).getTime();
};

const serializeFilters = (filters: Set<ExtendedFilter>) =>
    Array.from(filters).sort().join(',');

const parseFilters = (raw: string | null): Set<ExtendedFilter> => {
    if (!raw) return new Set();
    const parts = raw.split(',').filter(Boolean) as ExtendedFilter[];
    return new Set(parts);
};

const deriveNudgeReason = (filters: Set<ExtendedFilter>) => {
    if (filters.has('dropping')) return 'dropping_trend';
    if (filters.has('atRisk')) return 'at_risk';
    if (filters.has('notSeenToday')) return 'low_activity_today';
    if (filters.has('online')) return 'online_now';
    if (filters.has('highPerformers')) return 'high_performer';
    if (filters.has('activeToday')) return 'active_today';
    return 'manual_nudge';
};

const StudentsActivityOverviewPage: React.FC = () => {
    const navigate = useNavigate();
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    const { user } = useAuth();
    const teacherId = user?.id;

    const [searchParams, setSearchParams] = useSearchParams();
    const sortParam = (searchParams.get('sort') as SortOption) ?? DEFAULT_SORT;
    const filtersParam = parseFilters(searchParams.get('filters'));
    const searchParam = searchParams.get('q') ?? '';
    const [searchValue, setSearchValue] = React.useState(searchParam);
    const debouncedSearch = useDebouncedValue(searchValue, 250);

    React.useEffect(() => {
        setSearchValue(searchParam);
    }, [searchParam]);

    React.useEffect(() => {
        const next = new URLSearchParams(searchParams);
        if (debouncedSearch) {
            next.set('q', debouncedSearch);
        } else {
            next.delete('q');
        }
        if (next.toString() !== searchParams.toString()) {
            setSearchParams(next, { replace: true });
        }
    }, [debouncedSearch, searchParams, setSearchParams]);

    const updateParams = (next: { sort?: SortOption; filters?: Set<ExtendedFilter> }) => {
        const params = new URLSearchParams(searchParams);
        if (next.sort) {
            if (next.sort === DEFAULT_SORT) {
                params.delete('sort');
            } else {
                params.set('sort', next.sort);
            }
        }
        if (next.filters) {
            if (next.filters.size) {
                params.set('filters', serializeFilters(next.filters));
            } else {
                params.delete('filters');
            }
        }
        setSearchParams(params, { replace: true });
    };

    const { data, students, medianActiveMinutesToday, median7dActiveAverage, stdDev7dActiveAverage, isLoading, isError, refetch } =
        useActivitySummary({ teacherId });

    const nudgeMutation = useStudentNudge(teacherId);

    const highPerformerThreshold = useMemo(
        () => median7dActiveAverage + stdDev7dActiveAverage,
        [median7dActiveAverage, stdDev7dActiveAverage],
    );

    const filterSet = useMemo(() => new Set(filtersParam), [filtersParam]);

    const filteredStudents = useMemo(() => {
        let result = students;

        if (filterSet.has('online')) {
            result = result.filter(student => student.online);
        }
        if (filterSet.has('activeToday')) {
            result = result.filter(student => sumTodayMinutes(student) > 0);
        }
        if (filterSet.has('notSeenToday')) {
            result = result.filter(student => sumTodayMinutes(student) === 0);
        }
        if (filterSet.has('atRisk')) {
            result = result.filter(student => riskPriority(student) > 1);
        }
        if (filterSet.has('dropping')) {
            result = result.filter(student =>
                student.riskTags.includes('dropping') ||
                student.riskReasons.some(reason => reason.toLowerCase().includes('drop'))
            );
        }
        if (filterSet.has('highPerformers')) {
            result = result.filter(student => student.stats.average7dActiveMinutes >= highPerformerThreshold);
        }

        if (debouncedSearch) {
            const query = debouncedSearch.toLowerCase();
            result = result.filter(student =>
                student.name.toLowerCase().includes(query) ||
                (student.email?.toLowerCase().includes(query) ?? false),
            );
        }

        return result;
    }, [students, filterSet, highPerformerThreshold, debouncedSearch]);

    const classPulseFilters = useMemo(() => {
        const next = new Set<'online' | 'activeToday' | 'atRisk'>();
        if (filterSet.has('online')) next.add('online');
        if (filterSet.has('activeToday')) next.add('activeToday');
        if (filterSet.has('atRisk')) next.add('atRisk');
        return next;
    }, [filterSet]);

    const sortedStudents = useMemo(() => {
        const sorted = [...filteredStudents];
        switch (sortParam) {
            case 'lastSeen':
                sorted.sort((a, b) => lastSeenValue(b) - lastSeenValue(a));
                break;
            case 'activeToday':
                sorted.sort((a, b) => sumTodayMinutes(b) - sumTodayMinutes(a));
                break;
            case 'name':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'risk':
            default:
                sorted.sort((a, b) => {
                    const riskDiff = riskPriority(b) - riskPriority(a);
                    if (riskDiff !== 0) return riskDiff;
                    const activityDiff = sumTodayMinutes(b) - sumTodayMinutes(a);
                    if (activityDiff !== 0) return activityDiff;
                    return lastSeenValue(b) - lastSeenValue(a);
                });
                break;
        }
        return sorted;
    }, [filteredStudents, sortParam]);

    const onlineNowCount = useMemo(() => {
        if (data?.stats?.onlineNowCount !== undefined) return data.stats.onlineNowCount;
        if (data?.onlineNow?.length) return data.onlineNow.length;
        return students.filter(student => student.online).length;
    }, [data, students]);

    const activeTodayCount = useMemo(() => {
        if (data?.stats?.activeTodayCount !== undefined) return data.stats.activeTodayCount;
        return students.filter(student => sumTodayMinutes(student) > 0).length;
    }, [data, students]);

    const atRiskCount = useMemo(() => {
        if (data?.stats?.atRiskCount !== undefined) return data.stats.atRiskCount;
        return students.filter(student => riskPriority(student) > 1).length;
    }, [data, students]);

    const toggleFilter = (filter: ExtendedFilter) => {
        const next = new Set(filterSet);
        if (next.has(filter)) {
            next.delete(filter);
        } else {
            next.add(filter);
        }
        if (filter !== 'activeToday') {
            trackAnalyticsEvent('activity_filter_toggle', {
                filter,
                enabled: next.has(filter),
            });
        }
        updateParams({ filters: next });
    };

    const handleSortChange = (value: SortOption) => {
        trackAnalyticsEvent('activity_sort_change', { sort: value });
        updateParams({ sort: value });
    };

    const handleClassPulseToggle = (filter: 'online' | 'activeToday' | 'atRisk') => {
        if (filter === 'atRisk') {
            toggleFilter('atRisk');
        } else if (filter === 'activeToday') {
            toggleFilter('activeToday');
        } else {
            toggleFilter(filter);
        }
        trackAnalyticsEvent('activity_kpi_toggle', { kpi: filter });
    };

    const nudgeReason = useMemo(() => deriveNudgeReason(filterSet), [filterSet]);

    const handleNudge = async (studentId: string) => {
        if (!teacherId) return;
        const student = students.find(s => s.id === studentId);
        try {
            await nudgeMutation.mutateAsync({ studentId, reason: nudgeReason });
            enqueueSnackbar(`Nudge sent to ${student?.name ?? 'student'}`, { variant: 'success' });
        } catch (error: any) {
            const message =
                error?.response?.status === 429
                    ? 'Nudge rate limit reached. Try again in a few minutes.'
                    : 'Unable to send nudge. Please try again.';
            enqueueSnackbar(message, {
                variant: 'error',
                action: (snackbarId) => (
                    <Button
                        size="small"
                        onClick={() => {
                            closeSnackbar(snackbarId);
                            void handleNudge(studentId);
                        }}
                    >
                        Retry
                    </Button>
                ),
            });
        }
    };

    const handleOpenDetail = (studentId: string) => {
        navigate(`/teacher/students/${studentId}/activity`);
    };

    if (!activitySummaryConfig.enabled) {
        return (
            <Container sx={{ py: 4 }}>
                <Alert severity="info">
                    Activity summary is currently disabled. Please reach out to the product team before re-enabling.
                </Alert>
            </Container>
        );
    }

    return (
        <Box
            sx={{
                p: { xs: 2, sm: 2 },
                bgcolor: '#fafbfd',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            <PageHeader
                title="Students Activity Triage"
                titleColor={"primary"}
                subtitle="Monitor engagement trends, triage at‑risk students, and act fast."
                sticky
                glassmorphism
                metrics={
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip size="small" label={`Online ${onlineNowCount}`} />
                        <Chip size="small" label={`Active today ${activeTodayCount}`} variant="outlined" />
                        <Chip size="small" label={`Median active ${medianActiveMinutesToday}m`} variant="outlined" />
                        <Chip size="small" label={`At‑risk ${atRiskCount}`} color="warning" />
                    </Stack>
                }

            />

            {isError && (
                <Alert
                    severity="error"
                    sx={{ mb: 3 }}
                    action={
                        <Button color="inherit" onClick={() => void refetch()}>
                            Retry
                        </Button>
                    }
                >
                    We couldn&apos;t load the activity summary. Please retry.
                </Alert>
            )}

            <ActivityToolbar
                sort={sortParam}
                onSortChange={handleSortChange}
                filters={new Set(
                    Array.from(filterSet).filter((filter): filter is FilterOption => filter !== 'activeToday' && filter !== 'atRisk')
                )}
                onToggleFilter={toggleFilter}
                search={searchValue}
                onSearchChange={setSearchValue}
                disabled={isLoading}
            />

            {isLoading ? (
                <Stack spacing={2}>
                    <Skeleton variant="rounded" height={CARD_SKELETON_HEIGHT} />
                    <Skeleton variant="rounded" height={CARD_SKELETON_HEIGHT} />
                    <Skeleton variant="rounded" height={CARD_SKELETON_HEIGHT} />
                </Stack>
            ) : sortedStudents.length === 0 ? (
                <Box
                    sx={{
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 3,
                        p: 6,
                        textAlign: 'center',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Typography variant="h6" gutterBottom>
                        No students match your filters
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Try adjusting filters or clearing the search to see the full class roster.
                    </Typography>
                    <Button variant="outlined" onClick={() => updateParams({ filters: new Set(), sort: DEFAULT_SORT })}>
                        Clear filters
                    </Button>
                </Box>
            ) : (
                <VirtualizedStudentGrid
                    items={sortedStudents}
                    renderItem={(student) => (
                        <StudentActivityCard
                            student={student}
                            onOpenDetail={handleOpenDetail}
                            onSendNudge={handleNudge}
                            nudgeInFlight={nudgeMutation.isPending && nudgeMutation.variables?.studentId === student.id}
                            disableActions={nudgeMutation.isPending && nudgeMutation.variables?.studentId !== student.id}
                        />
                    )}
                />
            )}
        </Box>
    );
};

const CARD_SKELETON_HEIGHT = 200;

export default StudentsActivityOverviewPage;
