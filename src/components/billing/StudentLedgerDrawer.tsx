import React, { useState, useMemo, useEffect } from 'react';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Drawer,
    Grid,
    IconButton,
    LinearProgress,
    Paper,
    Skeleton,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
    alpha,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HomeIcon from '@mui/icons-material/Home';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    BillingStudent,
    UnifiedLedgerEntry,
    UnifiedLedgerResponse,
    PackageState,
    PackageLessonSlot,
    PackageHistoryResponse,
    HistoricalPackage,
} from '../../types/billing';
import LedgerEntryRow from './LedgerEntryRow';
import {
    getPackageState,
    createPackageAdjustment,
    getPackageHistory,
} from '../../services/billing.api';

type DrawerTab = 'package' | 'payments' | 'audit';

interface StudentLedgerDrawerProps {
    open: boolean;
    onClose: () => void;
    student: BillingStudent | null;
    ledgerData: UnifiedLedgerResponse | null;
    loading: boolean;
    currency: string;
    onAddPayment: () => void;
    onEditPayment: (entry: UnifiedLedgerEntry) => Promise<void>;
    onDeletePayment: (entry: UnifiedLedgerEntry) => Promise<void>;
    onViewLesson?: (lessonId: string) => void;
    onEditPlan?: (student: BillingStudent) => void;
    onOpenSetup?: (student: BillingStudent) => void;
}

function formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

