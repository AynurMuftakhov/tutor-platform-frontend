import React, { useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    Grid,
    Link as MuiLink,
    Skeleton,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    alpha,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LocalFireDepartmentOutlinedIcon from '@mui/icons-material/LocalFireDepartmentOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import OutboundOutlinedIcon from '@mui/icons-material/OutboundOutlined';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useAuth } from '../context/AuthContext';
import {
    ActivityInterval,
    ActivityTimelineResponse,
    ActivityRollupResponse,
    fetchStudentActivityRollup,
    fetchStudentActivityTimeline,
} from '../services/api';
import { useQuery } from '@tanstack/react-query';
import Sparkline from '../features/activitySummary/components/Sparkline';
import { formatRelativeTime } from '../utils/time';
import { activitySummaryConfig } from '../features/activitySummary/config';
import { useActivitySummary } from '../features/activitySummary/hooks/useActivitySummary';
import { useStudentNudge } from '../features/activitySummary/hooks/useStudentNudge';

type RangePreset = '7' | '30';
type TrendKey = 'active' | 'homework' | 'vocab';

const toYMD = (d: Date) => d.toISOString().slice(0, 10);

const minutes = (value?: number) => Math.max(0, Math.round(value ?? 0));

const formatPercent = (value: number) => {
    if (!Number.isFinite(value) || Number.isNaN(value)) return '0%';
    const rounded = Math.round(value);
    return `${rounded > 0 ? '+' : ''}${rounded}%`;
};

const formatDuration = (ms: number) => {
    const totalMinutes = Math.round(ms / 60000);
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
};

const formatTimeRange = (start: Date, end: Date) => {
    const locale = navigator.language || 'en-US';
    return `${start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
};

const trendMeta: Record<TrendKey, { label: string; color: string; icon: React.ReactNode }> = {
    active: { label: 'Active', color: '#2573ff', icon: <TrendingUpIcon fontSize="small" /> },
    homework: { label: 'Homework', color: '#00d7c2', icon: <MenuBookOutlinedIcon fontSize="small" /> },
    vocab: { label: 'Vocab', color: '#8a6cff', icon: <SchoolOutlinedIcon fontSize="small" /> },
};

const timelineMeta: Record<ActivityInterval['type'], { label: string; color: string }> = {
    active: { label: 'Active', color: '#2573ff' },
    homework: { label: 'Homework', color: '#00b894' },
    vocab: { label: 'Vocab', color: '#8a6cff' },
    lesson: { label: 'Lesson', color: '#ffa726' },
};

interface TrendAnalysis {
    series: number[];
    previousSeries: number[];
    percentChange: number;
    total: number;
}

const analyzeTrend = (days: ActivityRollupResponse['days'], key: TrendKey, range: RangePreset): TrendAnalysis => {
    const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
    const windowSize = range === '30' ? 30 : 7;
    const currentDays = sorted.slice(-windowSize);
    const previousDays = sorted.slice(-windowSize * 2, -windowSize);
    const extract = (collection: typeof currentDays) => collection.map((day) => {
        if (key === 'active') return minutes(day.activeMinutes);
        if (key === 'homework') return minutes(day.homeworkMinutes);
        return minutes(day.vocabMinutes);
    });
    const series = extract(currentDays);
    const previousSeries = extract(previousDays);
    const total = series.reduce((acc, value) => acc + value, 0);
    const previousTotal = previousSeries.reduce((acc, value) => acc + value, 0);
    const percentChange =
        previousTotal === 0
            ? (total > 0 ? 100 : 0)
            : ((total - previousTotal) / previousTotal) * 100;
    return { series, previousSeries, percentChange, total };
};

const groupTimelineByType = (timeline?: ActivityTimelineResponse): Record<ActivityInterval['type'], ActivityInterval[]> => {
    const groups = {
        active: [] as ActivityInterval[],
        homework: [] as ActivityInterval[],
        vocab: [] as ActivityInterval[],
        lesson: [] as ActivityInterval[],
    };
    if (!timeline?.intervals) return groups;
    for (const interval of timeline.intervals) {
        groups[interval.type].push(interval);
    }
    for (const key of Object.keys(groups) as ActivityInterval['type'][]) {
        groups[key].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }
    return groups;
};

const TimelineTrack: React.FC<{
    label: string;
    color: string;
    intervals: ActivityInterval[];
    day: string;
}> = ({ label, color, intervals, day }) => {
    const dayStart = new Date(`${day}T00:00:00Z`).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const totalMs = dayEnd - dayStart;

    return (
        <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ width: 80 }}>
                {label}
            </Typography>
            <Box
                sx={{
                    position: 'relative',
                    flexGrow: 1,
                    height: 18,
                    borderRadius: 9,
                    bgcolor: 'grey.200',
                    overflow: 'hidden',
                }}
            >
                {intervals.map((interval, idx) => {
                    const start = new Date(interval.start).getTime();
                    const end = new Date(interval.end).getTime();
                    const clampedStart = Math.max(dayStart, start);
                    const clampedEnd = Math.min(dayEnd, end);
                    const left = ((clampedStart - dayStart) / totalMs) * 100;
                    const width = Math.max(1, ((clampedEnd - clampedStart) / totalMs) * 100);
                    const duration = clampedEnd - clampedStart;
                    return (
                        <Tooltip
                            key={`${interval.type}-${idx}`}
                            title={`${formatTimeRange(new Date(clampedStart), new Date(clampedEnd))} • ${formatDuration(duration)}`}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: `${left}%`,
                                    width: `${width}%`,
                                    top: 2,
                                    bottom: 2,
                                    borderRadius: 6,
                                    bgcolor: color,
                                    opacity: 0.7,
                                    transition: 'opacity 0.2s ease',
                                    '&:hover': { opacity: 1 },
                                }}
                            />
                        </Tooltip>
                    );
                })}
            </Box>
        </Stack>
    );
};

const HeroCard: React.FC<{ title: string; value: string; subtitle?: string; icon?: React.ReactNode }> = ({ title, value, subtitle, icon }) => (
    <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent>
            <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                    {icon}
                    <Typography variant="overline" color="text.secondary">
                        {title}
                    </Typography>
                </Stack>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {value}
                </Typography>
                {subtitle && (
                    <Typography variant="caption" color="text.secondary">
                        {subtitle}
                    </Typography>
                )}
            </Stack>
        </CardContent>
    </Card>
);

const trendOrder: TrendKey[] = ['active', 'homework', 'vocab'];

const TeacherStudentActivityPage: React.FC = () => {
    const { id: studentId = '' } = useParams<{ id: string }>();
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    const { user } = useAuth();
    const [preset, setPreset] = useState<RangePreset>('7');
    const teacherId = user?.id || '';
    const {students: summaryStudents, median7dActiveAverage } = useActivitySummary({ teacherId, enabled: Boolean(teacherId) });
    const summaryStudent = useMemo(() => summaryStudents.find((student) => student.id === studentId), [summaryStudents, studentId]);
    const todayYmd = toYMD(new Date());
    const rangeDays = preset === '30' ? 30 : 7;
    const from = toYMD(new Date(Date.now() - (rangeDays - 1) * 24 * 60 * 60 * 1000));

    const rollupQuery = useQuery<ActivityRollupResponse>({
        queryKey: ['activity-rollup', teacherId, studentId, from, todayYmd],
        queryFn: () => fetchStudentActivityRollup(teacherId, studentId, from, todayYmd),
        enabled: Boolean(teacherId && studentId),
        staleTime: 60_000,
    });

    const timelineQuery = useQuery<ActivityTimelineResponse>({
        queryKey: ['activity-timeline', teacherId, studentId, todayYmd],
        queryFn: () => fetchStudentActivityTimeline(teacherId, studentId, todayYmd),
        enabled: Boolean(teacherId && studentId),
        staleTime: 30_000,
    });

    const nudgeMutation = useStudentNudge(teacherId);

    const days = rollupQuery.data?.days ?? [];
    const todayData = days.find((day) => day.day === todayYmd);
    const lastSeenIso = summaryStudent?.lastSeenTs || todayData?.lastSeenTs;
    const todayActive = minutes(todayData?.activeMinutes);
    const todayHomework = minutes(todayData?.homeworkMinutes);
    const todayVocab = minutes(todayData?.vocabMinutes);
    const todayTotal = todayActive + todayHomework + todayVocab;

    const streakDays = summaryStudent?.streakDays ?? 0;
    const avg7dStudent = summaryStudent?.stats.average7dActiveMinutes ?? (days.length ? Math.round(days.reduce((acc, day) => acc + minutes(day.activeMinutes), 0) / days.length) : 0);
    const avgDelta = avg7dStudent - median7dActiveAverage;

    const trendAnalyses = useMemo(() => {
        const trendMap = new Map<TrendKey, TrendAnalysis>();
        trendOrder.forEach((key) => {
            trendMap.set(key, analyzeTrend(days, key, preset));
        });
        return trendMap;
    }, [days, preset]);

    const timelineGroups = useMemo(() => groupTimelineByType(timelineQuery.data), [timelineQuery.data]);

    const longestInterval = useMemo(() => {
        const allIntervals = timelineQuery.data?.intervals ?? [];
        return allIntervals.reduce<{ interval: ActivityInterval | null; duration: number }>(
            (acc, interval) => {
                const duration = new Date(interval.end).getTime() - new Date(interval.start).getTime();
                if (duration > acc.duration) {
                    return { interval, duration };
                }
                return acc;
            },
            { interval: null, duration: 0 },
        );
    }, [timelineQuery.data]);

    const homeworkSessionsCount = timelineGroups.homework.length;
    const firstSeen = useMemo(() => {
        const intervals = timelineQuery.data?.intervals ?? [];
        if (!intervals.length) return null;
        const sorted = [...intervals].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        return sorted[0].start;
    }, [timelineQuery.data]);

    const nudgeReason = todayTotal <= 5 ? 'detail_low_activity' : 'detail_check_in';

    const isLoading = rollupQuery.isLoading || timelineQuery.isLoading;
    const isError = rollupQuery.isError || timelineQuery.isError;
    const forbidden =
        (rollupQuery as any).error?.response?.status === 403 ||
        (timelineQuery as any).error?.response?.status === 403;

    const handleNudge = async () => {
        if (!teacherId || !studentId) return;
        try {
            await nudgeMutation.mutateAsync({ studentId, reason: nudgeReason });
            enqueueSnackbar('Nudge sent successfully', { variant: 'success' });
        } catch (error: any) {
            const message =
                error?.response?.status === 429
                    ? 'Rate limit hit for nudges. Try again later.'
                    : 'Failed to send nudge. Please retry.';
            enqueueSnackbar(message, {
                variant: 'error',
                action: (snackbarId) => (
                    <Button
                        size="small"
                        onClick={() => {
                            closeSnackbar(snackbarId);
                            void handleNudge();
                        }}
                    >
                        Retry
                    </Button>
                ),
            });
        }
    };

    if (!activitySummaryConfig.enabled) {
        return (
            <Container sx={{ py: 4 }}>
                <Alert severity="info">Activity insights are temporarily unavailable.</Alert>
            </Container>
        );
    }

    return (
        <Container sx={{ py: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Student Activity Detail
                    </Typography>
                    {summaryStudent?.email && (
                        <Typography variant="body2" color="text.secondary">
                            {summaryStudent.email}
                        </Typography>
                    )}
                </Box>
                <ToggleButtonGroup
                    size="small"
                    value={preset}
                    exclusive
                    onChange={(_, value: RangePreset) => value && setPreset(value)}
                >
                    <ToggleButton value="7">Last 7 days</ToggleButton>
                    <ToggleButton value="30">Last 30 days</ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            {forbidden && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    You are not authorized to view this student’s activity.
                </Alert>
            )}

            {isLoading && (
                <Stack spacing={2}>
                    <Skeleton variant="rounded" height={120} />
                    <Skeleton variant="rounded" height={220} />
                    <Skeleton variant="rounded" height={220} />
                </Stack>
            )}

            {!isLoading && !isError && (
                <Stack spacing={3}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <HeroCard title="Active minutes today" value={`${todayActive}m`} icon={<TrendingUpIcon fontSize="small" />} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <HeroCard title="Homework minutes today" value={`${todayHomework}m`} icon={<MenuBookOutlinedIcon fontSize="small" />} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <HeroCard title="Vocabulary minutes today" value={`${todayVocab}m`} icon={<SchoolOutlinedIcon fontSize="small" />} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <HeroCard title="Last seen" value={lastSeenIso ? formatRelativeTime(lastSeenIso) : '—'} icon={<AccessTimeIcon fontSize="small" />} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <HeroCard title="Streak" value={`${streakDays} days`} icon={<LocalFireDepartmentOutlinedIcon fontSize="small" />} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 12, md: 6 }}>
                            <HeroCard
                                title="7-day average vs class"
                                value={`${avg7dStudent}m`}
                                subtitle={`Δ ${avgDelta >= 0 ? '+' : ''}${avgDelta}m vs class median`}
                                icon={<TrendingUpIcon fontSize="small" />}
                            />
                        </Grid>
                    </Grid>

                    <Card variant="outlined">
                        <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Typography variant="h6">Trends</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Comparing current {preset === '30' ? '30' : '7'}-day window to the previous period.
                                </Typography>
                            </Stack>
                            <Grid container spacing={2}>
                                {trendOrder.map((key) => {
                                    const analysis = trendAnalyses.get(key)!;
                                    const meta = trendMeta[key];
                                    return (
                                        <Grid key={key} size={{ xs: 12, md: 4 }}>
                                            <Card variant="outlined" sx={{ height: '100%' }}>
                                                <CardContent>
                                                    <Stack spacing={1.5}>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            {meta.icon}
                                                            <Typography variant="subtitle2">{meta.label}</Typography>
                                                        </Stack>
                                                        <Sparkline
                                                            values={analysis.series}
                                                            highlightIndex={analysis.series.length - 1}
                                                            color={meta.color}
                                                            ariaLabel={`${meta.label} trend`}
                                                        />
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <Chip
                                                                size="small"
                                                                label={formatPercent(analysis.percentChange)}
                                                                color={analysis.percentChange >= 0 ? 'success' : 'warning'}
                                                            />
                                                            <Typography variant="caption" color="text.secondary">
                                                                {analysis.total} total minutes
                                                            </Typography>
                                                        </Stack>
                                                    </Stack>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </CardContent>
                    </Card>

                    <Card variant="outlined">
                        <CardContent>
                            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={2}>
                                <Typography variant="h6">Today&apos;s timeline</Typography>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                    {Object.entries(timelineMeta).map(([type, meta]) => (
                                        <Chip
                                            key={type}
                                            size="small"
                                            label={meta.label}
                                            sx={{ bgcolor: alpha(meta.color, 0.12), color: meta.color }}
                                        />
                                    ))}
                                </Stack>
                            </Stack>
                            {timelineQuery.data?.intervals?.length ? (
                                <Stack spacing={2}>
                                    <Box sx={{ position: 'relative', width: '100%', height: 20, mb: 1 }}>
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-end',
                                                color: 'text.secondary',
                                                fontSize: '0.625rem',
                                            }}
                                        >
                                            {['00:00', '06:00', '12:00', '18:00', '24:00'].map((label) => (
                                                <span key={label}>{label}</span>
                                            ))}
                                        </Box>
                                    </Box>
                                    {(Object.keys(timelineGroups) as ActivityInterval['type'][]).map((type) => (
                                        <TimelineTrack
                                            key={type}
                                            label={timelineMeta[type].label}
                                            color={timelineMeta[type].color}
                                            intervals={timelineGroups[type]}
                                            day={timelineQuery.data?.day ?? todayYmd}
                                        />
                                    ))}
                                </Stack>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    No activity recorded yet today.
                                </Typography>
                            )}
                        </CardContent>
                    </Card>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                        Longest session
                                    </Typography>
                                    {longestInterval.interval ? (
                                        <Stack spacing={0.5}>
                                            <Typography variant="body2">
                                                {formatDuration(longestInterval.duration)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {timelineMeta[longestInterval.interval.type].label} • {formatTimeRange(new Date(longestInterval.interval.start), new Date(longestInterval.interval.end))}
                                            </Typography>
                                        </Stack>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            No sessions logged.
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                        Homework sessions
                                    </Typography>
                                    <Typography variant="body2">
                                        {homeworkSessionsCount} session{homeworkSessionsCount === 1 ? '' : 's'}
                                    </Typography>
                                    {homeworkSessionsCount > 0 && (
                                        <Typography variant="caption" color="text.secondary">
                                            Avg duration{' '}
                                            {formatDuration(
                                                timelineGroups.homework.reduce((acc, interval) => {
                                                    return acc + (new Date(interval.end).getTime() - new Date(interval.start).getTime());
                                                }, 0) / homeworkSessionsCount
                                            )}
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                        First seen today
                                    </Typography>
                                    {firstSeen ? (
                                        <Typography variant="body2">
                                            {new Date(firstSeen).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                        </Typography>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            Awaiting first activity.
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                Actions
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <Button
                                    variant="contained"
                                    startIcon={<NotificationsActiveOutlinedIcon />}
                                    onClick={handleNudge}
                                    disabled={nudgeMutation.isPending}
                                >
                                    {nudgeMutation.isPending ? 'Sending…' : 'Send nudge'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    endIcon={<OutboundOutlinedIcon />}
                                    component={RouterLink}
                                    to={`/t/homework/new?studentId=${studentId}`}
                                >
                                    Assign homework
                                </Button>
                                {summaryStudent?.email && (
                                    <MuiLink
                                        href={`mailto:${summaryStudent.email}`}
                                        underline="hover"
                                        sx={{ alignSelf: 'center', color: 'primary.main', fontWeight: 500 }}
                                    >
                                        Email student
                                    </MuiLink>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            )}

            {isError && !isLoading && !forbidden && (
                <Alert severity="error" sx={{ mt: 3 }}>
                    We hit an issue while loading activity data. Please refresh and try again.
                </Alert>
            )}
        </Container>
    );
};

export default TeacherStudentActivityPage;
