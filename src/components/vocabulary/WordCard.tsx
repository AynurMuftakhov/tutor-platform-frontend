import React, { useState } from 'react';
import {
    Card,
    CardContent,
    CardActions,
    Typography,
    IconButton,
    IconButtonProps,
    Box,
    Chip,
    Tooltip,
    Button,
    styled,
    useTheme,
    alpha,
    Divider,
    Badge,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogContentText
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import TranslateIcon from '@mui/icons-material/Translate';
import SpeedIcon from '@mui/icons-material/Speed';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { VocabularyWord } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import {useAuth} from "../../context/AuthContext";

// Density type for card view modes
export type CardDensity = 'comfortable' | 'compact';

// CSS variable-based spacing constants for easy customization
const CARD_SPACING = {
    comfortable: {
        padding: 3,
        paddingReadOnly: 2,
        gap: 2,
        iconSize: 32,
        fontSize: {
            word: 'h5',
            translation: 'body1',
            phonetic: 'body2',
        },
        chipHeight: 24,
        metricsChipHeight: 26,
        borderRadius: 3,
    },
    compact: {
        padding: 1.5,
        paddingReadOnly: 1,
        gap: 1,
        iconSize: 24,
        fontSize: {
            word: 'subtitle1',
            translation: 'body2',
            phonetic: 'caption',
        },
        chipHeight: 20,
        metricsChipHeight: 20,
        borderRadius: 2,
    },
} as const;

interface ExpandMoreProps extends IconButtonProps {
  expand: boolean;
  compact?: boolean;
}

const ExpandMore = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'expand' && prop !== 'compact',
})<ExpandMoreProps>(({ theme, expand, compact }) => ({
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
  width: compact ? 24 : 32,
  height: compact ? 24 : 32,
  borderRadius: '50%',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
}));

interface WordCardProps {
    word: VocabularyWord;
    onDelete?: (id: string) => void;
    onEdit?: (word: VocabularyWord) => void;
    onToggleLearned?: (id: string) => void;
    onAddToMyVocabulary?: (id: string) => void;
    isLearned?: boolean;
    selectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelection?: (id: string) => void;
    readOnly?: boolean;
    initialExpanded?: boolean;
    onPronounce?: (id: string, audioUrl: string) => void;
    /** Controls the visual density of the card. 'compact' reduces padding and uses smaller typography */
    density?: CardDensity;
}

// Helper function to get color based on difficulty level
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

