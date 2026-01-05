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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import dayjs, { Dayjs } from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { fetchStudents } from '../../services/api';
import { createPayment } from '../../services/billing.api';
import {
    CURRENCIES,
    BillingStudent,
} from '../../types/billing';
import { Student } from '../../pages/MyStudentsPage';

interface AddPaymentModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultCurrency: string;
    preselectedStudent?: BillingStudent | null;
}

function formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
    open,
    onClose,
    onSuccess,
    defaultCurrency,
    preselectedStudent,
}) => {
    const theme = useTheme();
    const { user } = useAuth();

    // Form state
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [currency, setCurrency] = useState(defaultCurrency);
    const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
    const [packagesCount, setPackagesCount] = useState('1');
    const [lessonsCount, setLessonsCount] = useState('');
    const [amount, setAmount] = useState('');
    const [amountManuallySet, setAmountManuallySet] = useState(false);
    const [date, setDate] = useState<Dayjs | null>(dayjs());
    const [comment, setComment] = useState('');

    // Autocomplete state
    const [studentOptions, setStudentOptions] = useState<Student[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Submit state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Smart defaults based on preselected student (package-based)
    const smartDefaults = useMemo(() => {
        if (!preselectedStudent) {
            return { 
                packagesOutstanding: 0, 
                packageSize: 1, 
                packageRate: 0, 
                hasOutstanding: false,
            };
        }
        
        const packageSize = preselectedStudent.packageSize || 1;
        const packageRate = preselectedStudent.pricePerPackage || 0;
        
        // Calculate outstanding packages
        const completedPackages = Math.floor(preselectedStudent.lessonsCompleted / packageSize);
        const paidPackages = Math.floor(preselectedStudent.lessonsPaid / packageSize);
        const packagesOutstanding = completedPackages - paidPackages;
        const hasOutstanding = packagesOutstanding > 0;
        
        return {
            packagesOutstanding,
            packageSize,
            packageRate,
            hasOutstanding,
        };
    }, [preselectedStudent]);

    // Calculate amount when payment changes (if not manually set)
    useEffect(() => {
        if (!amountManuallySet && preselectedStudent) {
            const { packageRate, packageSize } = smartDefaults;
            
            if (paymentType === 'full') {
                // Full package payment
                const packages = parseFloat(packagesCount) || 1;
                const calculatedAmount = packages * packageRate;
                const calculatedLessons = packages * packageSize;
                setAmount(String(calculatedAmount));
                setLessonsCount(String(calculatedLessons));
            } else {
                // Partial payment - calculate based on lessons
                const lessons = parseFloat(lessonsCount) || 0;
                const perLessonRate = packageSize > 0 ? packageRate / packageSize : 0;
                const calculatedAmount = lessons * perLessonRate;
                setAmount(String(calculatedAmount));
            }
        }
    }, [paymentType, packagesCount, lessonsCount, preselectedStudent, amountManuallySet, smartDefaults]);

    // Reset form when opening
    useEffect(() => {
        if (open) {
            setCurrency(preselectedStudent?.currency || defaultCurrency);
            setDate(dayjs());
            setComment('');
            setError(null);
            setAmountManuallySet(false);
            setPaymentType('full');

            if (preselectedStudent) {
                setSelectedStudent({
                    id: preselectedStudent.studentId,
                    name: preselectedStudent.studentName,
                    avatar: preselectedStudent.studentAvatar,
                    level: 'Intermediate',
                    homeworkDone: false,
                } as Student);
                // Set smart defaults - default to outstanding packages or 1
                const defaultPackages = smartDefaults.hasOutstanding 
                    ? smartDefaults.packagesOutstanding 
                    : 1;
                setPackagesCount(String(defaultPackages));
                setLessonsCount(String(defaultPackages * smartDefaults.packageSize));
                setAmount(String(defaultPackages * smartDefaults.packageRate));
            } else {
                setSelectedStudent(null);
                setPackagesCount('1');
                setLessonsCount('');
                setAmount('');
            }
        }
    }, [open, defaultCurrency, preselectedStudent, smartDefaults]);

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
        setAmountManuallySet(false);
    };

    const handleLessonsChange = (value: string) => {
        setLessonsCount(value);
        setAmountManuallySet(false);
    };

    const handleAmountChange = (value: string) => {
        setAmount(value);
        setAmountManuallySet(true);
    };

    const handlePaymentTypeChange = (type: 'full' | 'partial') => {
        setPaymentType(type);
        setAmountManuallySet(false);
        if (type === 'full') {
            // Reset to 1 package
            setPackagesCount('1');
        } else {
            // Reset lessons for partial
            setLessonsCount('1');
        }
    };

    const handleSubmit = async () => {
        if (!selectedStudent || !amount || !date || !lessonsCount) {
            setError('Please fill in all required fields');
            return;
        }

        const parsedAmount = parseFloat(amount);
        const parsedLessons = parseFloat(lessonsCount);
        
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (isNaN(parsedLessons) || parsedLessons <= 0) {
            setError('Please enter a valid number of lessons');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await createPayment({
                studentId: selectedStudent.id,
                lessonsCount: parsedLessons,
                amount: parsedAmount,
                currency,
                entryDate: date.format('YYYY-MM-DD'),
                comment: comment || null,
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

    const showSmartDefaultsInfo = preselectedStudent && smartDefaults.packageRate > 0;

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

                    {/* Smart defaults info */}
                    {showSmartDefaultsInfo && (
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
                                {smartDefaults.hasOutstanding 
                                    ? `${smartDefaults.packagesOutstanding} package${smartDefaults.packagesOutstanding !== 1 ? 's' : ''} outstanding`
                                    : 'No outstanding packages'
                                }
                                {' • '}
                                Package: {smartDefaults.packageSize} lessons for {formatMoney(smartDefaults.packageRate, currency)}
                            </Typography>
                        </Box>
                    )}

                    {/* Payment type toggle */}
                    {preselectedStudent && (
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                Payment type
                            </Typography>
                            <RadioGroup
                                row
                                value={paymentType}
                                onChange={(e) => handlePaymentTypeChange(e.target.value as 'full' | 'partial')}
                            >
                                <FormControlLabel
                                    value="full"
                                    control={<Radio size="small" />}
                                    label={
                                        <Typography variant="body2">
                                            Full package ({formatMoney(smartDefaults.packageRate, currency)})
                                        </Typography>
                                    }
                                />
                                <FormControlLabel
                                    value="partial"
                                    control={<Radio size="small" />}
                                    label={
                                        <Typography variant="body2" color="text.secondary">
                                            Partial (per lesson)
                                        </Typography>
                                    }
                                />
                            </RadioGroup>
                        </Box>
                    )}

                    {/* Packages count (for full payment type) */}
                    {paymentType === 'full' && preselectedStudent && (
                        <TextField
                            label="Number of packages"
                            type="number"
                            value={packagesCount}
                            onChange={(e) => handlePackagesChange(e.target.value)}
                            required
                            size="small"
                            fullWidth
                            inputProps={{ min: 1, step: 1 }}
                            helperText={`= ${parseFloat(packagesCount) * smartDefaults.packageSize || 0} lessons`}
                        />
                    )}

                    {/* Lessons count (for partial payment type or no preselected student) */}
                    {(paymentType === 'partial' || !preselectedStudent) && (
                        <>
                            <TextField
                                label="Number of lessons"
                                type="number"
                                value={lessonsCount}
                                onChange={(e) => handleLessonsChange(e.target.value)}
                                required
                                size="small"
                                fullWidth
                                inputProps={{ min: 0.5, step: 0.5 }}
                                InputProps={{
                                    endAdornment: preselectedStudent && (
                                        <InputAdornment position="end">
                                            <Chip
                                                label={`of ${preselectedStudent.packageSize}`}
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
                        </>
                    )}

                    <Stack direction="row" spacing={2}>
                        {/* Currency */}
                        <TextField
                            select
                            label="Currency"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            size="small"
                            sx={{ minWidth: 100 }}
                        >
                            {CURRENCIES.map((cur) => (
                                <MenuItem key={cur} value={cur}>
                                    {cur}
                                </MenuItem>
                            ))}
                        </TextField>

                        {/* Amount */}
                        <TextField
                            label="Amount"
                            type="number"
                            value={amount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            required
                            size="small"
                            fullWidth
                            inputProps={{ min: 0, step: 0.01 }}
                            InputProps={{
                                endAdornment: amountManuallySet && preselectedStudent && (
                                    <Tooltip title="Amount manually adjusted">
                                        <InputAdornment position="end">
                                            <Chip
                                                label="Custom"
                                                size="small"
                                                color="warning"
                                                sx={{ height: 20, fontSize: '0.7rem' }}
                                            />
                                        </InputAdornment>
                                    </Tooltip>
                                ),
                            }}
                        />
                    </Stack>

                    {/* Date */}
                    <DatePicker
                        label="Date"
                        value={date}
                        onChange={(v) => setDate(v)}
                        slotProps={{ textField: { size: 'small', fullWidth: true, required: true } }}
                    />

                    {/* Comment */}
                    <TextField
                        label="Comment (optional)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        placeholder={`Payment for ${lessonsCount || '...'} lesson${parseFloat(lessonsCount) !== 1 ? 's' : ''}`}
                    />

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
                    disabled={submitting || !selectedStudent || !amount || !lessonsCount}
                >
                    {submitting ? 'Recording...' : `Record ${formatMoney(parseFloat(amount) || 0, currency)}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddPaymentModal;
