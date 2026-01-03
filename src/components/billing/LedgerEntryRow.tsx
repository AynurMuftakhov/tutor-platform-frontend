import React from 'react';
import {
    Box,
    Chip,
    IconButton,
    Tooltip,
    Typography,
    useTheme,
    alpha,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PaymentIcon from '@mui/icons-material/Payment';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { UnifiedLedgerEntry } from '../../types/billing';

interface LedgerEntryRowProps {
    entry: UnifiedLedgerEntry;
    currency: string;
    onEdit?: (entry: UnifiedLedgerEntry) => void;
    onDelete?: (entry: UnifiedLedgerEntry) => void;
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

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function formatLessonQuantity(quantity: number): string {
    if (quantity === 0) return 'Cancelled';
    if (quantity === 0.5) return '0.5 lesson';
    if (quantity === 1) return '1 lesson';
    return `${quantity} lessons`;
}

const LedgerEntryRow: React.FC<LedgerEntryRowProps> = ({
    entry,
    currency,
    onEdit,
    onDelete,
    onViewLesson,
}) => {
    const theme = useTheme();
    
    const isLesson = entry.kind === 'LESSON';
    const isPayment = entry.kind === 'PAYMENT';
    const isCancelled = entry.quantity === 0;
    
    const iconBgColor = isLesson
        ? alpha(theme.palette.info.main, 0.1)
        : alpha(theme.palette.success.main, 0.1);
    
    const iconColor = isLesson
        ? theme.palette.info.main
        : theme.palette.success.main;
    
    const rowBgColor = isLesson
        ? alpha(theme.palette.info.main, 0.02)
        : alpha(theme.palette.success.main, 0.02);

    const hasDebt = entry.balanceAfterLessons > 0;
    const hasCredit = entry.balanceAfterLessons < 0;

    return (
        <Box
            sx={{
                p: 1.5,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: isCancelled ? alpha(theme.palette.grey[500], 0.05) : rowBgColor,
                opacity: isCancelled ? 0.7 : 1,
                mb: 1,
            }}
        >
            <Box display="flex" alignItems="flex-start" gap={1.5}>
                {/* Icon */}
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: iconBgColor,
                        flexShrink: 0,
                    }}
                >
                    {isLesson ? (
                        <MenuBookIcon sx={{ fontSize: 18, color: iconColor }} />
                    ) : (
                        <PaymentIcon sx={{ fontSize: 18, color: iconColor }} />
                    )}
                </Box>

                {/* Content */}
                <Box flex={1} minWidth={0}>
                    {/* Header row: Type + Date */}
                    <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
                        <Chip
                            label={isLesson ? 'Lesson' : 'Payment'}
                            size="small"
                            sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                bgcolor: iconBgColor,
                                color: iconColor,
                            }}
                        />
                        {isLesson && entry.lessonStatus && (
                            <Chip
                                label={entry.lessonStatus}
                                size="small"
                                variant="outlined"
                                sx={{ 
                                    height: 20, 
                                    fontSize: '0.65rem',
                                    borderColor: isCancelled 
                                        ? theme.palette.grey[400]
                                        : theme.palette.divider,
                                }}
                            />
                        )}
                        <Typography variant="caption" color="text.secondary">
                            {formatDate(entry.entryDate)}
                        </Typography>
                    </Box>

                    {/* Description */}
                    <Typography 
                        variant="body2" 
                        fontWeight={500}
                        sx={{ 
                            mb: 0.5,
                            textDecoration: isCancelled ? 'line-through' : 'none',
                        }}
                    >
                        {isLesson 
                            ? (entry.comment || 'Lesson')
                            : (entry.comment || 'Payment received')
                        }
                    </Typography>

                    {/* Quantity and Amount */}
                    {!isLesson && (<Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                        <Typography 
                            variant="body2" 
                            color={isLesson ? 'info.main' : 'success.main'}
                            fontWeight={600}
                        >
                            {isLesson 
                                ? formatLessonQuantity(entry.quantity)
                                : `+${formatMoney(entry.amount, currency)}`
                            }
                        </Typography>
                        
                        {isLesson && entry.amount > 0 && (
                            <Typography variant="body2" color="text.secondary">
                                ({formatMoney(entry.amount, currency)})
                            </Typography>
                        )}
                    </Box>)}

                    {/* Balance after pill */}
                    <Box mt={1}>
                        <Chip
                            label={`Balance: ${Math.abs(entry.balanceAfterLessons)} lesson${Math.abs(entry.balanceAfterLessons) !== 1 ? 's' : ''} = ${formatMoney(Math.abs(entry.balanceAfterAmount), currency)} ${hasDebt ? '(debt)' : hasCredit ? '(credit)' : ''}`}
                            size="small"
                            sx={{
                                height: 22,
                                fontSize: '0.7rem',
                                fontWeight: 500,
                                bgcolor: hasDebt 
                                    ? alpha(theme.palette.error.main, 0.1)
                                    : hasCredit
                                    ? alpha(theme.palette.success.main, 0.1)
                                    : alpha(theme.palette.grey[500], 0.1),
                                color: hasDebt 
                                    ? theme.palette.error.main
                                    : hasCredit
                                    ? theme.palette.success.main
                                    : theme.palette.text.secondary,
                            }}
                        />
                    </Box>
                </Box>

                {/* Actions */}
                <Box display="flex" gap={0.5} flexShrink={0}>
                    {isLesson && entry.lessonId && onViewLesson && (
                        <Tooltip title="View lesson">
                            <IconButton
                                size="small"
                                onClick={() => onViewLesson(entry.lessonId!)}
                                sx={{ 
                                    color: 'text.secondary',
                                    opacity: 0.7,
                                    '&:hover': { opacity: 1 },
                                }}
                            >
                                <OpenInNewIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {isPayment && onEdit && (
                        <Tooltip title="Edit payment">
                            <IconButton
                                size="small"
                                onClick={() => onEdit(entry)}
                                sx={{ 
                                    color: 'text.secondary',
                                    opacity: 0.7,
                                    '&:hover': { opacity: 1 },
                                }}
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {isPayment && onDelete && (
                        <Tooltip title="Delete payment">
                            <IconButton
                                size="small"
                                onClick={() => onDelete(entry)}
                                sx={{ 
                                    color: 'error.main',
                                    opacity: 0.7,
                                    '&:hover': { opacity: 1 },
                                }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default LedgerEntryRow;

