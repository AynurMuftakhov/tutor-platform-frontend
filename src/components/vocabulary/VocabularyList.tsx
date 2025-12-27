import React, { useState } from 'react';
import {
    Box,
    List,
    ListItem,
    ListItemText,
    Typography,
    IconButton,
    Tooltip,
    Chip,
    Dialog,
    useTheme,
    alpha,
    Paper,
    Divider
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TranslateIcon from '@mui/icons-material/Translate';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SpeedIcon from '@mui/icons-material/Speed';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { VocabularyWord } from '../../types';
import WordCard, { CardDensity } from './WordCard';
import { motion, AnimatePresence } from 'framer-motion';

// Helper function to get color based on difficulty level (same as WordCard)
const getDifficultyColor = (difficulty: number) => {
    switch(difficulty) {
        case 1: return '#22c55e'; // easy - green
        case 2: return '#84cc16'; // fairly easy - lime
        case 3: return '#f59e0b'; // medium - amber
        case 4: return '#f97316'; // challenging - orange
        case 5: return '#ef4444'; // difficult - red
        default: return '#6b7280'; // default - gray
    }
};

// CSS variable-based spacing constants for list view
const LIST_SPACING = {
    comfortable: {
        paddingY: 2,
        paddingX: 3,
        fontSize: {
            word: 'h6',
            translation: 'body2',
        },
        iconSize: 'small' as const,
        chipHeight: 24,
    },
    compact: {
        paddingY: 1,
        paddingX: 2,
        fontSize: {
            word: 'body1',
            translation: 'caption',
        },
        iconSize: 'small' as const,
        chipHeight: 18,
    },
} as const;

interface VocabularyListProps {
    data: VocabularyWord[];
    onDelete?: (id: string) => void;
    onEdit?: (word: VocabularyWord) => void;
    onToggleLearned?: (id: string) => void;
    onAddToMyVocabulary?: (id: string) => void;
    learnedWords?: Set<string>;
    wordStreaks?: Record<string, number>;
    masteryStreak?: number;
    readOnly?: boolean;
    selectionMode?: boolean;
    homeworkMode?: boolean;
    selectedWords?: string[];
    onToggleSelection?: (id: string) => void;
    // new: sync hooks
    onWordOpen?: (wordId: string) => void;
    openWordId?: string | null;
    onWordDialogClose?: () => void;
    onWordPronounce?: (id: string, audioUrl: string) => void;
    /** Controls the visual density of list rows. 'compact' uses smaller spacing and typography */
    density?: CardDensity;
}

const VocabularyList: React.FC<VocabularyListProps> = ({
    data,
    onDelete,
    onEdit,
    onToggleLearned,
    onAddToMyVocabulary,
    learnedWords = new Set(),
    wordStreaks,
    masteryStreak,
    readOnly = false,
    selectionMode = false,
    homeworkMode = false,
    selectedWords = [],
    onToggleSelection,
    onWordOpen,
    openWordId,
    onWordDialogClose,
    onWordPronounce,
    density = 'compact',
}) => {
    const theme = useTheme();
    const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    
    // Get spacing values based on density
    const isCompact = density === 'compact';
    const spacing = LIST_SPACING[density];
    
    // Toggle row expansion for progressive disclosure
    const toggleRowExpansion = (wordId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(wordId)) {
                newSet.delete(wordId);
            } else {
                newSet.add(wordId);
            }
            return newSet;
        });
    };

    // open programmatically when openWordId changes
    React.useEffect(() => {
        if (typeof openWordId === 'undefined') return; // prop not provided
        if (openWordId === null) {
            if (dialogOpen) {
                setDialogOpen(false);
                setSelectedWord(null);
            }
            return;
        }
        const w = data.find(d => d.id === openWordId);
        if (w) {
            setSelectedWord(w);
            setDialogOpen(true);
        }
    }, [openWordId, data, dialogOpen]);

    // Empty state when no words are available
    if (data.length === 0) {
        return (
            <Box 
                sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    py: 8,
                    textAlign: 'center'
                }}
            >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    No vocabulary words found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                    Add new words to your vocabulary list to start learning and practicing.
                </Typography>
            </Box>
        );
    }

    const handlePlayAudio = (e: React.MouseEvent, w: VocabularyWord) => {
        e.stopPropagation();
        if (w.audioUrl) {
            try {
                new Audio(w.audioUrl).play().catch(() => {/*no op*/});
            } catch {/*no op*/}
            onWordPronounce?.(w.id, w.audioUrl);
        }
    };

    const handleWordClick = (word: VocabularyWord) => {
        if (selectionMode && onToggleSelection) {
            onToggleSelection(word.id);
        } else {
            setSelectedWord(word);
            setDialogOpen(true);
            onWordOpen?.(word.id);
        }
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedWord(null);
        onWordDialogClose?.();
    };

    const handleAddToMyVocabulary = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (onAddToMyVocabulary) {
            onAddToMyVocabulary(id);
        }
    };

    return (
        <>
            <Paper 
                elevation={0} 
                sx={{ 
                    borderRadius: 2, 
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
            >
                <List disablePadding>
                    {data.map((word, index) => {
                        const isLearned = learnedWords.has(word.id);
                        const isSelected = selectedWords.includes(word.id);
                        const needed = Math.max(1, masteryStreak || 0);
                        const streakVal = Math.max(0, wordStreaks?.[word.id] || 0);
                        const showProgress = !isLearned && needed > 0 && homeworkMode;
                        const isExpanded = expandedRows.has(word.id);

                        return (
                            <React.Fragment key={word.id}>
                                {index > 0 && <Divider component="li" />}
                                <ListItem
                                    component={motion.li}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
                                    sx={{
                                        py: spacing.paddingY,
                                        px: spacing.paddingX,
                                        cursor: 'pointer',
                                        bgcolor: isLearned
                                            ? alpha(theme.palette.success.main, 0.03)
                                            : isSelected
                                                ? alpha(theme.palette.primary.main, 0.03)
                                                : 'transparent',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.05)
                                        },
                                        borderLeft: isLearned
                                            ? `${isCompact ? 3 : 4}px solid ${theme.palette.success.main}`
                                            : isSelected
                                                ? `${isCompact ? 3 : 4}px solid ${theme.palette.primary.main}`
                                                : `${isCompact ? 3 : 4}px solid transparent`,
                                        flexDirection: 'column',
                                        alignItems: 'stretch',
                                    }}
                                    onClick={() => handleWordClick(word)}
                                >
                                    {/* Main row content */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <ListItemText
                                            disableTypography
                                            sx={{ flex: 1, minWidth: 0, my: 0 }}
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: isCompact ? 0.5 : 1, flexWrap: 'wrap' }}>
                                                    <Typography 
                                                        variant={isCompact ? 'body1' : 'h6'} 
                                                        sx={{ 
                                                            fontWeight: 600,
                                                            color: theme.palette.primary.main,
                                                            fontSize: isCompact ? '0.95rem' : undefined
                                                        }}
                                                    >
                                                        {word.text}
                                                    </Typography>
                                                    {word.partOfSpeech && (
                                                        <Chip
                                                            label={isCompact ? word.partOfSpeech.slice(0, 4) : word.partOfSpeech}
                                                            size="small"
                                                            sx={{
                                                                textTransform: 'capitalize',
                                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                                color: theme.palette.primary.main,
                                                                fontWeight: 600,
                                                                fontSize: isCompact ? '0.6rem' : '0.7rem',
                                                                height: isCompact ? 16 : 20,
                                                                borderRadius: 1,
                                                                '& .MuiChip-label': {
                                                                    px: isCompact ? 0.75 : 1
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                    {/* Compact mode: show difficulty/popularity badges inline */}
                                                    {isCompact && word.difficulty && (
                                                        <Tooltip title={`Difficulty: ${word.difficulty}/5`}>
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 0.25,
                                                                    px: 0.5,
                                                                    py: 0.125,
                                                                    borderRadius: 0.75,
                                                                    bgcolor: alpha(getDifficultyColor(word.difficulty), 0.12),
                                                                }}
                                                            >
                                                                <SpeedIcon sx={{ fontSize: 10, color: getDifficultyColor(word.difficulty) }} />
                                                                <Typography 
                                                                    variant="caption" 
                                                                    sx={{ 
                                                                        fontWeight: 600, 
                                                                        color: getDifficultyColor(word.difficulty),
                                                                        fontSize: '0.6rem',
                                                                        lineHeight: 1
                                                                    }}
                                                                >
                                                                    {word.difficulty}
                                                                </Typography>
                                                            </Box>
                                                        </Tooltip>
                                                    )}
                                                    {isCompact && word.popularity && (
                                                        <Tooltip title={`Popularity: ${word.popularity}/5`}>
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 0.25,
                                                                    px: 0.5,
                                                                    py: 0.125,
                                                                    borderRadius: 0.75,
                                                                    bgcolor: alpha(theme.palette.secondary.main, 0.12),
                                                                }}
                                                            >
                                                                <TrendingUpIcon sx={{ fontSize: 10, color: theme.palette.secondary.main }} />
                                                                <Typography 
                                                                    variant="caption" 
                                                                    sx={{ 
                                                                        fontWeight: 600, 
                                                                        color: theme.palette.secondary.main,
                                                                        fontSize: '0.6rem',
                                                                        lineHeight: 1
                                                                    }}
                                                                >
                                                                    {word.popularity}
                                                                </Typography>
                                                            </Box>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', mt: isCompact ? 0.25 : 0.5, gap: isCompact ? 0.5 : 1 }}>
                                                    <TranslateIcon 
                                                        sx={{ 
                                                            color: theme.palette.secondary.main, 
                                                            opacity: 0.8,
                                                            fontSize: isCompact ? 14 : 20
                                                        }} 
                                                    />
                                                    <Typography 
                                                        variant={isCompact ? 'caption' : 'body2'} 
                                                        sx={{ 
                                                            color: 'text.secondary',
                                                            fontWeight: 500,
                                                            fontSize: isCompact ? '0.8rem' : undefined
                                                        }}
                                                    >
                                                        {word.translation}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                        
                                        {/* Actions area */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: isCompact ? 0.5 : 1, ml: 1, flexShrink: 0 }}>
                                            {word.audioUrl && (
                                                <Tooltip title="Play pronunciation">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => handlePlayAudio(e, word)}
                                                        sx={{
                                                            color: theme.palette.primary.main,
                                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                            width: isCompact ? 24 : 32,
                                                            height: isCompact ? 24 : 32,
                                                            '&:hover': {
                                                                bgcolor: alpha(theme.palette.primary.main, 0.2)
                                                            }
                                                        }}
                                                    >
                                                        <VolumeUpIcon sx={{ fontSize: isCompact ? 14 : 18 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}

                                            {onAddToMyVocabulary && readOnly && (
                                                <Tooltip title="Add to My Vocabulary">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => handleAddToMyVocabulary(e, word.id)}
                                                        sx={{
                                                            color: theme.palette.primary.main,
                                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                            width: isCompact ? 24 : 32,
                                                            height: isCompact ? 24 : 32,
                                                            '&:hover': {
                                                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                                                                transform: 'translateY(-2px)'
                                                            },
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <AddIcon sx={{ fontSize: isCompact ? 14 : 18 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}

                                            {isLearned && !selectionMode && (
                                                isCompact ? (
                                                    <Tooltip title="Learned">
                                                        <CheckCircleIcon 
                                                            sx={{ 
                                                                color: theme.palette.success.main,
                                                                fontSize: 18
                                                            }} 
                                                        />
                                                    </Tooltip>
                                                ) : (
                                                    <Chip
                                                        icon={<CheckCircleIcon />}
                                                        label="Learned"
                                                        size="small"
                                                        color="success"
                                                        sx={{ 
                                                            borderRadius: 1.5,
                                                            bgcolor: alpha(theme.palette.success.main, 0.1),
                                                            color: theme.palette.success.main,
                                                            '& .MuiChip-icon': {
                                                                color: theme.palette.success.main
                                                            }
                                                        }}
                                                    />
                                                )
                                            )}

                                            {showProgress && (
                                                <Chip
                                                    label={`${Math.min(streakVal, needed)}/${needed}`}
                                                    size="small"
                                                    color="warning"
                                                    sx={{
                                                        borderRadius: 1.5,
                                                        bgcolor: alpha(theme.palette.warning.main, 0.1),
                                                        color: theme.palette.warning.main,
                                                        height: isCompact ? 20 : 24,
                                                        fontSize: isCompact ? '0.7rem' : undefined
                                                    }}
                                                />
                                            )}

                                            {selectionMode && isSelected && (
                                                isCompact ? (
                                                    <Tooltip title="Selected">
                                                        <CheckCircleIcon 
                                                            sx={{ 
                                                                color: theme.palette.primary.main,
                                                                fontSize: 18
                                                            }} 
                                                        />
                                                    </Tooltip>
                                                ) : (
                                                    <Chip
                                                        icon={<CheckCircleIcon />}
                                                        label="Selected"
                                                        size="small"
                                                        color="primary"
                                                        sx={{ 
                                                            borderRadius: 1.5,
                                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                            color: theme.palette.primary.main,
                                                            '& .MuiChip-icon': {
                                                                color: theme.palette.primary.main
                                                            }
                                                        }}
                                                    />
                                                )
                                            )}

                                            {/* Expand/Collapse chevron for progressive disclosure */}
                                            <Tooltip title={isExpanded ? "Show less" : "Show more"}>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => toggleRowExpansion(word.id, e)}
                                                    sx={{
                                                        color: theme.palette.primary.main,
                                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                        width: isCompact ? 24 : 28,
                                                        height: isCompact ? 24 : 28,
                                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            bgcolor: alpha(theme.palette.primary.main, 0.2)
                                                        }
                                                    }}
                                                >
                                                    <ExpandMoreIcon sx={{ fontSize: isCompact ? 14 : 18 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>

                                    {/* Expandable details section (progressive disclosure) */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <Box 
                                                    sx={{ 
                                                        mt: isCompact ? 1 : 1.5, 
                                                        pt: isCompact ? 1 : 1.5, 
                                                        borderTop: `1px solid ${theme.palette.divider}` 
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {/* Phonetic & pronunciation */}
                                                    {word.phonetic && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                            <Typography 
                                                                variant="caption" 
                                                                sx={{ 
                                                                    color: 'text.secondary', 
                                                                    fontWeight: 600,
                                                                    minWidth: 80
                                                                }}
                                                            >
                                                                Phonetic:
                                                            </Typography>
                                                            <Typography 
                                                                variant="body2" 
                                                                sx={{ 
                                                                    fontFamily: 'monospace', 
                                                                    color: 'text.primary',
                                                                    fontSize: isCompact ? '0.8rem' : undefined
                                                                }}
                                                            >
                                                                {word.phonetic}
                                                            </Typography>
                                                        </Box>
                                                    )}

                                                    {/* Definition */}
                                                    {word.definitionEn && (
                                                        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                                            <Typography 
                                                                variant="caption" 
                                                                sx={{ 
                                                                    color: 'text.secondary', 
                                                                    fontWeight: 600,
                                                                    minWidth: 80,
                                                                    flexShrink: 0
                                                                }}
                                                            >
                                                                Definition:
                                                            </Typography>
                                                            <Typography 
                                                                variant="body2" 
                                                                sx={{ 
                                                                    color: 'text.primary',
                                                                    fontSize: isCompact ? '0.8rem' : undefined,
                                                                    lineHeight: 1.4
                                                                }}
                                                            >
                                                                {word.definitionEn}
                                                            </Typography>
                                                        </Box>
                                                    )}

                                                    {/* Synonyms */}
                                                    {word.synonymsEn && word.synonymsEn.length > 0 && (
                                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                            <Typography 
                                                                variant="caption" 
                                                                sx={{ 
                                                                    color: 'text.secondary', 
                                                                    fontWeight: 600,
                                                                    minWidth: 80,
                                                                    flexShrink: 0,
                                                                    pt: 0.25
                                                                }}
                                                            >
                                                                Synonyms:
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                {word.synonymsEn.map((syn, idx) => (
                                                                    <Chip
                                                                        key={idx}
                                                                        label={syn}
                                                                        size="small"
                                                                        sx={{
                                                                            bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                                                            color: theme.palette.secondary.main,
                                                                            fontWeight: 500,
                                                                            fontSize: isCompact ? '0.65rem' : '0.7rem',
                                                                            height: isCompact ? 20 : 24,
                                                                            borderRadius: 1
                                                                        }}
                                                                    />
                                                                ))}
                                                            </Box>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </ListItem>
                            </React.Fragment>
                        );
                    })}
                </List>
            </Paper>

            {/* Word Card Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        overflow: 'hidden'
                    }
                }}
            >
                {selectedWord && (
                    <WordCard
                        word={selectedWord}
                        onDelete={!readOnly ? onDelete : undefined}
                        onEdit={!readOnly ? onEdit : undefined}
                        onToggleLearned={onToggleLearned}
                        onAddToMyVocabulary={onAddToMyVocabulary}
                        isLearned={learnedWords.has(selectedWord.id)}
                        readOnly={readOnly}
                        initialExpanded={true}
                        onPronounce={onWordPronounce}
                    />
                )}
            </Dialog>
        </>
    );
};

export default VocabularyList;
