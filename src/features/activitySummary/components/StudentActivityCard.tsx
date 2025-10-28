import React from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Stack,
    Tooltip,
    Typography,
    alpha,
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import OutboundOutlinedIcon from '@mui/icons-material/OutboundOutlined';
import type { StudentActivityViewModel } from '../types';
import Sparkline from './Sparkline';
import { formatRelativeTime } from '../../../utils/time';
import { resolveChipVariant } from '../config';

const chipColors = {
    muted: { color: 'default' as const, variant: 'outlined' as const },
    primary: { color: 'primary' as const, variant: 'filled' as const },
    success: { color: 'success' as const, variant: 'filled' as const },
};

const riskColorOf = (level: StudentActivityViewModel['riskLevel']) => {
    if (level === 'high') return 'error';
    if (level === 'medium') return 'warning';
    if (level === 'low') return 'info';
    return 'default';
};

const riskLabelOf = (level: StudentActivityViewModel['riskLevel']) => {
    if (level === 'high') return 'High risk';
    if (level === 'medium') return 'Monitor';
    if (level === 'low') return 'Doing well';
    return 'No risk';
};

export interface StudentActivityCardProps {
    student: StudentActivityViewModel;
    onOpenDetail: (studentId: string) => void;
    onSendNudge: (studentId: string) => void;
    nudgeInFlight?: boolean;
    disableActions?: boolean;
}

const StudentActivityCard: React.FC<StudentActivityCardProps> = ({
    student,
    onOpenDetail,
    onSendNudge,
    nudgeInFlight = false,
    disableActions = false,
}) => {
    const activeVariant = chipColors[resolveChipVariant(student.todayMinutes.active)];
    const homeworkVariant = chipColors[resolveChipVariant(student.todayMinutes.homework)];
    const vocabVariant = chipColors[resolveChipVariant(student.todayMinutes.vocab)];
    const lastSeen = student.online ? 'Online' : formatRelativeTime(student.lastSeenTs);
    const riskReasons = student.riskReasons.join(', ');

    return (
        <Card
            variant="outlined"
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme => theme.shadows[3],
                },
            }}
        >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography
                                variant="subtitle1"
                                fontWeight={600}
                                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                            >
                                <FiberManualRecordIcon
                                    fontSize="small"
                                    sx={{
                                        color: student.online ? 'success.main' : 'text.disabled',
                                        filter: student.online ? 'drop-shadow(0px 0px 4px rgba(34,197,94,0.5))' : 'none',
                                    }}
                                    aria-label={student.online ? 'Online' : 'Offline'}
                                />
                                {student.name}
                            </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            Last seen {lastSeen}
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button
                            size="small"
                            variant="contained"
                            endIcon={<OutboundOutlinedIcon fontSize="small" />}
                            onClick={() => onOpenDetail(student.id)}
                            disabled={disableActions}
                        >
                            Open
                        </Button>
{/*                        <Button
                            size="small"
                            variant="outlined"
                            endIcon={<NotificationsActiveOutlinedIcon fontSize="small" />}
                            onClick={() => onSendNudge(student.id)}
                            disabled={disableActions || nudgeInFlight}
                        >
                            {nudgeInFlight ? 'Nudging…' : 'Nudge'}
                        </Button>*/}
                    </Stack>
                </Stack>

                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: theme => alpha(theme.palette.primary.main, 0.04),
                        border: theme => `1px dashed ${alpha(theme.palette.primary.main, 0.1)}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        Last 7 days
                    </Typography>
                    <Sparkline
                        values={student.series7d.active}
                        highlightIndex={student.series7d.active.length - 1}
                        color="#2573ff"
                        ariaLabel={`${student.name} seven day active minutes trend`}
                    />
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Tooltip title={`${student.todayMinutes.active} min active today`}>
                        <Chip
                            size="small"
                            label={`Active ${student.todayMinutes.active}m`}
                            color={activeVariant.color}
                            variant={activeVariant.variant}
                        />
                    </Tooltip>
                    <Tooltip title={`${student.todayMinutes.homework} min homework today`}>
                        <Chip
                            size="small"
                            label={`Homework ${student.todayMinutes.homework}m`}
                            color={homeworkVariant.color}
                            variant={homeworkVariant.variant}
                        />
                    </Tooltip>
                    <Tooltip title={`${student.todayMinutes.vocab} min vocab today`}>
                        <Chip
                            size="small"
                            label={`Vocab ${student.todayMinutes.vocab}m`}
                            color={vocabVariant.color}
                            variant={vocabVariant.variant}
                        />
                    </Tooltip>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" mt="auto">
                    <Chip
                        size="small"
                        icon={<BoltOutlinedIcon fontSize="small" />}
                        label={`${student.streakDays} day streak`}
                        color={student.streakDays >= 3 ? 'success' : 'default'}
                    />
                    <Tooltip title={riskReasons || 'No risk signals'}>
                        <Chip
                            size="small"
                            icon={<ReportProblemOutlinedIcon fontSize="small" />}
                            label={riskLabelOf(student.riskLevel)}
                            color={riskColorOf(student.riskLevel) as any}
                            variant={student.riskLevel ? 'filled' : 'outlined'}
                        />
                    </Tooltip>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default StudentActivityCard;
