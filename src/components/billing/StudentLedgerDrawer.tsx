import React, { useState, useMemo } from 'react';
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
    Paper,
    Skeleton,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
    alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import {
    BillingStudent,
    UnifiedLedgerEntry,
    UnifiedLedgerResponse,
} from '../../types/billing';
import LedgerEntryRow from './LedgerEntryRow';

type LedgerFilterTab = 'all' | 'lessons' | 'payments';

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

    // Ledger filter tab state
    const [ledgerFilterTab, setLedgerFilterTab] = useState<LedgerFilterTab>('all');

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

    // Filter entries based on selected tab
    const filteredEntries = useMemo(() => {
        if (ledgerFilterTab === 'all') return entries;
        if (ledgerFilterTab === 'lessons') return entries.filter(e => e.kind === 'LESSON');
        if (ledgerFilterTab === 'payments') return entries.filter(e => e.kind === 'PAYMENT');
        return entries;
    }, [entries, ledgerFilterTab]);

    // Calculate summary totals from entries
    const summaryTotals = useMemo(() => {
        const totalCharged = entries
            .filter(e => e.kind === 'LESSON')
            .reduce((sum, e) => sum + e.amount, 0);
        const totalPaid = entries
            .filter(e => e.kind === 'PAYMENT')
            .reduce((sum, e) => sum + e.amount, 0);
        return { totalCharged, totalPaid };
    }, [entries]);

    // Use student prop for KPIs (already has correct values from students list)
    const lessonsCompleted = student?.lessonsCompleted ?? 0;
    const lessonsPaid = student?.lessonsPaid ?? 0;
    const lessonsOutstanding = student?.lessonsOutstanding ?? 0;
    const outstandingAmount = student?.outstandingAmount ?? 0;

    const hasDebt = lessonsOutstanding > 0;
    const hasCredit = lessonsOutstanding < 0;

    const getBalanceBadge = () => {
        const outstanding = lessonsOutstanding;
        const amount = outstandingAmount;
        
        if (outstanding > 0) {
            return (
                <Chip
                    label={`Owes ${outstanding} lesson${outstanding !== 1 ? 's' : ''} (${formatMoney(amount, currency)})`}
                    size="small"
                    sx={{
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                        color: theme.palette.error.main,
                        fontWeight: 600,
                    }}
                />
            );
        }
        if (outstanding < 0) {
            return (
                <Chip
                    label={`Credit ${Math.abs(outstanding)} lesson${Math.abs(outstanding) !== 1 ? 's' : ''} (${formatMoney(Math.abs(amount), currency)})`}
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

            {/* Mini KPIs */}
            <Box sx={{ p: 2 }}>
                <Grid container spacing={2}>
                    <Grid size={{ xs:4 }}>
                        <Card
                            elevation={0}
                            sx={{
                                bgcolor: alpha(theme.palette.info.main, 0.05),
                                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                            }}
                        >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="caption" color="text.secondary">
                                    Completed
                                </Typography>
                                {loading ? (
                                    <Skeleton width={40} height={24} />
                                ) : (
                                    <Typography variant="subtitle1" fontWeight={700} color="info.main">
                                        {lessonsCompleted}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs:4 }}>
                        <Card
                            elevation={0}
                            sx={{
                                bgcolor: alpha(theme.palette.success.main, 0.05),
                                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                            }}
                        >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="caption" color="text.secondary">
                                    Paid
                                </Typography>
                                {loading ? (
                                    <Skeleton width={40} height={24} />
                                ) : (
                                    <Typography variant="subtitle1" fontWeight={700} color="success.main">
                                        {lessonsPaid}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs:4 }}>
                        <Card
                            elevation={0}
                            sx={{
                                bgcolor: hasDebt 
                                    ? alpha(theme.palette.error.main, 0.05)
                                    : hasCredit
                                    ? alpha(theme.palette.success.main, 0.05)
                                    : alpha(theme.palette.grey[500], 0.05),
                                border: `1px solid ${hasDebt 
                                    ? alpha(theme.palette.error.main, 0.2)
                                    : hasCredit
                                    ? alpha(theme.palette.success.main, 0.2)
                                    : theme.palette.divider}`,
                            }}
                        >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="caption" color="text.secondary">
                                    Unpaid
                                </Typography>
                                {loading ? (
                                    <Skeleton width={60} height={24} />
                                ) : (
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        <Typography
                                            variant="subtitle1"
                                            fontWeight={700}
                                            sx={{
                                                color: hasDebt
                                                    ? theme.palette.error.main
                                                    : hasCredit
                                                    ? theme.palette.success.main
                                                    : theme.palette.text.primary,
                                            }}
                                        >
                                            {Math.abs(lessonsOutstanding)}
                                        </Typography>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Balance badge */}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    {!loading && getBalanceBadge()}
                </Box>

                {/* Action button */}
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onAddPayment}
                    fullWidth
                    sx={{ mt: 2, textTransform: 'none', borderRadius: 2 }}
                >
                    Record payment
                </Button>
            </Box>

            <Divider />

            {/* Ledger filter tabs */}
            <Box sx={{ px: 2, pt: 1 }}>
                <Tabs
                    value={ledgerFilterTab}
                    onChange={(_, newValue) => setLedgerFilterTab(newValue as LedgerFilterTab)}
                    variant="fullWidth"
                    sx={{
                        minHeight: 36,
                        '& .MuiTab-root': {
                            minHeight: 36,
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                        },
                    }}
                >
                    <Tab label="All" value="all" />
                    <Tab label="Lessons" value="lessons" />
                    <Tab label="Payments" value="payments" />
                </Tabs>

                {/* Summary totals */}
                {!loading && entries.length > 0 && (
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            gap: 3,
                            mt: 1.5,
                            mb: 1,
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
                )}
            </Box>

            {/* Ledger entries */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, pt: 1 }}>
                {loading ? (
                    <Stack spacing={1}>
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} variant="rounded" height={100} />
                        ))}
                    </Stack>
                ) : filteredEntries.length === 0 ? (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 4,
                            textAlign: 'center',
                            bgcolor: alpha(theme.palette.grey[500], 0.05),
                            borderRadius: 2,
                        }}
                    >
                        <Typography color="text.secondary">
                            {entries.length === 0 
                                ? 'No transactions yet' 
                                : `No ${ledgerFilterTab === 'lessons' ? 'lessons' : 'payments'} in this period`
                            }
                        </Typography>
                    </Paper>
                ) : (
                    <Stack spacing={0}>
                        {filteredEntries.map((entry) => (
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