const StudentLedgerDrawer: React.FC<StudentLedgerDrawerProps> = ({
    open,
    onClose,
    student,
    ledgerData,
    loading,
    currency,
    onAddPayment,
    onEditPayment,
    onDeletePayment,
    onViewLesson,
    onEditPlan,
    onOpenSetup,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Edit dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<UnifiedLedgerEntry | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editQuantity, setEditQuantity] = useState('');
    const [editDate, setEditDate] = useState<Dayjs | null>(null);
    const [editComment, setEditComment] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingEntry, setDeletingEntry] = useState<UnifiedLedgerEntry | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Drawer tab state
    const [activeTab, setActiveTab] = useState<DrawerTab>('package');

    const queryClient = useQueryClient();

    // Package Navigation State
    const [viewingPackageNumber, setViewingPackageNumber] = useState<number | null>(null); // null = current

    // Package History Data
    const { data: packageHistory, isLoading: loadingPackageHistory } = useQuery({
        queryKey: ['package-history', student?.studentId],
        queryFn: () => getPackageHistory(student!.studentId),
        enabled: !!student?.studentId && open,
        staleTime: 0,
    });

    // Get current package data (either historical or current)
    const currentViewPackage: HistoricalPackage | null = packageHistory
        ? packageHistory.packages.find(pkg =>
            viewingPackageNumber ? pkg.packageNumber === viewingPackageNumber : pkg.isCurrent
          ) || null
        : null;

    const isViewingCurrent = !viewingPackageNumber || viewingPackageNumber === packageHistory?.currentPackageNumber;
    const isViewingHistorical = !isViewingCurrent;

    // Package State Data (fallback for compatibility, until backend has history endpoint)
    const { data: packageState, isLoading: loadingPackageState, refetch: refetchPackageState } = useQuery({
        queryKey: ['package-state', student?.studentId],
        queryFn: () => getPackageState(student!.studentId),
        enabled: !!student?.studentId && open && !packageHistory, // Only use as fallback
        staleTime: 0,
    });

    // Slot Menu State
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedSlot, setSelectedSlot] = useState<PackageLessonSlot | null>(null);

    // Reset Package Confirmation State
    const [confirmResetOpen, setConfirmResetOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Package Navigation Handlers
    const handlePreviousPackage = () => {
        if (!packageHistory) return;
        const currentNum = viewingPackageNumber || packageHistory.currentPackageNumber;
        if (currentNum > 1) {
            setViewingPackageNumber(currentNum - 1);
        }
    };

    const handleNextPackage = () => {
        if (!packageHistory) return;
        const currentNum = viewingPackageNumber || packageHistory.currentPackageNumber;
        if (currentNum < packageHistory.totalPackages) {
            setViewingPackageNumber(currentNum + 1);
        }
    };

    const handleReturnToCurrent = () => {
        setViewingPackageNumber(null);
    };

    const handleSlotClick = (event: React.MouseEvent<HTMLElement>, slot: PackageLessonSlot) => {
        setAnchorEl(event.currentTarget);
        setSelectedSlot(slot);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedSlot(null);
    };

    // Apply adjustment and refresh
    const applyAdjustment = async (
        type: 'RESET_PACKAGE' | 'ADJUST_LESSONS' | 'SET_PACKAGE_START',
        options: { value?: number; lessonId?: string; comment?: string } = {}
    ) => {
        if (!student) return;
        setSubmitting(true);

        try {
            await createPackageAdjustment(student.studentId, {
                type,
                value: options.value,
                lessonId: options.lessonId,
                effectiveDate: new Date().toISOString().split('T')[0],
                comment: options.comment,
            });

            // Invalidate caches
            queryClient.invalidateQueries({ queryKey: ['package-state', student.studentId] });
            queryClient.invalidateQueries({ queryKey: ['package-history', student.studentId] });
            queryClient.invalidateQueries({ queryKey: ['billing-students'] });

            // Refetch to update the UI
            await refetchPackageState();
        } catch (err) {
            console.error('Failed to apply adjustment:', err);
        } finally {
            setSubmitting(false);
        }
    };

    // Reset package
    const handleResetClick = () => {
        setConfirmResetOpen(true);
    };

    const handleResetConfirm = () => {
        setConfirmResetOpen(false);
        applyAdjustment('RESET_PACKAGE', { comment: 'Package reset' });
    };

    const handleResetCancel = () => {
        setConfirmResetOpen(false);
    };

    // Remove lesson from package (adjust -1)
    const handleRemoveLesson = (slot: PackageLessonSlot) => {
        applyAdjustment('ADJUST_LESSONS', {
            value: -1,
            comment: `Removed lesson #${slot.slotNumber}${slot.lessonId ? ` (${slot.lessonId})` : ''}`,
        });
        setAnchorEl(null);
        setSelectedSlot(null);
    };

    // Set package start from this lesson
    const handleSetStartFromLesson = (slot: PackageLessonSlot) => {
        if (!slot.lessonId) {
            console.error('Cannot set package start: no lessonId for slot', slot);
            return;
        }
        applyAdjustment('SET_PACKAGE_START', {
            lessonId: slot.lessonId,
            comment: `Package starts from lesson #${slot.slotNumber}`,
        });
        setAnchorEl(null);
        setSelectedSlot(null);
    };

    const handleOpenEdit = (entry: UnifiedLedgerEntry) => {
        setEditingEntry(entry);
        setEditAmount(String(entry.amount));
        setEditQuantity(String(entry.quantity));
        setEditDate(dayjs(entry.entryDate));
        setEditComment(entry.comment || '');
        setEditDialogOpen(true);
    };

    const handleCloseEdit = () => {
        setEditDialogOpen(false);
        setEditingEntry(null);
    };

    const handleSaveEdit = async () => {
        if (!editingEntry) return;
        setEditLoading(true);
        try {
            // The parent will handle the actual API call
            await onEditPayment({
                ...editingEntry,
                amount: parseFloat(editAmount),
                quantity: parseFloat(editQuantity),
                entryDate: (editDate ?? dayjs(editingEntry.entryDate)).format('YYYY-MM-DD'),
                comment: editComment || null,
            });
            handleCloseEdit();
        } finally {
            setEditLoading(false);
        }
    };

    const handleOpenDelete = (entry: UnifiedLedgerEntry) => {
        setDeletingEntry(entry);
        setDeleteDialogOpen(true);
    };

    const handleCloseDelete = () => {
        setDeleteDialogOpen(false);
        setDeletingEntry(null);
    };

    const handleConfirmDelete = async () => {
        if (!deletingEntry) return;
        setDeleteLoading(true);
        try {
            await onDeletePayment(deletingEntry);
            handleCloseDelete();
        } finally {
            setDeleteLoading(false);
        }
    };

    const entries = ledgerData?.entries ?? [];
    const paymentEntries = useMemo(() => entries.filter(e => e.kind === 'PAYMENT'), [entries]);
    const lessonEntries = useMemo(
        () => entries.filter((e) => e.kind === 'LESSON').slice().sort(
            (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
        ),
        [entries]
    );

    // Use ledger summary directly from backend (period-filtered)
    const summaryTotals = useMemo(() => ({
        totalCharged: ledgerData?.summary?.earnedInPeriod ?? 0,
        totalPaid: ledgerData?.summary?.paidInPeriod ?? 0,
    }), [ledgerData?.summary]);

    const packageSize = student?.packageSize || 1;
    const packageLessonsCompleted = student?.currentPackageLessonsCompleted ?? ((student?.lessonsCompleted ?? 0) % packageSize);
    const packageLessonsPaid = student?.currentPackageLessonsPaid ?? ((student?.lessonsPaid ?? 0) % packageSize);
    const packageBalanceLessons = student?.currentPackageBalanceLessons ?? (packageLessonsCompleted - packageLessonsPaid);
    const packageProgressLessons = student?.currentPackageProgressInLessons ?? packageLessonsCompleted;
    const packageProgressPercent = packageSize > 0 ? Math.min((packageProgressLessons / packageSize) * 100, 100) : 0;
    const packageStatus = student?.currentPackageStatus ?? (packageBalanceLessons > 0 ? 'Owed' : packageBalanceLessons < 0 ? 'Credit' : 'Settled');
    const completedSlotsCount = Math.max(0, Math.min(packageLessonsCompleted, packageSize));
    const packageSlots = useMemo(() => {
        const recentLessons = lessonEntries.slice(-completedSlotsCount);
        return Array.from({ length: packageSize }, (_, idx) => {
            const lesson = recentLessons[idx];
            const label = lesson?.entryDate ? dayjs(lesson.entryDate).format('MMM D') : 'Completed lesson';
            return {
                slotNumber: idx + 1,
                completed: idx < completedSlotsCount,
                label: idx < completedSlotsCount ? label : 'Open slot',
            };
        });
    }, [lessonEntries, completedSlotsCount, packageSize]);
    const packagesOwedFull = student?.packagesOwedFull ?? Math.max(student?.outstandingPackages ?? 0, 0);
    const outstandingFullAmount = student?.outstandingAmountFullPackages ?? student?.outstandingAmount ?? 0;

    // Use backend-provided student values (all-time, not affected by date filter)
    const displayCurrency = student?.currency || currency;
    const outstandingPackages = student?.outstandingPackages ?? 0;
    const outstandingAmount = student?.outstandingAmount ?? 0;
    const hasDebt = student?.packageDue ?? false;
    const hasCredit = student?.hasCredit ?? false;

    useEffect(() => {
        if (open) setActiveTab('package');
    }, [open, student?.studentId]);

    const getBalanceBadge = () => {
        if (outstandingPackages > 0) {
            return (
                <Chip
                    label={`Owes ${outstandingPackages} pkg (${formatMoney(outstandingAmount, displayCurrency)})`}
                    size="small"
                    sx={{
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                        color: theme.palette.error.main,
                        fontWeight: 600,
                    }}
                />
            );
        }
        if (outstandingPackages < 0) {
            return (
                <Chip
                    label={`Credit ${Math.abs(outstandingPackages)} pkg (${formatMoney(Math.abs(outstandingAmount), displayCurrency)})`}
                    size="small"
                    sx={{
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        color: theme.palette.success.main,
                        fontWeight: 600,
                    }}
                />
            );
        }
        return (
            <Chip
                label="Settled"
                size="small"
                sx={{
                    bgcolor: alpha(theme.palette.grey[500], 0.1),
                    color: theme.palette.text.secondary,
                    fontWeight: 500,
                }}
            />
        );
    };

    const getStateChip = () => {
        if (!student) return getBalanceBadge();

        let label = '';
        let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';

        // Determine status based on student data
        // Priority order: Credit > Owes > Ready to Settle > In Progress

        if (student.hasCredit) {
            // Student has prepaid lessons
            label = 'Prepaid';
            color = 'info';
        } else if (student.packageDue || (student.owesPackageCount ?? 0) > 0) {
            // Student owes money (use packageDue or owesPackageCount as source of truth)
            label = 'Owes package';
            color = 'error';
        } else if (student.packagePhase === 'READY_TO_SETTLE' || student.packagesToSettle) {
            // Package complete, ready for settlement (no debt)
            label = 'Ready';
            color = 'success';
        } else if (student.packagePhase === 'IN_PROGRESS') {
            // Still working on current package
            label = 'In progress';
            color = 'primary';
        } else {
            // Fallback to balance badge logic
            return getBalanceBadge();
        }

        return (
            <Chip
                label={label}
                size="small"
                color={color}
                sx={{ fontWeight: 600 }}
            />
        );
    };

    const drawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box
                sx={{
                    p: 2,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Box display="flex" alignItems="center" gap={2}>
                    <Avatar
                        src={student?.studentAvatar}
                        alt={student?.studentName}
                        sx={{ width: 48, height: 48, bgcolor: theme.palette.primary.light }}
                    >
                        {student?.studentName?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>
                            {student?.studentName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Billing Ledger
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} edge="end" aria-label="close">
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue as DrawerTab)}
                variant="fullWidth"
                sx={{
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    '& .MuiTab-root': {
                        textTransform: 'none',
                        fontWeight: 600,
                    },
                }}
            >
                <Tab label="Package" value="package" />
                <Tab label="Payments" value="payments" />
                <Tab label="Audit trail" value="audit" />
            </Tabs>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                {activeTab === 'package' && (
                    <Stack spacing={2}>
                        {/* Tracker Header */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: 3,
                                border: `1px solid ${theme.palette.divider}`,
                                bgcolor: alpha(theme.palette.primary.main, 0.02),
                            }}
                        >
                            <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1.5}>
                                <Box flex={1}>
                                    {/* Package Navigation Header */}
                                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                        <Tooltip title="Previous package" arrow>
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={handlePreviousPackage}
                                                    disabled={!packageHistory || (viewingPackageNumber || packageHistory.currentPackageNumber) <= 1}
                                                    sx={{ p: 0.5 }}
                                                >
                                                    <ArrowBackIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>

                                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                                            {packageHistory
                                                ? `Package #${viewingPackageNumber || packageHistory.currentPackageNumber}`
                                                : 'Current package'}
                                            {isViewingCurrent && <Typography component="span" color="primary.main" sx={{ ml: 0.5 }}>(Current)</Typography>}
                                            {currentViewPackage?.status === 'PAID' && <Chip label="PAID" size="small" color="success" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />}
                                            {currentViewPackage?.status === 'COMPLETED' && <Chip label="COMPLETE" size="small" color="info" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />}
                                        </Typography>

                                        <Tooltip title="Next package" arrow>
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={handleNextPackage}
                                                    disabled={!packageHistory || (viewingPackageNumber || packageHistory.currentPackageNumber) >= packageHistory.totalPackages}
                                                    sx={{ p: 0.5 }}
                                                >
                                                    <ArrowForwardIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>

                                        {isViewingHistorical && (
                                            <Tooltip title="Return to current package" arrow>
                                                <IconButton
                                                    size="small"
                                                    onClick={handleReturnToCurrent}
                                                    color="primary"
                                                    sx={{ p: 0.5, ml: 0.5 }}
                                                >
                                                    <HomeIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>

                                    <Typography variant="h5" fontWeight={900} sx={{ mt: 0.5 }}>
                                        {currentViewPackage?.lessonsCompleted ?? packageState?.lessonsInPackage ?? packageLessonsCompleted}/
                                        {currentViewPackage?.packageSize ?? packageState?.packageSize ?? packageSize}
                                        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1, fontWeight: 500 }}>
                                            lessons
                                        </Typography>
                                    </Typography>

                                    {/* Show dates for historical packages */}
                                    {currentViewPackage && (
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                            {currentViewPackage.startDate && `Started: ${dayjs(currentViewPackage.startDate).format('MMM D, YYYY')}`}
                                            {currentViewPackage.endDate && ` • Completed: ${dayjs(currentViewPackage.endDate).format('MMM D, YYYY')}`}
                                            {currentViewPackage.paidDate && ` • Paid: ${dayjs(currentViewPackage.paidDate).format('MMM D, YYYY')}`}
                                        </Typography>
                                    )}
                                </Box>
                                {getStateChip()}
                            </Box>

                            <LinearProgress
                                variant="determinate"
                                value={
                                    currentViewPackage
                                        ? (currentViewPackage.lessonsCompleted / currentViewPackage.packageSize) * 100
                                        : packageState
                                        ? (packageState.lessonsInPackage / packageState.packageSize) * 100
                                        : packageProgressPercent
                                }
                                sx={{
                                    height: 10,
                                    borderRadius: 5,
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 5,
                                        bgcolor: theme.palette.primary.main,
                                    },
                                    mb: 1.5,
                                }}
                            />

                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                    Plan: {currentViewPackage?.packageSize ?? packageState?.packageSize ?? packageSize} lessons • {formatMoney(student?.pricePerPackage ?? 0, displayCurrency)}
                                </Typography>
                                <Stack direction="row" spacing={0.5}>
                                    {onOpenSetup && student && (
                                        <Button size="small" onClick={() => onOpenSetup(student)} sx={{ textTransform: 'none', fontWeight: 600 }}>
                                            Set state
                                        </Button>
                                    )}
                                    {onEditPlan && student && (
                                        <Button size="small" onClick={() => onEditPlan(student)} sx={{ textTransform: 'none', fontWeight: 600 }}>
                                            Edit plan
                                        </Button>
                                    )}
                                </Stack>
                            </Box>
                        </Paper>

                        {/* Package Lessons List */}
                        <Paper
                            elevation={0}
                            data-testid="package-tracker-container"
                            sx={{
                                p: 2,
                                borderRadius: 3,
                                border: `1px solid ${theme.palette.divider}`,
                                bgcolor: isViewingHistorical ? alpha(theme.palette.grey[500], 0.02) : 'background.paper',
                            }}
                        >
                            {isViewingHistorical && (
                                <Box
                                    sx={{
                                        mb: 2,
                                        p: 1,
                                        borderRadius: 1,
                                        bgcolor: alpha(theme.palette.info.main, 0.08),
                                        border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <InfoOutlinedIcon sx={{ fontSize: 16, color: theme.palette.info.main }} />
                                    <Typography variant="caption" color="text.secondary">
                                        Viewing historical package. Editing is disabled.
                                    </Typography>
                                </Box>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="subtitle2" fontWeight={800}>
                                    Package Lessons
                                </Typography>
                                <Tooltip title={isViewingHistorical ? "Cannot edit historical packages" : "Reset package to 0"} arrow>
                                    <span>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="warning"
                                            startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
                                            onClick={handleResetClick}
                                            disabled={submitting || isViewingHistorical || !packageState || packageState.lessonsInPackage === 0}
                                            sx={{
                                                textTransform: 'none',
                                                fontSize: '0.7rem',
                                                py: 0.25,
                                                px: 1,
                                                minWidth: 'auto',
                                                borderColor: alpha(theme.palette.warning.main, 0.5),
                                                '&:hover': {
                                                    borderColor: theme.palette.warning.main,
                                                    bgcolor: alpha(theme.palette.warning.main, 0.08),
                                                },
                                            }}
                                        >
                                            Reset
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Box>

                            {loadingPackageState || loadingPackageHistory ? (
                                <Box
                                    sx={{
                                        border: `1px solid ${theme.palette.divider}`,
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                    }}
                                >
                                    {[...Array(Math.min(packageSize, 6))].map((_, i) => (
                                        <Box
                                            key={i}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                py: 1,
                                                px: 1.5,
                                                borderBottom: i < packageSize - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                                            }}
                                        >
                                            <Skeleton variant="circular" width={24} height={24} />
                                            <Skeleton variant="circular" width={18} height={18} />
                                            <Skeleton variant="text" width={20} />
                                            <Skeleton variant="text" width={80} sx={{ ml: 'auto' }} />
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Box
                                    sx={{
                                        border: `1px solid ${theme.palette.divider}`,
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                    }}
                                >
                                    {(currentViewPackage?.packageLessons ?? packageState?.packageLessons ?? []).map((slot, i) => {
                                        const isCompleted = slot.status === 'completed';
                                        const isScheduled = slot.status === 'scheduled';
                                        const isEmpty = slot.status === 'empty';
                                        const dateDisplay = slot.lessonDate ? dayjs(slot.lessonDate).format('YYYY-MM-DD') : null;

                                        return (
                                            <Box
                                                key={slot.slotNumber}
                                                data-testid={`slot-${slot.slotNumber}`}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                    py: 0.5,
                                                    px: 1,
                                                    borderBottom: i < (packageState?.packageLessons.length || 0) - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                                                    bgcolor: isCompleted
                                                        ? alpha(theme.palette.success.main, 0.04)
                                                        : isScheduled
                                                        ? alpha(theme.palette.info.main, 0.04)
                                                        : 'transparent',
                                                    '&:hover': {
                                                        bgcolor: isCompleted
                                                            ? alpha(theme.palette.success.main, 0.08)
                                                            : isScheduled
                                                            ? alpha(theme.palette.info.main, 0.08)
                                                            : alpha(theme.palette.grey[500], 0.04),
                                                    },
                                                }}
                                            >
                                                {/* Actions Menu Icon */}
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleSlotClick(e, slot)}
                                                    disabled={isEmpty || isViewingHistorical}
                                                    sx={{
                                                        p: 0.5,
                                                        color: 'text.secondary',
                                                        '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.1) },
                                                        opacity: isEmpty || isViewingHistorical ? 0.3 : 1,
                                                    }}
                                                >
                                                    <MoreVertIcon sx={{ fontSize: 16 }} />
                                                </IconButton>

                                                {/* Status icon */}
                                                {isCompleted && <CheckCircleIcon sx={{ fontSize: 18, color: theme.palette.success.main }} />}
                                                {isScheduled && <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: theme.palette.info.main }} />}
                                                {isEmpty && <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: theme.palette.grey[400] }} />}

                                                {/* Slot number */}
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={600}
                                                    sx={{
                                                        minWidth: 20,
                                                        color: isEmpty ? 'text.disabled' : 'text.primary',
                                                    }}
                                                >
                                                    {slot.slotNumber}
                                                </Typography>

                                                {/* Date or status text */}
                                                {(isCompleted || isScheduled) && dateDisplay ? (
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            ml: 'auto',
                                                            color: 'text.primary',
                                                            fontFamily: 'monospace',
                                                            fontSize: '0.8rem',
                                                        }}
                                                    >
                                                        {dateDisplay}
                                                    </Typography>
                                                ) : (
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            ml: 'auto',
                                                            color: 'text.disabled',
                                                            fontSize: '0.8rem',
                                                        }}
                                                    >
                                                        ———
                                                    </Typography>
                                                )}

                                                {/* Open lesson button (if has lesson) */}
                                                {(isCompleted || isScheduled) && slot.lessonId && (
                                                    <Tooltip title="Open lesson" arrow>
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onViewLesson) onViewLesson(slot.lessonId!);
                                                            }}
                                                            sx={{
                                                                p: 0.5,
                                                                color: theme.palette.primary.main,
                                                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                                                            }}
                                                        >
                                                            <OpenInNewIcon sx={{ fontSize: 14 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>
                            )}
                        </Paper>
                        
                        {/* Quick Actions / Summary */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: 3,
                                border: `1px solid ${theme.palette.divider}`,
                                bgcolor: alpha(theme.palette.grey[500], 0.03),
                            }}
                        >
                            <Grid container spacing={2} alignItems="center">
                                <Grid size={{ xs:12, sm:6 }}>
                                    <Typography variant="body2" fontWeight={800}>
                                        Total Debt: {formatMoney(outstandingFullAmount, displayCurrency)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Equivalent to {packagesOwedFull} full packages
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs:12, sm:6 }}>
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={onAddPayment}
                                        fullWidth
                                        disableElevation
                                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                                    >
                                        Add payment
                                    </Button>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Stack>
                )}

                {activeTab === 'payments' && (
                    <Stack spacing={2}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle1" fontWeight={700}>Payments</Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={onAddPayment}
                                sx={{ textTransform: 'none', borderRadius: 2 }}
                            >
                                Record payment
                            </Button>
                        </Box>
                        {loading ? (
                            <Stack spacing={1}>
                                {[...Array(4)].map((_, i) => (
                                    <Skeleton key={i} variant="rounded" height={100} />
                                ))}
                            </Stack>
                        ) : paymentEntries.length === 0 ? (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 4,
                                    textAlign: 'center',
                                    bgcolor: alpha(theme.palette.grey[500], 0.05),
                                    borderRadius: 2,
                                }}
                            >
                                <Typography color="text.secondary">No payments in this period</Typography>
                            </Paper>
                        ) : (
                            <Stack spacing={0}>
                                {paymentEntries.map((entry) => (
                                    <LedgerEntryRow
                                        key={entry.id}
                                        entry={entry}
                                        currency={currency}
                                        onEdit={handleOpenEdit}
                                        onDelete={handleOpenDelete}
                                    />
                                ))}
                            </Stack>
                        )}
                    </Stack>
                )}

                {activeTab === 'audit' && (
                    <Stack spacing={2}>
                        <Box 
                            sx={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                gap: 3,
                                py: 1,
                                px: 2,
                                bgcolor: alpha(theme.palette.grey[500], 0.05),
                                borderRadius: 1,
                            }}
                        >
                            <Typography variant="caption" color="text.secondary">
                                <strong style={{ color: theme.palette.info.main }}>Charged:</strong>{' '}
                                {formatMoney(summaryTotals.totalCharged, currency)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                <strong style={{ color: theme.palette.success.main }}>Paid:</strong>{' '}
                                {formatMoney(summaryTotals.totalPaid, currency)}
                            </Typography>
                        </Box>
                        {loading ? (
                            <Stack spacing={1}>
                                {[...Array(5)].map((_, i) => (
                                    <Skeleton key={i} variant="rounded" height={100} />
                                ))}
                            </Stack>
                        ) : entries.length === 0 ? (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 4,
                                    textAlign: 'center',
                                    bgcolor: alpha(theme.palette.grey[500], 0.05),
                                    borderRadius: 2,
                                }}
                            >
                                <Typography color="text.secondary">No transactions yet</Typography>
                            </Paper>
                        ) : (
                            <Stack spacing={0}>
                                {entries.map((entry) => (
                                    <LedgerEntryRow
                                        key={entry.id}
                                        entry={entry}
                                        currency={currency}
                                        onEdit={entry.kind === 'PAYMENT' ? handleOpenEdit : undefined}
                                        onDelete={entry.kind === 'PAYMENT' ? handleOpenDelete : undefined}
                                        onViewLesson={onViewLesson}
                                    />
                                ))}
                            </Stack>
                        )}
                    </Stack>
                )}
            </Box>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onClose={handleCloseEdit} maxWidth="xs" fullWidth>
                <DialogTitle>Edit Payment</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Lessons count"
                            type="number"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            fullWidth
                            size="small"
                            inputProps={{ min: 0, step: 0.5 }}
                        />
                        <TextField
                            label="Amount"
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            fullWidth
                            size="small"
                        />
                        <DatePicker
                            label="Date"
                            value={editDate}
                            onChange={(v) => setEditDate(v)}
                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        />
                        <TextField
                            label="Comment"
                            value={editComment}
                            onChange={(e) => setEditComment(e.target.value)}
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                        />
                        
                        {/* Warning about balance impact */}
                        <Box 
                            sx={{ 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: 1,
                                p: 1.5,
                                bgcolor: alpha(theme.palette.warning.main, 0.1),
                                border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                                borderRadius: 1,
                            }}
                        >
                            <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main', mt: 0.25 }} />
                            <Typography variant="caption" color="warning.dark">
                                Changing the amount or lessons count will affect the student&apos;s balance.
                            </Typography>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEdit} disabled={editLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSaveEdit} variant="contained" disabled={editLoading}>
                        {editLoading ? 'Saving...' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={handleCloseDelete}>
                <DialogTitle>Delete Payment</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this payment of{' '}
                        {deletingEntry && formatMoney(deletingEntry.amount, currency)}?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDelete} disabled={deleteLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmDelete} color="error" disabled={deleteLoading}>
                        {deleteLoading ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Slot Actions Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                PaperProps={{
                    elevation: 3,
                    sx: { borderRadius: 2, minWidth: 180 }
                }}
            >
                {selectedSlot && selectedSlot.lessonId && (
                    <MenuItem onClick={() => {
                        if (selectedSlot.lessonId && onViewLesson) onViewLesson(selectedSlot.lessonId);
                        handleCloseMenu();
                    }}>
                        <ListItemIcon><OpenInNewIcon fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Open lesson" />
                    </MenuItem>
                )}
                {!isViewingHistorical && selectedSlot && selectedSlot.slotNumber > 1 && selectedSlot.lessonId && (
                    <MenuItem
                        onClick={() => handleSetStartFromLesson(selectedSlot)}
                    >
                        <ListItemIcon><PlayArrowIcon fontSize="small" color="primary" /></ListItemIcon>
                        <ListItemText primary="Start package here" />
                    </MenuItem>
                )}
                {!isViewingHistorical && selectedSlot && selectedSlot.lessonId && (
                    <MenuItem onClick={() => handleRemoveLesson(selectedSlot)}>
                        <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
                        <ListItemText primary="Remove from package" />
                    </MenuItem>
                )}
            </Menu>

            {/* Reset Package Confirmation Dialog */}
            <Dialog
                open={confirmResetOpen}
                onClose={handleResetCancel}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        maxWidth: 360,
                        mx: 2,
                    },
                }}
            >
                <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            bgcolor: alpha(theme.palette.warning.main, 0.12),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <WarningAmberIcon sx={{ color: theme.palette.warning.main }} />
                    </Box>
                    <Typography variant="h6" fontWeight={600}>
                        Reset Package?
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        This will reset the package progress to <strong>0/{packageState?.packageSize || packageSize}</strong> lessons.
                        The lesson history will be preserved, but a new package cycle will start.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
                    <Button
                        onClick={handleResetCancel}
                        variant="outlined"
                        sx={{
                            flex: 1,
                            textTransform: 'none',
                            borderRadius: 2,
                            borderColor: theme.palette.divider,
                            color: 'text.secondary',
                            '&:hover': {
                                borderColor: theme.palette.grey[400],
                                bgcolor: alpha(theme.palette.grey[500], 0.08),
                            },
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleResetConfirm}
                        variant="contained"
                        color="warning"
                        disabled={submitting}
                        sx={{
                            flex: 1,
                            textTransform: 'none',
                            borderRadius: 2,
                            fontWeight: 600,
                        }}
                    >
                        {submitting ? 'Resetting...' : 'Reset Package'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );

    // Use Drawer for desktop, Dialog fullScreen for mobile
    return isMobile ? (
        <Dialog fullScreen open={open} onClose={onClose}>
            {drawerContent}
        </Dialog>
    ) : (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: { sm: '450px', md: '520px' },
                    borderRadius: 0,
                    boxShadow: '0 0 20px rgba(0,0,0,0.08)',
                },
            }}
        >
            {drawerContent}
        </Drawer>
    );
};

export default StudentLedgerDrawer;
