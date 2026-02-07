import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    InputAdornment,
    MenuItem,
    Switch,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Tooltip,
    Typography,
    Avatar,
    CircularProgress,
    useTheme,
    alpha,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import dayjs, { Dayjs } from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { fetchStudents } from '../../services/api';
import { createPayment } from '../../services/billing.api';
import {
    CURRENCIES,
    BillingStudent,
    PAYMENT_METHODS,
    PaymentMethod,
} from '../../types/billing';
import { Student } from '../../pages/MyStudentsPage';

type PaymentMode = 'packages' | 'lessons';

export type PaymentPreset = {
    mode: PaymentMode;
    packagesCount?: number;
    lessonsCount?: number;
};

interface AddPaymentModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultCurrency: string;
    preselectedStudent?: BillingStudent | null;
    preset?: PaymentPreset | null;
}

function formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

function parseCount(value: string): number {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
    open,
    onClose,
    onSuccess,
    defaultCurrency,
    preselectedStudent,
    preset,
}) => {
    const theme = useTheme();
    const { user } = useAuth();

    // Form state
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [currency, setCurrency] = useState(defaultCurrency);
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('packages');
    const [packagesCount, setPackagesCount] = useState('1');
    const [customLessonsCount, setCustomLessonsCount] = useState('1');
    const [amount, setAmount] = useState('');
    const [overrideAmount, setOverrideAmount] = useState(false);
    const [date, setDate] = useState<Dayjs | null>(dayjs());
    const [method, setMethod] = useState<PaymentMethod | ''>('');
    const [comment, setComment] = useState('');

    // Autocomplete state
    const [studentOptions, setStudentOptions] = useState<Student[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Submit state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasAutoPricing = !!preselectedStudent;

    const pricingInfo = useMemo(() => {
        if (!preselectedStudent) {
            return {
                packageSize: 1,
                pricePerPackage: 0,
                ratePerLesson: 0,
                packagesOwedFull: 0,
                currentPackageBalanceLessons: 0,
            };
        }

        const packageSize = preselectedStudent.packageSize || 1;
        const pricePerPackage = preselectedStudent.pricePerPackage || 0;
        const ratePerLesson = preselectedStudent.ratePerLesson || (packageSize ? pricePerPackage / packageSize : 0);
        const packagesOwedFull = preselectedStudent.packagesOwedFull ?? Math.max(preselectedStudent.outstandingPackages, 0);
        const currentPackageBalanceLessons = preselectedStudent.currentPackageBalanceLessons ?? 0;

        return {
            packageSize,
            pricePerPackage,
            ratePerLesson,
            packagesOwedFull,
            currentPackageBalanceLessons,
        };
    }, [preselectedStudent]);

    const computedPackageLessons = useMemo(() => {
        const pkgCount = parseCount(packagesCount);
        return pkgCount * pricingInfo.packageSize;
    }, [packagesCount, pricingInfo.packageSize]);

    const computedCustomLessons = useMemo(() => parseCount(customLessonsCount), [customLessonsCount]);

    const computedLessons = paymentMode === 'packages' ? computedPackageLessons : computedCustomLessons;

    const autoAmount = useMemo(() => {
        if (!preselectedStudent) {
            return 0;
        }
        if (paymentMode === 'packages') {
            const pkgCount = parseCount(packagesCount);
            return pkgCount * pricingInfo.pricePerPackage;
        }
        return computedCustomLessons * pricingInfo.ratePerLesson;
    }, [computedCustomLessons, paymentMode, packagesCount, preselectedStudent, pricingInfo.pricePerPackage, pricingInfo.ratePerLesson]);

    // Reset form when opening
    useEffect(() => {
        if (open) {
            setCurrency(preselectedStudent?.currency || defaultCurrency);
            setDate(dayjs());
            setComment('');
            setError(null);
            setOverrideAmount(false);
            setMethod('');

            if (preselectedStudent) {
                setOverrideAmount(false);
                setSelectedStudent({
                    id: preselectedStudent.studentId,
                    name: preselectedStudent.studentName,
                    avatar: preselectedStudent.studentAvatar,
                    level: 'Intermediate',
                    homeworkDone: false,
                } as Student);

                const defaultPackages = Math.max(
                    preset?.packagesCount ?? (pricingInfo.packagesOwedFull > 0 ? pricingInfo.packagesOwedFull : 1),
                    1
                );
                const fallbackLessons = pricingInfo.currentPackageBalanceLessons > 0
                    ? Math.min(pricingInfo.currentPackageBalanceLessons, pricingInfo.packageSize)
                    : pricingInfo.packageSize;
                const defaultLessons = Math.max(preset?.lessonsCount ?? fallbackLessons, 1);
                const initialMode = preset?.mode ?? 'packages';

                setPaymentMode(initialMode);
                setPackagesCount(String(defaultPackages));
                setCustomLessonsCount(String(defaultLessons));
                setAmount('');
            } else {
                setOverrideAmount(true);
                setSelectedStudent(null);
                setPackagesCount('1');
                setCustomLessonsCount('1');
                setAmount('');
                setPaymentMode('lessons');
            }
        }
    }, [open, defaultCurrency, preselectedStudent, preset, pricingInfo]);

    useEffect(() => {
        if (!open || !hasAutoPricing) return;
        if (!overrideAmount) {
            setAmount(String(autoAmount));
        }
    }, [autoAmount, hasAutoPricing, overrideAmount, open]);

    // Debounced student search
    const searchStudents = useCallback(async (search: string) => {
        if (!user?.id) return;
        setLoadingStudents(true);
        try {
            const data = await fetchStudents(user.id, search, 0, 20);
            setStudentOptions(data.content);
        } catch (err) {
            console.error('Failed to fetch students', err);
        } finally {
            setLoadingStudents(false);
        }
    }, [user?.id]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (studentSearch.length >= 0) {
                searchStudents(studentSearch);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [studentSearch, searchStudents]);

    // Load initial students when opening
    useEffect(() => {
        if (open && !preselectedStudent) {
            searchStudents('');
        }
    }, [open, preselectedStudent, searchStudents]);

    const handlePackagesChange = (value: string) => {
        setPackagesCount(value);
    };

    const handleLessonsChange = (value: string) => {
        setCustomLessonsCount(value);
    };

    const handlePaymentModeChange = (mode: PaymentMode) => {
        if (!hasAutoPricing && mode === 'packages') {
            return;
        }
        setPaymentMode(mode);
        if (hasAutoPricing) {
            setOverrideAmount(false);
        }
    };

    const handleSubmit = async () => {
        const resolvedLessons = paymentMode === 'packages' ? computedPackageLessons : computedCustomLessons;
        const parsedAmount = parseFloat(amount);
        const resolvedAmount = hasAutoPricing && !overrideAmount ? autoAmount : parsedAmount;

        if (!selectedStudent || !date || resolvedLessons <= 0) {
            setError('Please fill in all required fields');
            return;
        }

        if (isNaN(resolvedAmount) || resolvedAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await createPayment({
                studentId: selectedStudent.id,
                lessonsCount: resolvedLessons,
                amount: resolvedAmount,
                currency,
                entryDate: date.format('YYYY-MM-DD'),
                comment: comment || null,
                method: method || null,
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to create payment', err);
            setError('Failed to create payment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const displayAmount = hasAutoPricing && !overrideAmount ? autoAmount : parseFloat(amount) || 0;
    const displayLessons = computedLessons || 0;
    const packageSummary = preselectedStudent
        ? `${pricingInfo.packageSize} lessons • ${formatMoney(pricingInfo.pricePerPackage, currency)} (${formatMoney(pricingInfo.ratePerLesson, currency)} per lesson)`
        : null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogContent>
                <Stack spacing={2.5} sx={{ mt: 1 }}>
                    {/* Student autocomplete */}
                    <Autocomplete
                        value={selectedStudent}
                        onChange={(_, newValue) => setSelectedStudent(newValue)}
                        inputValue={studentSearch}
                        onInputChange={(_, newInputValue) => setStudentSearch(newInputValue)}
                        options={studentOptions}
                        getOptionLabel={(option) => option.name}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        loading={loadingStudents}
                        disabled={!!preselectedStudent}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Student"
                                required
                                size="small"
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {loadingStudents ? <CircularProgress size={20} /> : null}
                                            {params.InputProps.endAdornment}
                                        </>
                                    ),
                                }}
                            />
                        )}
                        renderOption={(props, option) => (
                            <Box component="li" {...props} key={option.id}>
                                <Avatar
                                    src={option.avatar}
                                    alt={option.name}
                                    sx={{ width: 28, height: 28, mr: 1.5, fontSize: 12 }}
                                >
                                    {option.name.charAt(0)}
                                </Avatar>
                                <Typography variant="body2">{option.name}</Typography>
                            </Box>
                        )}
                    />

                    {preselectedStudent && (
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: alpha(theme.palette.info.main, 0.08),
                                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                            }}
                        >
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                <InfoOutlinedIcon sx={{ fontSize: 16, color: 'info.main' }} />
                                <Typography variant="caption" color="info.main" fontWeight={600}>
                                    Package billing
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                {pricingInfo.packagesOwedFull > 0
                                    ? `${pricingInfo.packagesOwedFull} package${pricingInfo.packagesOwedFull !== 1 ? 's' : ''} outstanding`
                                    : 'No full packages outstanding'}
                                {' • '}
                                {packageSummary}
                            </Typography>
                        </Box>
                    )}

                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                            Payment covers
                        </Typography>
                        <RadioGroup
                            row
                            value={paymentMode}
                            onChange={(e) => handlePaymentModeChange(e.target.value as PaymentMode)}
                        >
                            <FormControlLabel
                                value="packages"
                                control={<Radio size="small" />}
                                label={<Typography variant="body2">Full package(s)</Typography>}
                                disabled={!hasAutoPricing}
                            />
                            <FormControlLabel
                                value="lessons"
                                control={<Radio size="small" />}
                                label={<Typography variant="body2">Custom lessons</Typography>}
                            />
                        </RadioGroup>
                    </Box>

                    {paymentMode === 'packages' && (
                        <TextField
                            label="Number of packages"
                            type="number"
                            value={packagesCount}
                            onChange={(e) => handlePackagesChange(e.target.value)}
                            required
                            size="small"
                            fullWidth
                            inputProps={{ min: 1, step: 1 }}
                            helperText={`= ${computedPackageLessons || 0} lessons`}
                        />
                    )}

                    {paymentMode === 'lessons' && (
                        <TextField
                            label="Number of lessons"
                            type="number"
                            value={customLessonsCount}
                            onChange={(e) => handleLessonsChange(e.target.value)}
                            required
                            size="small"
                            fullWidth
                            inputProps={{ min: 0.5, step: 0.5 }}
                            InputProps={{
                                endAdornment: preselectedStudent && (
                                    <InputAdornment position="end">
                                        <Chip
                                            label={`of ${pricingInfo.packageSize}`}
                                            size="small"
                                            sx={{
                                                height: 20,
                                                fontSize: '0.7rem',
                                                bgcolor: alpha(theme.palette.grey[500], 0.1),
                                            }}
                                        />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    )}

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                        <TextField
                            label="Amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            size="small"
                            fullWidth
                            inputProps={{ min: 0, step: 0.01, readOnly: hasAutoPricing && !overrideAmount }}
                            InputProps={{
                                endAdornment: hasAutoPricing && !overrideAmount && (
                                    <Tooltip title="Auto-calculated from selection">
                                        <InputAdornment position="end">
                                            <Chip
                                                label="Auto"
                                                size="small"
                                                color="info"
                                                sx={{ height: 20, fontSize: '0.7rem' }}
                                            />
                                        </InputAdornment>
                                    </Tooltip>
                                ),
                            }}
                        />
                        {hasAutoPricing && (
                            <FormControlLabel
                                control={(
                                    <Switch
                                        size="medium"
                                        checked={overrideAmount}
                                        onChange={(e) => {
                                            setOverrideAmount(e.target.checked);
                                            if (!e.target.checked) {
                                                setAmount(String(autoAmount));
                                            }
                                        }}
                                    />
                                )}
                                label="Override amount"
                                sx={{ mt: { xs: 0, sm: 1 } }}
                            />
                        )}
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            select
                            label="Currency"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            size="small"
                            sx={{ minWidth: 120 }}
                        >
                            {CURRENCIES.map((cur) => (
                                <MenuItem key={cur} value={cur}>
                                    {cur}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Payment method"
                            value={method}
                            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                            size="small"
                            fullWidth
                        >
                            <MenuItem value="">Select method</MenuItem>
                            {PAYMENT_METHODS.map((item) => (
                                <MenuItem key={item.value} value={item.value}>
                                    {item.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Stack>

                    <DatePicker
                        label="Date"
                        value={date}
                        onChange={(v) => setDate(v)}
                        slotProps={{ textField: { size: 'small', fullWidth: true, required: true } }}
                    />

                    <TextField
                        label="Comment (optional)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        placeholder={`Payment for ${displayLessons || '...'} lesson${displayLessons === 1 ? '' : 's'}`}
                    />

                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        }}
                    >
                        <Typography variant="body2" fontWeight={700}>
                            Will record payment: {displayLessons || 0} lessons = {formatMoney(displayAmount || 0, currency)} ({currency})
                        </Typography>
                    </Box>

                    {error && (
                        <Typography color="error" variant="body2">
                            {error}
                        </Typography>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={submitting}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={submitting || !selectedStudent || displayLessons <= 0 || displayAmount <= 0}
                >
                    {submitting ? 'Recording...' : `Record ${formatMoney(displayAmount || 0, currency)}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddPaymentModal;
