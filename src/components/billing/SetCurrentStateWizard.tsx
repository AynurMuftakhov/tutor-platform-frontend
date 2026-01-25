import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    Stack,
    Step,
    StepLabel,
    Stepper,
    TextField,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PaymentIcon from '@mui/icons-material/Payment';
import { isAxiosError } from 'axios';
import dayjs, { Dayjs } from 'dayjs';
import {
    BillingStudent,
    CURRENCIES,
    PAYMENT_METHODS,
    PaymentMethod,
} from '../../types/billing';
import { packageSetupStudent, type PackageSetupPayload } from '../../services/billing.api';

interface SetCurrentStateWizardProps {
    open: boolean;
    onClose: () => void;
    student: BillingStudent | null;
    defaultCurrency: string;
    onSuccess: (studentId: string) => void;
}

const steps = ['Input', 'Preview'];

function formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

const SetCurrentStateWizard: React.FC<SetCurrentStateWizardProps> = ({
    open,
    onClose,
    student,
    defaultCurrency,
    onSuccess,
}) => {
    const theme = useTheme();

    const [activeStep, setActiveStep] = useState(0);
    const [effectiveDate, setEffectiveDate] = useState<Dayjs | null>(dayjs());
    const [packageSize, setPackageSize] = useState('1');
    const [pricePerPackage, setPricePerPackage] = useState('0');
    const [currency, setCurrency] = useState(defaultCurrency);
    const [lessonsCompleted, setLessonsCompleted] = useState('0');
    const [lessonsPaid, setLessonsPaid] = useState('0');
    const [comment, setComment] = useState('[Migration] Initial setup');
    const [recordPayment, setRecordPayment] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentAmountTouched, setPaymentAmountTouched] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
    const [paymentComment, setPaymentComment] = useState('');
    const [paymentDate, setPaymentDate] = useState<Dayjs | null>(dayjs());
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const parsedValues = useMemo(() => {
        const toNumber = (value: string) => {
            const num = Number(value);
            return Number.isFinite(num) ? num : 0;
        };
        const pkgSize = toNumber(packageSize);
        const price = toNumber(pricePerPackage);
        const completed = toNumber(lessonsCompleted);
        const paid = toNumber(lessonsPaid);
        const perLesson = pkgSize > 0 ? price / pkgSize : 0;
        const hasPaymentAmountInput = paymentAmount.trim() !== '';
        const paymentInput = toNumber(paymentAmount);
        const paymentAmt = recordPayment
            ? (hasPaymentAmountInput ? paymentInput : paid * perLesson || 0)
            : 0;
        return { pkgSize, price, completed, paid, perLesson, paymentAmt };
    }, [packageSize, pricePerPackage, lessonsCompleted, lessonsPaid, recordPayment, paymentAmount]);

    const balanceLessons = parsedValues.completed - parsedValues.paid;
    const status =
        balanceLessons > 0 ? 'OWED' : balanceLessons < 0 ? 'CREDIT' : 'SETTLED';
    const packagesDelta = parsedValues.pkgSize > 0
        ? balanceLessons / parsedValues.pkgSize
        : 0;
    const estimatedPackages =
        balanceLessons >= 0
            ? Math.ceil(packagesDelta)
            : Math.floor(packagesDelta);
    const estimatedAmount = packagesDelta * parsedValues.price;
    const paidLessonsWarning = parsedValues.pkgSize > 0 && parsedValues.paid > parsedValues.pkgSize * 2;

    const resetForm = useCallback(() => {
        const pkgSize = student?.packageSize || 1;
        const defaultCompleted = student
            ? student.currentPackageLessonsCompleted
                ?? (student.lessonsCompleted % pkgSize)
            : 0;
        const defaultPaid = student
            ? student.currentPackageLessonsPaid
                ?? (student.lessonsPaid % pkgSize)
            : 0;
        setActiveStep(0);
        setEffectiveDate(dayjs());
        setPaymentDate(dayjs());
        setPackageSize(String(pkgSize));
        setPricePerPackage(String(student?.pricePerPackage ?? 0));
        setCurrency(student?.currency || defaultCurrency);
        setLessonsCompleted(String(defaultCompleted));
        setLessonsPaid(String(defaultPaid));
        setComment('[Migration] Initial setup');
        setRecordPayment(false);
        setPaymentAmountTouched(false);
        setPaymentAmount('');
        setPaymentMethod('');
        setPaymentComment('');
        setError(null);
        setSubmitting(false);
    }, [student, defaultCurrency]);

    useEffect(() => {
        if (open) {
            resetForm();
        }
    }, [open, resetForm, student?.studentId]);

    useEffect(() => {
        if (!recordPayment || paymentAmountTouched) return;
        const autoAmount = parsedValues.paid * parsedValues.perLesson;
        const safeAutoAmount = autoAmount >= 0 ? autoAmount : 0;
        setPaymentAmount(String(safeAutoAmount));
    }, [parsedValues.paid, parsedValues.perLesson, recordPayment, paymentAmountTouched]);

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const validateStep = (): boolean => {
        if (!student) {
            setError('Select a student to proceed.');
            return false;
        }
        if (!effectiveDate) {
            setError('Effective date is required.');
            return false;
        }
        if (parsedValues.pkgSize <= 0) {
            setError('Package size must be greater than 0.');
            return false;
        }
        if (parsedValues.price < 0) {
            setError('Price per package cannot be negative.');
            return false;
        }
        if (parsedValues.completed < 0 || parsedValues.paid < 0) {
            setError('Lesson counts cannot be negative.');
            return false;
        }
        if (!currency) {
            setError('Currency is required.');
            return false;
        }
        if (recordPayment) {
            if (parsedValues.paymentAmt < 0) {
                setError('Payment amount cannot be negative.');
                return false;
            }
            if (!paymentDate) {
                setError('Payment date is required.');
                return false;
            }
        }
        setError(null);
        return true;
    };

    const handleNext = () => {
        if (!validateStep()) return;
        setActiveStep(1);
    };

    const handleSubmit = async () => {
        if (!validateStep() || !student) return;
        setSubmitting(true);
        setError(null);
        const payload: PackageSetupPayload = {
            effectiveDate: (effectiveDate ?? dayjs()).format('YYYY-MM-DD'),
            packageSize: parsedValues.pkgSize,
            pricePerPackage: parsedValues.price,
            currency,
            completedLessons: parsedValues.completed,
            paidLessons: parsedValues.paid,
            comment: comment || null,
        };
        if (recordPayment) {
            payload.recordPayment = true;
            payload.paymentLessons = parsedValues.paid;
            payload.paymentAmount = parsedValues.paymentAmt;
            payload.paymentMethod = paymentMethod || null;
            payload.paymentComment = paymentComment ? paymentComment : comment || null;
            payload.paymentDate = (paymentDate ?? effectiveDate ?? dayjs()).format('YYYY-MM-DD');
        }

        try {
            await packageSetupStudent(student.studentId, payload);
            onSuccess(student.studentId);
            handleClose();
        } catch (err) {
            if (isAxiosError(err)) {
                if (err.response?.status === 409) {
                    setError('Setup already exists for this date. Choose a different effective date.');
                } else {
                    const message = (err.response?.data as any)?.message ?? 'Failed to update state. Please try again.';
                    setError(message);
                }
            } else {
                setError('Failed to update state. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const renderStatusChip = () => {
        if (status === 'OWED') {
            return (
                <Chip
                    label="OWED"
                    color="error"
                    size="small"
                    sx={{ fontWeight: 700 }}
                />
            );
        }
        if (status === 'CREDIT') {
            return (
                <Chip
                    label="CREDIT"
                    color="success"
                    size="small"
                    sx={{ fontWeight: 700 }}
                />
            );
        }
        return (
            <Chip
                label="SETTLED"
                size="small"
                sx={{
                    fontWeight: 700,
                    bgcolor: alpha(theme.palette.grey[500], 0.16),
                }}
            />
        );
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>Set current state for {student?.studentName ?? 'student'}</DialogTitle>
            <DialogContent dividers>
                <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {activeStep === 0 && (
                    <Stack spacing={2}>
                        <Alert severity="info">
                            Use this wizard to seed the student&apos;s current package and balance without backfilling every lesson.
                        </Alert>
                        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)' }} gap={2}>
                            <DatePicker
                                label="Effective date"
                                value={effectiveDate}
                                onChange={(v) => setEffectiveDate(v)}
                                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                            />
                            <TextField
                                select
                                label="Currency"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                size="small"
                            >
                                {CURRENCIES.map((cur) => (
                                    <MenuItem key={cur} value={cur}>
                                        {cur}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                label="Package size (lessons)"
                                type="number"
                                value={packageSize}
                                onChange={(e) => setPackageSize(e.target.value)}
                                size="small"
                                inputProps={{ min: 1, step: 1 }}
                            />
                            <TextField
                                label="Price per package"
                                type="number"
                                value={pricePerPackage}
                                onChange={(e) => setPricePerPackage(e.target.value)}
                                size="small"
                                inputProps={{ min: 0, step: 0.01 }}
                            />
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Current package snapshot
                            </Typography>
                            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)' }} gap={2}>
                                <TextField
                                    label="Lessons completed in current package"
                                    type="number"
                                    value={lessonsCompleted}
                                    onChange={(e) => setLessonsCompleted(e.target.value)}
                                    size="small"
                                    inputProps={{ min: 0, step: 0.5 }}
                                />
                                <TextField
                                    label="Lessons paid in current package"
                                    type="number"
                                    value={lessonsPaid}
                                    onChange={(e) => setLessonsPaid(e.target.value)}
                                    size="small"
                                    inputProps={{ min: 0, step: 0.5 }}
                                />
                            </Box>
                            {paidLessonsWarning && (
                                <Alert
                                    severity="warning"
                                    icon={<WarningAmberIcon fontSize="inherit" />}
                                    sx={{ mt: 1 }}
                                >
                                    Paid lessons ({parsedValues.paid}) look high relative to the package size ({parsedValues.pkgSize}). Continue only if this matches legacy payments.
                                </Alert>
                            )}
                        </Box>

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={recordPayment}
                                    onChange={(e) => {
                                        setRecordPayment(e.target.checked);
                                        if (e.target.checked) {
                                            setPaymentAmountTouched(false);
                                            setPaymentDate(effectiveDate ?? dayjs());
                                        }
                                    }}
                                />
                            }
                            label="Also record payment now"
                        />

                        {recordPayment && (
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                                }}
                            >
                                <Typography variant="subtitle2" gutterBottom>
                                    Payment details
                                </Typography>
                                <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)' }} gap={2}>
                                    <TextField
                                        label="Payment amount"
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => {
                                            setPaymentAmount(e.target.value);
                                            setPaymentAmountTouched(true);
                                        }}
                                        size="small"
                                        inputProps={{ min: 0, step: 0.01 }}
                                    />
                                    <TextField
                                        select
                                        label="Payment method"
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                        size="small"
                                    >
                                        <MenuItem value="">None</MenuItem>
                                        {PAYMENT_METHODS.map((method) => (
                                            <MenuItem key={method.value} value={method.value}>
                                                {method.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <DatePicker
                                        label="Payment date"
                                        value={paymentDate}
                                        onChange={(v) => setPaymentDate(v)}
                                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                                    />
                                    <TextField
                                        label="Payment comment"
                                        value={paymentComment}
                                        onChange={(e) => setPaymentComment(e.target.value)}
                                        size="small"
                                    />
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                    Default amount is based on paid lessons × rate; override if legacy payments differ.
                                </Typography>
                            </Box>
                        )}

                        <TextField
                            label="Comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            size="small"
                            multiline
                            rows={2}
                        />

                        {error && (
                            <Alert severity="error">{error}</Alert>
                        )}
                    </Stack>
                )}

                {activeStep === 1 && (
                    <Stack spacing={2}>
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                border: `1px solid ${theme.palette.divider}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Status
                                </Typography>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="h6" fontWeight={800}>
                                        {status}
                                    </Typography>
                                    {renderStatusChip()}
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    Progress: {parsedValues.completed}/{parsedValues.pkgSize} lessons
                                </Typography>
                            </Box>
                            <Box textAlign="right">
                                <Typography variant="caption" color="text.secondary">
                                    Balance (lessons)
                                </Typography>
                                <Typography
                                    variant="h6"
                                    fontWeight={800}
                                    color={balanceLessons > 0 ? 'error.main' : balanceLessons < 0 ? 'success.main' : 'text.primary'}
                                >
                                    {balanceLessons > 0 ? `+${balanceLessons}` : balanceLessons}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Est. packages owed: {estimatedPackages || 0} ({formatMoney(estimatedAmount, currency)})
                                </Typography>
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                bgcolor: alpha(theme.palette.primary.main, 0.04),
                            }}
                        >
                            <Typography variant="subtitle2" gutterBottom>
                                This will create
                            </Typography>
                            <Stack spacing={1}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <AssignmentTurnedInIcon fontSize="small" color="primary" />
                                    <Typography variant="body2">
                                        Reset package to {parsedValues.pkgSize} lessons at {formatMoney(parsedValues.price, currency)}.
                                    </Typography>
                                </Box>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <AssignmentTurnedInIcon fontSize="small" color="primary" />
                                    <Typography variant="body2">
                                        Seed completed lessons (+{parsedValues.completed}).
                                    </Typography>
                                </Box>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <AssignmentTurnedInIcon fontSize="small" color="primary" />
                                    <Typography variant="body2">
                                        Mark {parsedValues.paid} lesson{parsedValues.paid === 1 ? '' : 's'} as paid.
                                    </Typography>
                                </Box>
                                {recordPayment && (
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <PaymentIcon fontSize="small" color="primary" />
                                        <Typography variant="body2">
                                            Seed payment ({parsedValues.paid} lessons, {formatMoney(parsedValues.paymentAmt, currency)}).
                                        </Typography>
                                    </Box>
                                )}
                            </Stack>
                        </Box>

                        {paidLessonsWarning && (
                            <Alert severity="warning" icon={<WarningAmberIcon fontSize="inherit" />}>
                                Paid lessons exceed the package size multiple. Double-check before confirming.
                            </Alert>
                        )}

                        {error && (
                            <Alert severity="error">{error}</Alert>
                        )}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={submitting}>
                    Cancel
                </Button>
                {activeStep === 0 ? (
                    <Button onClick={handleNext} variant="contained" disabled={submitting}>
                        Next: Preview
                    </Button>
                ) : (
                    <>
                        <Button onClick={() => setActiveStep(0)} disabled={submitting}>
                            Back
                        </Button>
                        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
                            {submitting ? 'Saving...' : 'Confirm'}
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default SetCurrentStateWizard;
