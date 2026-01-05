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
    const [packageSize, setPackageSize] = useState('');
    const [packagePrice, setPackagePrice] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (student && open) {
            setCurrency(student.currency || defaultCurrency);
            setPackageSize(student.packageSize ? String(student.packageSize) : '');
            setPackagePrice(student.pricePerPackage ? String(student.pricePerPackage) : '');
        }
    }, [student, open, defaultCurrency]);

    // Validation
    const validation = useMemo(() => {
        const priceNum = packagePrice ? Number(packagePrice) : null;
        const packageNum = packageSize ? Number(packageSize) : null;
        
        const priceError = priceNum !== null && priceNum < 0 
            ? 'Price cannot be negative' 
            : null;
        const packageError = packageNum !== null && packageNum < 1 
            ? 'Package size must be at least 1' 
            : null;
        
        const hasErrors = Boolean(priceError || packageError);
        
        return { priceError, packageError, hasErrors };
    }, [packagePrice, packageSize]);

    const handleSave = async () => {
        if (!student || validation.hasErrors) return;
        const pkgSizeNum = packageSize ? Number(packageSize) : 0;
        const pkgPriceNum = packagePrice ? Number(packagePrice) : 0;
        const perLessonRate = pkgSizeNum > 0 && pkgPriceNum > 0 ? pkgPriceNum / pkgSizeNum : undefined;
        setSaving(true);
        try {
            await updateBillingAccount(student.studentId, {
                defaultCurrency: currency,
                pricePerPackage: pkgPriceNum || undefined,
                ratePerLesson: perLessonRate,
                packageSize: pkgSizeNum || undefined,
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
                        Set the student&apos;s package rate and size. This is used to calculate outstanding lessons and quick-pay amounts.
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
                        label="Package price (total)"
                        type="number"
                        value={packagePrice}
                        onChange={(e) => setPackagePrice(e.target.value)}
                        size="small"
                        inputProps={{ min: 0, step: 0.01 }}
                        error={Boolean(validation.priceError)}
                        helperText={validation.priceError || 'Will be divided by package size to get per-lesson rate'}
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
