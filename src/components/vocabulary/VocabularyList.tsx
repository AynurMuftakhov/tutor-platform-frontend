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
import { VocabularyWord } from '../../types';
import WordCard from './WordCard';
import { motion } from 'framer-motion';

interface VocabularyListProps {
    data: VocabularyWord[];
    onDelete?: (id: string) => void;
    onEdit?: (word: VocabularyWord) => void;
    onToggleLearned?: (id: string) => void;
    onAddToMyVocabulary?: (id: string) => void;
    learnedWords?: Set<string>;
    readOnly?: boolean;
    selectionMode?: boolean;
    selectedWords?: string[];
    onToggleSelection?: (id: string) => void;
    // new: sync hooks
    onWordOpen?: (wordId: string) => void;
    openWordId?: string | null;
    onWordDialogClose?: () => void;
    onWordPronounce?: (id: string, audioUrl: string) => void;
}

const VocabularyList: React.FC<VocabularyListProps> = ({
    data,
    onDelete,
    onEdit,
    onToggleLearned,
    onAddToMyVocabulary,
    learnedWords = new Set(),
    readOnly = false,
    selectionMode = false,
    selectedWords = [],
    onToggleSelection,
    onWordOpen,
    openWordId,
    onWordDialogClose,
    onWordPronounce,
}) => {
    const theme = useTheme();
    const [selectedWord, setSelectedWord] = useState<VocabularyWord | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

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

                        return (
                            <React.Fragment key={word.id}>
                                {index > 0 && <Divider component="li" />}
                                <ListItem
                                    component={motion.li}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    sx={{
                                        py: 2,
                                        px: 3,
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
                                            ? `4px solid ${theme.palette.success.main}`
                                            : isSelected
                                                ? `4px solid ${theme.palette.primary.main}`
                                                : '4px solid transparent',
                                    }}
                                    onClick={() => handleWordClick(word)}
                                    secondaryAction={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {word.audioUrl && (
                                                <Tooltip title="Play pronunciation">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => handlePlayAudio(e, word)}
                                                        sx={{
                                                            color: theme.palette.primary.main,
                                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                            '&:hover': {
                                                                bgcolor: alpha(theme.palette.primary.main, 0.2)
                                                            }
                                                        }}
                                                    >
                                                        <VolumeUpIcon fontSize="small" />
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
                                                            '&:hover': {
                                                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                                                                transform: 'translateY(-2px)'
                                                            },
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <AddIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}

                                            {isLearned && !selectionMode && (
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
                                            )}

                                            {selectionMode && isSelected && (
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
                                            )}
                                        </Box>
                                    }
                                >
                                    <ListItemText
                                        disableTypography
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography 
                                                    variant="h6" 
                                                    sx={{ 
                                                        fontWeight: 600,
                                                        color: theme.palette.primary.main
                                                    }}
                                                >
                                                    {word.text}
                                                </Typography>
                                                {word.partOfSpeech && (
                                                    <Chip
                                                        label={word.partOfSpeech}
                                                        size="small"
                                                        sx={{
                                                            textTransform: 'capitalize',
                                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                            color: theme.palette.primary.main,
                                                            fontWeight: 600,
                                                            fontSize: '0.7rem',
                                                            height: 20,
                                                            borderRadius: 1
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        }
                                        secondary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 1 }}>
                                                <TranslateIcon 
                                                    fontSize="small" 
                                                    sx={{ color: theme.palette.secondary.main, opacity: 0.8 }} 
                                                />
                                                <Typography 
                                                    variant="body2" 
                                                    sx={{ 
                                                        color: 'text.secondary',
                                                        fontWeight: 500
                                                    }}
                                                >
                                                    {word.translation}
                                                </Typography>
                                            </Box>
                                        }
                                    />
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
