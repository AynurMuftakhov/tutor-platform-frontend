import React, { useEffect, useState, useMemo } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { CURRENCIES, BillingStudent } from '../../types/billing';
import { updateBillingAccount } from '../../services/billing.api';

interface PlanSettingsModalProps {
    open: boolean;
    onClose: () => void;
    student: BillingStudent | null;
    defaultCurrency: string;
    onSaved: () => void;
}

const PlanSettingsModal: React.FC<PlanSettingsModalProps> = ({
    open,
    onClose,
    student,
    defaultCurrency,
    onSaved,
}) => {
    const [currency, setCurrency] = useState(defaultCurrency);
    const [rate, setRate] = useState('');
    const [packageSize, setPackageSize] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (student && open) {
            setCurrency(student.currency || defaultCurrency);
            setRate(student.ratePerLesson ? String(student.ratePerLesson) : '');
            setPackageSize(student.packageSize ? String(student.packageSize) : '');
        }
    }, [student, open, defaultCurrency]);

    // Validation
    const validation = useMemo(() => {
        const rateNum = rate ? Number(rate) : null;
        const packageNum = packageSize ? Number(packageSize) : null;
        
        const rateError = rateNum !== null && rateNum < 0 
            ? 'Rate cannot be negative' 
            : null;
        const packageError = packageNum !== null && packageNum < 1 
            ? 'Package size must be at least 1' 
            : null;
        
        const hasErrors = Boolean(rateError || packageError);
        
        return { rateError, packageError, hasErrors };
    }, [rate, packageSize]);

    const handleSave = async () => {
        if (!student || validation.hasErrors) return;
        setSaving(true);
        try {
            await updateBillingAccount(student.studentId, {
                defaultCurrency: currency,
                ratePerLesson: rate ? Number(rate) : undefined,
                packageSize: packageSize ? Number(packageSize) : undefined,
                notes: notes || undefined,
            });
            onSaved();
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Billing plan for {student?.studentName}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Set the student&apos;s lesson rate and package size. This is used to calculate outstanding lessons and quick-pay amounts.
                    </Typography>
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
                        label="Rate per lesson"
                        type="number"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        size="small"
                        inputProps={{ min: 0, step: 0.01 }}
                        error={Boolean(validation.rateError)}
                        helperText={validation.rateError}
                    />
                    <TextField
                        label="Package size (lessons)"
                        type="number"
                        value={packageSize}
                        onChange={(e) => setPackageSize(e.target.value)}
                        size="small"
                        inputProps={{ min: 1, step: 1 }}
                        error={Boolean(validation.packageError)}
                        helperText={validation.packageError}
                    />
                    <TextField
                        label="Notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        size="small"
                        multiline
                        rows={2}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained" 
                    disabled={saving || !student || validation.hasErrors}
                >
                    {saving ? 'Saving...' : 'Save plan'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PlanSettingsModal;
