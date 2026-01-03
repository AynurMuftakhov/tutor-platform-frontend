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
    InputAdornment,
    MenuItem,
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

    // Smart defaults based on preselected student
    const smartDefaults = useMemo(() => {
        if (!preselectedStudent) {
            return { lessonsCount: 1, amount: 0, ratePerLesson: 0, hasOutstanding: false };
        }
        
        const outstanding = preselectedStudent.lessonsOutstanding;
        const hasOutstanding = outstanding > 0;
        const defaultLessons = hasOutstanding ? outstanding : preselectedStudent.packageSize;
        const ratePerLesson = preselectedStudent.ratePerLesson || 0;
        
        return {
            lessonsCount: defaultLessons,
            amount: defaultLessons * ratePerLesson,
            ratePerLesson,
            hasOutstanding,
        };
    }, [preselectedStudent]);

    // Calculate amount when lessons count changes (if not manually set)
    useEffect(() => {
        if (!amountManuallySet && preselectedStudent && lessonsCount) {
            const lessons = parseFloat(lessonsCount) || 0;
            const calculatedAmount = lessons * (preselectedStudent.ratePerLesson || 0);
            setAmount(String(calculatedAmount));
        }
    }, [lessonsCount, preselectedStudent, amountManuallySet]);

    // Reset form when opening
    useEffect(() => {
        if (open) {
            setCurrency(defaultCurrency);
            setDate(dayjs());
            setComment('');
            setError(null);
            setAmountManuallySet(false);

            if (preselectedStudent) {
                setSelectedStudent({
                    id: preselectedStudent.studentId,
                    name: preselectedStudent.studentName,
                    avatar: preselectedStudent.studentAvatar,
                    level: 'Intermediate',
                    homeworkDone: false,
                } as Student);
                // Set smart defaults
                setLessonsCount(String(smartDefaults.lessonsCount));
                setAmount(String(smartDefaults.amount));
            } else {
                setSelectedStudent(null);
                setLessonsCount('1');
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

    const handleLessonsChange = (value: string) => {
        setLessonsCount(value);
        setAmountManuallySet(false); // Reset manual flag when changing lessons
    };

    const handleAmountChange = (value: string) => {
        setAmount(value);
        setAmountManuallySet(true); // Mark as manually set
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

    const showSmartDefaultsInfo = preselectedStudent && smartDefaults.ratePerLesson > 0;

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
                                    Smart defaults applied
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                {smartDefaults.hasOutstanding 
                                    ? `Paying for ${smartDefaults.lessonsCount} outstanding lesson${smartDefaults.lessonsCount !== 1 ? 's' : ''}`
                                    : `Paying for full package (${smartDefaults.lessonsCount} lessons)`
                                }
                                {' • '}
                                Rate: {formatMoney(smartDefaults.ratePerLesson, currency)}/lesson
                            </Typography>
                        </Box>
                    )}

                    {/* Lessons count */}
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
