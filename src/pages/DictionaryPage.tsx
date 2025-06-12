import React, {useMemo, useState} from 'react';
import {
    Box,
    Typography,
    TextField,
    InputAdornment,
    Stack,
    Button,
    Pagination,
    Chip,
    Divider,
    useMediaQuery,
    useTheme,
    Tabs,
    Tab,
    Snackbar,
    Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import SchoolIcon from '@mui/icons-material/School';
import FilterListIcon from '@mui/icons-material/FilterList';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import {
    useDictionary,
    useDeleteWord,
    useCreateWord,
    useUpdateWord
} from '../hooks/useVocabulary';
import {useAssignments, useAssignWords} from '../hooks/useAssignments';
import WordGrid from '../components/vocabulary/WordGrid';
import CategoryTabs from '../components/vocabulary/CategoryTabs';
import GenerateWordDialog from '../components/vocabulary/GenerateWordDialog';
import ReviewWordDialog from '../components/vocabulary/ReviewWordDialog';
import QuizMode from '../components/vocabulary/QuizMode';
import AssignStudentModal from '../components/vocabulary/AssignStudentModal';
import {VocabularyWord} from '../types';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const ITEMS_PER_PAGE = 12;

const DictionaryPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user } = useAuth();
    const isTeacher = user?.role === 'tutor';

    // Tab state for student view (My Vocabulary / Vocabulary Library)
    const [activeTab, setActiveTab] = useState<'my-vocabulary' | 'library'>('my-vocabulary');

    // Fetch all vocabulary words
    const {data: words = [], refetch: refetchWords} = useDictionary();

    // Fetch words assigned to the student (if user is a student)
    const {data: assignedWords = []} = useAssignments(user?.id || '');

    // Hook for assigning words to students
    const assignWords = useAssignWords();

    // Create a map of assigned word IDs for quick lookup
    const assignedWordIds = useMemo(() => {
        const ids = new Set<string>();
        assignedWords.forEach(assignment => ids.add(assignment.vocabularyWordId));
        return ids;
    }, [assignedWords]);

    // Get words for the current view based on user role and active tab
    const displayWords = useMemo(() => {
        if (isTeacher) {
            // Teachers see all words
            return words;
        } else {
            // Students see either assigned words or library words based on active tab
            if (activeTab === 'my-vocabulary') {
                // Filter words that are assigned to the student
                return words.filter(word => assignedWordIds.has(word.id));
            } else {
                // Show all words for the library view EXCEPT those already assigned to the student
                return words.filter(word => !assignedWordIds.has(word.id));
            }
        }
    }, [isTeacher, words, activeTab, assignedWordIds]);

    // Get words for quiz - for students, always use only assigned words
    const quizWords = useMemo(() => {
        if (isTeacher) {
            // Teachers see all words in quiz
            return words;
        } else {
            // Students always see only assigned words in quiz
            return words.filter(word => assignedWordIds.has(word.id));
        }
    }, [isTeacher, words, assignedWordIds]);

    const deleteWord = useDeleteWord();
    useCreateWord();
    const updateWord = useUpdateWord();
    const [genOpen, setGenOpen] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [quizOpen, setQuizOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [selected, setSelected] = useState<VocabularyWord | null>(null);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<'0' | '1' | '2' | '3' | '4' | '5'>('0');
    const [page, setPage] = useState(1); // 1-based for Pagination component
    const [showOnlyLearned, setShowOnlyLearned] = useState(false);
    const [learnedWords, setLearnedWords] = useState<Set<string>>(new Set());

    // State for word selection (for assigning to students)
    const [selectedWords, setSelectedWords] = useState<string[]>([]);
    const [selectionMode, setSelectionMode] = useState(false);

    // State for Snackbar notifications
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

    // ------- FILTER + PAGINATE -------
    const filtered = useMemo(
        () =>
            displayWords.filter(w => {
                const matchSearch = w.text.toLowerCase().includes(search.toLowerCase());
                const matchCat = category === '0' ? true : w.difficulty?.toString() === category;
                const matchLearned = showOnlyLearned ? learnedWords.has(w.id) : true;
                return matchSearch && matchCat && matchLearned;
            }),
        [displayWords, search, category, showOnlyLearned, learnedWords]
    );

    const paginated = useMemo(
        () => filtered.slice((page - 1) * ITEMS_PER_PAGE, (page - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE),
        [filtered, page]
    );

    const handleWordEdit = (word: VocabularyWord) => {
        setSelected(word);
        setReviewOpen(true);
    };

    const handleReviewSave = (patch: Partial<VocabularyWord>) => {
        if (selected) {
            updateWord.mutate({id: selected.id, dto: patch});
        }
    };

    const handleToggleLearned = (id: string) => {
        setLearnedWords(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // Function to add a word from the library to the student's personal vocabulary
    const handleAddToMyVocabulary = (id: string) => {
        if (!user) return;

        // Create assignment request
        const dto = { 
            studentId: user.id, 
            vocabularyWordIds: [id] 
        };

        // Use the assignWords hook to assign the word to the student
        assignWords.mutate(dto, {
            onSuccess: () => {
                // Update the assignedWordIds set to include the newly assigned word
                // This ensures the word appears in "My Vocabulary" without requiring a reload
                assignedWordIds.add(id);

                // Show success message with Snackbar
                setSnackbarMessage('Word added to your vocabulary!');
                setSnackbarSeverity('success');
                setSnackbarOpen(true);

                // No longer navigate to My Vocabulary tab automatically
            },
            onError: (error) => {
                console.error('Failed to add word to vocabulary:', error);
                setSnackbarMessage('Failed to add word to your vocabulary. Please try again.');
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
            }
        });
    };

    // Toggle selection mode for assigning words to students
    const toggleSelectionMode = () => {
        setSelectionMode(prev => !prev);
        if (selectionMode) {
            // Clear selections when exiting selection mode
            setSelectedWords([]);
        }
    };

    // Toggle word selection
    const handleToggleSelection = (id: string) => {
        setSelectedWords(prev => {
            if (prev.includes(id)) {
                return prev.filter(wordId => wordId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    return (
        <Box 
            sx={{ 
                p: { xs: 2, sm: 4 },
                bgcolor: '#fafbfd',
                minHeight: '100vh'
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    justifyContent="space-between" 
                    alignItems={{ xs: 'flex-start', sm: 'center' }} 
                    mb={3}
                    spacing={2}
                >
                    <Typography 
                        variant="h4" 
                        sx={{ 
                            fontWeight: 600,
                            color: '#2573ff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}
                    >
                        <SchoolIcon sx={{ fontSize: 32 }} /> Vocabulary
                    </Typography>

                    {isTeacher ? (
                        // Teacher actions
                        <Stack direction="row" spacing={1}>
                            {selectionMode ? (
                                <>
                                    <Button
                                        variant="outlined"
                                        onClick={toggleSelectionMode}
                                        sx={{ 
                                            borderRadius: 2,
                                            borderColor: 'error.main',
                                            color: 'error.main',
                                            '&:hover': {
                                                bgcolor: 'rgba(255, 72, 66, 0.1)'
                                            }
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={() => setAssignOpen(true)}
                                        disabled={selectedWords.length === 0}
                                        sx={{ 
                                            borderRadius: 2,
                                            bgcolor: '#2573ff',
                                            '&:hover': {
                                                bgcolor: '#1a5cd1'
                                            }
                                        }}
                                    >
                                        Assign {selectedWords.length} Word{selectedWords.length !== 1 ? 's' : ''}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="outlined"
                                        onClick={toggleSelectionMode}
                                        startIcon={<PersonAddIcon />}
                                        sx={{ 
                                            borderRadius: 2,
                                            borderColor: '#00d7c2',
                                            color: '#00d7c2',
                                            '&:hover': {
                                                borderColor: '#00b3a1',
                                                bgcolor: 'rgba(0, 215, 194, 0.1)'
                                            }
                                        }}
                                    >
                                        Select Words to Assign
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={() => setGenOpen(true)}
                                        startIcon={<AddIcon />}
                                        sx={{ 
                                            borderRadius: 2,
                                            bgcolor: '#2573ff',
                                            '&:hover': {
                                                bgcolor: '#1a5cd1'
                                            }
                                        }}
                                    >
                                        Add Word
                                    </Button>
                                </>
                            )}
                        </Stack>
                    ) : (
                        // Student actions
                        <Stack direction="row" spacing={1}>
                            <Button
                                variant="outlined"
                                onClick={() => setQuizOpen(true)}
                                startIcon={<SchoolIcon />}
                                sx={{ 
                                    borderRadius: 2,
                                    borderColor: '#00d7c2',
                                    color: '#00d7c2',
                                    '&:hover': {
                                        borderColor: '#00b3a1',
                                        bgcolor: 'rgba(0, 215, 194, 0.1)'
                                    }
                                }}
                            >
                                Practice
                            </Button>
                        </Stack>
                    )}
                </Stack>

                {/* Student tabs for switching between My Vocabulary and Library */}
                {!isTeacher && (
                    <Box sx={{ mb: 3 }}>
                        <Tabs 
                            value={activeTab} 
                            onChange={(_, newValue) => setActiveTab(newValue)}
                            sx={{ 
                                mb: 2,
                                '& .MuiTab-root': {
                                    minWidth: 'auto',
                                    px: 3,
                                    py: 1,
                                    borderRadius: 2,
                                    mr: 1,
                                    color: 'text.secondary',
                                    '&.Mui-selected': {
                                        color: '#2573ff',
                                        fontWeight: 600
                                    }
                                },
                                '& .MuiTabs-indicator': {
                                    height: 3,
                                    borderRadius: 1.5
                                }
                            }}
                        >
                            <Tab 
                                value="my-vocabulary" 
                                label="My Vocabulary" 
                                icon={<BookmarkIcon />} 
                                iconPosition="start"
                            />
                            <Tab 
                                value="library" 
                                label="Vocabulary Library" 
                                icon={<LibraryBooksIcon />} 
                                iconPosition="start"
                            />
                        </Tabs>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {activeTab === 'my-vocabulary' 
                                ? 'Words assigned to you by your teacher. Practice these to improve your vocabulary.'
                                : 'Browse all available vocabulary words. Add interesting words to your personal vocabulary.'}
                        </Typography>
                    </Box>
                )}

                {/* Search & Filters */}
                <Box 
                    sx={{ 
                        mb: 3,
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        border: '1px solid rgba(0,0,0,0.08)'
                    }}
                >
                    <Stack 
                        direction={{ xs: 'column', sm: 'row' }} 
                        spacing={2} 
                        mb={2}
                        alignItems={{ xs: 'stretch', sm: 'center' }}
                    >
                        <TextField
                            placeholder="Search word…"
                            fullWidth
                            size="small"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                )
                            }}
                            sx={{ 
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2
                                }
                            }}
                        />

                        <Chip
                            icon={<FilterListIcon />}
                            label={showOnlyLearned ? "Learned words" : "All words"}
                            clickable
                            color={showOnlyLearned ? "success" : "default"}
                            onClick={() => setShowOnlyLearned(!showOnlyLearned)}
                            sx={{ 
                                borderRadius: 2,
                                bgcolor: showOnlyLearned ? 'rgba(0, 215, 194, 0.1)' : 'transparent',
                                border: showOnlyLearned ? '1px solid #00d7c2' : '1px solid rgba(0,0,0,0.12)',
                                '& .MuiChip-icon': {
                                    color: showOnlyLearned ? '#00d7c2' : 'inherit'
                                }
                            }}
                        />
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <CategoryTabs value={category} onChange={(v) => setCategory(v as '0' | '1' | '2' | '3' | '4' | '5')} />
                </Box>

                {/* Word Grid */}
                <WordGrid
                    data={paginated}
                    onDelete={isTeacher && !selectionMode ? id => deleteWord.mutate(id) : undefined}
                    onEdit={isTeacher && !selectionMode ? handleWordEdit : undefined}
                    onToggleLearned={!selectionMode ? handleToggleLearned : undefined}
                    onAddToMyVocabulary={!isTeacher && activeTab === 'library' && !selectionMode ? handleAddToMyVocabulary : undefined}
                    learnedWords={learnedWords}
                    readOnly={!isTeacher && activeTab === 'library'}
                    selectionMode={selectionMode}
                    selectedWords={selectedWords}
                    onToggleSelection={handleToggleSelection}
                />

                {/* Pagination */}
                {filtered.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                        <Pagination
                            count={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                            page={page}
                            onChange={(_, p) => setPage(p)}
                            color="primary"
                            size={isMobile ? "small" : "medium"}
                            showFirstButton
                            showLastButton
                            sx={{
                                '& .MuiPaginationItem-root': {
                                    borderRadius: 2,
                                },
                                '& .Mui-selected': {
                                    bgcolor: '#2573ff !important',
                                    color: 'white'
                                }
                            }}
                        />
                    </Box>
                )}
            </motion.div>

            {/* Dialogs */}
            <GenerateWordDialog open={genOpen} onClose={() => {
                setGenOpen(false);
                refetchWords(); // Refetch words when dialog is closed
            }}/>

            <ReviewWordDialog
                open={reviewOpen}
                data={selected}
                onSave={handleReviewSave}
                onClose={() => {
                    setReviewOpen(false);
                    refetchWords(); // Refetch words when dialog is closed
                }}
            />

            <QuizMode
                open={quizOpen}
                onClose={() => {
                    setQuizOpen(false);
                    refetchWords(); // Refetch words when dialog is closed
                }}
                words={quizWords}
            />

            {/* Modal for assigning words to students */}
            <AssignStudentModal
                open={assignOpen}
                onClose={() => {
                    setAssignOpen(false);
                    // Exit selection mode after assigning
                    if (selectionMode) {
                        setSelectionMode(false);
                        setSelectedWords([]);
                    }
                    refetchWords(); // Refetch words when dialog is closed
                }}
                selectedWords={selectedWords}
            />

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={4000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    onClose={() => setSnackbarOpen(false)} 
                    severity={snackbarSeverity}
                    variant="filled"
                    sx={{ 
                        width: '100%',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        borderRadius: 2
                    }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default DictionaryPage;