const WordCard: React.FC<WordCardProps> = ({
    word,
    onDelete,
    onEdit,
    onToggleLearned,
    onAddToMyVocabulary,
    isLearned = false,
    selectionMode = false,
    isSelected = false,
    onToggleSelection,
    readOnly = false,
    initialExpanded = false,
    onPronounce,
    density = 'compact',
}) => {
    const [expanded, setExpanded] = useState(initialExpanded);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const theme = useTheme();
    const { user } = useAuth();

    const isTeacher = user?.role === 'tutor';
    
    // Get spacing values based on density
    const isCompact = density === 'compact';
    const spacing = CARD_SPACING[density];

    const handleExpandClick = () => {
        setExpanded(!expanded);
    };

    const handlePlayAudio = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (word.audioUrl) {
            try {
                new Audio(word.audioUrl).play().catch(() => {});
            } catch {}
            onPronounce?.(word.id, word.audioUrl);
        }
    };

    const handlePlayExampleAudio = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (word.exampleSentenceAudioUrl) {
            new Audio(word.exampleSentenceAudioUrl).play();
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmDeleteOpen(true);
    };

    const confirmDelete = () => {
        if (onDelete) {
            onDelete(word.id);
        }
        setConfirmDeleteOpen(false);
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onEdit) {
            onEdit(word);
        }
    };

    const handleToggleLearned = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onToggleLearned) {
            onToggleLearned(word.id);
        }
    };

    const handleAddToMyVocabulary = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onAddToMyVocabulary) {
            onAddToMyVocabulary(word.id);
        }
    };

    const handleToggleSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onToggleSelection) {
            onToggleSelection(word.id);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={{
                y: isCompact ? -2 : -5,
                transition: { duration: 0.2 }
            }}
            style={{ height: '100%' }}
        >
            <Card
                sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: spacing.borderRadius,
                    boxShadow: isLearned
                        ? `0 ${isCompact ? 4 : 8}px ${isCompact ? 12 : 24}px ${alpha(theme.palette.success.main, 0.15)}`
                        : isSelected
                            ? `0 ${isCompact ? 4 : 8}px ${isCompact ? 12 : 24}px ${alpha(theme.palette.primary.main, 0.15)}`
                            : `0 ${isCompact ? 2 : 4}px ${isCompact ? 10 : 20}px rgba(0,0,0,0.06)`,
                    position: 'relative',
                    overflow: 'visible',
                    bgcolor: isLearned
                        ? alpha(theme.palette.success.main, 0.03)
                        : isSelected
                            ? alpha(theme.palette.primary.main, 0.03)
                            : '#ffffff',
                    transition: 'all 0.3s ease',
                    border: isLearned
                        ? `1px solid ${alpha(theme.palette.success.main, 0.3)}`
                        : isSelected
                            ? `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                            : '1px solid rgba(0,0,0,0.08)',
                    cursor: selectionMode ? 'pointer' : 'default',
                    ...(selectionMode && {
                        '&:hover': {
                            borderColor: theme.palette.primary.main,
                            bgcolor: alpha(theme.palette.primary.main, 0.03)
                        }
                    })
                }}
                onClick={selectionMode ? handleToggleSelection : undefined}
            >
                {/* Status indicators */}
                <AnimatePresence>
                    {isLearned && !selectionMode && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            style={{
                                position: 'absolute',
                                top: -10,
                                right: -10,
                                zIndex: 1
                            }}
                        >
                            <Badge
                                overlap="circular"
                                badgeContent={
                                    <CheckCircleIcon
                                        fontSize="small"
                                        sx={{
                                            color: 'white',
                                            filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))'
                                        }}
                                    />
                                }
                                sx={{
                                    '& .MuiBadge-badge': {
                                        bgcolor: 'success.main',
                                        width: 26,
                                        height: 26,
                                        borderRadius: '50%',
                                        border: '2px solid white'
                                    }
                                }}
                            />
                        </motion.div>
                    )}

                    {/* Selection indicator */}
                    {selectionMode && isSelected && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            style={{
                                position: 'absolute',
                                top: -10,
                                right: -10,
                                zIndex: 1
                            }}
                        >
                            <Badge
                                overlap="circular"
                                badgeContent={
                                    <CheckCircleIcon
                                        fontSize="small"
                                        sx={{
                                            color: 'white',
                                            filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))'
                                        }}
                                    />
                                }
                                sx={{
                                    '& .MuiBadge-badge': {
                                        bgcolor: 'primary.main',
                                        width: 26,
                                        height: 26,
                                        borderRadius: '50%',
                                        border: '2px solid white'
                                    }
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                <CardContent sx={{ 
                    flexGrow: 1, 
                    p: readOnly ? spacing.paddingReadOnly : spacing.padding, 
                    pt: readOnly ? (isCompact ? 1 : 1.5) : spacing.padding,
                    pb: isCompact ? 1 : undefined 
                }}>
                    {/* Word Header */}
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start', 
                        mb: isCompact ? 0.5 : (readOnly ? 1 : 2) 
                    }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: isCompact ? 0.5 : 1 }}>
                                <Typography
                                    variant={isCompact ? 'subtitle1' : 'h5'}
                                    component="div"
                                    sx={{
                                        fontWeight: 700,
                                        color: theme.palette.primary.main,
                                        lineHeight: 1.2,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: isCompact ? 'nowrap' : 'normal'
                                    }}
                                >
                                    {word.text}
                                </Typography>
                                
                                {/* In compact mode, show phonetic inline with audio button */}
                                {isCompact && word.audioUrl && (
                                    <Tooltip title="Play pronunciation">
                                        <IconButton
                                            size="small"
                                            onClick={handlePlayAudio}
                                            sx={{
                                                color: theme.palette.primary.main,
                                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                width: 20,
                                                height: 20,
                                                '&:hover': {
                                                    bgcolor: alpha(theme.palette.primary.main, 0.2)
                                                }
                                            }}
                                        >
                                            <VolumeUpIcon sx={{ fontSize: 12 }} />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Box>

                            {/* Phonetic - only show separately in comfortable mode */}
                            {!isCompact && word.phonetic && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: 'text.secondary',
                                            fontFamily: 'monospace',
                                            letterSpacing: 0.5
                                        }}
                                    >
                                        {word.phonetic}
                                    </Typography>

                                    {word.audioUrl && (
                                        <Tooltip title="Play pronunciation">
                                            <IconButton
                                                size="small"
                                                onClick={handlePlayAudio}
                                                sx={{
                                                    color: theme.palette.primary.main,
                                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                    width: 24,
                                                    height: 24,
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.primary.main, 0.2)
                                                    }
                                                }}
                                            >
                                                <VolumeUpIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Box>
                            )}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end', ml: 1 }}>
                            {word.partOfSpeech && (
                                <Chip
                                    label={isCompact ? word.partOfSpeech.slice(0, 4) : word.partOfSpeech}
                                    size="small"
                                    sx={{
                                        textTransform: 'capitalize',
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        color: theme.palette.primary.main,
                                        fontWeight: 600,
                                        fontSize: isCompact ? '0.65rem' : '0.7rem',
                                        height: spacing.chipHeight,
                                        borderRadius: 1.5
                                    }}
                                />
                            )}
                        </Box>
                    </Box>

                    {/* Metrics Row - compact uses icon badges, comfortable uses full labels */}
                    <Box
                        sx={{
                            display: 'flex',
                            gap: isCompact ? 0.5 : (readOnly ? 1 : 1.5),
                            mb: isCompact ? 0.5 : (readOnly ? 1 : 2),
                            flexWrap: 'wrap',
                            alignItems: 'center'
                        }}
                    >
                        {word.difficulty && (
                            isCompact ? (
                                // Compact: Icon badge with color indicator
                                <Tooltip title={`Difficulty: ${word.difficulty}/5`}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.25,
                                            px: 0.75,
                                            py: 0.25,
                                            borderRadius: 1,
                                            bgcolor: alpha(getDifficultyColor(word.difficulty), 0.12),
                                            border: `1px solid ${alpha(getDifficultyColor(word.difficulty), 0.3)}`,
                                        }}
                                    >
                                        <SpeedIcon sx={{ fontSize: 12, color: getDifficultyColor(word.difficulty) }} />
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                fontWeight: 600, 
                                                color: getDifficultyColor(word.difficulty),
                                                fontSize: '0.65rem',
                                                lineHeight: 1
                                            }}
                                        >
                                            {word.difficulty}
                                        </Typography>
                                    </Box>
                                </Tooltip>
                            ) : (
                                // Comfortable: Full label
                                <Tooltip title={`Difficulty: ${word.difficulty}/5`}>
                                    <Chip
                                        label={`Difficulty: ${word.difficulty}`}
                                        size="small"
                                        icon={<Box
                                            component="span"
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                bgcolor: getDifficultyColor(word.difficulty),
                                                ml: 1
                                            }}
                                        />}
                                        sx={{
                                            bgcolor: alpha(getDifficultyColor(word.difficulty), 0.1),
                                            color: 'text.primary',
                                            fontWeight: 500,
                                            height: spacing.metricsChipHeight,
                                            '& .MuiChip-icon': {
                                                order: 1,
                                                ml: 0.5,
                                                mr: -0.5
                                            }
                                        }}
                                    />
                                </Tooltip>
                            )
                        )}

                        {word.popularity && (
                            isCompact ? (
                                // Compact: Icon badge with color indicator
                                <Tooltip title={`Popularity: ${word.popularity}/5`}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.25,
                                            px: 0.75,
                                            py: 0.25,
                                            borderRadius: 1,
                                            bgcolor: alpha(theme.palette.secondary.main, 0.12),
                                            border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
                                        }}
                                    >
                                        <TrendingUpIcon sx={{ fontSize: 12, color: theme.palette.secondary.main }} />
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                fontWeight: 600, 
                                                color: theme.palette.secondary.main,
                                                fontSize: '0.65rem',
                                                lineHeight: 1
                                            }}
                                        >
                                            {word.popularity}
                                        </Typography>
                                    </Box>
                                </Tooltip>
                            ) : (
                                // Comfortable: Full label
                                <Tooltip title={`Popularity: ${word.popularity}/5`}>
                                    <Chip
                                        label={`Popularity: ${word.popularity}`}
                                        size="small"
                                        icon={<Box
                                            component="span"
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                bgcolor: theme.palette.secondary.main,
                                                ml: 1
                                            }}
                                        />}
                                        sx={{
                                            bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                            color: 'text.primary',
                                            fontWeight: 500,
                                            height: spacing.metricsChipHeight,
                                            '& .MuiChip-icon': {
                                                order: 1,
                                                ml: 0.5,
                                                mr: -0.5
                                            }
                                        }}
                                    />
                                </Tooltip>
                            )
                        )}
                    </Box>

                    {/* Translation */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: isCompact ? 0.75 : (readOnly ? 1 : 1.5),
                            p: isCompact ? 1 : (readOnly ? 1.5 : 2),
                            borderRadius: isCompact ? 1.5 : 2,
                            bgcolor: alpha(theme.palette.background.default, 0.7),
                            border: `1px solid ${theme.palette.divider}`,
                            mb: isCompact ? 0 : (readOnly ? 1.5 : 2)
                        }}
                    >
                        <TranslateIcon sx={{ 
                            color: theme.palette.secondary.main,
                            fontSize: isCompact ? 16 : 24
                        }} />
                        <Typography
                            variant={isCompact ? 'body2' : 'body1'}
                            sx={{
                                fontWeight: 600,
                                color: 'text.primary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: isCompact ? 'nowrap' : 'normal'
                            }}
                        >
                            {word.translation}
                        </Typography>
                    </Box>

                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Divider sx={{ my: 2 }} />

                                {/* Definition Section */}
                                {word.definitionEn && (
                                    <Box
                                        sx={{
                                            mb: 2,
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: alpha(theme.palette.background.default, 0.5),
                                            border: `1px solid ${theme.palette.divider}`
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle2"
                                            fontWeight={600}
                                            color="primary"
                                            gutterBottom
                                            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 4,
                                                    height: 16,
                                                    bgcolor: 'primary.main',
                                                    borderRadius: 1
                                                }}
                                            />
                                            Definition
                                        </Typography>
                                        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                                            {word.definitionEn}
                                        </Typography>
                                    </Box>
                                )}

                                {/* Example Section */}
                                {word.exampleSentence && (
                                    <Box
                                        sx={{
                                            mb: 2,
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: alpha(theme.palette.secondary.main, 0.05),
                                            border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <Typography
                                                variant="subtitle2"
                                                fontWeight={600}
                                                color="secondary"
                                                sx={{ display: 'flex', alignItems: 'center' }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: 4,
                                                        height: 16,
                                                        bgcolor: 'secondary.main',
                                                        borderRadius: 1,
                                                        mr: 1
                                                    }}
                                                />
                                                Example
                                            </Typography>
                                            {word.exampleSentenceAudioUrl && (
                                                <Tooltip title="Play pronunciation">
                                                    <IconButton
                                                        size="small"
                                                        onClick={handlePlayExampleAudio}
                                                        sx={{
                                                            color: theme.palette.primary.main,
                                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                            width: 24,
                                                            height: 24,
                                                            '&:hover': {
                                                                bgcolor: alpha(theme.palette.primary.main, 0.2)
                                                            }
                                                        }}
                                                    >
                                                        <VolumeUpIcon sx={{ fontSize: 14 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                lineHeight: 1.6,
                                                fontStyle: 'italic',
                                                pl: 2,
                                                borderLeft: `2px solid ${alpha(theme.palette.secondary.main, 0.3)}`
                                            }}
                                        >
                                            &#39;{word.exampleSentence}&#39;
                                        </Typography>
                                    </Box>
                                )}

                                {/* Synonyms Section */}
                                {word.synonymsEn && word.synonymsEn.length > 0 && (
                                    <Box sx={{ mb: 1 }}>
                                        <Typography
                                            variant="subtitle2"
                                            fontWeight={600}
                                            color="text.primary"
                                            gutterBottom
                                            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 4,
                                                    height: 16,
                                                    bgcolor: 'text.primary',
                                                    borderRadius: 1
                                                }}
                                            />
                                            Synonyms
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 1 }}>
                                            {word.synonymsEn.map((syn, index) => (
                                                <Chip
                                                    key={index}
                                                    label={syn}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                                        color: theme.palette.secondary.main,
                                                        fontWeight: 500,
                                                        borderRadius: 1.5,
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            bgcolor: alpha(theme.palette.secondary.main, 0.2),
                                                            transform: 'translateY(-2px)'
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>

                <CardActions
                    disableSpacing
                    sx={{
                        pt: 0,
                        px: isCompact ? 1.5 : (readOnly ? 2 : 3),
                        pb: isCompact ? 1 : (readOnly ? 1 : 2),
                        borderTop: expanded ? `1px solid ${theme.palette.divider}` : 'none',
                        mt: expanded ? (isCompact ? 0.5 : 1.5) : 0,
                        minHeight: isCompact ? 40 : 48
                    }}
                >
                    <Box sx={{ display: 'flex', gap: isCompact ? 0.5 : 1 }}>
                        {onEdit && !readOnly && (
                            <Tooltip title="Edit word">
                                <IconButton
                                    size="small"
                                    onClick={handleEdit}
                                    sx={{
                                        color: theme.palette.primary.main,
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        width: spacing.iconSize,
                                        height: spacing.iconSize,
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.2),
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                >
                                    <EditIcon sx={{ fontSize: isCompact ? 14 : 18 }} />
                                </IconButton>
                            </Tooltip>
                        )}

                        {onDelete && !readOnly && (
                            <Tooltip title="Delete word">
                                <IconButton
                                    size="small"
                                    onClick={handleDelete}
                                    sx={{
                                        color: theme.palette.error.main,
                                        bgcolor: alpha(theme.palette.error.main, 0.1),
                                        width: spacing.iconSize,
                                        height: spacing.iconSize,
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.error.main, 0.2),
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                >
                                    <DeleteIcon sx={{ fontSize: isCompact ? 14 : 18 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>

                    {/* Action buttons based on mode */}
                    <Box sx={{ display: 'flex', ml: 'auto', gap: isCompact ? 0.5 : 1 }}>
                        {onAddToMyVocabulary && readOnly && (
                            isCompact ? (
                                <Tooltip title="Add to My Vocabulary">
                                    <IconButton
                                        size="small"
                                        onClick={handleAddToMyVocabulary}
                                        sx={{
                                            color: theme.palette.primary.main,
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            width: spacing.iconSize,
                                            height: spacing.iconSize,
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                                                transform: 'translateY(-2px)'
                                            }
                                        }}
                                    >
                                        <BookmarkAddIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </Tooltip>
                            ) : (
                                <Button
                                    size="small"
                                    onClick={handleAddToMyVocabulary}
                                    variant="outlined"
                                    startIcon={<BookmarkAddIcon />}
                                    sx={{
                                        borderRadius: 6,
                                        px: 2,
                                        py: 0.8,
                                        borderColor: theme.palette.primary.main,
                                        color: theme.palette.primary.main,
                                        fontWeight: 600,
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            transform: 'translateY(-2px)',
                                            boxShadow: `0 4px 8px ${alpha(theme.palette.primary.main, 0.2)}`
                                        }
                                    }}
                                >
                                    Add to My Vocabulary
                                </Button>
                            )
                        )}

                        {onToggleLearned && !readOnly && !isTeacher && (
                            isCompact ? (
                                <Tooltip title={isLearned ? 'Learned' : 'Mark as learned'}>
                                    <IconButton
                                        size="small"
                                        onClick={handleToggleLearned}
                                        sx={{
                                            color: isLearned ? 'white' : theme.palette.success.main,
                                            bgcolor: isLearned 
                                                ? theme.palette.success.main 
                                                : alpha(theme.palette.success.main, 0.1),
                                            width: spacing.iconSize,
                                            height: spacing.iconSize,
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                bgcolor: isLearned 
                                                    ? theme.palette.success.dark 
                                                    : alpha(theme.palette.success.main, 0.2),
                                                transform: 'translateY(-2px)'
                                            }
                                        }}
                                    >
                                        <CheckCircleIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </Tooltip>
                            ) : (
                                <Button
                                    size="small"
                                    onClick={handleToggleLearned}
                                    variant={isLearned ? "contained" : "outlined"}
                                    startIcon={<CheckCircleIcon />}
                                    sx={{
                                        borderRadius: 6,
                                        px: 2,
                                        py: 0.8,
                                        borderColor: isLearned ? theme.palette.success.main : theme.palette.grey[400],
                                        bgcolor: isLearned ? theme.palette.success.main : 'transparent',
                                        color: isLearned ? 'white' : theme.palette.text.secondary,
                                        fontWeight: 600,
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            bgcolor: isLearned
                                                ? theme.palette.success.dark
                                                : alpha(theme.palette.success.main, 0.1),
                                            borderColor: theme.palette.success.main,
                                            color: isLearned ? 'white' : theme.palette.success.main,
                                            transform: 'translateY(-2px)',
                                            boxShadow: isLearned
                                                ? `0 4px 8px ${alpha(theme.palette.success.main, 0.3)}`
                                                : 'none'
                                        }
                                    }}
                                >
                                    {isLearned ? 'Learned' : 'Mark as learned'}
                                </Button>
                            )
                        )}

                        <Tooltip title={expanded ? "Show less" : "Show more"}>
                            <ExpandMore
                                expand={expanded}
                                compact={isCompact}
                                onClick={handleExpandClick}
                                aria-expanded={expanded}
                                aria-label="show more"
                                sx={{
                                    color: theme.palette.primary.main,
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                                        transform: expanded ? 'translateY(2px)' : 'translateY(-2px)'
                                    }
                                }}
                            >
                                <ExpandMoreIcon sx={{ fontSize: isCompact ? 16 : 24 }} />
                            </ExpandMore>
                        </Tooltip>
                    </Box>
                </CardActions>
            </Card>
            {/* Confirm Delete Dialog */}
            <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the word &#39;{word.text}&#39;? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteOpen(false)} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={confirmDelete} color="error" autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </motion.div>
    );
};

export default WordCard;
