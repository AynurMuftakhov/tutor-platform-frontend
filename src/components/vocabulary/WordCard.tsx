import React, { useState } from 'react';
import {
    Card,
    CardContent,
    CardActions,
    Typography,
    IconButton,
    Box,
    Chip,
    Tooltip,
    Collapse,
    Button,
    styled,
    useTheme
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { VocabularyWord } from '../../types';
import { motion } from 'framer-motion';
import {useAuth} from "../../context/AuthContext";

const ExpandMore = styled((props: {
    expand: boolean;
    onClick: () => void;
    'aria-expanded': boolean;
    'aria-label': string;
    children: React.ReactNode;
}) => {
    const { expand, ...other } = props;
    return <IconButton {...other} />;
})(({ theme, expand }) => ({
    transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
    marginLeft: 'auto',
    transition: theme.transitions.create('transform', {
        duration: theme.transitions.duration.shortest,
    }),
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
}

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
    readOnly = false
}) => {
    const [expanded, setExpanded] = useState(false);
    const theme = useTheme();
    const { user } = useAuth();

    const isTeacher = user?.role === 'tutor';

    const handleExpandClick = () => {
        setExpanded(!expanded);
    };

    const handlePlayAudio = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (word.audioUrl) {
            new Audio(word.audioUrl).play();
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(word.id);
        }
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
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
            style={{ height: '100%' }}
        >
            <Card 
                sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    position: 'relative',
                    overflow: 'visible',
                    bgcolor: isLearned 
                        ? 'rgba(0, 215, 194, 0.05)' 
                        : isSelected 
                            ? 'rgba(37, 115, 255, 0.05)' 
                            : '#fafbfd',
                    transition: 'all 0.3s ease',
                    border: isLearned 
                        ? `1px solid ${theme.palette.success.light}` 
                        : isSelected 
                            ? '1px solid #2573ff' 
                            : '1px solid rgba(0,0,0,0.08)',
                    cursor: selectionMode ? 'pointer' : 'default',
                    ...(selectionMode && { 
                        '&:hover': { 
                            borderColor: '#2573ff',
                            bgcolor: 'rgba(37, 115, 255, 0.05)'
                        } 
                    })
                }}
                onClick={selectionMode ? handleToggleSelection : undefined}
            >
                {/* Status indicators */}
                {isLearned && !selectionMode && (
                    <Box 
                        sx={{ 
                            position: 'absolute', 
                            top: -10, 
                            right: -10, 
                            bgcolor: 'success.main',
                            borderRadius: '50%',
                            p: 0.5,
                            zIndex: 1
                        }}
                    >
                        <CheckCircleIcon fontSize="small" sx={{ color: 'white' }} />
                    </Box>
                )}

                {/* Selection indicator */}
                {selectionMode && isSelected && (
                    <Box 
                        sx={{ 
                            position: 'absolute', 
                            top: -10, 
                            right: -10, 
                            bgcolor: '#2573ff',
                            borderRadius: '50%',
                            p: 0.5,
                            zIndex: 1
                        }}
                    >
                        <CheckCircleIcon fontSize="small" sx={{ color: 'white' }} />
                    </Box>
                )}
                <CardContent sx={{ flexGrow: 1, pb: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 600, color: '#2573ff' }}>
                            {word.text}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {word.difficulty && (
                                <Tooltip title={`Difficulty: ${word.difficulty}/5`}>
                                    <Chip 
                                        label={`D: ${word.difficulty}`} 
                                        size="small" 
                                        sx={{ 
                                            bgcolor: 'rgba(37, 115, 255, 0.1)',
                                            color: '#2573ff',
                                            fontWeight: 500
                                        }} 
                                    />
                                </Tooltip>
                            )}
                            {word.popularity && (
                                <Tooltip title={`Popularity: ${word.popularity}/5`}>
                                    <Chip 
                                        label={`P: ${word.popularity}`} 
                                        size="small" 
                                        sx={{ 
                                            bgcolor: 'rgba(0, 215, 194, 0.1)',
                                            color: '#00d7c2',
                                            fontWeight: 500
                                        }} 
                                    />
                                </Tooltip>
                            )}
                            {word.partOfSpeech && (
                                <Chip 
                                    label={word.partOfSpeech} 
                                    size="small" 
                                    sx={{ 
                                        textTransform: 'capitalize',
                                        bgcolor: 'rgba(37, 115, 255, 0.1)',
                                        color: '#2573ff',
                                        fontWeight: 500
                                    }} 
                                />
                            )}
                        </Box>
                    </Box>

                    {word.phonetic && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {word.phonetic}
                        </Typography>
                    )}

                    <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                        {word.translation}
                    </Typography>

                    <Collapse in={expanded} timeout="auto" unmountOnExit>
                        <Box sx={{ mt: 2, mb: 1 }}>
                            {word.definitionEn && (
                                <Typography variant="body2" paragraph sx={{ mb: 1 }}>
                                    <Typography component="span" fontWeight="bold">Definition:</Typography> {word.definitionEn}
                                </Typography>
                            )}

                            {word.exampleSentence && (
                                <Typography variant="body2" paragraph sx={{ mb: 1 }}>
                                    <Typography component="span" fontWeight="bold">Example:</Typography> "{word.exampleSentence}"
                                </Typography>
                            )}

                            {word.synonymsEn && word.synonymsEn.length > 0 && (
                                <Typography variant="body2">
                                    <Typography component="span" fontWeight="bold">Synonyms:</Typography>{' '}
                                    {word.synonymsEn.map((syn, index) => (
                                        <Chip 
                                            key={index} 
                                            label={syn} 
                                            size="small" 
                                            sx={{ 
                                                mr: 0.5, 
                                                mb: 0.5,
                                                bgcolor: 'rgba(0, 215, 194, 0.1)',
                                                color: '#00d7c2'
                                            }} 
                                        />
                                    ))}
                                </Typography>
                            )}
                        </Box>
                    </Collapse>
                </CardContent>

                <CardActions disableSpacing sx={{ pt: 0 }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {word.audioUrl && (
                            <Tooltip title="Play pronunciation">
                                <IconButton 
                                    size="small" 
                                    onClick={handlePlayAudio}
                                    sx={{ color: '#2573ff' }}
                                >
                                    <VolumeUpIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}

                        {onEdit && !readOnly && (
                            <Tooltip title="Edit word">
                                <IconButton 
                                    size="small" 
                                    onClick={handleEdit}
                                    sx={{ color: 'text.secondary' }}
                                >
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}

                        {onDelete && !readOnly && (
                            <Tooltip title="Delete word">
                                <IconButton 
                                    size="small" 
                                    onClick={handleDelete}
                                    sx={{ color: 'error.main' }}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>

                    {/* Action buttons based on mode */}
                    {onAddToMyVocabulary && readOnly && (
                        <Button 
                            size="small" 
                            onClick={handleAddToMyVocabulary}
                            variant="outlined"
                            sx={{ 
                                ml: 'auto', 
                                mr: 1,
                                borderRadius: 2,
                                borderColor: '#2573ff',
                                color: '#2573ff',
                                '&:hover': {
                                    bgcolor: 'rgba(37, 115, 255, 0.1)'
                                }
                            }}
                        >
                            Add to My Vocabulary
                        </Button>
                    )}

                    {onToggleLearned && !readOnly && !isTeacher && (
                        <Button 
                            size="small" 
                            onClick={handleToggleLearned}
                            sx={{ 
                                ml: 'auto', 
                                mr: 1,
                                color: isLearned ? 'success.main' : 'text.secondary',
                                '&:hover': {
                                    bgcolor: isLearned ? 'rgba(0, 215, 194, 0.1)' : 'rgba(0,0,0,0.04)'
                                }
                            }}
                        >
                            {isLearned ? 'Learned' : 'Mark as learned'}
                        </Button>
                    )}

                    <ExpandMore
                        expand={expanded}
                        onClick={handleExpandClick}
                        aria-expanded={expanded}
                        aria-label="show more"
                        sx={{ color: 'text.secondary' }}
                    >
                        <ExpandMoreIcon />
                    </ExpandMore>
                </CardActions>
            </Card>
        </motion.div>
    );
};

export default WordCard;
