import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Divider,
    IconButton,
    Popover,
    Radio,
    RadioGroup,
    Tooltip,
    Typography,
    FormControlLabel,
} from '@mui/material';
import SignalCellularAltRoundedIcon from '@mui/icons-material/SignalCellularAltRounded';
import { useRtc } from '../../context/RtcContext';

type QualityOptionId = 'high' | 'balanced' | 'low';

type QualityOption = {
    id: QualityOptionId;
    label: string;
    description: string;
    sendMaxQuality: 'low' | 'medium' | 'high';
    receiveQuality: 'high' | 'medium' | 'low';
};

const QUALITY_OPTIONS: QualityOption[] = [
    {
        id: 'high',
        label: 'High quality',
        description: 'Best video, uses more bandwidth',
        sendMaxQuality: 'high',
        receiveQuality: 'high',
    },
    {
        id: 'balanced',
        label: 'Balanced',
        description: 'Recommended default for most networks',
        sendMaxQuality: 'medium',
        receiveQuality: 'medium',
    },
    {
        id: 'low',
        label: 'Low bandwidth',
        description: 'Lower resolution to improve stability',
        sendMaxQuality: 'low',
        receiveQuality: 'low',
    },
];

const STORAGE_KEY = 'video-quality-preset';

export default function VideoQualityControl() {
    const { dailyCall } = useRtc();
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const [selectedId, setSelectedId] = useState<QualityOptionId>('balanced');
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [receiveSupported, setReceiveSupported] = useState(true);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY) as QualityOptionId | null;
            if (stored && QUALITY_OPTIONS.some((o) => o.id === stored)) {
                setSelectedId(stored);
            }
        } catch {
            // ignore storage errors
        }
    }, []);

    const selectedOption = useMemo(
        () => QUALITY_OPTIONS.find((o) => o.id === selectedId) ?? QUALITY_OPTIONS[1],
        [selectedId],
    );

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, selectedId);
        } catch {
            // ignore storage errors
        }
    }, [selectedId]);

    const applyQuality = useCallback(async (option: QualityOption) => {
        if (!dailyCall) return;
        setApplying(true);
        setError(null);
        try {
            await dailyCall.updateSendSettings?.({
                video: { maxQuality: option.sendMaxQuality },
            } as any);
            if (receiveSupported && typeof dailyCall.updateReceiveSettings === 'function') {
                try {
                    await dailyCall.updateReceiveSettings({
                        '*': { video: option.receiveQuality },
                    } as any);
                } catch (err) {
                    setReceiveSupported(false);
                    throw err;
                }
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to change quality');
            // swallow error to keep UI usable
        } finally {
            setApplying(false);
        }
    }, [dailyCall, receiveSupported]);

    useEffect(() => {
        if (!dailyCall) return;
        void applyQuality(selectedOption);
    }, [dailyCall, selectedOption, applyQuality]);

    const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);
    const open = Boolean(anchorEl);

    const handleChange = (value: QualityOptionId) => {
        setSelectedId(value);
        const next = QUALITY_OPTIONS.find((o) => o.id === value);
        if (next && dailyCall) {
            void applyQuality(next);
        }
    };

    return (
        <Box
            sx={{
                position: 'absolute',
                left: 16,
                bottom: 64,
                zIndex: 1200,
            }}
        >
            <Tooltip title="Video quality">
                <span>
                    <IconButton
                        color="primary"
                        onClick={handleOpen}
                        disabled={!dailyCall}
                        sx={{
                            bgcolor: 'background.paper',
                            boxShadow: (theme) => theme.shadows[4],
                            border: (theme) => `1px solid ${theme.palette.divider}`,
                            '&:hover': { bgcolor: 'background.paper' },
                        }}
                        aria-label="Video quality"
                    >
                        <SignalCellularAltRoundedIcon />
                    </IconButton>
                </span>
            </Tooltip>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                disableRestoreFocus
            >
                <Box sx={{ p: 2, maxWidth: 260 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Video quality
                    </Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <RadioGroup
                        value={selectedId}
                        onChange={(e) => handleChange(e.target.value as QualityOptionId)}
                    >
                        {QUALITY_OPTIONS.map((option) => (
                            <Box key={option.id} sx={{ mb: 1 }}>
                                <FormControlLabel
                                    value={option.id}
                                    control={<Radio size="small" />}
                                    label={
                                        <Box>
                                            <Typography variant="body2" fontWeight={600}>
                                                {option.label}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {option.description}
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </Box>
                        ))}
                    </RadioGroup>
                    {applying && (
                        <Typography variant="caption" color="text.secondary">
                            Applying…
                        </Typography>
                    )}
                    {error && (
                        <Typography variant="caption" color="error">
                            {error}
                        </Typography>
                    )}
                </Box>
            </Popover>
        </Box>
    );
}

